import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureOwner } from '@/lib/auth';
import { CreateResource } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    const resources = await prisma.resource.findMany({
      where: { workspaceId: id },
      include: { annotations: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(resources);
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Resources error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    const body = await req.json();
    const parse = CreateResource.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }

    const baseData = (parse.data.data ?? {}) as any;
    const mergedData = {
      ...baseData,
      ...(parse.data.notes ? { notes: parse.data.notes } : {}),
    };

    const resourceData = {
      workspaceId: id,
      title: parse.data.title,
      type: parse.data.type,
      tags: parse.data.tags,
      data: mergedData,
      ...(parse.data.url && { url: parse.data.url }),
    };

    const resource = await prisma.resource.create({
      data: resourceData,
    });
    return NextResponse.json(resource, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Resources error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}