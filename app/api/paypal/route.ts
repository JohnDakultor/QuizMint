// import { NextRequest, NextResponse } from "next/server";

// const base = "https://api-m.sandbox.paypal.com";

// async function getAccessToken() {
//   const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
//   const secret = process.env.NEXT_PUBLIC_PAYPAL_SECRET_ID!;
//   const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

//   const res = await fetch(`${base}/v1/oauth2/token`, {
//     method: "POST",
//     headers: {
//       Authorization: `Basic ${auth}`,
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body: "grant_type=client_credentials",
//   });
//   const data = await res.json();
//   return data.access_token;
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { planId } = await req.json();
//     if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

//     // Map friendly plan names to actual PayPal plan IDs
//     const PLAN_IDS: Record<string, string> = {
//       pro: process.env.PAYPAL_PRO_PLAN_ID!,
//       premium: process.env.PAYPAL_PREMIUM_PLAN_ID!,
//     };

//     const accessToken = await getAccessToken();

//     const createRes = await fetch(`${base}/v1/billing/subscriptions`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${accessToken}`,
//       },
//       body: JSON.stringify({
//         plan_id: PLAN_IDS[planId],
//         application_context: {
//           brand_name: "MyApp",
//           locale: "en-US",
//           user_action: "SUBSCRIBE_NOW",
//           return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
//           cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
//         },
//       }),
//     });

//     const result = await createRes.json();
//     return NextResponse.json({ id: result.id }); // only return subscription ID
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }



// import { NextRequest, NextResponse } from "next/server";

// const base = "https://api-m.sandbox.paypal.com";

// async function getAccessToken() {
//   const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
//   const secret = process.env.PAYPAL_SECRET_ID!; // Remove "NEXT_PUBLIC_" from secret
//   const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

//   const res = await fetch(`${base}/v1/oauth2/token`, {
//     method: "POST",
//     headers: {
//       Authorization: `Basic ${auth}`,
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body: "grant_type=client_credentials",
//   });
//   const data = await res.json();
//   return data.access_token;
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { planId } = await req.json();
//     if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

//     // Map friendly plan names to actual PayPal plan IDs
//     const PLAN_IDS: Record<string, string> = {
//       pro: process.env.PAYPAL_PRO_PLAN_ID!,
//       premium: process.env.PAYPAL_PREMIUM_PLAN_ID!,
//     };

//     const actualPlanId = PLAN_IDS[planId];
//     if (!actualPlanId) {
//       return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
//     }

//     const accessToken = await getAccessToken();

//     const createRes = await fetch(`${base}/v1/billing/subscriptions`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${accessToken}`,
//         "PayPal-Request-Id": `subscription-${Date.now()}`,
//       },
//       body: JSON.stringify({
//         plan_id: actualPlanId,
//         application_context: {
//           brand_name: "MyApp",
//           locale: "en-US",
//           shipping_preference: "NO_SHIPPING",
//           user_action: "SUBSCRIBE_NOW",
//           payment_method: {
//             payer_selected: "PAYPAL",
//             payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
//           },
//           return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
//           cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
//         },
//       }),
//     });

//     if (!createRes.ok) {
//       const errorText = await createRes.text();
//       console.error("PayPal API error:", errorText);
//       throw new Error(`PayPal API error: ${createRes.status}`);
//     }

//     const result = await createRes.json();
    
//     // Return the full subscription object including approval link
//     return NextResponse.json({
//       subscriptionId: result.id,
//       approvalLink: result.links?.find((link: any) => link.rel === "approve")?.href
//     });
//   } catch (err: any) {
//     console.error("PayPal subscription error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const base = "https://api-m.sandbox.paypal.com";

// Cache for product and plan IDs to avoid recreating them every time
const productCache = new Map<string, string>();
const planCache = new Map<string, string>();

async function getAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET_ID;
  
  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured in .env.local");
  }
  
  console.log("🔑 Getting access token...");
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Failed to get access token:", {
      status: res.status,
      error: errorText
    });
    throw new Error(`Authentication failed: ${res.status}`);
  }
  
  const data = await res.json();
  console.log("✅ Access token obtained");
  return data.access_token;
}

