import { NextResponse } from 'next/server';
import {
  hasAIClient,
  hasOpenRouter,
  OPENROUTER_APP_BUILDER_MODELS,
  GROQ_APP_BUILDER_MODELS,
} from '@/lib/ai/provider';

/**
 * GET /api/app-projects/ai-options
 * Returns which AI providers/models are available for the app builder chat.
 * Used by the chat UI to show provider/model selector (Groq vs OpenRouter DeepSeek Coder).
 */
export async function GET() {
  const groqAvailable = !!process.env.GROQ_API_KEY;
  const openRouterAvailable = hasOpenRouter();
  const anyAvailable = hasAIClient();

  return NextResponse.json({
    groqAvailable,
    openRouterAvailable,
    anyAvailable,
    models: {
      groq: GROQ_APP_BUILDER_MODELS.map((m) => ({ id: m.id, label: m.label })),
      openrouter: OPENROUTER_APP_BUILDER_MODELS.map((m) => ({ id: m.id, label: m.label })),
    },
  });
}
