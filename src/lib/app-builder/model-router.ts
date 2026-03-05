/**
 * Model Router — smart routing with automatic fallback on failure/timeout.
 * When a provider fails, automatically retry with the next available provider.
 */

import type { AIProvider } from '@/lib/ai/provider';
import { getMaxOutputTokens, isSlowProvider } from '@/lib/ai/provider';

export interface ModelRoute {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  isFast: boolean;
  timeout: number;
}

/**
 * Get the primary model route based on user selection.
 */
export function getModelRoute(provider: AIProvider, model: string): ModelRoute {
  return {
    provider,
    model,
    maxTokens: getMaxOutputTokens(provider, model),
    isFast: !isSlowProvider(provider, model),
    timeout: getTimeout(provider, model),
  };
}

/**
 * Get a fallback route when the primary fails.
 * Returns null if no fallback is available.
 *
 * Fallback chain:
 * - OpenRouter model fails → try a different OpenRouter model (Gemini Flash)
 * - OpenRouter fails entirely → try Groq if key available
 * - Groq fails → try OpenAI if key available
 * - OpenAI fails → try Anthropic if key available
 * - Anthropic fails → null (give up)
 */
export function getFallbackRoute(failedRoute: ModelRoute): ModelRoute | null {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const { provider, model } = failedRoute;

  // OpenRouter model-level fallback: try Gemini Flash (fast + high output)
  if (provider === 'openrouter' && model !== 'google/gemini-2.5-flash' && openRouterKey) {
    return {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
      maxTokens: 16384,
      isFast: true,
      timeout: 180_000,
    };
  }

  // Cross-provider fallback chain
  if (provider === 'openrouter' && groqKey) {
    return {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 16384,
      isFast: true,
      timeout: 120_000,
    };
  }

  if ((provider === 'openrouter' || provider === 'groq') && openaiKey) {
    return {
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 16384,
      isFast: true,
      timeout: 120_000,
    };
  }

  if (provider !== 'anthropic' && anthropicKey) {
    return {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 16384,
      isFast: true,
      timeout: 120_000,
    };
  }

  // No fallback available
  return null;
}

/**
 * Get timeout for a provider/model combination.
 */
function getTimeout(provider: AIProvider, model: string): number {
  if (provider === 'openrouter') {
    // Slow models via proxy need more time
    if (isSlowProvider(provider, model)) return 300_000; // 5 min
    return 180_000; // 3 min for fast models via OR
  }
  // Direct providers are faster
  return 120_000; // 2 min
}

/**
 * Check if an error is retryable (timeout, rate limit, server error).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Timeout errors
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) return true;
    // Rate limit
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) return true;
    // Server errors (500, 502, 503)
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('server error')) return true;
    // Connection errors
    if (msg.includes('econnrefused') || msg.includes('econnreset') || msg.includes('fetch failed')) return true;
  }
  return false;
}
