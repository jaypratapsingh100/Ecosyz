import { prisma } from '@/src/lib/db';

// ── Types ──────────────────────────────────────────────────────────
export type PartnerTierName = 'BRONZE' | 'SILVER' | 'GOLD';

export interface TierDefinition {
  name: PartnerTierName;
  label: string;
  commissionRate: number;       // decimal: 0.05, 0.07, 0.10
  commissionPercent: number;    // display: 5, 7, 10
  minReferrals: number;
  color: string;
  bgColor: string;
  icon: string;
}

// ── Tier Definitions (ordered Bronze → Gold) ──────────────────────
export const PARTNER_TIERS: Record<PartnerTierName, TierDefinition> = {
  BRONZE: {
    name: 'BRONZE',
    label: 'Bronze',
    commissionRate: 0.05,
    commissionPercent: 5,
    minReferrals: 0,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/20',
    icon: '🥉',
  },
  SILVER: {
    name: 'SILVER',
    label: 'Silver',
    commissionRate: 0.07,
    commissionPercent: 7,
    minReferrals: 10,
    color: 'text-slate-300',
    bgColor: 'bg-slate-400/20',
    icon: '🥈',
  },
  GOLD: {
    name: 'GOLD',
    label: 'Gold',
    commissionRate: 0.10,
    commissionPercent: 10,
    minReferrals: 25,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: '🥇',
  },
};

export const TIER_ORDER: PartnerTierName[] = ['BRONZE', 'SILVER', 'GOLD'];

export function getTierDefinition(tier: PartnerTierName): TierDefinition {
  return PARTNER_TIERS[tier] || PARTNER_TIERS.BRONZE;
}

export function getCommissionRate(tier: PartnerTierName): number {
  return PARTNER_TIERS[tier]?.commissionRate ?? 0.05;
}

export function computeTierForReferralCount(referralCount: number): PartnerTierName {
  if (referralCount >= PARTNER_TIERS.GOLD.minReferrals) return 'GOLD';
  if (referralCount >= PARTNER_TIERS.SILVER.minReferrals) return 'SILVER';
  return 'BRONZE';
}

export function getNextTier(currentTier: PartnerTierName): TierDefinition | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return PARTNER_TIERS[TIER_ORDER[idx + 1]];
}

export function getTierProgress(
  currentTier: PartnerTierName,
  referralCount: number
): { percent: number; current: number; needed: number } {
  const next = getNextTier(currentTier);
  if (!next) return { percent: 100, current: referralCount, needed: referralCount };

  const currentMin = PARTNER_TIERS[currentTier].minReferrals;
  const nextMin = next.minReferrals;
  const range = nextMin - currentMin;
  const progress = referralCount - currentMin;
  const percent = Math.min(100, Math.round((progress / range) * 100));

  return { percent, current: referralCount, needed: nextMin };
}

/**
 * Check and auto-upgrade a partner's tier based on referral count.
 * Only upgrades, never downgrades. Returns the new tier if upgraded, null otherwise.
 */
export async function checkAndUpgradeTier(partnershipId: string): Promise<PartnerTierName | null> {
  const referralCount = await prisma.affiliateCommission.count({
    where: {
      partnershipId,
      status: { not: 'reversed' },
    },
  });

  const partner = await prisma.partnershipApplication.findUnique({
    where: { id: partnershipId },
    select: { tier: true },
  });

  if (!partner) return null;

  const currentTier = (partner.tier as PartnerTierName) || 'BRONZE';
  const newTier = computeTierForReferralCount(referralCount);

  // Only upgrade, never downgrade
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const newIdx = TIER_ORDER.indexOf(newTier);

  if (newIdx > currentIdx) {
    await prisma.partnershipApplication.update({
      where: { id: partnershipId },
      data: {
        tier: newTier,
        tierUpgradedAt: new Date(),
      },
    });
    return newTier;
  }

  return null;
}
