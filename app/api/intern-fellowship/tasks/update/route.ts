import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const fellow = await prisma.internFellow.findUnique({
      where: { userId: prismaUser.id },
    });
    if (!fellow) {
      return NextResponse.json({ error: 'Not enrolled in fellowship' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const taskId = (body.taskId as string)?.trim();
    const status = (body.status as string)?.trim();
    const note = (body.note as string)?.trim();
    const progress = typeof body.progress === 'number' ? Math.min(100, Math.max(0, body.progress)) : undefined;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const allowedStatuses = ['in_progress', 'submitted']; // 'approved'/'completed' are admin-only via /api/admin/interns/tasks/review
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    const task = await prisma.internTask.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (task.trackId !== fellow.trackId) {
      return NextResponse.json({ error: 'Task not in your track' }, { status: 403 });
    }
    if (task.fellowId && task.fellowId !== fellow.id) {
      return NextResponse.json({ error: 'Task assigned to another intern' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (note) {
      const prev = (task.description || '').trim();
      const timestamp = new Date().toLocaleString();
      updateData.description = prev
        ? `${prev}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;
    }
    if (!task.fellowId) updateData.fellowId = fellow.id;
    if (status === 'submitted' && progress === undefined) updateData.progress = 100;
    if (status === 'completed' || status === 'approved') updateData.progress = 100;

    let updated;
    try {
      updated = await prisma.internTask.update({
        where: { id: taskId },
        data: updateData,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('progress') || msg.includes('Unknown arg')) {
        delete updateData.progress;
        updated = await prisma.internTask.update({
          where: { id: taskId },
          data: updateData,
        });
      } else {
        throw e;
      }
    }

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error('[intern-fellowship/tasks/update]', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
