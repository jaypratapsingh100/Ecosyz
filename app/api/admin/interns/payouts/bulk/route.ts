import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { notifyPayoutProcessed } from '@/lib/payments/stipend-emails';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const payoutIds = body.payoutIds as string[];
    const transactionRef = (body.transactionRef as string)?.trim() || null;
    const paymentMethod = (body.paymentMethod as string)?.trim() || 'bank_transfer';

    if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
      return NextResponse.json({ error: 'payoutIds array is required' }, { status: 400 });
    }
    if (payoutIds.length > 50) {
      return NextResponse.json({ error: 'Max 50 payouts per bulk action' }, { status: 400 });
    }

    const payouts = await prisma.stipendPayout.findMany({
      where: { id: { in: payoutIds }, status: { in: ['pending', 'processing'] } },
      include: { fellow: { include: { user: true } } },
    });

    if (payouts.length === 0) {
      return NextResponse.json({ error: 'No eligible payouts found' }, { status: 400 });
    }

    // Bulk update
    await prisma.stipendPayout.updateMany({
      where: { id: { in: payouts.map((p) => p.id) } },
      data: {
        status: 'paid',
        transactionRef,
        paymentMethod,
        paidAt: new Date(),
        approvedBy: user.email,
      },
    });

    // Send notifications (non-blocking)
    for (const payout of payouts) {
      const email = payout.fellow.user.email;
      const name = payout.fellow.user.name || email.split('@')[0];
      notifyPayoutProcessed(email, name, payout.amount, transactionRef).catch(console.error);
    }

    return NextResponse.json({ success: true, updated: payouts.length });
  } catch (err) {
    console.error('[admin/interns/payouts/bulk]', err);
    return NextResponse.json({ error: 'Failed to bulk update payouts' }, { status: 500 });
  }
}
