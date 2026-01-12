import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id, imageId } = await params;

    // Verify project ownership
    const project = await prisma.appProject.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify image belongs to project
    const image = await prisma.appImage.findUnique({
      where: { id: imageId },
      select: { projectId: true },
    });

    if (!image || image.projectId !== id) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    await prisma.appImage.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

