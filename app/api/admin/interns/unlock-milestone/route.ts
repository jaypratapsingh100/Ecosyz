import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

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
    const fellowId = (body.fellowId as string)?.trim();
    const milestoneId = (body.milestoneId as string)?.trim();
    const unlock = body.unlock !== false; // default true

    if (!fellowId || !milestoneId) {
      return NextResponse.json({ error: 'fellowId and milestoneId are required' }, { status: 400 });
    }

    const fellow = await prisma.internFellow.findUnique({ where: { id: fellowId } });
    if (!fellow) {
      return NextResponse.json({ error: 'Intern not found' }, { status: 404 });
    }

    const milestone = await prisma.internMilestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const current = Array.isArray(fellow.unlockedMilestoneIds)
      ? (fellow.unlockedMilestoneIds as string[])
      : [];

    let updated: string[];
    if (unlock) {
      updated = current.includes(milestoneId) ? current : [...current, milestoneId];
    } else {
      updated = current.filter((id) => id !== milestoneId);
    }

    await prisma.internFellow.update({
      where: { id: fellowId },
      data: { unlockedMilestoneIds: updated },
    });

    return NextResponse.json({ success: true, unlockedMilestoneIds: updated });
  } catch (err) {
    console.error('[admin/interns/unlock-milestone]', err);
    return NextResponse.json({ error: 'Failed to update milestone unlock' }, { status: 500 });
  }
}
