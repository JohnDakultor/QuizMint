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


// app/api/auth/google-one-tap/route.js
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          image: payload.picture,
          authProvider: "google",
          password: null,
          username: payload.email.split('@')[0], // Default username
        },
      });
    }

    // Set auth session (using NextAuth)
    // You might need to create a session manually or use NextAuth's signIn
    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      email: user.email,
      name: user.name 
    });
  } catch (error) {
    console.error("Google One-Tap error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}