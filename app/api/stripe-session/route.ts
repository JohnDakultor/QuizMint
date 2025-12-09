import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Retrieve line items separately
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
    const plan = lineItems.data[0]?.description || "Premium Plan";

    const amount = session.amount_total
      ? `$${(session.amount_total / 100).toFixed(2)}`
      : undefined;

    return NextResponse.json({ plan, amount });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch session" },
      { status: 500 }
    );
  }
}
