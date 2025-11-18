import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Invalid Stripe signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const getCustomer = async (subscription: Stripe.Subscription) => {
      const customerResponse = await stripe.customers.retrieve(subscription.customer as string);
      const customer = customerResponse as Stripe.Customer;
      if (!customer.email) throw new Error("Customer email not found");
      return { email: customer.email, stripeCustomerId: customer.id };
    };

    // Handle subscription created/updated
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const { email, stripeCustomerId } = await getCustomer(subscription);

      const plan =
        subscription.items.data[0].price.id === process.env.STRIPE_PREMIUM_PRICE_ID
          ? "premium"
          : "pro";

      const updateData: any = {
        subscriptionPlan: plan,
        subscriptionStatus: subscription.status,
        stripeCustomerId,
      };

      if (subscription.created) updateData.subscriptionStart = new Date(subscription.created * 1000);

      // Set subscriptionEnd: use Stripe current_period_end if available, otherwise calculate 1 month ahead
      let subscriptionEnd: Date | null = null;
      if ((subscription as any).current_period_end) {
        const end = new Date((subscription as any).current_period_end * 1000);
        if (!isNaN(end.getTime())) subscriptionEnd = end;
      } else if (updateData.subscriptionStart) {
        // Default to 1 month after start for monthly subscriptions
        subscriptionEnd = new Date(updateData.subscriptionStart);
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }
      if (subscriptionEnd) updateData.subscriptionEnd = subscriptionEnd;

      await prisma.user.update({
        where: { email },
        data: updateData,
      });
    }

    // Handle subscription deleted
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const { email } = await getCustomer(subscription);

      const updateData: any = { subscriptionStatus: "canceled" };

      let subscriptionEnd: Date | null = null;
      if ((subscription as any).current_period_end) {
        const end = new Date((subscription as any).current_period_end * 1000);
        if (!isNaN(end.getTime())) subscriptionEnd = end;
      } else if (subscription.created) {
        subscriptionEnd = new Date(subscription.created * 1000);
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }
      if (subscriptionEnd) updateData.subscriptionEnd = subscriptionEnd;

      await prisma.user.update({
        where: { email },
        data: updateData,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ Stripe webhook error:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}
