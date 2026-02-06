import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

export async function POST(
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

    // Verify project ownership
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
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { path, name, content, language, isMain } = body;

    if (!path || !name || content === undefined) {
      return NextResponse.json(
        { error: 'path, name, and content are required' },
        { status: 400 }
      );
    }

    const file = await prisma.appFile.upsert({
      where: {
        projectId_path: {
          projectId: id,
          path,
        },
      },
      update: {
        name,
        content,
        language: language || null,
        isMain: isMain || false,
      },
      create: {
        projectId: id,
        path,
        name,
        content,
        language: language || null,
        isMain: isMain || false,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error: any) {
    console.error('Error creating file:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'File already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    );
  }
}

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

    // Verify project ownership
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
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const files = await prisma.appFile.findMany({
      where: { projectId: id },
      orderBy: { path: 'asc' },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
