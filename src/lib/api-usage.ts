/**
 * Track external API requests for admin dashboard.
 * Categories: news (AI news APIs), search (resource providers), llm (Groq/OpenRouter).
 */

import { prisma } from './db';

export type ApiCategory = 'news' | 'search' | 'llm';

/** Daily request limits per provider (null = no strict published limit). */
export const DAILY_LIMITS: Record<string, number | null> = {
  // News APIs
  hackernews: null,       // HN Algolia – no official limit
  devto: null,           // Dev.to – no official limit
  gnews: 100,            // GNews free tier: 100 req/day
  // Search resource providers
  openalex: 100_000,     // OpenAlex – ~100k/day typical
  arxiv: 10_000,         // arXiv – 3 req/s, no daily cap; 10k safe
  zenodo: null,          // Zenodo – no strict limit
  swh: null,             // Software Heritage – no strict limit
  github: 5_000,         // GitHub – 5k/hr unauthenticated; treat as daily safe
  huggingface: null,     // Hugging Face – varies
  youtube: 10_000,       // YouTube Data API – 10k/day default
  hardware: null,
  oshwa: null,
  wikifactory: null,
  // LLM
  groq: 6_000,           // Groq free tier ~6k requests/day (varies)
  openrouter: null,      // OpenRouter – depends on key/credits
};

/**
 * Record one API request (fire-and-forget; does not block).
 */
export async function trackApiRequest(
  provider: string,
  category: ApiCategory
): Promise<void> {
  prisma.externalApiRequest
    .create({
      data: { provider: provider.toLowerCase(), category },
    })
    .catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[api-usage] track failed:', err);
      }
    });
}
