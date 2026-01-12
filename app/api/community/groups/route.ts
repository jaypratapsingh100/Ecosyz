import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CreateCommunityGroup } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get('isPublic');
    const topic = searchParams.get('topic');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true';
    } else {
      where.isPublic = true; // Default to public groups
    }
    
    if (topic) {
      where.topics = { has: topic };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.communityGroup.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              members: true,
              discussions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.communityGroup.count({ where }),
    ]);

    return NextResponse.json({
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
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
    const parse = CreateCommunityGroup.safeParse(body);
    
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    // Ensure user exists in database
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate slug from name if not provided
    let slug = parse.data.slug;
    if (!slug) {
      slug = parse.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Ensure slug is unique
    let finalSlug = slug;
    let counter = 1;
    while (true) {
      const existingGroup = await prisma.communityGroup.findUnique({
        where: { slug: finalSlug },
      });

      if (!existingGroup) {
        break;
      }

      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const group = await prisma.communityGroup.create({
      data: {
        ...parse.data,
        slug: finalSlug,
        creatorId: prismaUser.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            members: true,
            discussions: true,
          },
        },
      },
    });

    // Add creator as admin member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: prismaUser.id,
        role: 'admin',
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        userId: prismaUser.id,
        type: 'group_created',
        entityType: 'group',
        entityId: group.id,
        title: `Created group "${group.name}"`,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}

