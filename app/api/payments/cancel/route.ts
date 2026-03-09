import { NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cancelSubscription } from '@/lib/payments/subscription';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!prismaUser.subscriptionPlan || prismaUser.subscriptionStatus !== 'active') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    await cancelSubscription(prismaUser.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
      accessUntil: prismaUser.subscriptionEndDate,
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
