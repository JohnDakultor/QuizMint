-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "title" TEXT,
    "sourceType" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemanticCache" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanticCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_namespace_idx" ON "Document"("namespace");

-- CreateIndex
CREATE INDEX "Document_sourceUrl_idx" ON "Document"("sourceUrl");

-- CreateIndex
CREATE INDEX "SemanticCache_namespace_idx" ON "SemanticCache"("namespace");
