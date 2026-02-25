import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/community/users/[id]/follow-status
 * Returns whether the current user is following the given user.
 * 401 if not authenticated; 200 with { isFollowing: boolean } otherwise.
 */
export async function GET(
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

    const { id: targetUserId } = await params;

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ isFollowing: false });
    }

    if (prismaUser.id === targetUserId) {
      return NextResponse.json({ isFollowing: false });
    }

    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: prismaUser.id,
          followingId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      isFollowing: !!follow,
    });
  } catch (error) {
    console.error('Error fetching follow status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow status' },
      { status: 500 }
    );
  }
}
