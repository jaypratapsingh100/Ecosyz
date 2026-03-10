import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { ensurePartnerRazorpaySetup, createPayout } from '@/lib/payments/razorpay-x';
import { notifyAffiliatePayoutSent } from '@/lib/payments/affiliate-emails';

/**
 * GET: List all affiliate payouts
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const partnershipId = searchParams.get('partnershipId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (partnershipId) where.partnershipId = partnershipId;

    const payouts = await prisma.affiliatePayout.findMany({
      where,
      include: {
        partnership: {
          select: { id: true, name: true, email: true, affiliateCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('Error fetching affiliate payouts:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

/**
 * POST: Trigger a payout for a partner
 * Body: { partnershipId: string, amount?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { partnershipId, amount: requestedAmount } = await req.json();

    if (!partnershipId) {
      return NextResponse.json({ error: 'partnershipId is required' }, { status: 400 });
    }

    const partner = await prisma.partnershipApplication.findUnique({
      where: { id: partnershipId },
    });
    if (!partner || partner.status !== 'approved') {
      return NextResponse.json({ error: 'Partner not found or not approved' }, { status: 404 });
    }

    if (!partner.payoutVpa && !partner.payoutAccountNumber) {
      return NextResponse.json({ error: 'Partner has no payout details configured' }, { status: 400 });
    }

    // Calculate eligible commissions (past 30-day hold)
    const now = new Date();
    const eligibleCommissions = await prisma.affiliateCommission.findMany({
      where: {
        partnershipId,
        status: 'pending',
        eligibleAt: { lte: now },
      },
    });

    if (eligibleCommissions.length === 0) {
      return NextResponse.json({ error: 'No eligible commissions to pay out' }, { status: 400 });
    }

    const maxEligible = parseFloat(
      eligibleCommissions.reduce((sum, c) => sum + c.amount, 0).toFixed(2)
    );
    const payoutAmount = requestedAmount ? Math.min(requestedAmount, maxEligible) : maxEligible;

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'Payout amount must be greater than 0' }, { status: 400 });
    }

    // Setup Razorpay X Contact + Fund Account
    const { contactId, fundAccountId } = await ensurePartnerRazorpaySetup(partnershipId);

    const mode: 'UPI' | 'NEFT' = partner.payoutVpa ? 'UPI' : 'NEFT';
    const payoutMethod = partner.payoutVpa ? 'upi' : 'bank_transfer';

    // Create Razorpay X payout (amount in paise)
    const amountInPaise = Math.round(payoutAmount * 100);
    const referenceId = `aff_${partner.affiliateCode}_${Date.now()}`;
    const narration = `Commission payout - ${partner.affiliateCode}`;
    const razorpayResult = await createPayout(fundAccountId, amountInPaise, referenceId, mode, narration);

    // Create payout record
    const payout = await prisma.affiliatePayout.create({
      data: {
        partnershipId,
        amount: payoutAmount,
        currency: 'INR',
        status: razorpayResult.status === 'processed' ? 'paid' : 'processing',
        payoutMethod,
        razorpayPayoutId: razorpayResult.id,
        razorpayContactId: contactId,
        razorpayFundAccountId: fundAccountId,
        initiatedBy: user.email,
        initiatedAt: now,
        paidAt: razorpayResult.status === 'processed' ? now : null,
      },
    });

    // Mark eligible commissions as paid (up to payout amount)
    let remaining = payoutAmount;
    for (const commission of eligibleCommissions) {
      if (remaining <= 0) break;
      await prisma.affiliateCommission.update({
        where: { id: commission.id },
        data: { status: 'paid' },
      });
      remaining -= commission.amount;
    }

    // Notify partner (non-blocking)
    notifyAffiliatePayoutSent(
      partner.email,
      partner.name,
      payoutAmount,
      payoutMethod,
      referenceId
    ).catch((err) => console.error('Failed to send payout notification:', err));

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payoutAmount,
        status: payout.status,
        razorpayPayoutId: razorpayResult.id,
      },
    });
  } catch (error) {
    console.error('Error creating affiliate payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payout' },
      { status: 500 }
    );
  }
}
