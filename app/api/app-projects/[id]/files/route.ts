import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';
import { CreateAppFile } from '../../../../../src/lib/validation';

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

    const files = await prisma.appFile.findMany({
      where: { projectId: id },
      orderBy: { path: 'asc' },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const parse = CreateAppFile.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.message },
        { status: 400 }
      );
    }

    // Validate path to prevent directory traversal
    const normalizedPath = parse.data.path.replace(/\.\./g, '').replace(/^\//, '');
    if (normalizedPath !== parse.data.path) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // If setting as main, unset other main files
    if (parse.data.isMain) {
      await prisma.appFile.updateMany({
        where: { projectId: id, isMain: true },
        data: { isMain: false },
      });
    }

    const file = await prisma.appFile.upsert({
      where: {
        projectId_path: {
          projectId: id,
          path: normalizedPath,
        },
      },
      update: {
        content: parse.data.content,
        language: parse.data.language,
        isMain: parse.data.isMain,
        name: parse.data.name,
      },
      create: {
        projectId: id,
        path: normalizedPath,
        name: parse.data.name,
        content: parse.data.content,
        language: parse.data.language,
        isMain: parse.data.isMain,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