// Create a product if it doesn't exist
async function createProduct(accessToken: string, productName: string, description: string): Promise<string> {
  const cacheKey = `product:${productName}`;
  if (productCache.has(cacheKey)) {
    console.log(`📦 Using cached product: ${productName}`);
    return productCache.get(cacheKey)!;
  }

  console.log(`📦 Attempting to create product: "${productName}"`);
  
  try {
    // First, try to list existing products to avoid duplicates
    console.log("🔍 Checking for existing products...");
    const productsRes = await fetch(`${base}/v1/catalogs/products`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (productsRes.ok) {
      const productsData = await productsRes.json();
      const existingProduct = productsData.products?.find((p: any) => 
        p.name === productName || p.description?.includes(productName)
      );
      
      if (existingProduct) {
        console.log(`✅ Found existing product: ${existingProduct.name} (ID: ${existingProduct.id})`);
        productCache.set(cacheKey, existingProduct.id);
        return existingProduct.id;
      }
    }

    // If no existing product, create a new one
    console.log(`🔄 Creating new product: "${productName}"`);
    
    const productBody = {
      name: productName,
      description: description,
      type: "SERVICE",
      category: "SOFTWARE",
      // Remove optional fields that might be causing issues
      // image_url: "https://your-app.com/logo.png",
      // home_url: process.env.NEXT_PUBLIC_BASE_URL || "https://your-app.com"
    };

    console.log("Product creation body:", JSON.stringify(productBody, null, 2));
    
    const productRes = await fetch(`${base}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `product-${Date.now()}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(productBody)
    });

    const responseText = await productRes.text();
    console.log(`Product creation response status: ${productRes.status}`);
    
    if (!productRes.ok) {
      console.error(`❌ Failed to create product "${productName}":`, responseText);
      
      // Try a simpler product creation without optional fields
      console.log("🔄 Attempting simpler product creation...");
      const simpleProductBody = {
        name: productName,
        description: description,
        type: "SERVICE",
        category: "SOFTWARE"
      };
      
      const simpleProductRes = await fetch(`${base}/v1/catalogs/products`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simpleProductBody)
      });
      
      const simpleResponseText = await simpleProductRes.text();
      
      if (!simpleProductRes.ok) {
        console.error(`❌ Simple product creation also failed:`, simpleResponseText);
        throw new Error(`Failed to create product "${productName}": ${simpleProductRes.status} - ${simpleResponseText}`);
      }
      
      const simpleProductData = JSON.parse(simpleResponseText);
      productCache.set(cacheKey, simpleProductData.id);
      console.log(`✅ Created product with simple method: ${productName} (ID: ${simpleProductData.id})`);
      return simpleProductData.id;
    }

    const productData = JSON.parse(responseText);
    productCache.set(cacheKey, productData.id);
    console.log(`✅ Created product: ${productName} (ID: ${productData.id})`);
    return productData.id;
    
  } catch (error: any) {
    console.error(`❌ Error creating product "${productName}":`, error.message);
    // Try one more time with absolute minimum fields
    console.log("🔄 Last attempt with minimum fields...");
    
    try {
      const minimalProductBody = {
        name: productName,
        type: "SERVICE"
      };
      
      const minimalRes = await fetch(`${base}/v1/catalogs/products`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(minimalProductBody)
      });
      
      if (minimalRes.ok) {
        const minimalData = await minimalRes.json();
        console.log(`✅ Created product with minimal fields: ${productName} (ID: ${minimalData.id})`);
        return minimalData.id;
      }
    } catch (finalError) {
      console.error("Final attempt failed:", finalError);
    }
    
    throw error;
  }
}

