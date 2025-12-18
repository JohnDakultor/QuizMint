import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = Number(body.userId); // ✅ FIX HERE
    const policyType = body.policyType;

    if (!userId || !policyType) {
      return NextResponse.json(
        { message: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    const acceptance = await prisma.userPolicyAcceptance.upsert({
      where: {
        userId_policyType: {
          userId, // now Int ✅
          policyType,
        },
      },
      update: {
        accepted: true,
        acceptedAt: new Date(),
      },
      create: {
        userId,
        policyType,
        accepted: true,
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, acceptance });
  } catch (error) {
    console.error("Policy acceptance error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
