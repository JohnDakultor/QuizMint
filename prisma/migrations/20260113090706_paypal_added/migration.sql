-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paypalCustomerId" TEXT;

-- CreateTable
CREATE TABLE "paypal_subscriptions" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "nextBillingTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paypal_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paypal_subscriptions_subscriptionId_key" ON "paypal_subscriptions"("subscriptionId");

-- CreateIndex
CREATE INDEX "paypal_subscriptions_userId_idx" ON "paypal_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "paypal_subscriptions_status_idx" ON "paypal_subscriptions"("status");

-- CreateIndex
CREATE INDEX "paypal_subscriptions_subscriptionId_idx" ON "paypal_subscriptions"("subscriptionId");

-- AddForeignKey
ALTER TABLE "paypal_subscriptions" ADD CONSTRAINT "paypal_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
