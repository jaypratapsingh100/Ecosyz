/**
 * AI Provider Abstraction — Lovable/Replit-style App Builder
 *
 * Supported providers:
 * - Groq (default): Llama 3.3 — GROQ_API_KEY
 * - OpenRouter (fallback): DeepSeek, etc. — OPENROUTER_API_KEY
 */

import OpenAI from 'openai';

export type AIProvider = 'openrouter' | 'groq';

export interface AIClientConfig {
  provider: AIProvider;
  model: string;
  client: OpenAI;
  baseURL: string;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3-0324';

/**
 * Create AI client. Groq is default until proven stable; OpenRouter fallback.
 */
export function createAIClient(): AIClientConfig {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (groqKey) {
    return {
      provider: 'groq',
      model: process.env.GROQ_MODEL || GROQ_MODEL,
      baseURL: GROQ_BASE,
      client: new OpenAI({
        baseURL: GROQ_BASE,
        apiKey: groqKey,
      }),
    };
  }

  if (openRouterKey) {
    return {
      provider: 'openrouter',
      model: process.env.OPENROUTER_MODEL || OPENROUTER_MODEL,
      baseURL: OPENROUTER_BASE,
      client: new OpenAI({
        baseURL: OPENROUTER_BASE,
        apiKey: openRouterKey,
      }),
    };
  }

  throw new Error(
    'No AI provider configured. Set GROQ_API_KEY (default) or OPENROUTER_API_KEY in environment.'
  );
}

/**
 * Check if any AI provider is available.
 */
export function hasAIClient(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
}
