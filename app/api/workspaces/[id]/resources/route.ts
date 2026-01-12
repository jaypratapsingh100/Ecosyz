import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureOwner } from '@/lib/auth';
import { CreateResource } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await ensureOwner(id);
  if (ws instanceof NextResponse) return ws;

  const resources = await prisma.resource.findMany({
    where: { workspaceId: id },
    include: { annotations: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(resources);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await ensureOwner(id);
  if (ws instanceof NextResponse) return ws;

  const body = await req.json();
  const parse = CreateResource.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.message }, { status: 400 });
  }

  const resourceData = {
    workspaceId: id,
    title: parse.data.title,
    type: parse.data.type,
    tags: parse.data.tags,
    data: parse.data.data ?? {},
    ...(parse.data.url && { url: parse.data.url }),
  };

  const resource = await prisma.resource.create({
    data: resourceData,
  });
  return NextResponse.json(resource, { status: 201 });
}