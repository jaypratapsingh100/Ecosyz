import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/subscriptions
 * Returns all subscribers, recent payments, and revenue stats.
 * Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Active subscribers
    const subscribers = await prisma.user.findMany({
      where: {
        OR: [
          { subscriptionStatus: 'active' },
          { subscriptionStatus: 'cancelled' },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        lastPaymentAmount: true,
        lastPaymentDate: true,
        referredByAffiliateCode: true,
        trialStartDate: true,
        trialEndDate: true,
      },
      orderBy: { subscriptionStartDate: 'desc' },
    });

    // Recent payments
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    // Revenue stats
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'captured' },
      _sum: { amount: true },
      _count: true,
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.payment.aggregate({
      where: {
        status: 'captured',
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      subscribers,
      payments,
      stats: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalPayments: totalRevenue._count,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        monthlyPayments: monthlyRevenue._count,
        activeSubscribers: subscribers.filter((s) => s.subscriptionStatus === 'active').length,
        cancelledSubscribers: subscribers.filter((s) => s.subscriptionStatus === 'cancelled').length,
      },
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
