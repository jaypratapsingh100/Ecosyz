import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Create or find a conversation between the current user and another user,
// optionally scoped to a Gig or BarterAsk, and list all conversations for inbox.

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: prismaUser.id },
        },
      },
      include: {
        gig: {
          select: { id: true, title: true },
        },
        barterAsk: {
          select: { id: true, title: true },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Compute unread count per conversation for the current user
    const inboxItems = conversations.map((conv) => {
      const me = conv.participants.find((p) => p.userId === prismaUser.id);
      const lastReadAt = me?.readAt;

      const unreadCount = lastReadAt
        ? conv.messages.filter((m) => m.createdAt > lastReadAt).length
        : conv.messages.length;

      const lastMessage = conv.messages[0] ?? null;

      return {
        id: conv.id,
        gig: conv.gig,
        barterAsk: conv.barterAsk,
        participants: conv.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          avatarUrl: p.user.avatarUrl,
        })),
        lastMessage: lastMessage
          ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            sender: {
              id: lastMessage.sender.id,
              name: lastMessage.sender.name,
              avatarUrl: lastMessage.sender.avatarUrl,
            },
          }
          : null,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
      };
    });

    return NextResponse.json({ conversations: inboxItems });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[conversations] list error:', message);
    return NextResponse.json(
      { error: 'Failed to load conversations', details: message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      otherUserId,
      gigId,
      barterAskId,
    }: { otherUserId: string; gigId?: string; barterAskId?: string } = body;

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Missing otherUserId' },
        { status: 400 },
      );
    }

    if (gigId && barterAskId) {
      return NextResponse.json(
        { error: 'Conversation can be linked to either gigId or barterAskId, not both' },
        { status: 400 },
      );
    }

    // Ensure the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    });
    if (!otherUser) {
      return NextResponse.json(
        { error: 'Other user not found' },
        { status: 404 },
      );
    }

    // Try to find an existing conversation with same context and participants
    const existing = await prisma.conversation.findFirst({
      where: {
        gigId: gigId ?? null,
        barterAskId: barterAskId ?? null,
        participants: {
          every: {
            userId: { in: [prismaUser.id, otherUserId] },
          },
        },
      },
      include: {
        gig: { select: { id: true, title: true } },
        barterAsk: { select: { id: true, title: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        gig: existing.gig,
        barterAsk: existing.barterAsk,
        participants: existing.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          avatarUrl: p.user.avatarUrl,
        })),
      });
    }

    // Create a new conversation and participants
    const conversation = await prisma.conversation.create({
      data: {
        gigId: gigId ?? null,
        barterAskId: barterAskId ?? null,
        participants: {
          create: [
            { userId: prismaUser.id },
            { userId: otherUserId },
          ],
        },
      },
      include: {
        gig: { select: { id: true, title: true } },
        barterAsk: { select: { id: true, title: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: conversation.id,
      gig: conversation.gig,
      barterAsk: conversation.barterAsk,
      participants: conversation.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[conversations] create error:', message);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: message },
      { status: 500 },
    );
  }
}

