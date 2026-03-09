import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { activateSubscription } from '@/lib/payments/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ received: true });

      const paymentId = payment.id;
      const orderId = payment.order_id;
      const amount = payment.amount / 100; // Convert from paise
      const plan = payment.notes?.plan || 'plus';

      // Check if already processed
      const existing = await prisma.payment.findUnique({
        where: { providerPaymentId: paymentId },
      });
      if (existing) {
        return NextResponse.json({ received: true, message: 'Already processed' });
      }

      // Find user by order — look up recent user who initiated this order
      // The order was created with the user's receipt ID
      const receipt = payment.notes?.receipt || '';
      const userIdMatch = receipt.match(/receipt_(.+?)_\d+/);

      if (userIdMatch) {
        const userId = userIdMatch[1];
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await activateSubscription(
            userId,
            plan,
            paymentId,
            'razorpay',
            amount,
            'INR',
            orderId
          );
        }
      }
    }

    if (eventType === 'refund.created') {
      const refund = event.payload?.refund?.entity;
      if (!refund) return NextResponse.json({ received: true });

      const paymentId = refund.payment_id;

      await prisma.payment.updateMany({
        where: { providerPaymentId: paymentId },
        data: { status: 'refunded' },
      });

      // Find the payment to get userId and downgrade
      const paymentRecord = await prisma.payment.findUnique({
        where: { providerPaymentId: paymentId },
      });
      if (paymentRecord) {
        await prisma.user.update({
          where: { id: paymentRecord.userId },
          data: {
            subscriptionStatus: 'cancelled',
            subscriptionPlan: null,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
