import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";

const base = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'production' 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET_ID!;
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  console.log("🔍 Verifying PayPal subscription...");
  
  try {
    const body = await req.json();
    const subscriptionId = body.subscriptionId;
    const forcePlanType = body.planType;
    
    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }

    console.log(`📋 Subscription ID: ${subscriptionId}`);
    console.log(`📋 Plan Type from URL: ${forcePlanType}`);
    console.log(`📋 Full body received:`, JSON.stringify(body, null, 2));

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log(`👤 User session email: ${session.user.email}`);

    // Get access token
    const accessToken = await getAccessToken();
    
    // Fetch subscription details from PayPal
    console.log(`🔍 Fetching subscription details from PayPal...`);
    const res = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Failed to fetch subscription:", errorText);
      return NextResponse.json({ 
        error: "Failed to verify subscription", 
        details: errorText 
      }, { status: 400 });
    }

    const subscription = await res.json();
    console.log('📊 Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      start_time: subscription.start_time,
    });

    // === DEFINITIVE PLAN TYPE DETECTION ===
    let planType: 'pro' | 'premium' = 'pro';
    
    // Method 1: Use planType from URL if provided (MOST IMPORTANT)
    if (forcePlanType === 'pro' || forcePlanType === 'premium') {
      planType = forcePlanType as 'pro' | 'premium';
      console.log(`✅ USING PLAN TYPE FROM URL: ${planType}`);
    }
    // Method 2: If no URL parameter, check plan price
    else if (subscription.plan_id) {
      try {
        const planRes = await fetch(`${base}/v1/billing/plans/${subscription.plan_id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        
        if (planRes.ok) {
          const planDetails = await planRes.json();
          const price = planDetails.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value || '0';
          
          console.log(`💰 Plan price: $${price}`);
          
          if (price === '15.00' || price === '15') {
            planType = 'premium';
            console.log('✅ Price is $15, setting to PREMIUM');
          } else if (price === '5.00' || price === '5') {
            planType = 'pro';
            console.log('✅ Price is $5, setting to PRO');
          }
        }
      } catch (planError) {
        console.error('Error fetching plan details:', planError);
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`👤 Found user: ${user.email}`);
    console.log(`👤 Current user subscriptionPlan: ${user.subscriptionPlan}`);
    console.log(`🎯 FINAL PLAN TYPE: ${planType}`);

    // Calculate subscription end date (1 month from now)
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    
    // ====== FIXED: Update planType in BOTH update and create ======
    const paypalSubscription = await prisma.payPalSubscription.upsert({
      where: { subscriptionId },
      update: {
        status: subscription.status,
        planType: planType,  // ← CRITICAL: Update planType
        planId: subscription.plan_id,
        updatedAt: new Date(),
        nextBillingTime: subscription.billing_info?.next_billing_time 
          ? new Date(subscription.billing_info.next_billing_time)
          : subscriptionEnd,
      },
      create: {
        subscriptionId,
        planId: subscription.plan_id,
        planType: planType,  // ← CRITICAL: Set planType
        status: subscription.status,
        userId: user.id,
        startTime: new Date(subscription.start_time || new Date()),
        nextBillingTime: subscription.billing_info?.next_billing_time 
          ? new Date(subscription.billing_info.next_billing_time)
          : subscriptionEnd,
      },
    });

    console.log(`📝 PayPal subscription saved with planType: ${paypalSubscription.planType}`);

    // CRITICAL: Log what we're about to update
    console.log(`🔄 About to update User table:`, {
      userId: user.id,
      from: user.subscriptionPlan,
      to: planType,
      data: {
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        subscriptionStart: new Date(),
        subscriptionEnd: subscriptionEnd,
        paypalCustomerId: subscription.subscriber?.payer_id,
      }
    });

    // Update user's subscription info
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        subscriptionStart: new Date(),
        subscriptionEnd: subscriptionEnd,
        paypalCustomerId: subscription.subscriber?.payer_id,
      },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      }
    });

    console.log(`✅ User subscription updated to: ${updatedUser.subscriptionPlan}`);
    console.log(`✅ Full updated user:`, JSON.stringify(updatedUser, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: `Subscription verified and user upgraded to ${planType}`,
      user: updatedUser,
      subscription: {
        id: paypalSubscription.subscriptionId,
        planType: paypalSubscription.planType,
        status: paypalSubscription.status,
        planId: paypalSubscription.planId
      }
    });
    
  } catch (err: any) {
    console.error("❌ Verification error:", err);
    console.error("Stack trace:", err.stack);
    return NextResponse.json({ 
      error: "Verification failed", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}