import { NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fellow = await prisma.internFellow.findUnique({ where: { userId: prismaUser.id } });
    if (!fellow) {
      return NextResponse.json({ error: 'Not enrolled in fellowship' }, { status: 403 });
    }

    const payouts = await prisma.stipendPayout.findMany({
      where: { fellowId: fellow.id },
      include: {
        task: { select: { id: true, title: true } },
        milestone: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarned = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ payouts, totalEarned, totalPending });
  } catch (err) {
    console.error('[intern-fellowship/payouts]', err);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
