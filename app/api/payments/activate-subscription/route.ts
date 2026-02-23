import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { plan, paymentId, paymentLinkId } = await req.json();

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    // Determine amount based on plan
    const planAmounts: Record<string, number> = {
      plus: 999,
      enterprise: 0, // Custom pricing
    };

    // Update user subscription
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        lastPaymentDate: new Date(),
        lastPaymentAmount: planAmounts[plan.toLowerCase()] || 0,
        lastPaymentId: paymentId || paymentLinkId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      plan: plan,
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
