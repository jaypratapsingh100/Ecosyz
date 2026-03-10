import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';
import { activateSubscription } from '@/lib/payments/subscription';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      affiliateCode,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    if (!plan || !['basic', 'plus', 'enterprise'].includes(plan.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Verify Razorpay signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for duplicate payment
    const existing = await prisma.payment.findUnique({
      where: { providerPaymentId: razorpay_payment_id },
    });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Payment already processed', plan });
    }

    const amount = plan.toLowerCase() === 'plus' ? 999 : plan.toLowerCase() === 'basic' ? 200 : 0;

    await activateSubscription(
      prismaUser.id,
      plan,
      razorpay_payment_id,
      'razorpay',
      amount,
      'INR',
      razorpay_order_id,
      affiliateCode
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      plan,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
