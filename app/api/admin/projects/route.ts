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

    const where: any = {};

    if (queryFilter) {
      where.OR = [
        { title: { contains: queryFilter, mode: 'insensitive' } },
        { owner: { email: { contains: queryFilter, mode: 'insensitive' } } },
        { owner: { name: { contains: queryFilter, mode: 'insensitive' } } },
      ];
    }

    const [projects, total] = await prisma.$transaction([
      prisma.appProject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          _count: {
            select: { files: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appProject.count({ where }),
    ]);

    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        type: p.type,
        framework: p.framework,
        isPublic: p.isPublic,
        deploymentUrl: p.deploymentUrl,
        deploymentStatus: p.deploymentStatus,
        deployedAt: p.deployedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        fileCount: p._count.files,
        owner: {
          id: p.owner.id,
          email: p.owner.email,
          name: p.owner.name,
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Admin projects error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load projects';

    return NextResponse.json(
      {
        error: 'Failed to load projects',
        ...(process.env.NODE_ENV === 'development' && { details: message }),
      },
      { status: 500 },
    );
  }
}
