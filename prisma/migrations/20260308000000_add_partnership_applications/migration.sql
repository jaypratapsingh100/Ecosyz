-- CreateTable
CREATE TABLE "PartnershipApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedin" TEXT,
    "coverNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnershipApplication_status_idx" ON "PartnershipApplication"("status");

-- CreateIndex
CREATE INDEX "PartnershipApplication_email_idx" ON "PartnershipApplication"("email");

-- CreateIndex
CREATE INDEX "PartnershipApplication_createdAt_idx" ON "PartnershipApplication"("createdAt");
