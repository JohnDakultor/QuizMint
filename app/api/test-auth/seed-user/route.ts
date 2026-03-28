import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

function isTestAuthEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.CYPRESS === "true" ||
    process.env.E2E_BYPASS_RECAPTCHA === "true"
  );
}

function buildUsernameFromEmail(email: string) {
  const local = email.split("@")[0] || "cypress";
  return `${local.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20)}_qa`;
}

export async function POST(req: NextRequest) {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || process.env.APP_REVIEWER_LOGIN_EMAIL || "test@quizmint.ai")
    .trim()
    .toLowerCase();
  const password = String(body?.password || "TestPassword123!");
  const username = String(body?.username || buildUsernameFromEmail(email));

  if (!email || !password) {
    return NextResponse.json({ error: "Missing seed credentials" }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      authProvider: "credentials",
      subscriptionPlan: "free",
      aiDifficulty: "easy",
      adaptiveLearning: false,
      ...(existing?.username
        ? {}
        : { username }),
    },
    create: {
      email,
      password: passwordHash,
      username,
      authProvider: "credentials",
      subscriptionPlan: "free",
      aiDifficulty: "easy",
      adaptiveLearning: false,
    },
    select: {
      id: true,
      email: true,
      username: true,
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

  return NextResponse.json({
    ok: true,
    user,
  });
}
