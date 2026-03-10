import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createOrder } from '@/lib/payments/razorpay';
import { createCheckoutSession } from '@/lib/payments/stripe';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const { plan, provider } = await req.json();

    if (!plan || !['basic', 'plus', 'enterprise'].includes(plan.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!provider || !['razorpay', 'stripe'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (provider === 'razorpay') {
      // Razorpay receipt max length is 40 chars
      const receipt = `rcpt_${prismaUser.id.slice(-8)}_${Date.now()}`.slice(0, 40);
      const order = await createOrder(plan, receipt);
      return NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    // Stripe
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createCheckoutSession(
      plan,
      prismaUser.id,
      prismaUser.email,
      `${origin}/payment/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      `${origin}/pricing?cancelled=true`,
      prismaUser.stripeCustomerId
    );

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
