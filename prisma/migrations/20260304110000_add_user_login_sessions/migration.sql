-- CreateTable
CREATE TABLE "public"."UserLoginSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserLoginSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLoginSession_sessionId_key" ON "public"."UserLoginSession"("sessionId");

-- CreateIndex
CREATE INDEX "UserLoginSession_userId_lastSeenAt_idx" ON "public"."UserLoginSession"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "UserLoginSession_userId_revokedAt_idx" ON "public"."UserLoginSession"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "public"."UserLoginSession" ADD CONSTRAINT "UserLoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
