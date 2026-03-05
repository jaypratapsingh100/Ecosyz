/**
 * Generation Tracker — lightweight generation logging without schema changes.
 * Logs generation attempts, durations, token counts, and outcomes.
 * Uses structured console logging for now; can be extended to DB/analytics later.
 */

export interface GenerationMetrics {
  projectId: string;
  userId: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  status: 'completed' | 'failed' | 'timeout' | 'fallback';
  filesCreated: number;
  themePreset?: string;
  errorMessage?: string;
  usedFallback?: boolean;
  fallbackProvider?: string;
  fallbackModel?: string;
}

/**
 * Track a generation attempt. Currently logs to structured console output.
 * Can be extended to persist to DB, send to analytics, etc.
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
    ...(usedFallback && { fallback: `${fallbackProvider}` }),
    ...(errorMessage && { error: errorMessage.slice(0, 100) }),
  });
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
