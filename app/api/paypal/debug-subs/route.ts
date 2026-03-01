// app/api/debug-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { assertAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const admin = await assertAdminSession();
    if (!admin.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action } = await req.json();
    
    if (action === 'get') {
      // Get current user info
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
