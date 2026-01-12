import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureOwner } from '@/lib/auth';
import { CreateShare } from '@/lib/validation';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureOwner(id);

  const shares = await prisma.shareLink.findMany({
    where: { workspaceId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(shares);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureOwner(id);

  const body = await req.json();
  const parse = CreateShare.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.message }, { status: 400 });
  }

  // Generate a unique token
  const token = crypto.randomUUID();

  const share = await prisma.shareLink.create({
    data: {
      workspaceId: id,
      token,
      expiresAt: parse.data.expiresAt ?? null,
    },
  });
  return NextResponse.json(share);
}