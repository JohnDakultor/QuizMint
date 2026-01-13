// // app/api/account/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { stripe } from "@/lib/stripe";
// import { authOptions } from "@/lib/auth-option";
// import { getServerSession } from "next-auth";


// // GET: Fetch current user's subscription
// export async function GET(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const user = await prisma.user.findUnique({
//       where: { email: session.user.email },
//       select: {
//         subscriptionPlan: true,
//         subscriptionStatus: true,
//         subscriptionEnd: true,
//         stripeCustomerId: true,
//         aiDifficulty: true,          // FIXED
//         adaptiveLearning: true,      // FIXED
//       },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     return NextResponse.json({ user });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: "Failed to fetch account info" }, { status: 500 });
//   }
// }


// // POST: Cancel current subscription
// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const email = session.user.email;

//     const user = await prisma.user.findUnique({
//       where: { email },
//       select: { stripeCustomerId: true },
//     });

//     if (!user || !user.stripeCustomerId) {
//       return NextResponse.json({ error: "No subscription to cancel" }, { status: 400 });
//     }

//     // Retrieve the customer's subscriptions
//     const subscriptions = await stripe.subscriptions.list({
//       customer: user.stripeCustomerId,
//       status: "active",
//       limit: 1,
//     });

//     if (subscriptions.data.length === 0) {
//       return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
//     }

//     const subscriptionId = subscriptions.data[0].id;

//     // Cancel the subscription
//     await stripe.subscriptions.cancel(subscriptionId);

//     // Update database
//     await prisma.user.update({
//       where: { email },
//       data: { subscriptionStatus: "cancelled", subscriptionEnd: new Date(), subscriptionPlan: "free", quizUsage: 0, aiDifficulty: "easy", adaptiveLearning: false },
//     });

//     return NextResponse.json({ message: "Subscription cancelled" });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message || "Failed to cancel subscription" }, { status: 500 });
//   }
// }


// export async function POST_AI_DIFFICULTY(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.email) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//    const userId = session.user.id;
//    const { difficulty } = await req.json();

//    if (userId === "string"){
//     const numericId = parseInt(userId, 10);
//     await prisma.user.update({
//       where: { id: numericId },
//       data: { aiDifficulty: difficulty },
//     });
//   } else {
//     await prisma.user.update({
//       where: { email: userId },
//       data: { aiDifficulty: difficulty },
//     });
//   }

//     return NextResponse.json({ message: "AI difficulty updated" });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message || "Failed to update AI difficulty" }, { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";

// Helper function for PayPal cancellation
async function cancelPayPalSubscription(subscriptionId: string) {
  const base = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'production' 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET_ID!;
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  // Get access token
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Cancel the subscription
  const cancelRes = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "Cancelled by user via account page"
    }),
  });

  return cancelRes.ok;
}

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
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        stripeCustomerId: true,
        paypalCustomerId: true, // Add this
        aiDifficulty: true,
        adaptiveLearning: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get PayPal subscriptions if they exist
    const paypalSubscriptions = await prisma.payPalSubscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      user,
      paypalSubscriptions,
      subscriptionType: paypalSubscriptions.length > 0 ? 'paypal' : 
                       user.stripeCustomerId ? 'stripe' : 'none'
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch account info" }, { status: 500 });
  }
}

// POST: Cancel current subscription (BOTH Stripe AND PayPal)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true,
        stripeCustomerId: true,
        subscriptionPlan: true,
        subscriptionStatus: true 
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for PayPal subscriptions first
    const paypalSubscriptions = await prisma.payPalSubscription.findMany({
      where: { 
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (paypalSubscriptions.length > 0) {
      // Cancel PayPal subscription
      const subscriptionId = paypalSubscriptions[0].subscriptionId;
      const cancelled = await cancelPayPalSubscription(subscriptionId);
      
      if (cancelled) {
        // Update PayPal subscription record
        await prisma.payPalSubscription.update({
          where: { subscriptionId },
          data: { 
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });

        // Update user
        await prisma.user.update({
          where: { email },
          data: { 
            subscriptionStatus: "cancelled", 
            subscriptionEnd: new Date(),
            subscriptionPlan: "free",
            adaptiveLearning: false,
            aiDifficulty: "easy",
            quizUsage: 0
          },
        });

        return NextResponse.json({ 
          message: "PayPal subscription cancelled successfully",
          note: "You will retain access until the end of your current billing period"
        });
      } else {
        return NextResponse.json({ 
          error: "Failed to cancel PayPal subscription" 
        }, { status: 500 });
      }
    }
    
    // If no PayPal, check for Stripe
    else if (user.stripeCustomerId) {
      // Your existing Stripe cancellation logic
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
      }

      const subscriptionId = subscriptions.data[0].id;
      await stripe.subscriptions.cancel(subscriptionId);

      // Update database
      await prisma.user.update({
        where: { email },
        data: { 
          subscriptionStatus: "cancelled", 
          subscriptionEnd: new Date(),
          subscriptionPlan: "free", 
          quizUsage: 0, 
          aiDifficulty: "easy", 
          adaptiveLearning: false 
        },
      });

      return NextResponse.json({ message: "Stripe subscription cancelled" });
    } 
    
    else {
      return NextResponse.json({ 
        error: "No active subscription found to cancel" 
      }, { status: 400 });
    }

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ 
      error: err.message || "Failed to cancel subscription" 
    }, { status: 500 });
  }
}