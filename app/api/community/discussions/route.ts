import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { getCurrentUser } from '../../../../src/lib/auth';
import { CreateDiscussion } from '../../../../src/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const workspaceId = searchParams.get('workspaceId');
    const authorId = searchParams.get('authorId');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (groupId) {
      where.groupId = groupId;
    }
    
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }
    
    if (authorId) {
      where.authorId = authorId;
    }
    
    if (tag) {
      where.tags = { has: tag };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          workspace: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.discussion.count({ where }),
    ]);

    return NextResponse.json({
      discussions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parse = CreateDiscussion.safeParse(body);
    
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    // Ensure either groupId or workspaceId is provided, but not both
    if (!parse.data.groupId && !parse.data.workspaceId) {
      return NextResponse.json(
        { error: 'Either groupId or workspaceId must be provided' },
        { status: 400 }
      );
    }

    if (parse.data.groupId && parse.data.workspaceId) {
      return NextResponse.json(
        { error: 'Cannot specify both groupId and workspaceId' },
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

    // If groupId, verify user is a member
    if (parse.data.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: parse.data.groupId,
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

    // If workspaceId, verify user has access
    if (parse.data.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: parse.data.workspaceId },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }

      // For now, allow workspace owner only. Can be extended for shared workspaces
      if (workspace.ownerId !== prismaUser.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    const discussion = await prisma.discussion.create({
      data: {
        title: parse.data.title,
        content: parse.data.content,
        groupId: parse.data.groupId || null,
        workspaceId: parse.data.workspaceId || null,
        authorId: prismaUser.id,
        tags: parse.data.tags || [],
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
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        workspace: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        userId: prismaUser.id,
        type: 'discussion_created',
        entityType: 'discussion',
        entityId: discussion.id,
        title: `Created discussion "${discussion.title}"`,
      },
    });

    return NextResponse.json(discussion, { status: 201 });
  } catch (error) {
    console.error('Error creating discussion:', error);
    return NextResponse.json(
      { error: 'Failed to create discussion' },
      { status: 500 }
    );
  }
}






