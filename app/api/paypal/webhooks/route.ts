import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from 'crypto';

const base = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'production' 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

// Verify webhook signature (important for production)
async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  // For development, skip verification
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');
  const transmissionSig = headers.get('paypal-transmission-sig');
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId || !transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('Missing PayPal webhook headers');
    return false;
  }

  // In production, you should implement proper signature verification
  // This is a simplified version - you should use PayPal's SDK for proper verification
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    console.log('📩 PayPal Webhook Received:', {
      event_type: body.event_type,
      resource_type: body.resource_type,
      resource_id: body.resource?.id,
    });

    // Verify webhook signature
    const isValid = await verifyWebhook(req.headers, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const eventType = body.event_type;
    const resource = body.resource;

    // Handle subscription events
    if (eventType.includes('BILLING.SUBSCRIPTION')) {
      const subscriptionId = resource.id;
      
      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          console.log(`✅ Subscription Activated: ${subscriptionId}`);
          await handleSubscriptionActivated(resource);
          break;
          
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          console.log(`❌ Subscription Cancelled: ${subscriptionId}`);
          await handleSubscriptionCancelled(subscriptionId);
          break;
          
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          console.log(`⏸️ Subscription Suspended: ${subscriptionId}`);
          await handleSubscriptionSuspended(subscriptionId);
          break;
          
        case 'BILLING.SUBSCRIPTION.EXPIRED':
          console.log(`⌛ Subscription Expired: ${subscriptionId}`);
          await handleSubscriptionExpired(subscriptionId);
          break;
          
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          console.log(`💸 Payment Failed: ${subscriptionId}`);
          await handlePaymentFailed(subscriptionId);
          break;
          
        case 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED':
          console.log(`💰 Payment Completed: ${subscriptionId}`);
          await handlePaymentCompleted(resource);
          break;
      }
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handler functions
async function handleSubscriptionActivated(resource: any) {
  const subscriptionId = resource.id;
  const payerEmail = resource.subscriber?.email_address;
  const payerId = resource.subscriber?.payer_id;
  
  if (!payerEmail) {
    console.error('No payer email in subscription data');
    return;
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: payerEmail }
    });

    if (!user) {
      console.error(`User not found with email: ${payerEmail}`);
      // You might want to create a user record here or log this for manual intervention
      return;
    }

    // Determine plan type from plan ID or description
    let planType = 'pro';
    const planId = resource.plan_id;
    if (planId.includes('premium') || resource.description?.toLowerCase().includes('premium')) {
      planType = 'premium';
    }

    // Create or update subscription record
    const subscription = await prisma.payPalSubscription.upsert({
      where: { subscriptionId },
      update: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      create: {
        subscriptionId,
        planId: resource.plan_id,
        planType,
        status: 'ACTIVE',
        userId: user.id,
        startTime: new Date(resource.start_time || new Date()),
        nextBillingTime: resource.billing_info?.next_billing_time 
          ? new Date(resource.billing_info.next_billing_time)
          : null,
      },
    });

    // Update user subscription info
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 1 month from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        subscriptionStart: new Date(),
        subscriptionEnd,
        paypalCustomerId: payerId,
      }
    });

    console.log(`✅ User ${user.email} subscription activated: ${planType}`);
    
  } catch (error) {
    console.error('Error handling subscription activation:', error);
  }
}

async function handleSubscriptionCancelled(subscriptionId: string) {
  try {
    // Update subscription status
    await prisma.payPalSubscription.update({
      where: { subscriptionId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      }
    });

    // Find subscription to get user ID
    const subscription = await prisma.payPalSubscription.findUnique({
      where: { subscriptionId },
      select: { userId: true }
    });

    if (subscription) {
      // Update user subscription info
      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          subscriptionStatus: 'cancelled',
          subscriptionEnd: new Date(),
        }
      });
    }
    
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handleSubscriptionSuspended(subscriptionId: string) {
  try {
    await prisma.payPalSubscription.update({
      where: { subscriptionId },
      data: {
        status: 'SUSPENDED',
        updatedAt: new Date(),
      }
    });
  } catch (error) {
    console.error('Error handling subscription suspension:', error);
  }
}

async function handleSubscriptionExpired(subscriptionId: string) {
  try {
    await prisma.payPalSubscription.update({
      where: { subscriptionId },
      data: {
        status: 'EXPIRED',
        updatedAt: new Date(),
      }
    });

    const subscription = await prisma.payPalSubscription.findUnique({
      where: { subscriptionId },
      select: { userId: true }
    });

    if (subscription) {
      await prisma.user.update({
        where: { id: subscription.userId },
        data: {
          subscriptionStatus: 'expired',
          subscriptionPlan: null,
          subscriptionEnd: new Date(),
        }
      });
    }
    
  } catch (error) {
    console.error('Error handling subscription expiration:', error);
  }
}

async function handlePaymentFailed(subscriptionId: string) {
  try {
    await prisma.payPalSubscription.update({
      where: { subscriptionId },
      data: {
        status: 'SUSPENDED',
        updatedAt: new Date(),
      }
    });
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentCompleted(resource: any) {
  const subscriptionId = resource.id;
  
  try {
    // Update next billing time
    if (resource.billing_info?.next_billing_time) {
      await prisma.payPalSubscription.update({
        where: { subscriptionId },
        data: {
          nextBillingTime: new Date(resource.billing_info.next_billing_time),
          status: 'ACTIVE',
          updatedAt: new Date(),
        }
      });

      // Update user subscription end date
      const subscription = await prisma.payPalSubscription.findUnique({
        where: { subscriptionId },
        select: { userId: true }
      });

      if (subscription) {
        const newEndDate = new Date(resource.billing_info.next_billing_time);
        await prisma.user.update({
          where: { id: subscription.userId },
          data: {
            subscriptionEnd: newEndDate,
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error handling payment completion:', error);
  }
}