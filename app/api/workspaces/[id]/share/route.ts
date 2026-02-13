import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureOwner } from '@/lib/auth';
import { CreateShare } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    // Return single share link for workspace (one link per workspace)
    const share = await prisma.shareLink.findFirst({
      where: { workspaceId: id },
      orderBy: { createdAt: 'desc' },
    });
    
    // Return null if no share link exists (instead of empty array)
    return NextResponse.json(share);
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
    console.error('Share links GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ensureOwner(id);

    const body = await req.json();
    const parse = CreateShare.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }

    // Check if a share link already exists for this workspace
    const existingShare = await prisma.shareLink.findFirst({
      where: { workspaceId: id },
      orderBy: { createdAt: 'desc' },
    });

    // If share link exists, return it instead of creating a new one
    if (existingShare) {
      return NextResponse.json(existingShare);
    }

    // Generate a unique token and create new share link
    const token = crypto.randomUUID();

    const share = await prisma.shareLink.create({
      data: {
        workspaceId: id,
        token,
        expiresAt: parse.data.expiresAt ?? null,
      },
    });
    return NextResponse.json(share);
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
    console.error('Share links POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}