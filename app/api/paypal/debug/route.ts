import { NextRequest, NextResponse } from "next/server";

const base = "https://api-m.sandbox.paypal.com";

export async function GET() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: "development",
    
    // Environment variables check
    envCheck: {
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID 
        ? `✓ Set (${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID.substring(0, 10)}...)` 
        : "✗ MISSING - Add to .env.local",
      PAYPAL_SECRET_ID: process.env.PAYPAL_SECRET_ID 
        ? "✓ Set" 
        : "✗ MISSING - Add to .env.local",
      PAYPAL_PRO_PLAN_ID: process.env.PAYPAL_PRO_PLAN_ID 
        ? `✓ Set: ${process.env.PAYPAL_PRO_PLAN_ID}` 
        : "✗ MISSING - Add to .env.local",
      PAYPAL_PREMIUM_PLAN_ID: process.env.PAYPAL_PREMIUM_PLAN_ID 
        ? `✓ Set: ${process.env.PAYPAL_PREMIUM_PLAN_ID}` 
        : "✗ MISSING - Add to .env.local",
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL 
        ? `✓ Set: ${process.env.NEXT_PUBLIC_BASE_URL}` 
        : "✗ MISSING - Will use localhost:3000",
      NODE_ENV: process.env.NODE_ENV || "not set",
    },
    
    // Test results
    authTest: null,
    planTests: [],
    allPlans: [],
  };

  try {
    console.log("=== PAYPAL DEBUG START ===");
    
    // Test 1: Check if we have credentials
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET_ID;
    
    if (!clientId || !secret) {
      throw new Error("Missing PayPal credentials in .env.local file");
    }
    
    console.log("Credentials found, testing authentication...");
    
    // Test 2: Get access token
    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
    
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    
    debugInfo.authTest = {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      success: tokenRes.ok,
    };
    
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      debugInfo.authTest.error = errorText;
      throw new Error(`Authentication failed with status ${tokenRes.status}`);
    }
    
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    debugInfo.authTest.tokenObtained = true;
    console.log("✅ Authentication successful");
    
    // Test 3: Check each plan ID
    const plansToCheck = [
      { name: "Pro Plan", id: process.env.PAYPAL_PRO_PLAN_ID },
      { name: "Premium Plan", id: process.env.PAYPAL_PREMIUM_PLAN_ID },
    ];
    
    console.log("Checking plan IDs...");
    
    for (const plan of plansToCheck) {
      if (!plan.id) {
        debugInfo.planTests.push({
          name: plan.name,
          id: "NOT SET",
          error: "Plan ID not configured in .env.local",
        });
        continue;
      }
      
      try {
        console.log(`Checking ${plan.name}: ${plan.id}`);
        const planRes = await fetch(`${base}/v1/billing/plans/${plan.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        
        const planData = planRes.ok ? await planRes.json() : await planRes.text();
        
        debugInfo.planTests.push({
          name: plan.name,
          id: plan.id,
          status: planRes.status,
          exists: planRes.ok,
          data: planRes.ok ? {
            id: planData.id,
            name: planData.name,
            status: planData.status,
            product_id: planData.product_id,
          } : planData,
        });
        
        if (planRes.ok) {
          console.log(`✅ ${plan.name}: ${planData.status}`);
        } else {
          console.log(`❌ ${plan.name}: Not found`);
        }
        
      } catch (error: any) {
        debugInfo.planTests.push({
          name: plan.name,
          id: plan.id,
          error: error.message,
        });
        console.log(`❌ ${plan.name}: Error - ${error.message}`);
      }
    }
    
    // Test 4: List all available plans
    try {
      console.log("Fetching all available plans...");
      const allPlansRes = await fetch(`${base}/v1/billing/plans?page_size=20&total_required=true`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      if (allPlansRes.ok) {
        const allPlansData = await allPlansRes.json();
        debugInfo.allPlans = allPlansData.plans?.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          status: plan.status,
          product_id: plan.product_id,
        })) || [];
        
        console.log(`Found ${debugInfo.allPlans.length} total plans`);
      }
    } catch (error) {
      console.log("Could not fetch all plans:", error);
    }
    
    debugInfo.success = true;
    debugInfo.summary = {
      auth: debugInfo.authTest.success ? "✅ Working" : "❌ Failed",
      proPlan: debugInfo.planTests.find((p: any) => p.name === "Pro Plan")?.exists ? "✅ Found" : "❌ Missing",
      premiumPlan: debugInfo.planTests.find((p: any) => p.name === "Premium Plan")?.exists ? "✅ Found" : "❌ Missing",
    };
    
    console.log("=== PAYPAL DEBUG END ===");
    
  } catch (error: any) {
    debugInfo.success = false;
    debugInfo.error = error.message;
    debugInfo.errorStack = error.stack;
    
    console.error("=== PAYPAL DEBUG ERROR ===");
    console.error(error.message);
    console.error("=== END ERROR ===");
  }
  
  return NextResponse.json(debugInfo, {
    status: debugInfo.success ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}