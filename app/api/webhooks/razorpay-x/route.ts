import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { notifyPayoutProcessed } from '@/lib/payments/stipend-emails';

/**
 * POST /api/webhooks/razorpay-x
 *
 * Handles Razorpay X payout webhook events:
 * - payout.processed  → mark StipendPayout as paid
 * - payout.reversed   → mark as failed
 * - payout.failed     → mark as failed
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event as string;
    const payoutEntity = payload.payload?.payout?.entity;

    if (!payoutEntity?.id) {
      return NextResponse.json({ ok: true }); // Ignore unknown events
    }

    const razorpayPayoutId = payoutEntity.id as string;

    // Find our payout record by razorpayPayoutId
    const payout = await prisma.stipendPayout.findUnique({
      where: { razorpayPayoutId },
      include: { fellow: { include: { user: true } } },
    });

    if (!payout) {
      console.warn(`[razorpay-x-webhook] No payout found for ${razorpayPayoutId}`);
      return NextResponse.json({ ok: true });
    }

    const fellowEmail = payout.fellow.user.email;
    const fellowName = payout.fellow.user.name || fellowEmail.split('@')[0];
    const utr = (payoutEntity.utr as string) || null;

    if (event === 'payout.processed') {
      await prisma.stipendPayout.update({
        where: { id: payout.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          transactionRef: utr,
          paymentMethod: 'razorpay_x',
        },
      });
      notifyPayoutProcessed(fellowEmail, fellowName, payout.amount, utr).catch(console.error);
    } else if (event === 'payout.reversed' || event === 'payout.failed') {
      const reason = (payoutEntity.failure_reason as string) || `Payout ${event.split('.')[1]}`;
      await prisma.stipendPayout.update({
        where: { id: payout.id },
        data: {
          status: 'failed',
          failedAt: new Date(),
          failureReason: reason,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[razorpay-x-webhook]', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
