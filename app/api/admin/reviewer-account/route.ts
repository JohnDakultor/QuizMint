import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

function isBootstrapEnabled() {
  const raw = String(process.env.APP_REVIEWER_BOOTSTRAP_ENABLED || "")
    .trim()
    .toLowerCase();
  const explicitlyEnabled =
    raw === "1" || raw === "true" || raw === "yes" || raw === "on";

  // Default safe behavior in production: disabled unless explicitly enabled.
  if (process.env.NODE_ENV === "production") return explicitlyEnabled;
  // In non-production, keep it available for local/test unless explicitly disabled.
  if (!raw) return true;
  return explicitlyEnabled;
}

function getInternalSecret(req: NextRequest) {
  const headerSecret = req.headers.get("x-internal-secret") || "";
  const envSecret =
    process.env.REVIEWER_BOOTSTRAP_SECRET ||
    process.env.GENERATION_JOB_INTERNAL_SECRET ||
    "";
  return { headerSecret, envSecret };
}

export async function POST(req: NextRequest) {
  try {
    if (!isBootstrapEnabled()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { headerSecret, envSecret } = getInternalSecret(req);
    if (!envSecret || headerSecret !== envSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(
      body?.email || process.env.APP_REVIEWER_LOGIN_EMAIL || ""
    )
      .trim()
      .toLowerCase();
    const password = String(
      body?.password || process.env.APP_REVIEWER_LOGIN_PASSWORD || ""
    ).trim();
    const username = String(
      body?.username || process.env.APP_REVIEWER_LOGIN_USERNAME || "google-reviewer"
    ).trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid reviewer email is required." },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Reviewer password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);
    const safeUsername = username || email.split("@")[0] || "google-reviewer";

    await prisma.user.upsert({
      where: { email },
      update: {
        password: passwordHash,
        authProvider: "credentials",
        username: safeUsername,
      },
      create: {
        email,
        password: passwordHash,
        username: safeUsername,
        authProvider: "credentials",
        aiDifficulty: "easy",
        adaptiveLearning: false,
        subscriptionPlan: "free",
      },
    });

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create reviewer account." },
      { status: 500 }
    );
  }
}
