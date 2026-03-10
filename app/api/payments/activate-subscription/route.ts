import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';
import { activateSubscription } from '@/lib/payments/subscription';

/**
 * POST /api/payments/activate-subscription
 *
 * Kept for backward compatibility with the Razorpay Payment Link redirect flow.
 * New integrations should use /api/payments/verify instead.
 *
 * Now includes server-side signature verification when available.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { plan, paymentId, paymentLinkId, affiliateCode, razorpay_order_id, razorpay_signature } = await req.json();

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    // If Razorpay signature is provided, verify it
    if (razorpay_order_id && razorpay_signature && paymentId) {
      const isValid = verifyPaymentSignature(razorpay_order_id, paymentId, razorpay_signature);
      if (!isValid) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      }
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const providerPaymentId = paymentId || paymentLinkId;
    if (!providerPaymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.payment.findUnique({
      where: { providerPaymentId },
    });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already processed', plan });
    }

    const amount = plan.toLowerCase() === 'plus' ? 999 : plan.toLowerCase() === 'basic' ? 200 : 0;

    await activateSubscription(
      prismaUser.id,
      plan,
      providerPaymentId,
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
    console.error('Subscription activation error:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to activate subscription',
        ...(isDev && { details: error.message }),
      },
      { status: 500 }
    );
  }
}
