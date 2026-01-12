import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUid } from '@/lib/auth';
import { CreateAnnotation } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();

  // Check if resource belongs to user's workspace
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { workspace: true },
  });
  if (!resource || resource.workspace.ownerId !== uid) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  const annotations = await prisma.annotation.findMany({
    where: { resourceId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(annotations);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = await getUid();

  // Check ownership
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { workspace: true },
  });
  if (!resource || resource.workspace.ownerId !== uid) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

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
}