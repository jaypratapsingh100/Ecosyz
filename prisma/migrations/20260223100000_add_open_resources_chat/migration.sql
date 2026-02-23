-- CreateTable
CREATE TABLE "OpenResourcesChat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenResourcesChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpenResourcesChat_sessionId_searchQuery_key" ON "OpenResourcesChat"("sessionId", "searchQuery");

-- CreateIndex
CREATE INDEX "OpenResourcesChat_sessionId_updatedAt_idx" ON "OpenResourcesChat"("sessionId", "updatedAt");
