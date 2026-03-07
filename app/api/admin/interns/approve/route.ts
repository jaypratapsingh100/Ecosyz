import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * POST: Approve a fellow (change status from pending_approval to active)
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
    const fellowId = (body.fellowId as string)?.trim();
    if (!fellowId) {
      return NextResponse.json({ error: 'fellowId is required' }, { status: 400 });
    }

    const fellow = await prisma.internFellow.findUnique({ where: { id: fellowId } });
    if (!fellow) {
      return NextResponse.json({ error: 'Fellow not found' }, { status: 404 });
    }

    await prisma.internFellow.update({
      where: { id: fellowId },
      data: { status: 'active' },
    });

    return NextResponse.json({ success: true, status: 'active' });
  } catch (err) {
    console.error('[admin/interns/approve]', err);
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }
}