// Create a billing plan for a product
async function createPlan(
  accessToken: string, 
  productId: string, 
  planName: string, 
  price: string,
  description: string
): Promise<string> {
  const cacheKey = `plan:${planName}:${price}`;
  if (planCache.has(cacheKey)) {
    console.log(`📋 Using cached plan: ${planName}`);
    return planCache.get(cacheKey)!;
  }

  console.log(`📋 Creating plan: "${planName}" for product ID: ${productId}`);
  
  try {
    // First check if plan already exists
    const plansRes = await fetch(`${base}/v1/billing/plans?product_id=${productId}&page_size=20`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (plansRes.ok) {
      const plansData = await plansRes.json();
      const existingPlan = plansData.plans?.find((p: any) => 
        p.name === planName || p.description?.includes(planName)
      );
      
      if (existingPlan) {
        console.log(`✅ Found existing plan: ${existingPlan.name} (ID: ${existingPlan.id})`);
        
        // Ensure the plan is active
        if (existingPlan.status !== "ACTIVE") {
          console.log(`🔄 Activating plan: ${existingPlan.id}`);
          await fetch(`${base}/v1/billing/plans/${existingPlan.id}/activate`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            }
          });
        }
        
        planCache.set(cacheKey, existingPlan.id);
        return existingPlan.id;
      }
    }

    // Create new plan
    const planBody = {
      product_id: productId,
      name: planName,
      description: description,
      billing_cycles: [{
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: price,
            currency_code: "USD"
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "0",
          currency_code: "USD"
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
        allowed_payment_method: "INSTANT_FUNDING_SOURCE",
      }
      // Remove optional taxes field
    };

    console.log("Plan creation body:", JSON.stringify(planBody, null, 2));
    
    const planRes = await fetch(`${base}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `plan-${Date.now()}`,
      },
      body: JSON.stringify(planBody)
    });

    const responseText = await planRes.text();
    console.log(`Plan creation response status: ${planRes.status}`);
    
    if (!planRes.ok) {
      console.error(`❌ Failed to create plan "${planName}":`, responseText);
      throw new Error(`Failed to create plan: ${planRes.status} - ${responseText}`);
    }

    const planData = JSON.parse(responseText);
    
    // Activate the plan
    console.log(`🔄 Activating plan: ${planData.id}`);
    await fetch(`${base}/v1/billing/plans/${planData.id}/activate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      }
    });

    planCache.set(cacheKey, planData.id);
    console.log(`✅ Created and activated plan: ${planName} (ID: ${planData.id})`);
    return planData.id;
    
  } catch (error: any) {
    console.error(`❌ Error creating plan "${planName}":`, error.message);
    throw error;
  }
}

