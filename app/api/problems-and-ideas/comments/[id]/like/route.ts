import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

/** POST: toggle like on a comment. Returns { liked: boolean, likeCount: number } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: commentId } = await params;

    const existing = await prisma.problemIdeaCommentLike.findUnique({
      where: {
        commentId_userId: { commentId, userId: prismaUser.id },
      },
    });

    if (existing) {
      await prisma.problemIdeaCommentLike.delete({
        where: { id: existing.id },
      });
      const likeCount = await prisma.problemIdeaCommentLike.count({
        where: { commentId },
      });
      return NextResponse.json({
        liked: false,
        likeCount,
      });
    }

    await prisma.problemIdeaCommentLike.create({
      data: {
        commentId,
        userId: prismaUser.id,
      },
    });

    const likeCount = await prisma.problemIdeaCommentLike.count({
      where: { commentId },
    });

    return NextResponse.json({
      liked: true,
      likeCount,
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json(
      { error: 'Failed to update like' },
      { status: 500 }
    );
  }
}
