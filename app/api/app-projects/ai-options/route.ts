import { NextResponse } from 'next/server';
import {
  hasAIClient,
  hasOpenRouter,
  hasOpenAI,
  hasAnthropic,
  GROQ_APP_BUILDER_MODELS,
  OPENAI_APP_BUILDER_MODELS,
  ANTHROPIC_APP_BUILDER_MODELS,
  PROVIDER_GROUPS,
} from '@/lib/ai/provider';

/**
 * GET /api/app-projects/ai-options
 * Returns which AI providers/models are available for the app builder chat.
 * Used by the chat UI to show provider/model selector.
 *
 * Response shape:
 *   groqAvailable, openRouterAvailable, openaiAvailable, anthropicAvailable
 *   providers: [{ provider, label, models: [{id, label}], available, backend }]
 */
export async function GET() {
  const groqAvailable = !!process.env.GROQ_API_KEY;
  const openRouterAvailable = hasOpenRouter();
  const openaiAvailable = hasOpenAI();
  const anthropicAvailable = hasAnthropic();
  const anyAvailable = hasAIClient();

  // Build unified provider list for the UI
  // First: Groq (free)
  const providers: Array<{
    provider: string;
    label: string;
    models: Array<{ id: string; label: string }>;
    available: boolean;
    backend: string; // actual backend used: 'groq' | 'openrouter' | 'openai' | 'anthropic'
    free?: boolean;
  }> = [
    {
      provider: 'groq',
      label: 'Groq (Free)',
      models: GROQ_APP_BUILDER_MODELS.map((m) => ({ id: m.id, label: m.label })),
      available: groqAvailable,
      backend: 'groq',
      free: true,
    },
  ];

  // Add OpenRouter-backed providers (Google, DeepSeek, Meta, etc.)
  for (const group of PROVIDER_GROUPS) {
    providers.push({
      provider: group.provider,
      label: group.label,
      models: group.models.map((m) => ({ id: m.id, label: m.label })),
      available: openRouterAvailable,
      backend: 'openrouter',
    });
  }

  // Add direct-key providers (OpenAI, Anthropic) if keys are set
  if (openaiAvailable) {
    providers.push({
      provider: 'openai-direct',
      label: 'OpenAI (Direct)',
      models: OPENAI_APP_BUILDER_MODELS.map((m) => ({ id: m.id, label: m.label })),
      available: true,
      backend: 'openai',
    });
  }
  if (anthropicAvailable) {
    providers.push({
      provider: 'anthropic-direct',
      label: 'Anthropic (Direct)',
      models: ANTHROPIC_APP_BUILDER_MODELS.map((m) => ({ id: m.id, label: m.label })),
      available: true,
      backend: 'anthropic',
    });
  }

  return NextResponse.json({
    groqAvailable,
    openRouterAvailable,
    openaiAvailable,
    anthropicAvailable,
    anyAvailable,
    providers,
  });
}
