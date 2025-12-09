import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    // Optionally check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        subscriptionPlan: "free",
        aiDifficulty: "easy",
        password: hashedPassword,
      },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
  }
}
