// import NextAuth, { NextAuthOptions } from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import { prisma } from "@/lib/prisma";
// import { compare } from "bcryptjs";

// export const authOptions: NextAuthOptions = {
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials) throw new Error("Missing credentials");

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (!user) throw new Error("Invalid email or password");

//         const passwordMatch = user.password
//           ? await compare(credentials.password, user.password)
//           : false;
//         if (!passwordMatch) throw new Error("Invalid email or password");

//         // ✅ Return correct shape
//         return {
//           id: user.id.toString(),
//           email: user.email,
//           name: user.username,
//         };
//       },
//     }),
//   ],

//   session: {
//     strategy: "jwt",
//   },

//   pages: {
//     signIn: "/login",
//   },

//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.id = user.id;
//         token.name = user.name;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.id as string;
//         session.user.name = token.name as string;
//       }
//       return session;
//     },
//   },
// };

// export default NextAuth(authOptions);

import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

function getSessionLimitByPlan(plan: string | null | undefined): number {
  const normalized = String(plan || "free").toLowerCase();
  const freeLimit = Number(process.env.SESSION_LIMIT_FREE || 1);
  const proLimit = Number(process.env.SESSION_LIMIT_PRO || 1);
  const premiumLimit = Number(process.env.SESSION_LIMIT_PREMIUM || 1);

  const sanitize = (value: number) =>
    Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;

  if (normalized === "premium") return sanitize(premiumLimit);
  if (normalized === "pro") return sanitize(proLimit);
  return sanitize(freeLimit);
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) throw new Error("Missing credentials");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) throw new Error("Invalid email or password");

        const passwordMatch = user.password
          ? await compare(credentials.password, user.password)
          : false;
        if (!passwordMatch) throw new Error("Invalid email or password");

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.username,
        };
      },
    }),

    // Google login
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    // Force re-authentication if user is inactive/away.
    // 8 hours max session, refresh token age every 15 minutes while active.
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 15,
  },

  pages: {
    signIn: "/sign-in",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Add user info from login to token
      if (user) {
        token.id = user.id;
        token.name = user.name;

        const sessionId = randomUUID();
        const tokenWithSession = token as typeof token & { sessionId?: string };
        tokenWithSession.sessionId = sessionId;

        try {
          const headerStore = await headers();
          const forwardedFor = headerStore.get("x-forwarded-for") || "";
          const ip = forwardedFor.split(",")[0]?.trim() || null;
          const userAgent = headerStore.get("user-agent") || null;
          const userId = String(user.id);

          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { subscriptionPlan: true },
          });
          const sessionLimit = getSessionLimitByPlan(dbUser?.subscriptionPlan);

          await prisma.$transaction(async (tx) => {
            const activeSessions = await tx.userLoginSession.findMany({
              where: { userId, revokedAt: null },
              orderBy: { lastSeenAt: "desc" },
              select: { id: true },
            });

            const keepBeforeInsert = Math.max(sessionLimit - 1, 0);
            if (activeSessions.length > keepBeforeInsert) {
              const toRevoke = activeSessions.slice(keepBeforeInsert).map((s) => s.id);
              if (toRevoke.length > 0) {
                await tx.userLoginSession.updateMany({
                  where: { id: { in: toRevoke } },
                  data: { revokedAt: new Date() },
                });
              }
            }

            await tx.userLoginSession.create({
              data: {
                userId,
                sessionId,
                ip,
                userAgent,
              },
            });
          });
        } catch (sessionErr) {
          console.error("Session registration failed:", sessionErr);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (!session.user) return session;

      session.user.id = token.id as string;
      session.user.name = token.name as string;

      try {
        const userId = token.id as string;
        const userEmail = token.email ?? "";
        const tokenWithSession = token as typeof token & { sessionId?: string };
        const sessionId = tokenWithSession.sessionId;

        if (sessionId) {
          const activeSession = await prisma.userLoginSession.findUnique({
            where: { sessionId },
            select: { userId: true, revokedAt: true },
          });
          if (!activeSession || activeSession.userId !== userId || activeSession.revokedAt) {
            throw new Error("SESSION_REVOKED");
          }

          const userPlan = await prisma.user.findUnique({
            where: { id: userId },
            select: { subscriptionPlan: true },
          });
          const sessionLimit = getSessionLimitByPlan(userPlan?.subscriptionPlan);
          const activeSessions = await prisma.userLoginSession.findMany({
            where: { userId, revokedAt: null },
            orderBy: { lastSeenAt: "desc" },
            select: { id: true, sessionId: true },
          });

          // Keep newest N active sessions; revoke older ones.
          const allowedSessionIds = new Set(
            activeSessions.slice(0, sessionLimit).map((s) => s.sessionId)
          );
          const revokeIds = activeSessions
            .slice(sessionLimit)
            .map((s) => s.id);

          if (revokeIds.length > 0) {
            await prisma.userLoginSession.updateMany({
              where: { id: { in: revokeIds } },
              data: { revokedAt: new Date() },
            });
          }

          if (!allowedSessionIds.has(sessionId)) {
            throw new Error("SESSION_REVOKED");
          }

          await prisma.userLoginSession
            .update({
              where: { sessionId },
              data: { lastSeenAt: new Date() },
            })
            .catch(() => null);
        }

        // Upsert the user: create only if it doesn't exist
        const user = await prisma.user.upsert({
          where: { email: userEmail },
          update: {
            ...(token.name ? { name: String(token.name) } : {}),
            ...(token.picture
              ? {
                  image: String(token.picture),
                  authProvider: "google",
                }
              : {}),
          },
          create: {
            id: userId,
            email: userEmail,
            username: token.name ?? "Unknown",
            authProvider: "google",
            image: token.picture ?? "",
            aiDifficulty: "easy",
            adaptiveLearning: false,
            password: null,
            subscriptionPlan: "free",
          },
        });

        const now = new Date();
        await Promise.all([
          prisma.userPolicyAcceptance.upsert({
            where: { userId_policyType: { userId: user.id, policyType: "terms" } },
            update: { accepted: true, acceptedAt: now },
            create: { userId: user.id, policyType: "terms", accepted: true, acceptedAt: now },
          }),
          prisma.userPolicyAcceptance.upsert({
            where: { userId_policyType: { userId: user.id, policyType: "privacy" } },
            update: { accepted: true, acceptedAt: now },
            create: { userId: user.id, policyType: "privacy", accepted: true, acceptedAt: now },
          }),
        ]);
      } catch (err) {
        if ((err as Error)?.message === "SESSION_REVOKED") {
          throw err;
        }
        console.error("Policy/session validation during session callback failed:", err);
      }

      return session;
    },
  },

  events: {
    async signOut(message) {
      const tokenWithSession = (message.token || undefined) as
        | (typeof message.token & { sessionId?: string })
        | undefined;
      const sessionId = tokenWithSession?.sessionId;
      if (!sessionId) return;
      await prisma.userLoginSession
        .updateMany({
          where: { sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => null);
    },
  },
};

export default NextAuth(authOptions);
