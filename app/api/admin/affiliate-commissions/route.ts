import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * GET: Return affiliate commission data with per-partner balances
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();

    // Get all approved partners with their commission stats
    const partners = await prisma.partnershipApplication.findMany({
      where: { status: 'approved', affiliateCode: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        affiliateCode: true,
        payoutVpa: true,
        payoutBeneficiaryName: true,
        payoutAccountNumber: true,
        razorpayContactId: true,
        razorpayFundAccountId: true,
      },
    });

    // Get all commissions grouped by partner
    const commissions = await prisma.affiliateCommission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        payment: {
          select: {
            amount: true,
            currency: true,
            plan: true,
            createdAt: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    // Calculate balances per partner
    const partnerBalances = partners.map((p) => {
      const partnerCommissions = commissions.filter((c) => c.partnershipId === p.id);
      const pending = partnerCommissions.filter((c) => c.status === 'pending');
      const eligibleBalance = pending
        .filter((c) => c.eligibleAt <= now)
        .reduce((sum, c) => sum + c.amount, 0);
      const holdingBalance = pending
        .filter((c) => c.eligibleAt > now)
        .reduce((sum, c) => sum + c.amount, 0);
      const totalEarned = partnerCommissions
        .filter((c) => c.status !== 'reversed')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalPaid = partnerCommissions
        .filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0);

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        affiliateCode: p.affiliateCode,
        hasPayoutDetails: !!(p.payoutVpa || p.payoutAccountNumber),
        payoutMethod: p.payoutVpa ? 'upi' : p.payoutAccountNumber ? 'bank' : null,
        eligibleBalance: parseFloat(eligibleBalance.toFixed(2)),
        holdingBalance: parseFloat(holdingBalance.toFixed(2)),
        totalEarned: parseFloat(totalEarned.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        referralCount: partnerCommissions.filter((c) => c.status !== 'reversed').length,
      };
    });

    // Overall stats
    const allPending = commissions.filter((c) => c.status === 'pending');
    const stats = {
      totalEligible: parseFloat(
        allPending.filter((c) => c.eligibleAt <= now).reduce((sum, c) => sum + c.amount, 0).toFixed(2)
      ),
      totalOnHold: parseFloat(
        allPending.filter((c) => c.eligibleAt > now).reduce((sum, c) => sum + c.amount, 0).toFixed(2)
      ),
      totalPaidOut: parseFloat(
        commissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0).toFixed(2)
      ),
      activeAffiliates: partners.length,
      totalCommissions: commissions.length,
    };

    // Recent commissions for the log tab
    const recentCommissions = commissions.slice(0, 50).map((c) => ({
      id: c.id,
      affiliateCode: c.affiliateCode,
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      eligibleAt: c.eligibleAt,
      createdAt: c.createdAt,
      reversedAt: c.reversedAt,
      subscriberEmail: c.payment.user.email,
      subscriberName: c.payment.user.name,
      paymentAmount: c.payment.amount,
      paymentPlan: c.payment.plan,
    }));

    return NextResponse.json({ partners: partnerBalances, stats, commissions: recentCommissions });
  } catch (error) {
    console.error('Error fetching affiliate commissions:', error);
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
  }
}
