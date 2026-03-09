/**
 * AI Provider Abstraction — Lovable/Replit-style App Builder
 *
 * Supported providers:
 * - Groq (default): Llama 3.3 — GROQ_API_KEY
 * - OpenRouter: Gemini Flash/Pro, DeepSeek, Qwen Coder, Llama, etc. — OPENROUTER_API_KEY
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
const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.5-flash';
const OPENAI_MODEL = 'gpt-4o';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

/**
 * OpenRouter model list (internal — used by createAIClient for validation).
 * All non-Groq, non-direct-OpenAI, non-direct-Anthropic models route through OpenRouter.
 */
export const OPENROUTER_APP_BUILDER_MODELS = [
  // Google
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  // DeepSeek
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
  { id: 'deepseek/deepseek-coder', label: 'DeepSeek Coder' },
  // Qwen
  { id: 'qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B' },
  // Meta
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
  // Mistral
  { id: 'mistralai/mistral-large', label: 'Mistral Large' },
  { id: 'mistralai/codestral-latest', label: 'Codestral' },
  // Claude & GPT via OpenRouter
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
] as const;

/** Allowed Groq model IDs — free tier. */
export const GROQ_APP_BUILDER_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
] as const;

/** Allowed OpenAI model IDs (direct key). */
export const OPENAI_APP_BUILDER_MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
] as const;

/** Allowed Anthropic (Claude) model IDs (direct key). */
export const ANTHROPIC_APP_BUILDER_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
] as const;

/**
 * Provider groups for the UI — maps user-facing provider names to models.
 * These all route through OpenRouter on the backend.
 */
export const PROVIDER_GROUPS = [
  {
    provider: 'google',
    label: 'Google',
    models: [
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    models: [
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
      { id: 'deepseek/deepseek-coder', label: 'DeepSeek Coder' },
    ],
  },
  {
    provider: 'meta',
    label: 'Meta',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
    ],
  },
  {
    provider: 'mistral',
    label: 'Mistral',
    models: [
      { id: 'mistralai/mistral-large', label: 'Mistral Large' },
      { id: 'mistralai/codestral-latest', label: 'Codestral' },
    ],
  },
  {
    provider: 'qwen',
    label: 'Qwen',
    models: [
      { id: 'qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B' },
    ],
  },
  {
    provider: 'anthropic-or',
    label: 'Anthropic',
    models: [
      { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
    ],
  },
  {
    provider: 'openai-or',
    label: 'OpenAI',
    models: [
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
    ],
  },
] as const;

/**
 * Max output tokens — model-aware for OpenRouter, fixed for direct providers.
 * Gemini Flash/Pro: 65K max — we use 16K for app generation.
 * DeepSeek via proxy: 8K to keep responses fast.
 * Qwen Coder: 8K limit.
 * Llama/Mistral/Claude/GPT via OR: 16K.
 */
export function getMaxOutputTokens(provider: AIProvider, model?: string): number {
  if (provider === 'openrouter' && model) {
    // Gemini models — fast with high output limits
    if (model.startsWith('google/gemini')) return 16384;
    // Claude/GPT via OpenRouter
    if (model.startsWith('anthropic/') || model.startsWith('openai/')) return 16384;
    // Llama, Mistral — 16K output
    if (model.startsWith('meta-llama/') || model.startsWith('mistralai/')) return 16384;
    // DeepSeek — keep lower for speed through proxy
    if (model.startsWith('deepseek/')) return 8192;
    // Qwen Coder — 8K max
    if (model.startsWith('qwen/')) return 8192;
    return 8192;
  }
  switch (provider) {
    case 'anthropic': return 16384;
    case 'openai': return 16384;
    case 'groq': return 16384;
    case 'openrouter': return 8192;
    default: return 8192;
  }
}

/**
 * Check if a model is slow (needs fast-path: skip planner/architect, use compact prompt).
 * DeepSeek via OpenRouter proxy is slow. Gemini, Llama, Claude via OR are fast.
 */
export function isSlowProvider(provider: AIProvider, model?: string): boolean {
  if (provider !== 'openrouter') return false;
  if (!model) return true; // default cautious
  // These are fast even via OpenRouter
  if (model.startsWith('google/gemini')) return false;
  if (model.startsWith('anthropic/')) return false;
  if (model.startsWith('openai/')) return false;
  if (model.startsWith('meta-llama/')) return false;
  if (model.startsWith('mistralai/')) return false;
  // DeepSeek and Qwen via proxy are slow
  return true;
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

  // OpenRouter — 3 min timeout to prevent indefinite waits
  if (wantProvider === 'openrouter' && openRouterKey) {
    const model =
      options?.userModel && OPENROUTER_APP_BUILDER_MODELS.some((m) => m.id === options.userModel)
        ? options.userModel
        : process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL;
    return {
      provider: 'openrouter',
      model,
      baseURL: OPENROUTER_BASE,
      client: new OpenAI({
        baseURL: OPENROUTER_BASE,
        apiKey: openRouterKey,
        timeout: 180_000, // 3 min — prevents 10+ min hangs
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
      model: process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL,
      baseURL: OPENROUTER_BASE,
      client: new OpenAI({ baseURL: OPENROUTER_BASE, apiKey: openRouterKey, timeout: 180_000 }),
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
