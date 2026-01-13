// app/api/debug-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { action, planType } = await req.json();
    
    if (action === 'get') {
      // Get current user info
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          email: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionStart: true,
          subscriptionEnd: true,
        }
      });

      const subscriptions = await prisma.payPalSubscription.findMany({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({
        user,
        subscriptions,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'fix' && (planType === 'pro' || planType === 'premium')) {
      // Force fix user plan
      const user = await prisma.user.update({
        where: { email: session.user.email },
        data: {
          subscriptionPlan: planType
        },
        select: {
          id: true,
          email: true,
          subscriptionPlan: true,
        }
      });

      // Also update PayPal subscriptions
      await prisma.payPalSubscription.updateMany({
        where: { userId: user.id },
        data: { planType: planType }
      });

      return NextResponse.json({
        success: true,
        message: `Force updated to ${planType}`,
        user
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}