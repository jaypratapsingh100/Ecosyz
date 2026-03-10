import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getStripe } from '@/lib/payments/stripe';
import { getRazorpay } from '@/lib/payments/razorpay';

/**
 * POST /api/admin/refunds
 * Admin-only endpoint to initiate a full refund via Stripe or Razorpay.
 * Body: { paymentId: string }
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

    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'refunded') {
      return NextResponse.json({ error: 'Payment already refunded' }, { status: 400 });
    }

    if (payment.status !== 'captured') {
      return NextResponse.json({ error: `Cannot refund a payment with status "${payment.status}"` }, { status: 400 });
    }

    if (payment.provider === 'stripe') {
      await getStripe().refunds.create({
        payment_intent: payment.providerPaymentId,
      });
    } else if (payment.provider === 'razorpay') {
      await getRazorpay().payments.refund(payment.providerPaymentId, {
        amount: Math.round(payment.amount * 100), // Convert to paise
      });
    } else {
      return NextResponse.json({ error: `Unknown payment provider: ${payment.provider}` }, { status: 400 });
    }

    // The webhook will update payment status to "refunded" and cancel the subscription.
    return NextResponse.json({
      success: true,
      message: `Refund initiated for ${payment.user.email} (${payment.provider})`,
    });
  } catch (error: any) {
    console.error('Admin refund error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
