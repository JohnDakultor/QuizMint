import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminSession } from "@/lib/admin-auth";

const VALID_PLANS = new Set(["free", "pro", "premium"]);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const auth = await assertAdminSession();
  if (!auth.ok) {
    const status =
      auth.reason === "misconfigured"
          ? 500
          : auth.reason === "challenge"
            ? 428
            : 403;
    return NextResponse.json({ error: auth.reason }, { status });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const plan = String(body?.plan || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!VALID_PLANS.has(plan)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const isPaid = plan === "pro" || plan === "premium";
  const now = new Date();
  const updated = await prisma.user.update({
    where: { email },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: isPaid ? "active" : "inactive",
      subscriptionStart: isPaid ? now : null,
      subscriptionEnd: null,
      aiDifficulty: isPaid ? undefined : "easy",
      adaptiveLearning: isPaid ? undefined : false,
    },
    select: {
      id: true,
      email: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      aiDifficulty: true,
      adaptiveLearning: true,
    },
  });

  return NextResponse.json({ message: "updated", user: updated });
}
