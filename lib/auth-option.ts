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
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Add user info from login to token
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.name = token.name as string;

    // ✅ Automatically mark Terms & Privacy accepted
    try {
      const userId = Number(token.id);

      // Check if the user already accepted policies
      const terms = await prisma.userPolicyAcceptance.findUnique({
        where: { userId_policyType: { userId, policyType: "terms" } },
      });
      const privacy = await prisma.userPolicyAcceptance.findUnique({
        where: { userId_policyType: { userId, policyType: "privacy" } },
      });

      const now = new Date();

      if (!terms) {
        await prisma.userPolicyAcceptance.create({
          data: { userId, policyType: "terms", accepted: true, acceptedAt: now },
        });
      }

      if (!privacy) {
        await prisma.userPolicyAcceptance.create({
          data: { userId, policyType: "privacy", accepted: true, acceptedAt: now },
        });
      }
    } catch (err) {
      console.error("Policy acceptance during session callback failed:", err);
    }
  }

  return session;
},

    
  },
};

export default NextAuth(authOptions);
