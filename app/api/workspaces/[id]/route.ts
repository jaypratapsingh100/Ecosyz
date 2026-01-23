import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureOwner } from '@/lib/auth';
import { CreateWorkspace } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        resources: {
          include: {
            annotations: true
          }
        }
      }
    });
    return NextResponse.json(workspace);
  } catch (error: any) {
    if (error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    const body = await req.json();
    const parse = CreateWorkspace.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }

    const updated = await prisma.workspace.update({
      where: { id },
      data: { title: parse.data.title },
      select: { id: true, title: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    await prisma.workspace.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    if (error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}