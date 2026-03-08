-- AlterTable: Add affiliateCode to PartnershipApplication
ALTER TABLE "PartnershipApplication" ADD COLUMN IF NOT EXISTS "affiliateCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PartnershipApplication_affiliateCode_key" ON "PartnershipApplication"("affiliateCode");

-- AlterTable: Add referredByAffiliateCode to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByAffiliateCode" TEXT;
