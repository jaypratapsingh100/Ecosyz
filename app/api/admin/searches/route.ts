import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10) || 50;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 200);
    const queryFilter = searchParams.get('q')?.trim() || '';

    const where: Parameters<typeof prisma.searchLog.findMany>[0]['where'] = {};

    if (queryFilter) {
      where.query = {
        contains: queryFilter,
        mode: 'insensitive',
      };
    }

    const [logs, total] = await prisma.$transaction([
      prisma.searchLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.searchLog.count({ where }),
    ]);

    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        query: log.query,
        resourceType: log.resourceType,
        resultCount: log.resultCount,
        clicked: log.clicked,
        clickedResourceId: log.clickedResourceId,
        providers: log.providers,
        createdAt: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              email: log.user.email,
              name: log.user.name,
            }
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Admin searches error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load searches';

    return NextResponse.json(
      {
        error: 'Failed to load searches',
        ...(process.env.NODE_ENV === 'development' && { details: message }),
      },
      { status: 500 },
    );
  }
}

