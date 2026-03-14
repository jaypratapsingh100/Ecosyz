/**
 * Credits system for the App Builder.
 *
 * Credit allocation:
 *   FREE       → 10 credits (one-time on signup)
 *   BASIC      → 200 credits per billing cycle (carry over)
 *   PLUS       → 1000 credits per billing cycle (carry over)
 *   ENTERPRISE → unlimited (bypass)
 *
 * Credit deduction:
 *   creditsDeducted = costUsd × 85 (USD→INR) × 2 (markup)
 *   Groq is free — no credits deducted.
 */

import { prisma } from '@/lib/db';
import { getEffectivePlan, type EffectivePlan } from '@/lib/payments/subscription';

const USD_TO_INR = 85;
const MARKUP_MULTIPLIER = 2;

const PLAN_CREDITS: Record<EffectivePlan, number> = {
  free: 10,
  basic: 200,
  plus: 1000,
  enterprise: -1, // unlimited
};

/**
 * Calculate credits to deduct for a generation.
 * Groq is free → returns 0.
 */
export function calculateCreditsForGeneration(
  costUsd: number | null | undefined,
  provider: string
): number {
  if (provider === 'groq') return 0;
  if (!costUsd || costUsd <= 0) return 0;
  return costUsd * USD_TO_INR * MARKUP_MULTIPLIER;
}

/**
 * Allocate initial credits to a new user (10 free credits).
 */
export async function allocateInitialCredits(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: PLAN_CREDITS.free,
      creditsAllocated: PLAN_CREDITS.free,
    },
  });
}

/**
 * Allocate credits for a paid subscription billing cycle.
 * Credits carry over — increments existing balance.
 */
export async function allocateSubscriptionCredits(userId: string, plan: 'basic' | 'plus' = 'plus'): Promise<void> {
  const credits = PLAN_CREDITS[plan];
  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: { increment: credits },
      creditsAllocated: { increment: credits },
    },
  });
}

/**
 * Deduct credits after a generation. Returns the amount deducted.
 * Uses Prisma atomic decrement to avoid race conditions.
 */
export async function deductCredits(
  userId: string,
  costUsd: number | null | undefined,
  provider: string,
  generationLogId?: string
): Promise<number> {
  const credits = calculateCreditsForGeneration(costUsd, provider);
  if (credits <= 0) return 0;

  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: { decrement: credits },
      creditsUsed: { increment: credits },
    },
  });

  if (generationLogId) {
    prisma.generationLog
      .update({
        where: { id: generationLogId },
        data: { creditsDeducted: credits },
      })
      .catch(() => {}); // non-critical
  }

  return credits;
}

/**
 * Check if user has sufficient credits before a generation.
 * Enterprise users always pass. Returns null if OK, or error object if insufficient.
 */
export async function checkCreditBalance(
  userId: string,
  userPlanData: {
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
    subscriptionEndDate: Date | null;
    trialStartDate: Date | null;
    trialEndDate: Date | null;
  }
): Promise<{ status: 402; body: Record<string, unknown> } | null> {
  const plan = getEffectivePlan(userPlanData);
  if (plan === 'enterprise') return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user || user.creditBalance <= 0) {
    return {
      status: 402,
      body: {
        error: 'Insufficient credits',
        code: 'CREDITS_EXHAUSTED',
        creditBalance: user?.creditBalance ?? 0,
        tier: plan,
        upgradeUrl: '/pricing',
      },
    };
  }

  return null;
}

/**
 * Get credit usage summary for UI display.
 */
export async function getCreditUsage(
  userId: string,
  userPlanData: {
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
    subscriptionEndDate: Date | null;
    trialStartDate: Date | null;
    trialEndDate: Date | null;
  }
): Promise<{
  plan: EffectivePlan;
  creditBalance: number;
  creditsUsed: number;
  creditsAllocated: number;
  isUnlimited: boolean;
}> {
  const plan = getEffectivePlan(userPlanData);

  if (plan === 'enterprise') {
    return {
      plan,
      creditBalance: -1,
      creditsUsed: 0,
      creditsAllocated: -1,
      isUnlimited: true,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true, creditsUsed: true, creditsAllocated: true },
  });

  return {
    plan,
    creditBalance: user?.creditBalance ?? 0,
    creditsUsed: user?.creditsUsed ?? 0,
    creditsAllocated: user?.creditsAllocated ?? 0,
    isUnlimited: false,
  };
}
