import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, paid, paidThisMonth, failed] = await Promise.all([
      prisma.stipendPayout.aggregate({
        where: { status: 'pending' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.stipendPayout.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.stipendPayout.aggregate({
        where: { status: 'paid', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.stipendPayout.aggregate({
        where: { status: 'failed' },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      pendingCount: pending._count,
      pendingAmount: pending._sum.amount || 0,
      totalPaidCount: paid._count,
      totalPaidAmount: paid._sum.amount || 0,
      paidThisMonthCount: paidThisMonth._count,
      paidThisMonthAmount: paidThisMonth._sum.amount || 0,
      failedCount: failed._count,
    });
  } catch (err) {
    console.error('[admin/interns/payouts/summary]', err);
    return NextResponse.json({ error: 'Failed to fetch payout summary' }, { status: 500 });
  }
}
