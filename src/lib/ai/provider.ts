/**
 * AI Provider Abstraction — Lovable/Replit-style App Builder
 *
 * Supported providers:
 * - Groq (default): Llama 3.3 — GROQ_API_KEY
 * - OpenRouter: DeepSeek Chat, DeepSeek Coder — OPENROUTER_API_KEY
 * - OpenAI: GPT-4o, GPT-4o Mini — OPENAI_API_KEY
 * - Anthropic (Claude): Claude Sonnet 4, Claude Haiku 4.5 — ANTHROPIC_API_KEY
 *
 * User can select provider and model from the chat UI (userProvider, userModel in request body).
 */

import OpenAI from 'openai';

export type AIProvider = 'groq' | 'openrouter' | 'openai' | 'anthropic';

export interface AIClientConfig {
  provider: AIProvider;
  model: string;
  client: OpenAI;
  baseURL: string;
}

/** Options to override default provider/model (from chat request body). */
export interface AIClientOptions {
  userProvider?: AIProvider;
  userModel?: string;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const OPENAI_BASE = 'https://api.openai.com/v1';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL_CHAT = 'deepseek/deepseek-chat-v3-0324';
const OPENROUTER_MODEL_CODER = 'deepseek/deepseek-coder';
const OPENAI_MODEL = 'gpt-4o';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

/** Allowed OpenRouter model IDs for app builder (user can select). */
export const OPENROUTER_APP_BUILDER_MODELS = [
  { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek Chat v3' },
  { id: OPENROUTER_MODEL_CODER, label: 'DeepSeek Coder v2' },
  { id: 'deepseek/deepseek-coder-v1.5-16b', label: 'DeepSeek Coder 1.5 16B' },
] as const;

/** Allowed Groq model IDs (for display; server uses env or default). */
export const GROQ_APP_BUILDER_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
] as const;

/** Allowed OpenAI model IDs for app builder. */
export const OPENAI_APP_BUILDER_MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
] as const;

/** Allowed Anthropic (Claude) model IDs for app builder. */
export const ANTHROPIC_APP_BUILDER_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
] as const;

/**
 * Max output tokens per provider — tuned per provider's actual limits.
 * Groq Llama 3.3 70B: supports up to 32K output tokens (was limited to 8K).
 * OpenRouter DeepSeek Chat v3: max 8K output tokens.
 * OpenAI GPT-4o: supports up to 16K output tokens.
 * Anthropic Claude: supports up to 64K, we use 16K for app generation.
 */
export function getMaxOutputTokens(provider: AIProvider): number {
  switch (provider) {
    case 'anthropic': return 16384;
    case 'openai': return 16384;
    case 'groq': return 16384; // Groq supports 32K, 16K is plenty for multi-file apps
    case 'openrouter': return 8192; // DeepSeek Chat v3 max is 8K
    default: return 8192;
  }
}

/**
 * Create AI client. If userProvider/userModel are provided and valid, use them; else use env default.
 * All providers use OpenAI-compatible API via the openai SDK:
 * - Groq: native OpenAI-compatible endpoint
 * - OpenRouter: native OpenAI-compatible endpoint
 * - OpenAI: native
 * - Anthropic: OpenAI-compatible endpoint (messages API via openai SDK)
 */
export function createAIClient(options?: AIClientOptions): AIClientConfig {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const wantProvider = options?.userProvider;

  // Anthropic (Claude) — uses OpenAI-compatible endpoint
  if (wantProvider === 'anthropic' && anthropicKey) {
    const model =
      options?.userModel && ANTHROPIC_APP_BUILDER_MODELS.some((m) => m.id === options.userModel)
        ? options.userModel
        : process.env.ANTHROPIC_MODEL || ANTHROPIC_MODEL;
    return {
      provider: 'anthropic',
      model,
      baseURL: ANTHROPIC_BASE,
      client: new OpenAI({
        baseURL: ANTHROPIC_BASE,
        apiKey: anthropicKey,
        defaultHeaders: {
          'anthropic-version': '2023-06-01',
        },
      }),
    };
  }

  // OpenAI — native SDK support
  if (wantProvider === 'openai' && openaiKey) {
    const model =
      options?.userModel && OPENAI_APP_BUILDER_MODELS.some((m) => m.id === options.userModel)
        ? options.userModel
        : process.env.OPENAI_MODEL || OPENAI_MODEL;
    return {
      provider: 'openai',
      model,
      baseURL: OPENAI_BASE,
      client: new OpenAI({
        baseURL: OPENAI_BASE,
        apiKey: openaiKey,
      }),
    };
  }

  // OpenRouter
  if (wantProvider === 'openrouter' && openRouterKey) {
    const model =
      options?.userModel && OPENROUTER_APP_BUILDER_MODELS.some((m) => m.id === options.userModel)
        ? options.userModel
        : process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_CHAT;
    return {
      provider: 'openrouter',
      model,
      baseURL: OPENROUTER_BASE,
      client: new OpenAI({
        baseURL: OPENROUTER_BASE,
        apiKey: openRouterKey,
      }),
    };
  }

  // Groq (default)
  if ((wantProvider === 'groq' || !wantProvider) && groqKey) {
    const model = process.env.GROQ_MODEL || GROQ_MODEL;
    return {
      provider: 'groq',
      model,
      baseURL: GROQ_BASE,
      client: new OpenAI({
        baseURL: GROQ_BASE,
        apiKey: groqKey,
      }),
    };
  }

  // Fallback chain: try any available provider
  if (groqKey) {
    return {
      provider: 'groq',
      model: process.env.GROQ_MODEL || GROQ_MODEL,
      baseURL: GROQ_BASE,
      client: new OpenAI({ baseURL: GROQ_BASE, apiKey: groqKey }),
    };
  }
  if (openaiKey) {
    return {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || OPENAI_MODEL,
      baseURL: OPENAI_BASE,
      client: new OpenAI({ baseURL: OPENAI_BASE, apiKey: openaiKey }),
    };
  }
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || ANTHROPIC_MODEL,
      baseURL: ANTHROPIC_BASE,
      client: new OpenAI({
        baseURL: ANTHROPIC_BASE,
        apiKey: anthropicKey,
        defaultHeaders: { 'anthropic-version': '2023-06-01' },
      }),
    };
  }
  if (openRouterKey) {
    return {
      provider: 'openrouter',
      model: process.env.OPENROUTER_MODEL || OPENROUTER_MODEL_CHAT,
      baseURL: OPENROUTER_BASE,
      client: new OpenAI({ baseURL: OPENROUTER_BASE, apiKey: openRouterKey }),
    };
  }

  throw new Error(
    'No AI provider configured. Set one of: GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or OPENROUTER_API_KEY.'
  );
}

/**
 * Check if any AI provider is available.
 */
export function hasAIClient(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/**
 * Check if OpenRouter is available (so UI can show OpenRouter + DeepSeek Coder option).
 */
export function hasOpenRouter(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Check if OpenAI is available.
 */
export function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Check if Anthropic (Claude) is available.
 */
export function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
