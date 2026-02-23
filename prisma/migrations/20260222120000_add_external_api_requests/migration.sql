-- CreateTable
CREATE TABLE "ExternalApiRequest" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalApiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalApiRequest_provider_requestedAt_idx" ON "ExternalApiRequest"("provider", "requestedAt");

-- CreateIndex
CREATE INDEX "ExternalApiRequest_category_requestedAt_idx" ON "ExternalApiRequest"("category", "requestedAt");
