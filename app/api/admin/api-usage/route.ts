import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { DAILY_LIMITS } from '@/lib/api-usage';

const KNOWN_PROVIDERS: Array<{ provider: string; category: string }> = [
  { provider: 'hackernews', category: 'news' },
  { provider: 'devto', category: 'news' },
  { provider: 'gnews', category: 'news' },
  { provider: 'openalex', category: 'search' },
  { provider: 'arxiv', category: 'search' },
  { provider: 'zenodo', category: 'search' },
  { provider: 'swh', category: 'search' },
  { provider: 'github', category: 'search' },
  { provider: 'huggingface', category: 'search' },
  { provider: 'youtube', category: 'search' },
  { provider: 'hardware', category: 'search' },
  { provider: 'oshwa', category: 'search' },
  { provider: 'wikifactory', category: 'search' },
  { provider: 'groq', category: 'llm' },
  { provider: 'openrouter', category: 'llm' },
];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let counts: Array<{ provider: string; category: string; _count: { id: number } }>;
    try {
      counts = await prisma.externalApiRequest.groupBy({
        by: ['provider', 'category'],
        where: { requestedAt: { gte: startOfToday } },
        _count: { id: true },
      });
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      const isMissingTable =
        msg.includes('ExternalApiRequest') ||
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        (typeof (dbError as { code?: string })?.code === 'string' && (dbError as { code: string }).code === 'P2021');
      if (isMissingTable) {
        console.warn('API usage: ExternalApiRequest table missing. Run: pnpm prisma migrate deploy');
        counts = [];
      } else {
        console.error('Admin API usage DB error:', dbError);
        throw dbError;
      }
    }

    const usage = counts.map(({ provider, category, _count }) => {
      const limit = DAILY_LIMITS[provider] ?? null;
      const countToday = _count.id;
      const status =
        limit == null ? 'ok' : countToday >= limit ? 'over' : countToday >= limit * 0.9 ? 'near' : 'ok';
      return { provider, category, countToday, dailyLimit: limit, status };
    });

    const byKey = new Map(usage.map((u) => [`${u.provider}:${u.category}`, u]));
    for (const { provider, category } of KNOWN_PROVIDERS) {
      const key = `${provider}:${category}`;
      if (!byKey.has(key)) {
        const limit = DAILY_LIMITS[provider] ?? null;
        byKey.set(key, { provider, category, countToday: 0, dailyLimit: limit, status: 'ok' });
      }
    }

    const fullUsage = Array.from(byKey.values()).sort(
      (a, b) => a.category.localeCompare(b.category) || a.provider.localeCompare(b.provider)
    );

    return NextResponse.json({
      usage: fullUsage,
      dailyLimits: DAILY_LIMITS,
      asOf: now.toISOString(),
    });
  } catch (error) {
    console.error('Admin API usage error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load API usage';
    return NextResponse.json(
      {
        error: 'Failed to load API usage',
        ...(process.env.NODE_ENV === 'development' && { details: message }),
      },
      { status: 500 }
    );
  }
}
