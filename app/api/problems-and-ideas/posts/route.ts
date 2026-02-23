import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { CreateProblemIdeaPost } from '@/lib/validation';

function getProblemIdeaPostModel() {
  const model = (prisma as { problemIdeaPost?: typeof prisma.problemIdeaPost }).problemIdeaPost;
  if (!model) {
    throw new Error(
      'Database schema out of date. Run: npx prisma generate && npx prisma migrate deploy'
    );
  }
  return model;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const model = getProblemIdeaPostModel();
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    const currentUserId = prismaUser?.id ?? null;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const type = searchParams.get('type'); // optional filter: problem | idea
    const skip = (page - 1) * limit;

    const where: { type?: string } = {};
    if (type === 'problem' || type === 'idea') where.type = type;

    const include = {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    };

    const [posts, total] = await Promise.all([
      model.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      model.count({ where }),
    ]);

    const postsWithMeta = posts.map((p: { authorId: string; _count: { comments: number } }) => ({
      ...p,
      isOwn: p.authorId === currentUserId,
      likedByMe: false,
      likeCount: 0,
    }));

    return NextResponse.json({
      posts: postsWithMeta,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const cause = error instanceof Error && error.cause ? String(error.cause) : undefined;
    console.error('Error fetching problem/idea posts:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to fetch posts',
        ...(isDev && { details: message, cause }),
      },
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

    const body = await req.json();
    const parse = CreateProblemIdeaPost.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    const model = getProblemIdeaPostModel();
    const post = await model.create({
      data: {
        content: parse.data.content,
        type: parse.data.type,
        imageUrls: parse.data.imageUrls ?? [],
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
        _count: {
          select: { comments: true },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating problem/idea post:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to create post',
        ...(isDev && { details: message }),
      },
      { status: 500 }
    );
  }
}
