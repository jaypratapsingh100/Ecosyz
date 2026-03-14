import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTierDefinition, getNextTier, getTierProgress, type PartnerTierName } from '@/lib/payments/partner-tiers';

/**
 * GET: Return the partner's own commissions, payouts, and balance
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partner = await prisma.partnershipApplication.findFirst({
      where: { email: user.email.toLowerCase(), status: 'approved' },
      select: { id: true, affiliateCode: true, name: true, tier: true },
    });

    if (!partner) {
      return NextResponse.json({ error: 'No approved partnership found' }, { status: 404 });
    }

    const now = new Date();

    const [commissions, payouts] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where: { partnershipId: partner.id },
        orderBy: { createdAt: 'desc' },
        include: {
          payment: { select: { amount: true, currency: true, createdAt: true, plan: true } },
        },
      }),
      prisma.affiliatePayout.findMany({
        where: { partnershipId: partner.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate balances
    const pendingCommissions = commissions.filter((c) => c.status === 'pending');
    const eligibleBalance = pendingCommissions
      .filter((c) => c.eligibleAt <= now)
      .reduce((sum, c) => sum + c.amount, 0);
    const holdingBalance = pendingCommissions
      .filter((c) => c.eligibleAt > now)
      .reduce((sum, c) => sum + c.amount, 0);
    const totalEarned = commissions
      .filter((c) => c.status !== 'reversed')
      .reduce((sum, c) => sum + c.amount, 0);
    const totalPaidOut = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    // Compute tier info
    const currentTier = (partner.tier as PartnerTierName) || 'BRONZE';
    const tierDef = getTierDefinition(currentTier);
    const nextTierDef = getNextTier(currentTier);
    const referralCount = commissions.filter((c) => c.status !== 'reversed').length;
    const progress = getTierProgress(currentTier, referralCount);

    return NextResponse.json({
      affiliateCode: partner.affiliateCode,
      stats: {
        totalEarned: parseFloat(totalEarned.toFixed(2)),
        eligibleBalance: parseFloat(eligibleBalance.toFixed(2)),
        holdingBalance: parseFloat(holdingBalance.toFixed(2)),
        totalPaidOut: parseFloat(totalPaidOut.toFixed(2)),
        totalReferrals: referralCount,
        tier: {
          current: currentTier,
          label: tierDef.label,
          commissionPercent: tierDef.commissionPercent,
          icon: tierDef.icon,
          color: tierDef.color,
          bgColor: tierDef.bgColor,
          progress,
          nextTier: nextTierDef
            ? {
                label: nextTierDef.label,
                commissionPercent: nextTierDef.commissionPercent,
                minReferrals: nextTierDef.minReferrals,
              }
            : null,
        },
      },
      commissions: commissions.map((c) => ({
        id: c.id,
        amount: c.amount,
        commissionRate: c.commissionRate,
        currency: c.currency,
        status: c.status,
        eligibleAt: c.eligibleAt,
        createdAt: c.createdAt,
        paymentAmount: c.payment.amount,
        paymentPlan: c.payment.plan,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        payoutMethod: p.payoutMethod,
        transactionRef: p.transactionRef,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching partner commissions:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}
