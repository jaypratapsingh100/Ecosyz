/**
 * AI Provider Abstraction — Lovable/Replit-style App Builder
 *
 * Supported providers:
 * - Groq (default): Llama 3.3 — GROQ_API_KEY
 * - OpenRouter: DeepSeek Chat, DeepSeek Coder — OPENROUTER_API_KEY
 *
 * User can select provider and model from the chat UI (userProvider, userModel in request body).
 */

import OpenAI from 'openai';

export type AIProvider = 'openrouter' | 'groq';

export interface AIClientConfig {
  provider: AIProvider;
  model: string;
  client: OpenAI;
  baseURL: string;
}

/** Options to override default provider/model (from chat request body). */
export interface AIClientOptions {
  userProvider?: 'groq' | 'openrouter';
  userModel?: string;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL_CHAT = 'deepseek/deepseek-chat-v3-0324';
const OPENROUTER_MODEL_CODER = 'deepseek/deepseek-coder';

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

/**
 * Create AI client. If userProvider/userModel are provided and valid, use them; else use env default.
 * OpenRouter is activated when OPENROUTER_API_KEY is set; user can select "OpenRouter" + "DeepSeek Coder" in UI.
 */
export function createAIClient(options?: AIClientOptions): AIClientConfig {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const wantOpenRouter = options?.userProvider === 'openrouter';
  const wantGroq = options?.userProvider === 'groq' || !options?.userProvider;

  if (wantOpenRouter && openRouterKey) {
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

  if ((wantGroq || !openRouterKey) && groqKey) {
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

  if (openRouterKey) {
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

/**
 * Check if OpenRouter is available (so UI can show OpenRouter + DeepSeek Coder option).
 */
export function hasOpenRouter(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
