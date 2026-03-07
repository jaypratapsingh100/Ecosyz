import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
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

    const fellow = await prisma.internFellow.findUnique({
      where: { userId: prismaUser.id },
      include: {
        track: {
          include: {
            subTracks: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!fellow) {
      return NextResponse.json({ fellow: null });
    }

    // All milestones for this track (ordered) with tasks
    const allMilestones = await prisma.internMilestone.findMany({
      where: { trackId: fellow.trackId },
      include: {
        tasks: {
          where: { OR: [{ fellowId: null }, { fellowId: fellow.id }] },
          orderBy: { createdAt: 'asc' },
        },
        subTrack: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Admin can manually unlock milestones for this intern
    const adminUnlocked: string[] = Array.isArray(fellow.unlockedMilestoneIds)
      ? (fellow.unlockedMilestoneIds as string[])
      : [];

    const isMilestoneComplete = (m: typeof allMilestones[number]) =>
      m.tasks.length > 0 && m.tasks.every((t) => t.status === 'completed' || t.status === 'approved');

    // First milestone always unlocked. Others unlock when all previous are complete,
    // OR when admin has manually unlocked them.
    const milestones = allMilestones.map((m, idx) => {
      const progressUnlocked =
        idx === 0 ||
        allMilestones.slice(0, idx).every(isMilestoneComplete);
      const unlocked = progressUnlocked || adminUnlocked.includes(m.id);

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        dueDate: m.dueDate,
        stipend: m.stipend,
        status: m.status,
        highlighted: m.highlighted,
        subTrack: m.subTrack ? { id: m.subTrack.id, name: m.subTrack.name } : null,
        isLocked: !unlocked,
        isCompleted: isMilestoneComplete(m),
        tasks: unlocked
          ? m.tasks.map((t) => ({
              ...t,
              progress: (t as Record<string, unknown>).progress ?? 0,
            }))
          : [],
      };
    });

    // Legacy tasks not under a milestone (always visible)
    const tasks = await prisma.internTask.findMany({
      where: {
        trackId: fellow.trackId,
        milestoneId: null,
        OR: [{ fellowId: null }, { fellowId: fellow.id }],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      fellow: {
        id: fellow.id,
        track: {
          id: fellow.track.id,
          slug: fellow.track.slug,
          name: fellow.track.name,
          stipendRange: fellow.track.stipendRange,
          subTracks: fellow.track.subTracks ?? [],
        },
        resumeUrl: fellow.resumeUrl,
        resumeParsed: fellow.resumeParsed,
        status: fellow.status,
        xp: fellow.xp,
        milestonesCompleted: fellow.milestonesCompleted,
        milestones,
        tasks,
      },
    });
  } catch (err) {
    console.error('[intern-fellowship/me]', err);
    return NextResponse.json(
      { error: 'Failed to fetch intern status' },
      { status: 500 }
    );
  }
}
