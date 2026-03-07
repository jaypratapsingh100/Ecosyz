import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { INTERN_TRACKS, WHITEPAPER_SEED } from '@/lib/intern-tracks';

/**
 * POST: Seed all tracks, sub-tracks, milestones, and tasks from the
 * Open Idea Research Whitepaper data.  Admin-only, idempotent.
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stats = {
      tracksUpserted: 0,
      subTracksCreated: 0,
      milestonesCreated: 0,
      tasksCreated: 0,
    };

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
      stats.tracksUpserted++;
    }

    for (const trackSeed of WHITEPAPER_SEED) {
      const track = await prisma.internTrack.findUnique({
        where: { slug: trackSeed.trackSlug },
      });
      if (!track) continue;

      for (const stSeed of trackSeed.subTracks) {
        let subTrack = await prisma.internSubTrack.findFirst({
          where: { trackId: track.id, slug: stSeed.slug },
        });

        if (!subTrack) {
          subTrack = await prisma.internSubTrack.create({
            data: {
              trackId: track.id,
              slug: stSeed.slug,
              name: stSeed.name,
              description: stSeed.description,
              order: stSeed.order,
            },
          });
          stats.subTracksCreated++;
        }

        for (const mSeed of stSeed.milestones) {
          let milestone = await prisma.internMilestone.findFirst({
            where: {
              trackId: track.id,
              subTrackId: subTrack.id,
              title: mSeed.title,
            },
          });

          if (!milestone) {
            milestone = await prisma.internMilestone.create({
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
            stats.milestonesCreated++;
          }

          for (const tSeed of mSeed.tasks) {
            const existingTask = await prisma.internTask.findFirst({
              where: {
                trackId: track.id,
                milestoneId: milestone.id,
                title: tSeed.title,
              },
            });

            if (!existingTask) {
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
              stats.tasksCreated++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Whitepaper seed data applied successfully',
      stats,
    });
  } catch (err) {
    console.error('[admin/interns/seed-whitepaper]', err);
    return NextResponse.json(
      { error: 'Failed to seed whitepaper data' },
      { status: 500 },
    );
  }
}
