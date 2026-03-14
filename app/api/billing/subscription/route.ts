import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth/core/user';
import { prisma } from '@/lib/db';
import { getEffectivePlan } from '@/lib/payments/subscription';

const PLAN_PRICES: Record<string, string> = {
  free: '₹0',
  basic: '₹200/mo',
  plus: '₹999/mo',
  enterprise: 'Custom',
};

export async function GET() {
  try {
    const supabaseUser = await getCurrentUser();
    if (!supabaseUser?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: userId } = await ensureUserInDb(supabaseUser, { ensureWorkspace: false });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        trialStartDate: true,
        trialEndDate: true,
        lastPaymentAmount: true,
        lastPaymentDate: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const effectivePlan = getEffectivePlan(user);
    const rawPlan = user.subscriptionPlan?.toLowerCase() || null;
    const price = PLAN_PRICES[rawPlan || effectivePlan] || PLAN_PRICES.free;

    return NextResponse.json({
      plan: effectivePlan,
      rawPlan,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      lastPaymentAmount: user.lastPaymentAmount,
      lastPaymentDate: user.lastPaymentDate,
      price,
    });
  } catch (error) {
    console.error('Error fetching billing subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
