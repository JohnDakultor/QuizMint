import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { getPayMongoAuthHeader, getPayMongoBase } from "@/lib/paymongo";

function getPlanAmountPhpCentavos(planType: "pro" | "premium") {
  const pro = Number(process.env.GCASH_PRO_PHP || "299");
  const premium = Number(process.env.GCASH_PREMIUM_PHP || "899");
  const php = planType === "pro" ? pro : premium;
  return Math.max(1, Math.round(php * 100));
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!user) return apiError(404, "User not found", requestId);

    const body = await req.json();
    const planType = body?.planType as "pro" | "premium";
    if (planType !== "pro" && planType !== "premium") {
      return apiError(400, "Valid planType is required", requestId);
    }

    const amount = getPlanAmountPhpCentavos(planType);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.quizmintai.com";

    const payload = {
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `QuizMintAI ${planType.toUpperCase()} (GCash)`,
          line_items: [
            {
              currency: "PHP",
              amount,
              name: `QuizMintAI ${planType.toUpperCase()} Monthly Access`,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash"],
          success_url: `${baseUrl}/success/gcash?planType=${planType}`,
          cancel_url: `${baseUrl}/subscription`,
          metadata: {
            userId: user.id,
            email: user.email,
            planType,
          },
        },
      },
    };

    const res = await fetch(`${getPayMongoBase()}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: getPayMongoAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        json?.errors?.[0]?.detail || json?.errors?.[0]?.code || "Failed to create GCash checkout";
      return apiError(502, msg, requestId);
    }

    const checkoutId = json?.data?.id as string;
    const checkoutUrl = json?.data?.attributes?.checkout_url as string;
    if (!checkoutId || !checkoutUrl) {
      return apiError(500, "Invalid GCash checkout response", requestId);
    }

    await prisma.gCashPayment.upsert({
      where: { checkoutId },
      update: {
        status: "pending",
        planType,
        amount,
        metadata: payload.data.attributes.metadata,
      },
      create: {
        checkoutId,
        planType,
        amount,
        status: "pending",
        userId: user.id,
        metadata: payload.data.attributes.metadata,
      },
    });

    return NextResponse.json(
      { checkoutId, checkoutUrl, requestId },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "gcash/checkout", err);
    return apiError(500, "Failed to start GCash checkout", requestId);
  }
}
