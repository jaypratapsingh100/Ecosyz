/**
 * Generation Tracker — persists generation metrics to DB and logs to console.
 * Tracks cost, token usage, latency, and outcomes per AI call.
 */

import { prisma } from '@/lib/db';
import { fetchOpenRouterCost, estimateCost } from './openrouter-cost';
import { deductCredits } from '@/lib/app-builder/credits';

export interface GenerationMetrics {
  projectId: string;
  userId: string;
  provider: string;
  model: string;
  stage?: 'planner' | 'architect' | 'coder' | 'retry' | 'fix-loop';
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number | null;
  costSource?: string | null;
  durationMs: number;
  ttfbMs?: number;
  status: 'completed' | 'failed' | 'timeout' | 'fallback';
  filesCreated: number;
  themePreset?: string;
  errorMessage?: string;
  usedFallback?: boolean;
  fallbackProvider?: string;
  fallbackModel?: string;
  generationId?: string; // OpenRouter generation ID for cost lookup
}

/**
 * Track a generation attempt. Logs to console and persists to GenerationLog table.
 */
export function trackGeneration(metrics: GenerationMetrics): void {
  const {
    projectId,
    provider,
    model,
    durationMs,
    status,
    filesCreated,
    inputTokens,
    outputTokens,
    errorMessage,
    usedFallback,
    fallbackProvider,
  } = metrics;

  // Estimate cost from token counts if no cost provided (fallback pricing)
  let costUsd = metrics.costUsd ?? null;
  let costSource = metrics.costSource ?? null;
  if (costUsd == null && (inputTokens || outputTokens)) {
    const estimated = estimateCost(model, inputTokens, outputTokens);
    if (estimated !== null) {
      costUsd = estimated;
      costSource = 'estimated';
    }
  }

  const durationSec = (durationMs / 1000).toFixed(1);
  const emoji = status === 'completed' ? '✅' : status === 'fallback' ? '🔄' : '❌';

  console.log(`${emoji} [GENERATION] ${provider}/${model}`, {
    projectId: projectId.slice(0, 8) + '...',
    status,
    duration: `${durationSec}s`,
    files: filesCreated,
    tokens: inputTokens || outputTokens
      ? `${inputTokens ?? '?'}in/${outputTokens ?? '?'}out`
      : 'n/a',
    cost: costUsd != null ? `$${costUsd.toFixed(6)}` : 'n/a',
    generationId: metrics.generationId ?? 'none',
    ...(usedFallback && { fallback: `${fallbackProvider}` }),
    ...(errorMessage && { error: errorMessage.slice(0, 100) }),
  });

  // Persist to DB (fire-and-forget)
  prisma.generationLog
    .create({
      data: {
        projectId: metrics.projectId,
        userId: metrics.userId,
        provider: metrics.provider,
        model: metrics.model,
        stage: metrics.stage ?? 'coder',
        status: metrics.status,
        inputTokens: metrics.inputTokens ?? null,
        outputTokens: metrics.outputTokens ?? null,
        totalTokens: metrics.totalTokens ?? null,
        costUsd,
        costSource,
        durationMs: metrics.durationMs,
        ttfbMs: metrics.ttfbMs ?? null,
        filesCreated: metrics.filesCreated,
        usedFallback: metrics.usedFallback ?? false,
        fallbackProvider: metrics.fallbackProvider ?? null,
        fallbackModel: metrics.fallbackModel ?? null,
        errorMessage: metrics.errorMessage ?? null,
        generationId: metrics.generationId ?? null,
      },
    })
    .then((log) => {
      console.log(`[generation-tracker] ✅ Saved generation log for ${provider}/${model}`);

      // Deduct credits based on estimated cost (fire-and-forget)
      if (metrics.status === 'completed' && costUsd != null && costUsd > 0) {
        void deductCredits(metrics.userId, costUsd, metrics.provider, log.id).then((deducted) => {
          if (deducted > 0) {
            console.log(`[generation-tracker] 💳 Deducted ${deducted.toFixed(2)} credits from user ${metrics.userId.slice(0, 8)}...`);
          }
        }).catch((err) => {
          console.error('[generation-tracker] ❌ Credit deduction failed:', err instanceof Error ? err.message : err);
        });
      }
    })
    .catch((err) => {
      // Always log DB errors — critical for diagnosing missing cost data
      console.error('[generation-tracker] ❌ DB write failed:', err instanceof Error ? err.message : err);
    });

  // Fetch actual cost from OpenRouter async (fire-and-forget)
  // This will overwrite the estimated cost with the real cost from OpenRouter
  if (
    metrics.provider === 'openrouter' &&
    metrics.generationId &&
    metrics.status === 'completed'
  ) {
    console.log(`[generation-tracker] Queuing OpenRouter cost fetch for gen: ${metrics.generationId}`);
    void fetchOpenRouterCost(metrics.generationId);
  }
}

/**
 * Create a timer for tracking generation duration.
 */
export function createGenerationTimer(): { elapsed: () => number } {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}
