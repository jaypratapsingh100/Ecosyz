import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth/core/user';
import { CreateAnnotation } from '@/lib/validation';

async function checkResourceOwnership(resourceId: string) {
  const supabaseUser = await getCurrentUser();
  
  if (!supabaseUser) {
    throw new Error('Not authenticated');
  }

  // Ensure user exists in database
  await ensureUserInDb(supabaseUser);

  // Get the Prisma user record to get the correct ID
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!prismaUser) {
    throw new Error('User not found in database');
  }

  // Check if resource belongs to user's workspace
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { workspace: true },
  });

  if (!resource) {
    throw new Error('Resource not found');
  }

  if (resource.workspace.ownerId !== prismaUser.id) {
    throw new Error('Not found or forbidden');
  }

  return resource;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await checkResourceOwnership(id);

    const annotations = await prisma.annotation.findMany({
      where: { resourceId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(annotations);
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Resource not found' || error.message === 'Not found or forbidden') {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    console.error('Annotations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await checkResourceOwnership(id);

    const body = await req.json();
    const parse = CreateAnnotation.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }

    const annotation = await prisma.annotation.create({
      data: {
        resourceId: id,
        body: parse.data.body,
        highlights: parse.data.highlights ?? null,
      },
    });
    return NextResponse.json(annotation, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Resource not found' || error.message === 'Not found or forbidden') {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    console.error('Annotations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}