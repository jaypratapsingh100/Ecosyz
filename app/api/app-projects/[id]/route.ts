import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { UpdateAppProject } from '@/lib/validation';

export async function GET(
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

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error in GET project:', dbError);
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check your DATABASE_URL.',
          code: 'DATABASE_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }

    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: any) {
      console.error('Database query error in GET project:', dbError);
      return NextResponse.json(
        { 
          error: 'Database query failed. Please check your DATABASE_URL.',
          code: 'DATABASE_QUERY_ERROR'
        },
        { status: 503 }
      );
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    let project;
    try {
      project = await prisma.appProject.findUnique({
        where: { id },
        include: {
          files: {
            orderBy: { path: 'asc' },
          },
        },
      });
    } catch (dbError: any) {
      console.error('Database query error fetching project:', dbError);
      return NextResponse.json(
        { 
          error: 'Database query failed. Please check your DATABASE_URL.',
          code: 'DATABASE_QUERY_ERROR',
          details: dbError?.message
        },
        { status: 503 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error fetching app project:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parse = UpdateAppProject.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.message },
        { status: 400 }
      );
    }

    const updated = await prisma.appProject.update({
      where: { id },
      data: {
        ...(parse.data.title && { title: parse.data.title }),
        ...(parse.data.description !== undefined && { description: parse.data.description }),
        ...(parse.data.config !== undefined && { config: parse.data.config }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        framework: true,
        workspaceId: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating app project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    await prisma.appProject.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting app project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


