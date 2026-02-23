import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

type SavedNewsDelegate = PrismaClient['savedNews'];

function getSavedNewsModel(): SavedNewsDelegate {
  const model = (prisma as { savedNews?: SavedNewsDelegate }).savedNews;
  if (!model) {
    throw new Error(
      'SavedNews model not in Prisma client. Run: npx prisma generate && npx prisma migrate deploy'
    );
  }
  return model;
}

/** GET: list saved news for current user. Returns full items for saved page, or minimal { url, includeInNewsletter } for feed. */
export async function GET(req: NextRequest) {
  try {
    const savedNews = getSavedNewsModel();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ saved: [] });
    }
    const dbUser = await ensureUserInDb(user, { ensureWorkspace: false });
    const full = req.nextUrl.searchParams.get('full') === '1';
    const list = await savedNews.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      select: full
        ? { url: true, title: true, summary: true, source: true, category: true, imageUrl: true, includeInNewsletter: true, createdAt: true }
        : { url: true, includeInNewsletter: true },
    });
    return NextResponse.json({ saved: list });
  } catch (err) {
    console.error('[ai-news/saved GET]', err);
    return NextResponse.json({ saved: [] });
  }
}

/** POST: save a news item, optionally mark for newsletter */
export async function POST(req: NextRequest) {
  try {
    const savedNews = getSavedNewsModel();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to save news' },
        { status: 401 }
      );
    }
    const dbUser = await ensureUserInDb(user, { ensureWorkspace: false });
    const body = await req.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const includeInNewsletter = Boolean(body.includeInNewsletter);
    if (!url || !title) {
      return NextResponse.json(
        { error: 'url and title are required' },
        { status: 400 }
      );
    }
    const summary = typeof body.summary === 'string' ? body.summary.trim() : null;
    const source = typeof body.source === 'string' ? body.source.trim() : null;
    const category = typeof body.category === 'string' ? body.category.trim() : null;
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : null;

    await savedNews.upsert({
      where: {
        userId_url: { userId: dbUser.id, url },
      },
      create: {
        userId: dbUser.id,
        url,
        title,
        summary: summary ?? undefined,
        source: source ?? undefined,
        category: category ?? undefined,
        imageUrl: imageUrl ?? undefined,
        includeInNewsletter,
      },
      update: {
        title,
        ...(summary !== null && { summary }),
        ...(source !== null && { source }),
        ...(category !== null && { category }),
        ...(imageUrl !== null && { imageUrl }),
        includeInNewsletter,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ai-news/saved POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save';
    const status = message.includes('Prisma client') ? 503 : 500;
    return NextResponse.json(
      { error: message.includes('npx prisma') ? message : 'Failed to save' },
      { status }
    );
  }
}

/** DELETE: remove saved news (query ?url=...) */
export async function DELETE(req: NextRequest) {
  try {
    const savedNews = getSavedNewsModel();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to manage saved news' },
        { status: 401 }
      );
    }
    const dbUser = await ensureUserInDb(user, { ensureWorkspace: false });
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json(
        { error: 'url query is required' },
        { status: 400 }
      );
    }
    await savedNews.deleteMany({
      where: { userId: dbUser.id, url },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ai-news/saved DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to remove' },
      { status: 500 }
    );
  }
}
