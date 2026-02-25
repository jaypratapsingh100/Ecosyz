import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { UpdateGigStatus } from '@/lib/validation';

function elaborateError(context: string, error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message || 'Unknown error';
  const tableMissing = /(relation|table|does not exist|Unknown arg)/i.test(message);
  console.error(`[gigs] ${context}:`, message);
  if (err.stack) console.error(err.stack);
  return NextResponse.json(
    {
      error: `Failed to ${context}`,
      code: tableMissing ? 'DATABASE_SCHEMA' : 'SERVER_ERROR',
      details: message,
      ...(tableMissing && {
        hint: 'Gig tables may not exist. Run: pnpm prisma db push in development.',
      }),
    },
    { status: 500 }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const gig = await prisma.gig.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        requests: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!gig) {
      return NextResponse.json(
        { error: 'Gig not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(gig);
  } catch (error) {
    return elaborateError('fetch gig', error);
  }
}

export async function PATCH(
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

    const { id } = await params;
    const body = await req.json();
    const parse = UpdateGigStatus.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const existing = await prisma.gig.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      );
    }

    if (existing.authorId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Only the author can change the status' },
        { status: 403 }
      );
    }

    const updated = await prisma.gig.update({
      where: { id },
      data: { status: parse.data.status },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        requests: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return elaborateError('update gig status', error);
  }
}

