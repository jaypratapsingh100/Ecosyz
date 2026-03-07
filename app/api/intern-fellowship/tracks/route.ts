import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { INTERN_TRACKS } from '@/lib/intern-tracks';

/**
 * GET: List all fellowship tracks with sub-tracks and milestones (ensures seeded)
 */
export async function GET() {
  try {
    let tracks = await prisma.internTrack.findMany({
      include: {
        subTracks: {
          include: {
            milestones: {
              include: { tasks: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { slug: 'asc' },
    });

    if (tracks.length === 0) {
      for (const t of INTERN_TRACKS) {
        await prisma.internTrack.create({
          data: {
            slug: t.slug,
            name: t.name,
            description: t.description,
            stipendRange: t.stipendRange,
          },
        });
      }
      tracks = await prisma.internTrack.findMany({
        include: {
          subTracks: {
            include: {
              milestones: {
                include: { tasks: true },
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { slug: 'asc' },
      });
    }

    return NextResponse.json({ tracks });
  } catch (err) {
    console.error('[intern-fellowship/tracks]', err);
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    );
  }
}
