import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * GET: List all office interns (admin only)
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

    const fellows = await prisma.internFellow.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        track: true,
        tasks: { orderBy: { createdAt: 'desc' } },
        payouts: {
          where: { status: 'pending' },
          select: { id: true, amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = fellows.map((f) => ({
      ...f,
      unlockedMilestoneIds: Array.isArray(f.unlockedMilestoneIds)
        ? f.unlockedMilestoneIds
        : [],
      pendingPayoutsCount: f.payouts.length,
      pendingPayoutsAmount: f.payouts.reduce((sum, p) => sum + p.amount, 0),
    }));

    return NextResponse.json({ fellows: mapped });
  } catch (err) {
    console.error('[admin/interns]', err);
    return NextResponse.json(
      { error: 'Failed to fetch interns' },
      { status: 500 }
    );
  }
}
