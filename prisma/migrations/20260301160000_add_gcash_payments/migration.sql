CREATE TABLE "public"."GCashPayment" (
  "id" TEXT NOT NULL,
  "checkoutId" TEXT NOT NULL,
  "paymentId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "planType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "metadata" JSONB,
  "paidAt" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GCashPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GCashPayment_checkoutId_key" ON "public"."GCashPayment"("checkoutId");
CREATE INDEX "GCashPayment_userId_createdAt_idx" ON "public"."GCashPayment"("userId", "createdAt");
CREATE INDEX "GCashPayment_status_createdAt_idx" ON "public"."GCashPayment"("status", "createdAt");

ALTER TABLE "public"."GCashPayment"
ADD CONSTRAINT "GCashPayment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
