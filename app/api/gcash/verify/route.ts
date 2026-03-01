import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { finalizeGcashCheckout } from "@/lib/gcash";

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, subscriptionEnd: true },
    });
    if (!user) return apiError(404, "User not found", requestId);

    const { checkoutId } = await req.json();
    if (!checkoutId) return apiError(400, "checkoutId is required", requestId);

    const finalized = await finalizeGcashCheckout({
      checkoutId,
      expectedUserId: user.id,
      expectedEmail: user.email,
    });

    if (!finalized.ok) {
      return apiError(finalized.status, finalized.error, requestId);
    }

    return NextResponse.json(
      {
        success: true,
        alreadyProcessed: finalized.alreadyProcessed,
        planType: finalized.planType,
        subscriptionEnd: finalized.subscriptionEnd?.toISOString() ?? null,
        requestId,
      },
      { headers: { "x-request-id": requestId, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logApiError(requestId, "gcash/verify", err);
    return apiError(500, "Failed to verify GCash payment", requestId);
  }
}
