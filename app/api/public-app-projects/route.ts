import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/src/lib/auth/server/get-current-user';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const safeLimit = Number.isNaN(limit) ? 20 : Math.min(Math.max(limit, 1), 50);
    const safePage = Number.isNaN(page) ? 1 : Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const currentUser = await getCurrentUser().catch(() => null);
    const currentUserId = currentUser?.id ?? null;

    const [projects, total] = await Promise.all([
      prisma.appProject.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          title: true,
          description: true,
          framework: true,
          appType: true,
          deploymentUrl: true,
          thumbnailUrl: true,
          createdAt: true,
          _count: {
            select: {
              appProjectUpvotes: true,
            },
          },
          appProjectUpvotes: currentUserId
            ? {
                where: {
                  userId: currentUserId,
                },
                select: {
                  id: true,
                },
              }
            : false,
          owner: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.appProject.count({
        where: { isPublic: true },
      }),
    ]);

    const mapped = projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      framework: p.framework,
      appType: p.appType,
      deploymentUrl: p.deploymentUrl,
      thumbnailUrl: p.thumbnailUrl,
      createdAt: p.createdAt,
      owner: p.owner,
      upvoteCount: p._count.appProjectUpvotes,
      userHasUpvoted: Array.isArray(p.appProjectUpvotes) ? p.appProjectUpvotes.length > 0 : false,
    }));

    return NextResponse.json({
      projects: mapped,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching public app projects:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Failed to fetch public projects';

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

