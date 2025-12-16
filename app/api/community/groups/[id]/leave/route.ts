import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../../src/lib/auth';

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

    const { id } = await params;

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const group = await prisma.communityGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (group.creatorId === prismaUser.id) {
      return NextResponse.json(
        { error: 'Group creator cannot leave the group' },
        { status: 400 }
      );
    }

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: prismaUser.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this group' },
        { status: 400 }
      );
    }

    await prisma.groupMember.delete({
      where: {
        id: member.id,
      },
    });

    return NextResponse.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    );
  }
}


