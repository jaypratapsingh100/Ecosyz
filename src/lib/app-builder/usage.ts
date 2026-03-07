/**
 * Generation usage limits and credit system for the App Builder.
 *
 * Counts AI generations per user per calendar month using existing
 * AppChat messages as the source of truth (each assistant message = 1 generation).
 *
 * Tiers are aligned with the subscription plans set via Razorpay payment:
 *   FREE  → 5 generations/month, all providers, max 10 files/generation
 *   PLUS  → 200 generations/month, all providers, max 25 files/generation
 *   ENTERPRISE → unlimited, all providers, unlimited files
 */

import { prisma } from '@/lib/db';
import { isAdminEmail } from '@/lib/admin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'plus' | 'enterprise';

export interface PlanLimits {
  tier: PlanTier;
  maxGenerationsPerMonth: number; // -1 = unlimited
  maxFilesPerGeneration: number; // -1 = unlimited
  allowedProviders: string[]; // provider ids the user may select
}

export interface UsageStatus {
  tier: PlanTier;
  generationsUsed: number;
  generationsLimit: number; // -1 = unlimited
  remaining: number; // -1 = unlimited
  isExhausted: boolean;
  maxFilesPerGeneration: number;
  allowedProviders: string[];
  upgradeUrl: string;
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const ALL_PROVIDERS = ['groq', 'openrouter', 'openai', 'anthropic'];

const PLAN_CONFIG: Record<PlanTier, PlanLimits> = {
  free: {
    tier: 'free',
    maxGenerationsPerMonth: 5,
    maxFilesPerGeneration: 10,
    allowedProviders: ALL_PROVIDERS,
  },
  plus: {
    tier: 'plus',
    maxGenerationsPerMonth: 200,
    maxFilesPerGeneration: 25,
    allowedProviders: ALL_PROVIDERS,
  },
  enterprise: {
    tier: 'enterprise',
    maxGenerationsPerMonth: -1,
    maxFilesPerGeneration: -1,
    allowedProviders: ALL_PROVIDERS,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the user's subscriptionPlan string to a PlanTier.
 * The subscriptionPlan field is set by the Razorpay payment flow and stored
 * as a free-form string ("plus", "enterprise", etc.). Null / empty = free.
 */
export function resolvePlanTier(subscriptionPlan: string | null | undefined): PlanTier {
  if (!subscriptionPlan) return 'free';
  const normalised = subscriptionPlan.trim().toLowerCase();
  if (normalised === 'plus' || normalised === 'pro') return 'plus';
  if (normalised === 'enterprise') return 'enterprise';
  return 'free';
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_CONFIG[tier];
}

/**
 * Count AI generations for a user in the current calendar month.
 *
 * Each assistant message in any of the user's AppChat records counts as one
 * generation.  We look at chat messages across all projects owned by the user.
 */
export async function countMonthlyGenerations(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all project IDs owned by the user
  const projects = await prisma.appProject.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (projects.length === 0) return 0;

  const projectIds = projects.map((p) => p.id);

  // Get all chats for those projects
  const chats = await prisma.appChat.findMany({
    where: { projectId: { in: projectIds } },
    select: { messages: true, updatedAt: true },
  });

  let count = 0;
  for (const chat of chats) {
    const msgs = (chat.messages as any[]) || [];
    for (const msg of msgs) {
      if (msg.role !== 'assistant') continue;
      // Only count messages in the current month
      const ts = msg.timestamp ? new Date(msg.timestamp) : chat.updatedAt;
      if (ts >= monthStart) count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Check the user's generation quota. Returns full usage status.
 * Throws nothing — returns an object the caller can inspect.
 */
export async function checkGenerationQuota(userId: string, subscriptionPlan: string | null | undefined): Promise<UsageStatus> {
  const tier = resolvePlanTier(subscriptionPlan);
  const limits = getPlanLimits(tier);
  const used = await countMonthlyGenerations(userId);

  const isUnlimited = limits.maxGenerationsPerMonth === -1;
  const remaining = isUnlimited ? -1 : Math.max(0, limits.maxGenerationsPerMonth - used);
  const isExhausted = !isUnlimited && remaining <= 0;

  return {
    tier,
    generationsUsed: used,
    generationsLimit: limits.maxGenerationsPerMonth,
    remaining,
    isExhausted,
    maxFilesPerGeneration: limits.maxFilesPerGeneration,
    allowedProviders: limits.allowedProviders,
    upgradeUrl: '/pricing',
  };
}

/**
 * Quick guard — returns `null` when the user is within quota, or an error
 * object suitable for returning as a 429 JSON response body.
 */
export async function enforceGenerationLimit(
  userId: string,
  subscriptionPlan: string | null | undefined,
  requestedProvider?: string,
  userEmail?: string | null
): Promise<{ status: 429 | 403; body: Record<string, unknown> } | null> {
  // Admin accounts bypass all limits
  if (userEmail && isAdminEmail(userEmail)) {
    console.log(`✅ Admin bypass: ${userEmail} — skipping generation limit`);
    return null;
  }

  const usage = await checkGenerationQuota(userId, subscriptionPlan);

  // Provider restriction
  if (requestedProvider && !usage.allowedProviders.includes(requestedProvider)) {
    return {
      status: 403,
      body: {
        error: 'Provider not available on your plan',
        code: 'PROVIDER_RESTRICTED',
        provider: requestedProvider,
        allowedProviders: usage.allowedProviders,
        tier: usage.tier,
        upgradeUrl: usage.upgradeUrl,
      },
    };
  }

  // Generation limit
  if (usage.isExhausted) {
    return {
      status: 429,
      body: {
        error: 'Monthly generation limit reached',
        code: 'GENERATION_LIMIT',
        limit: usage.generationsLimit,
        used: usage.generationsUsed,
        tier: usage.tier,
        upgradeUrl: usage.upgradeUrl,
      },
    };
  }

  return null;
}
