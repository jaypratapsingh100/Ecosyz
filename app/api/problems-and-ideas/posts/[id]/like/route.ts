import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

/** POST: toggle like on a post. Returns { liked: boolean, likeCount: number } */
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

    const { id: postId } = await params;

    const existing = await prisma.problemIdeaPostLike.findUnique({
      where: {
        postId_userId: { postId, userId: prismaUser.id },
      },
    });

    if (existing) {
      await prisma.problemIdeaPostLike.delete({
        where: { id: existing.id },
      });
      const likeCount = await prisma.problemIdeaPostLike.count({
        where: { postId },
      });
      return NextResponse.json({
        liked: false,
        likeCount,
      });
    }

    await prisma.problemIdeaPostLike.create({
      data: {
        postId,
        userId: prismaUser.id,
      },
    });

    const likeCount = await prisma.problemIdeaPostLike.count({
      where: { postId },
    });

    return NextResponse.json({
      liked: true,
      likeCount,
    });
  } catch (error) {
    console.error('Error toggling post like:', error);
    return NextResponse.json(
      { error: 'Failed to update like' },
      { status: 500 }
    );
  }
}
