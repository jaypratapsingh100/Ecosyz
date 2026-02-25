import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: projectId } = await params;

    const project = await prisma.appProject.findFirst({
      where: { id: projectId, isPublic: true },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or not public' }, { status: 404 });
    }

    const existing = await prisma.appProjectUpvote.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: prismaUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ ok: true, upvoted: true });
    }

    await prisma.appProjectUpvote.create({
      data: {
        projectId,
        userId: prismaUser.id,
      },
    });

    const count = await prisma.appProjectUpvote.count({
      where: { projectId },
    });

    return NextResponse.json({ ok: true, upvoted: true, count });
  } catch (error) {
    console.error('Error upvoting project:', error);
    return NextResponse.json({ error: 'Failed to upvote project' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: projectId } = await params;

    await prisma.appProjectUpvote.deleteMany({
      where: {
        projectId,
        userId: prismaUser.id,
      },
    });

    const count = await prisma.appProjectUpvote.count({
      where: { projectId },
    });

    return NextResponse.json({ ok: true, upvoted: false, count });
  } catch (error) {
    console.error('Error removing project upvote:', error);
    return NextResponse.json({ error: 'Failed to remove upvote' }, { status: 500 });
  }
}

