/**
 * Fetch actual cost from OpenRouter's generation API and update GenerationLog.
 * Called fire-and-forget after a successful OpenRouter completion.
 *
 * OpenRouter API: GET https://openrouter.ai/api/v1/generation?id={generationId}
 * Returns: { data: { total_cost, tokens_prompt, tokens_completion, ... } }
 */

import { prisma } from '@/lib/db';

/**
 * Known per-token pricing (USD) for OpenRouter models.
 * Used as fallback when the OpenRouter generation API call fails.
 * Prices: [input $/token, output $/token]
 */
const MODEL_PRICING: Record<string, [number, number]> = {
  'google/gemini-2.5-flash':       [0.15e-6,  0.60e-6],
  'google/gemini-2.5-pro':         [1.25e-6,  10.0e-6],
  'deepseek/deepseek-chat':        [0.27e-6,  1.10e-6],
  'deepseek/deepseek-coder':       [0.14e-6,  0.28e-6],
  'qwen/qwen-2.5-coder-32b-instruct': [0.07e-6, 0.16e-6],
  'meta-llama/llama-3.3-70b-instruct': [0.12e-6, 0.30e-6],
  'meta-llama/llama-4-maverick':   [0.25e-6,  1.00e-6],
  'mistralai/mistral-large':       [2.00e-6,  6.00e-6],
  'mistralai/codestral-latest':    [0.30e-6,  0.90e-6],
  'anthropic/claude-sonnet-4':     [3.00e-6,  15.0e-6],
  'openai/gpt-4o':                 [2.50e-6,  10.0e-6],
  'openai/gpt-4o-mini':            [0.15e-6,  0.60e-6],
};

/**
 * Estimate cost from token counts using known pricing.
 */
export function estimateCost(
  model: string,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  const inCost = (inputTokens ?? 0) * pricing[0];
  const outCost = (outputTokens ?? 0) * pricing[1];
  const total = inCost + outCost;
  return total > 0 ? total : null;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS = [3000, 6000]; // ms delays between retries

export async function fetchOpenRouterCost(generationId: string): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('[openrouter-cost] No OPENROUTER_API_KEY — skipping cost fetch');
    return;
  }

  // OpenRouter needs a brief delay before the generation record is available
  await new Promise((resolve) => setTimeout(resolve, 3000));

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
    }

    try {
      const res = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn(`[openrouter-cost] Attempt ${attempt + 1}: HTTP ${res.status} for ${generationId}`, body.slice(0, 200));
        if (res.status === 404 && attempt < MAX_RETRIES) continue; // retry — generation may not be ready
        return;
      }

      const json = await res.json();
      // OpenRouter may return { data: {...} } or the object directly
      const data = json.data ?? json;
      if (!data || (typeof data.total_cost !== 'number' && typeof data.tokens_prompt !== 'number')) {
        console.warn(`[openrouter-cost] No cost data in response for ${generationId}:`, JSON.stringify(json).slice(0, 300));
        if (attempt < MAX_RETRIES) continue;
        return;
      }

      const costUsd = typeof data.total_cost === 'number' ? data.total_cost : null;
      const tokensPrompt = typeof data.tokens_prompt === 'number' ? data.tokens_prompt : null;
      const tokensCompletion = typeof data.tokens_completion === 'number' ? data.tokens_completion : null;

      await prisma.generationLog.updateMany({
        where: { generationId },
        data: {
          costUsd,
          costSource: 'openrouter-api',
          ...(tokensPrompt !== null && { inputTokens: tokensPrompt }),
          ...(tokensCompletion !== null && { outputTokens: tokensCompletion }),
          ...(tokensPrompt !== null && tokensCompletion !== null && {
            totalTokens: tokensPrompt + tokensCompletion,
          }),
        },
      });

      console.log(`[openrouter-cost] ✅ Updated ${generationId}: $${costUsd?.toFixed(6)} (${tokensPrompt ?? '?'}in/${tokensCompletion ?? '?'}out)`);
      return; // success — exit retry loop
    } catch (err) {
      console.error(`[openrouter-cost] Attempt ${attempt + 1} error for ${generationId}:`, err instanceof Error ? err.message : err);
      if (attempt >= MAX_RETRIES) return;
    }
  }
}
