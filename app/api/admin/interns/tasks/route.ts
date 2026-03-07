import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * POST: Add task to a track (admin only)
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
    const milestoneId = (body.milestoneId as string)?.trim() || undefined;
    const title = (body.title as string)?.trim();
    const description = (body.description as string)?.trim();
    const stipend = typeof body.stipend === 'number' ? body.stipend : (body.stipend ? parseInt(String(body.stipend), 10) : undefined);
    const fellowId = (body.fellowId as string)?.trim() || undefined;
    const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;

    if (!trackId || !title) {
      return NextResponse.json(
        { error: 'trackId and title are required' },
        { status: 400 }
      );
    }

    const track = await prisma.internTrack.findUnique({
      where: { id: trackId },
    });
    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    if (milestoneId) {
      const milestone = await prisma.internMilestone.findFirst({
        where: { id: milestoneId, trackId },
      });
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found' },
          { status: 404 }
        );
      }
    }

    const task = await prisma.internTask.create({
      data: {
        trackId,
        milestoneId: milestoneId || undefined,
        fellowId: fellowId || undefined,
        title,
        description: description || undefined,
        stipend: stipend ?? undefined,
        dueDate,
        status: 'pending',
      },
      include: { track: true, milestone: true },
    });

    return NextResponse.json({ task });
  } catch (err) {
    console.error('[admin/interns/tasks]', err);
    return NextResponse.json(
      { error: 'Failed to add task' },
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
    const taskId = searchParams.get('id')?.trim();
    if (!taskId) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const task = await prisma.internTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.internTask.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/interns/tasks DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
