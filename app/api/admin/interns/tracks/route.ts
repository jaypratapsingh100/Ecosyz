import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { INTERN_TRACKS, WHITEPAPER_SEED } from '@/lib/intern-tracks';

/**
 * Seed whitepaper-derived sub-tracks, milestones, and tasks once.
 * Skips rows that already exist (idempotent).
 */
async function ensureWhitepaperSeed() {
  const subTrackCount = await prisma.internSubTrack.count();
  if (subTrackCount > 0) return; // already seeded

  for (const trackSeed of WHITEPAPER_SEED) {
    const track = await prisma.internTrack.findUnique({
      where: { slug: trackSeed.trackSlug },
    });
    if (!track) continue;

    for (const stSeed of trackSeed.subTracks) {
      const subTrack = await prisma.internSubTrack.create({
        data: {
          trackId: track.id,
          slug: stSeed.slug,
          name: stSeed.name,
          description: stSeed.description,
          order: stSeed.order,
        },
      });

      for (const mSeed of stSeed.milestones) {
        const milestone = await prisma.internMilestone.create({
          data: {
            trackId: track.id,
            subTrackId: subTrack.id,
            title: mSeed.title,
            description: mSeed.description,
            order: mSeed.order,
            stipend: mSeed.stipend,
            highlighted: mSeed.highlighted ?? false,
          },
        });

        for (const tSeed of mSeed.tasks) {
          await prisma.internTask.create({
            data: {
              trackId: track.id,
              milestoneId: milestone.id,
              title: tSeed.title,
              description: tSeed.description,
              stipend: tSeed.stipend,
              status: 'pending',
            },
          });
        }
      }
    }
  }
}

/**
 * GET: List all tracks (admin - includes fellow counts)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Ensure all tracks from INTERN_TRACKS exist (upsert missing ones)
    for (const t of INTERN_TRACKS) {
      await prisma.internTrack.upsert({
        where: { slug: t.slug },
        create: {
          slug: t.slug,
          name: t.name,
          description: t.description,
          stipendRange: t.stipendRange,
        },
        update: {
          name: t.name,
          description: t.description,
          stipendRange: t.stipendRange,
        },
      });
    }

    // Auto-seed whitepaper-derived sub-tracks, milestones, and tasks on first load
    await ensureWhitepaperSeed();

    const tracks = await prisma.internTrack.findMany({
      include: {
        _count: { select: { fellows: true, tasks: true } },
        subTracks: {
          include: {
            milestones: { include: { tasks: true }, orderBy: { order: 'asc' } },
            _count: { select: { milestones: true } },
          },
          orderBy: { order: 'asc' },
        },
        milestones: {
          where: { subTrackId: null },
          include: { tasks: true },
          orderBy: { order: 'asc' },
        },
        tasks: { where: { milestoneId: null }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json({ tracks });
  } catch (err) {
    console.error('[admin/interns/tracks]', err);
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}
