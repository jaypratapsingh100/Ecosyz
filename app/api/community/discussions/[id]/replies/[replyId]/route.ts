import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { UpdateDiscussionReply } from '@/lib/validation';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { replyId } = await params;
    const body = await req.json();
    const parse = UpdateDiscussionReply.safeParse(body);

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

    const reply = await prisma.discussionReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    if (reply.authorId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const updatedReply = await prisma.discussionReply.update({
      where: { id: replyId },
      data: parse.data,
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

    return NextResponse.json(updatedReply);
  } catch (error) {
    console.error('Error updating reply:', error);
    return NextResponse.json(
      { error: 'Failed to update reply' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { replyId } = await params;

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const reply = await prisma.discussionReply.findUnique({
      where: { id: replyId },
      include: {
        discussion: true,
      },
    });

    if (!reply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    // Check if user is author or admin/moderator
    let canDelete = reply.authorId === prismaUser.id;

    if (!canDelete && reply.discussion.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: reply.discussion.groupId,
            userId: prismaUser.id,
          },
        },
      });
      canDelete = member?.role === 'admin' || member?.role === 'moderator';
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.discussionReply.delete({
      where: { id: replyId },
    });

    return NextResponse.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    return NextResponse.json(
      { error: 'Failed to delete reply' },
      { status: 500 }
    );
  }
}






