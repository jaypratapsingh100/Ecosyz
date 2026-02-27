import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { CreateAppProject } from '@/lib/validation';
import { getScaffoldFiles } from '@/app/lib/app-builder/scaffolds';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
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

    const body = await req.json();
    const parse = CreateAppProject.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    const project = await prisma.appProject.create({
      data: {
        ...parse.data,
        ownerId: prismaUser.id,
        previewVersion: parse.data.previewVersion || 'v2',
      },
    });

    // Create scaffold in one bulk insert so preview renders quickly (avoids N round-trips)
    try {
      const scaffoldFiles = getScaffoldFiles(project.framework || 'react', {
        projectTitle: project.title || 'My App',
      });
      await prisma.appFile.createMany({
        data: scaffoldFiles.map((f) => ({
          projectId: project.id,
          path: f.path,
          name: f.name,
          content: f.content ?? '',
          language: f.language ?? (f.path.endsWith('.css') ? 'css' : f.path.endsWith('.html') ? 'html' : 'jsx'),
          isMain: f.isMain ?? false,
        })),
      });
    } catch (scaffoldErr) {
      console.warn('[app-projects] Scaffold creation failed, project still created:', scaffoldErr);
      try {
        const fallback = getScaffoldFiles('react', { projectTitle: project.title || 'My App' });
        const appFile = fallback.find((f) => f.path.includes('App'));
        if (appFile) {
          await prisma.appFile.create({
            data: {
              projectId: project.id,
              path: appFile.path,
              name: appFile.name,
              content: appFile.content ?? '',
              language: appFile.language ?? 'jsx',
              isMain: true,
            },
          });
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
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

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    const safeLimit = Number.isNaN(limit) ? 50 : Math.min(Math.max(limit, 1), 100);
    const safePage = Number.isNaN(page) ? 1 : Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [projects, total] = await Promise.all([
      prisma.appProject.findMany({
        where: { ownerId: prismaUser.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          title: true,
          description: true,
          framework: true,
          createdAt: true,
          isPublic: true,
        },
      }),
      prisma.appProject.count({
        where: { ownerId: prismaUser.id },
      }),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project id is required' },
        { status: 400 },
      );
    }

    const project = await prisma.appProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 },
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 },
      );
    }

    await prisma.appProject.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting app project (collection route):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
