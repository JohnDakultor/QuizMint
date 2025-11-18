// app/api/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";


// GET: Fetch current user's subscription
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch account info" }, { status: 500 });
  }
}

// POST: Cancel current subscription
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription to cancel" }, { status: 400 });
    }

    // Retrieve the customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    const subscriptionId = subscriptions.data[0].id;

    // Cancel the subscription
    await stripe.subscriptions.cancel(subscriptionId);

    // Update database
    await prisma.user.update({
      where: { email },
      data: { subscriptionStatus: "cancelled", subscriptionEnd: new Date(), subscriptionPlan: "free", quizUsage: 0 },
    });

    return NextResponse.json({ message: "Subscription cancelled" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to cancel subscription" }, { status: 500 });
  }
}
