import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { INTERN_TRACKS } from '@/lib/intern-tracks';

/**
 * POST: Join fellowship with a track (creates InternFellow, resume optional)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const trackSlug = (body.track as string)?.trim() || 'platform-development';

    let track = await prisma.internTrack.findUnique({
      where: { slug: trackSlug },
    });
    if (!track) {
      const trackDef = INTERN_TRACKS.find((t) => t.slug === trackSlug);
      track = await prisma.internTrack.create({
        data: {
          slug: trackSlug,
          name: trackDef?.name || trackSlug,
          description: trackDef?.description || null,
          stipendRange: trackDef?.stipendRange || null,
        },
      });
    }

    const existing = await prisma.internFellow.findUnique({
      where: { userId: prismaUser.id },
      include: { track: true },
    });
    if (existing) {
      if (existing.trackId !== track.id) {
        return NextResponse.json(
          { error: 'You have already selected a track. Cannot change.' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        fellow: {
          id: existing.id,
          track: existing.track,
          resumeUrl: existing.resumeUrl,
          status: existing.status,
        },
      });
    }

    const fellow = await prisma.internFellow.create({
      data: {
        userId: prismaUser.id,
        trackId: track.id,
        status: 'active',
      },
      include: { track: true },
    });

    return NextResponse.json({
      success: true,
      fellow: {
        id: fellow.id,
        track: fellow.track,
        resumeUrl: fellow.resumeUrl,
        status: fellow.status,
      },
    });
  } catch (err) {
    console.error('[intern-fellowship/join]', err);
    const message = err instanceof Error ? err.message : 'Failed to join fellowship';
    const isPrismaTableMissing = typeof message === 'string' && (
      message.includes('does not exist') ||
      message.includes('relation') ||
      message.includes('Unknown arg')
    );
    return NextResponse.json(
      {
        error: isPrismaTableMissing
          ? 'Database migration required. Run: npx prisma migrate deploy'
          : process.env.NODE_ENV === 'development' ? message : 'Failed to join fellowship',
      },
      { status: 500 }
    );
  }
}
