// import { NextResponse } from "next/server";
// import { OAuth2Client } from "google-auth-library";
// import { prisma } from "@/lib/prisma";

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// export async function POST(req: Request) {
//   try {
//     const { credential } = await req.json();

//     const ticket = await client.verifyIdToken({
//       idToken: credential,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();

//     if (!payload?.email) {
//       return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
//     }

//     const user = await prisma.user.upsert({
//       where: { email: payload.email },
//       update: {
//         name: payload.name,
//         image: payload.picture,
//         authProvider: "google",
//       },
//       create: {
//         email: payload.email,
//         name: payload.name,
//         image: payload.picture,
//         authProvider: "google",
//         password: null,
//         username: null,
//       },
//     });

//     return NextResponse.json({ success: true, userId: user.id });
//   } catch (error) {
//     console.error("Google auth error:", error);
//     return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    if (!credential) throw new Error("No credential provided");

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return NextResponse.json({ success: false, error: "Invalid Google token" }, { status: 401 });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name, image: payload.picture, authProvider: "google" },
      create: {
        email: payload.email,
        name: payload.name,
        image: payload.picture,
        authProvider: "google",
        aiDifficulty: "easy",
        adaptiveLearning: false,
        subscriptionPlan: "free",
        password: null,
        username: payload.email.split("@")[0],
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    console.error("Google Auth API error:", err);
    return NextResponse.json({ success: false, error: err.message || "Authentication failed" }, { status: 400 });
  }
}
