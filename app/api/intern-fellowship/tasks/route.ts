import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET: Fetch tasks for the current intern (by their track)
 */
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
      include: { track: true },
    });

    if (!fellow) {
      return NextResponse.json({ tasks: [], track: null });
    }

    // Tasks for this track (either assigned to this fellow or track-level)
    const tasks = await prisma.internTask.findMany({
      where: {
        trackId: fellow.trackId,
        OR: [{ fellowId: null }, { fellowId: fellow.id }],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      tasks,
      track: fellow.track,
    });
  } catch (err) {
    console.error('[intern-fellowship/tasks]', err);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
