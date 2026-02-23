import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const RECENT_LIMIT = 5;

function getSessionId(req: NextRequest): string {
  const header = req.headers.get('x-openresources-session');
  if (header) return header;
  const url = new URL(req.url);
  const s = url.searchParams.get('sessionId');
  if (s) return s;
  return 'anonymous';
}

function normalizeMessages(messages: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(messages)) return [];
  return messages.map((m: Record<string, unknown> & { timestamp?: string }) => ({
    ...m,
    timestamp: m.timestamp ?? undefined,
  }));
}

/** GET: list recent 5 chats for session, or get one chat by query (?q=) */
export async function GET(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || String(RECENT_LIMIT), 10) || RECENT_LIMIT, 20);

    if (q !== null && q !== undefined && q !== '') {
      const chat = await prisma.openResourcesChat.findUnique({
        where: { sessionId_searchQuery: { sessionId, searchQuery: q } },
      });
      if (!chat) {
        return NextResponse.json({ chat: null });
      }
      return NextResponse.json({
        chat: {
          id: chat.id,
          searchQuery: chat.searchQuery,
          messages: normalizeMessages(chat.messages),
          updatedAt: chat.updatedAt,
        },
      });
    }

    const chats = await prisma.openResourcesChat.findMany({
      where: { sessionId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      chats: chats.map((c) => ({
        id: c.id,
        searchQuery: c.searchQuery,
        messages: normalizeMessages(c.messages),
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    console.error('GET openresources-chats:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list chats' },
      { status: 500 }
    );
  }
}

/** POST: upsert chat for (sessionId, searchQuery); rest stay in DB */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : getSessionId(req);
    const searchQuery = typeof body.searchQuery === 'string' ? body.searchQuery : '';
    const rawMessages = body.messages;

    if (!searchQuery) {
      return NextResponse.json({ error: 'searchQuery is required' }, { status: 400 });
    }

    const messages = Array.isArray(rawMessages)
      ? rawMessages.map((m: { timestamp?: Date | string }) => ({
          ...m,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp ?? new Date().toISOString()),
        }))
      : [];

    const chat = await prisma.openResourcesChat.upsert({
      where: { sessionId_searchQuery: { sessionId, searchQuery } },
      create: { sessionId, searchQuery, messages },
      update: { messages, updatedAt: new Date() },
    });

    return NextResponse.json({ id: chat.id, updatedAt: chat.updatedAt });
  } catch (e) {
    console.error('POST openresources-chats:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save chat' },
      { status: 500 }
    );
  }
}
