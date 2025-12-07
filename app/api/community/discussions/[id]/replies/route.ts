import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../../src/lib/auth';
import { CreateDiscussionReply } from '../../../../../../src/lib/validation';

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
    const body = await req.json();
    const parse = CreateDiscussionReply.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    if (discussion.isLocked) {
      return NextResponse.json(
        { error: 'Discussion is locked' },
        { status: 403 }
      );
    }

    // If group discussion, verify user is a member
    if (discussion.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: discussion.groupId,
            userId: prismaUser.id,
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Not a member of this group' },
          { status: 403 }
        );
      }
    }

    // If workspace discussion, verify user has access
    if (discussion.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: discussion.workspaceId },
      });

      if (!workspace || workspace.ownerId !== prismaUser.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    const reply = await prisma.discussionReply.create({
      data: {
        discussionId: id,
        content: parse.data.content,
        authorId: prismaUser.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        userId: prismaUser.id,
        type: 'reply_added',
        entityType: 'discussion',
        entityId: id,
        title: `Replied to discussion`,
      },
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}

