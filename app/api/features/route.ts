// app/api/features/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";

// GET: fetch user features + subscription plan
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { features: true, subscriptionPlan: true },
  });

  return NextResponse.json({
    features: user?.features || {},
    subscriptionPlan: user?.subscriptionPlan || "free",
  });
}

// POST: update a user feature
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { featureKey, enabled } = await req.json();
  if (!featureKey) return NextResponse.json({ error: "No feature specified" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updatedFeatures = { ...(user.features || {}), [featureKey]: enabled };

  await prisma.user.update({
    where: { email: session.user.email },
    data: { features: updatedFeatures },
  });

  return NextResponse.json({ features: updatedFeatures });
}