// Main endpoint to create subscription
export async function POST(req: NextRequest) {
  console.log("=== PAYPAL SUBSCRIPTION REQUEST START ===");
  
  try {
    const { planType } = await req.json();
    
    if (!planType || !["pro", "premium"].includes(planType)) {
      return NextResponse.json({ 
        error: "Valid planType required", 
        validValues: ["pro", "premium"] 
      }, { status: 400 });
    }

    console.log(`🚀 Starting subscription flow for: ${planType}`);
    console.log(`💰 Price: $${planType === 'premium' ? '15.00' : '5.00'}/month`);

    // Get access token
    const accessToken = await getAccessToken();

    // Define plan configurations - FIXED to ensure correct detection
    const planConfigs = {
      pro: {
        productName: "Quiz Mint AI Pro",
        productDescription: "Professional subscription for Quiz Mint AI - $5/month",
        planName: "Quiz Mint AI Pro Monthly",
        planDescription: "Monthly Pro subscription for Quiz Mint AI - $5/month",
        price: "5.00"
      },
      premium: {
        productName: "Quiz Mint AI Premium",
        productDescription: "Premium subscription for Quiz Mint AI - $15/month",
        planName: "Quiz Mint AI Premium Monthly",
        planDescription: "Monthly Premium subscription for Quiz Mint AI - $15/month",
        price: "15.00"
      }
    };

    const config = planConfigs[planType as keyof typeof planConfigs];

    // Step 1: Create or get product
    console.log(`\n📦 Step 1: Creating/Getting product: ${config.productName}`);
    const productId = await createProduct(accessToken, config.productName, config.productDescription);

    // Step 2: Create or get plan
    console.log(`\n📋 Step 2: Creating/Getting plan: ${config.planName}`);
    const planId = await createPlan(accessToken, productId, config.planName, config.price, config.planDescription);

    // Step 3: Create subscription
    console.log(`\n🔄 Step 3: Creating subscription`);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://quizmintai.com";
    
    const subscriptionBody = {
      plan_id: planId,
      application_context: {
        brand_name: "Quiz Mint AI",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: `${baseUrl}/success/paypal?planType=${planType}`, // ADD planType to URL
        cancel_url: `${baseUrl}/cancel`,
      },
    };

    console.log("Subscription request body:", JSON.stringify(subscriptionBody, null, 2));
    
    const subscriptionRes = await fetch(`${base}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "PayPal-Request-Id": `sub-${Date.now()}`,
      },
      body: JSON.stringify(subscriptionBody),
    });

    const responseText = await subscriptionRes.text();
    console.log(`📥 PayPal Response Status: ${subscriptionRes.status}`);
    console.log("Response:", responseText.substring(0, 500));

    if (!subscriptionRes.ok) {
      console.error("❌ Subscription creation failed");
      let errorMessage = `Subscription creation failed: ${subscriptionRes.status}`;
      
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) errorMessage = errorData.message;
        if (errorData.details) errorMessage += ` - ${JSON.stringify(errorData.details)}`;
      } catch (e) {
        errorMessage += ` - ${responseText.substring(0, 200)}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    
    // Find approval link
    const approvalLink = result.links?.find((link: any) => link.rel === "approve")?.href;
    
    // IMPORTANT: Store the subscription immediately with the correct planType
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });

      if (user) {
        // Store subscription in database immediately
        await prisma.payPalSubscription.upsert({
          where: { subscriptionId: result.id },
          update: {
            planId: planId,
            planType: planType,
            status: result.status,
            updatedAt: new Date(),
          },
          create: {
            subscriptionId: result.id,
            planId: planId,
            planType: planType, // STORE THE CORRECT PLAN TYPE
            status: result.status,
            userId: user.id,
            startTime: new Date(result.create_time || new Date()),
            nextBillingTime: result.billing_info?.next_billing_time 
              ? new Date(result.billing_info.next_billing_time)
              : null,
          },
        });

        console.log(`📝 Subscription stored in database with planType: ${planType}`);
      }
    }

    if (!approvalLink) {
      console.warn("⚠️ No approval link found in response");
      return NextResponse.json({
        subscriptionId: result.id,
        status: result.status,
        warning: "No approval link found",
        links: result.links,
        planType: planType,
      });
    }

    console.log(`\n✅ SUCCESS! ${planType.toUpperCase()} subscription created!`);
    console.log(`📝 Subscription ID: ${result.id}`);
    console.log(`📋 Plan Type: ${planType}`);
    console.log(`🔗 Approval URL: ${approvalLink}`);
    console.log("=== PAYPAL SUBSCRIPTION REQUEST END ===");

    return NextResponse.json({
      subscriptionId: result.id,
      approvalLink: approvalLink,
      status: result.status,
      planId: planId,
      planType: planType, // Return planType
    });

  } catch (err: any) {
    console.error("\n💥 PAYPAL SUBSCRIPTION ERROR:");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack?.split('\n')[0]);
    console.log("=== PAYPAL SUBSCRIPTION REQUEST END ===");
    
    return NextResponse.json({ 
      error: "Failed to create subscription",
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }, { status: 500 });
  }
}

// Helper endpoint to list existing products and plans
export async function GET() {
  try {
    console.log("📊 Listing PayPal resources...");
    const accessToken = await getAccessToken();
    
    // Get all products
    const productsRes = await fetch(`${base}/v1/catalogs/products`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Get all plans
    const plansRes = await fetch(`${base}/v1/billing/plans?page_size=50`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const products = productsRes.ok ? await productsRes.json() : { products: [] };
    const plans = plansRes.ok ? await plansRes.json() : { plans: [] };

    console.log(`📦 Found ${products.products?.length || 0} products`);
    console.log(`📋 Found ${plans.plans?.length || 0} plans`);

    return NextResponse.json({
      success: true,
      products: products.products || [],
      plans: plans.plans || [],
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts: products.products?.length || 0,
        totalPlans: plans.plans?.length || 0,
      }
    });

  } catch (err: any) {
    console.error("Error listing products/plans:", err);
    return NextResponse.json({ 
      error: "Failed to list resources",
      message: err.message 
    }, { status: 500 });
  }
}