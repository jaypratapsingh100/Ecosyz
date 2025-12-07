import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../../src/lib/auth';
import { UpdateAppFile } from '../../../../../../src/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
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

    const { id, fileId } = await params;
    const file = await prisma.appFile.findUnique({
      where: { id: fileId },
      include: { project: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (file.project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
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

    const { id, fileId } = await params;
    const file = await prisma.appFile.findUnique({
      where: { id: fileId },
      include: { project: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (file.project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parse = UpdateAppFile.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.message },
        { status: 400 }
      );
    }

    // If setting as main, unset other main files
    if (parse.data.isMain === true) {
      await prisma.appFile.updateMany({
        where: { projectId: id, isMain: true, id: { not: fileId } },
        data: { isMain: false },
      });
    }

    const updated = await prisma.appFile.update({
      where: { id: fileId },
      data: {
        ...(parse.data.content !== undefined && { content: parse.data.content }),
        ...(parse.data.isMain !== undefined && { isMain: parse.data.isMain }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
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

    const { id, fileId } = await params;
    const file = await prisma.appFile.findUnique({
      where: { id: fileId },
      include: { project: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (file.project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    await prisma.appFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

