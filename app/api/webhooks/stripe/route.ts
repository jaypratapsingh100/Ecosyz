import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/payments/stripe';
import { activateSubscription } from '@/lib/payments/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan || 'plus';

      if (!userId) {
        console.error('Stripe webhook: missing userId in metadata');
        return NextResponse.json({ received: true });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || session.id;

      // Check if already processed
      const existing = await prisma.payment.findUnique({
        where: { providerPaymentId: paymentIntentId },
      });
      if (existing) {
        return NextResponse.json({ received: true, message: 'Already processed' });
      }

      const amount = (session.amount_total || 0) / 100;
      const currency = (session.currency || 'inr').toUpperCase();

      // Store Stripe customer ID
      if (session.customer) {
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer.id;
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }

      await activateSubscription(
        userId,
        plan,
        paymentIntentId,
        'stripe',
        amount,
        currency,
        session.id
      );
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (paymentIntentId) {
        await prisma.payment.updateMany({
          where: { providerPaymentId: paymentIntentId },
          data: { status: 'refunded' },
        });

        const paymentRecord = await prisma.payment.findUnique({
          where: { providerPaymentId: paymentIntentId },
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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
