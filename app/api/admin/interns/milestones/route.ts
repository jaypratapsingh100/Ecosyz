import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * POST: Add milestone (admin only)
 * Milestone has dueDate and stipend. Can be under track or sub-track.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const trackId = (body.trackId as string)?.trim();
    const subTrackId = (body.subTrackId as string)?.trim() || undefined;
    const title = (body.title as string)?.trim();
    const description = (body.description as string)?.trim();
    const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    const stipend = typeof body.stipend === 'number' ? body.stipend : (body.stipend ? parseInt(String(body.stipend), 10) : undefined);

    if (!trackId || !title) {
      return NextResponse.json(
        { error: 'trackId and title are required' },
        { status: 400 }
      );
    }

    const track = await prisma.internTrack.findUnique({ where: { id: trackId } });
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    if (subTrackId) {
      const sub = await prisma.internSubTrack.findFirst({
        where: { id: subTrackId, trackId },
      });
      if (!sub) {
        return NextResponse.json({ error: 'Sub-track not found' }, { status: 404 });
      }
    }

    const milestone = await prisma.internMilestone.create({
      data: {
        trackId,
        subTrackId: subTrackId || undefined,
        title,
        description: description || undefined,
        dueDate,
        stipend: stipend ?? undefined,
      },
      include: { track: true, subTrack: true },
    });

    return NextResponse.json({ milestone });
  } catch (err) {
    console.error('[admin/interns/milestones]', err);
    return NextResponse.json(
      { error: 'Failed to add milestone' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Milestone id is required' }, { status: 400 });
    }

    const milestone = await prisma.internMilestone.findUnique({ where: { id } });
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    await prisma.internMilestone.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/interns/milestones DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
}
