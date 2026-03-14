-- Add subscription fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPaymentAmount" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPaymentId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPaymentDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- Add credit columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditsAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- stripeCustomerId unique index
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateEnum PartnerTier (if not exists)
DO $$ BEGIN
  CREATE TYPE "PartnerTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add tier columns to PartnershipApplication
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "tier" "PartnerTier" NOT NULL DEFAULT 'BRONZE';
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "tierUpgradedAt" TIMESTAMP(3);
-- Payout details on PartnershipApplication
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "payoutVpa" TEXT;
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "payoutAccountNumber" TEXT;
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "payoutIfsc" TEXT;
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "payoutBeneficiaryName" TEXT;
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT;
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "razorpayContactId" TEXT;
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "razorpayFundAccountId" TEXT;

-- CreateTable: Payment
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "plan" TEXT NOT NULL,
    "affiliateCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_userId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AffiliateCommission
CREATE TABLE IF NOT EXISTS "AffiliateCommission" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "affiliateCode" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateCommission_paymentId_key" ON "AffiliateCommission"("paymentId");
CREATE INDEX IF NOT EXISTS "AffiliateCommission_affiliateCode_idx" ON "AffiliateCommission"("affiliateCode");
CREATE INDEX IF NOT EXISTS "AffiliateCommission_partnershipId_idx" ON "AffiliateCommission"("partnershipId");
CREATE INDEX IF NOT EXISTS "AffiliateCommission_status_idx" ON "AffiliateCommission"("status");
CREATE INDEX IF NOT EXISTS "AffiliateCommission_eligibleAt_idx" ON "AffiliateCommission"("eligibleAt");
CREATE INDEX IF NOT EXISTS "AffiliateCommission_createdAt_idx" ON "AffiliateCommission"("createdAt");

ALTER TABLE "AffiliateCommission" DROP CONSTRAINT IF EXISTS "AffiliateCommission_paymentId_fkey";
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AffiliateCommission" DROP CONSTRAINT IF EXISTS "AffiliateCommission_partnershipId_fkey";
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_partnershipId_fkey"
    FOREIGN KEY ("partnershipId") REFERENCES "PartnershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AffiliatePayout
CREATE TABLE IF NOT EXISTS "AffiliatePayout" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payoutMethod" TEXT,
    "razorpayPayoutId" TEXT,
    "razorpayContactId" TEXT,
    "razorpayFundAccountId" TEXT,
    "transactionRef" TEXT,
    "initiatedBy" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliatePayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AffiliatePayout_razorpayPayoutId_key" ON "AffiliatePayout"("razorpayPayoutId");
CREATE INDEX IF NOT EXISTS "AffiliatePayout_partnershipId_idx" ON "AffiliatePayout"("partnershipId");
CREATE INDEX IF NOT EXISTS "AffiliatePayout_status_idx" ON "AffiliatePayout"("status");
CREATE INDEX IF NOT EXISTS "AffiliatePayout_createdAt_idx" ON "AffiliatePayout"("createdAt");

ALTER TABLE "AffiliatePayout" DROP CONSTRAINT IF EXISTS "AffiliatePayout_partnershipId_fkey";
ALTER TABLE "AffiliatePayout" ADD CONSTRAINT "AffiliatePayout_partnershipId_fkey"
    FOREIGN KEY ("partnershipId") REFERENCES "PartnershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add creditsDeducted to GenerationLog
ALTER TABLE "GenerationLog" ADD COLUMN IF NOT EXISTS "creditsDeducted" DOUBLE PRECISION;

-- CreateTable: StipendPayout
CREATE TABLE IF NOT EXISTS "StipendPayout" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "taskId" TEXT,
    "milestoneId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "transactionRef" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "razorpayPayoutId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StipendPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StipendPayout_razorpayPayoutId_key" ON "StipendPayout"("razorpayPayoutId");
CREATE UNIQUE INDEX IF NOT EXISTS "StipendPayout_taskId_fellowId_key" ON "StipendPayout"("taskId", "fellowId");
CREATE UNIQUE INDEX IF NOT EXISTS "StipendPayout_milestoneId_fellowId_key" ON "StipendPayout"("milestoneId", "fellowId");
CREATE INDEX IF NOT EXISTS "StipendPayout_fellowId_idx" ON "StipendPayout"("fellowId");
CREATE INDEX IF NOT EXISTS "StipendPayout_status_idx" ON "StipendPayout"("status");
CREATE INDEX IF NOT EXISTS "StipendPayout_createdAt_idx" ON "StipendPayout"("createdAt");

ALTER TABLE "StipendPayout" DROP CONSTRAINT IF EXISTS "StipendPayout_fellowId_fkey";
ALTER TABLE "StipendPayout" ADD CONSTRAINT "StipendPayout_fellowId_fkey"
    FOREIGN KEY ("fellowId") REFERENCES "InternFellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StipendPayout" DROP CONSTRAINT IF EXISTS "StipendPayout_taskId_fkey";
ALTER TABLE "StipendPayout" ADD CONSTRAINT "StipendPayout_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "InternTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StipendPayout" DROP CONSTRAINT IF EXISTS "StipendPayout_milestoneId_fkey";
ALTER TABLE "StipendPayout" ADD CONSTRAINT "StipendPayout_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "InternMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: InternPaymentDetails
CREATE TABLE IF NOT EXISTS "InternPaymentDetails" (
    "id" TEXT NOT NULL,
    "fellowId" TEXT NOT NULL,
    "upiId" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountHolderName" TEXT,
    "razorpayContactId" TEXT,
    "razorpayFundAcctId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternPaymentDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InternPaymentDetails_fellowId_key" ON "InternPaymentDetails"("fellowId");

ALTER TABLE "InternPaymentDetails" DROP CONSTRAINT IF EXISTS "InternPaymentDetails_fellowId_fkey";
ALTER TABLE "InternPaymentDetails" ADD CONSTRAINT "InternPaymentDetails_fellowId_fkey"
    FOREIGN KEY ("fellowId") REFERENCES "InternFellow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
