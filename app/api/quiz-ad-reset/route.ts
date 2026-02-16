import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

const FREE_QUIZ_LIMIT = 3;
const COOLDOWN_HOURS = 3;
const AD_RESET_LIMIT = 5;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const plan = user.subscriptionPlan || "free";
  if (plan !== "free") {
    return NextResponse.json(
      { error: "Ad reset is only for free users" },
      { status: 403 }
    );
  }

  const now = new Date();
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  const lastQuizAt = user.lastQuizAt ? new Date(user.lastQuizAt) : null;
  const withinCooldown =
    lastQuizAt && now.getTime() - lastQuizAt.getTime() < cooldownMs;

  if (!(user.quizUsage >= FREE_QUIZ_LIMIT && withinCooldown)) {
    return NextResponse.json(
      { error: "Ad reset not available", message: "You are not locked." },
      { status: 400 }
    );
  }

  let windowStart = user.quizAdResetWindowAt
    ? new Date(user.quizAdResetWindowAt)
    : null;
  let resetCount = user.quizAdResetCount ?? 0;

  if (!windowStart || now.getTime() - windowStart.getTime() >= cooldownMs) {
    windowStart = now;
    resetCount = 0;
  }

  if (resetCount >= AD_RESET_LIMIT) {
    return NextResponse.json(
      {
        error: "Ad reset limit reached",
        message: "Ad resets exhausted for this window.",
        nextAdResetAt: new Date(windowStart.getTime() + cooldownMs).toISOString(),
      },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      quizUsage: 0,
      lastQuizAt: null,
      lastQuizAdResetAt: now,
      quizAdResetCount: resetCount + 1,
      quizAdResetWindowAt: windowStart,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Usage reset. You can generate again.",
  });
}
