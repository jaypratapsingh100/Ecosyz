import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CreateGigRequest } from '@/lib/validation';

export async function POST(
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

    const { id: gigId } = await params;
    const body = await req.json();
    const parse = CreateGigRequest.safeParse(body);
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

    const gig = await prisma.gig.findUnique({
      where: { id: gigId },
    });
    if (!gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      );
    }
    if (gig.status === 'closed') {
      return NextResponse.json(
        { error: 'This gig is closed' },
        { status: 403 }
      );
    }

    const request = await prisma.gigRequest.create({
      data: {
        gigId,
        message: parse.data.message,
        budget: parse.data.budget ?? null,
        authorId: prismaUser.id,
      },
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
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message || 'Unknown error';
    const tableMissing = /(relation|table|does not exist|Unknown arg)/i.test(message);
    console.error('[gigs] create gig request:', message);
    if (err.stack) console.error(err.stack);
    return NextResponse.json(
      {
        error: 'Failed to create gig request',
        code: tableMissing ? 'DATABASE_SCHEMA' : 'SERVER_ERROR',
        details: message,
        ...(tableMissing && {
          hint: 'Gig tables may not exist. Run: pnpm prisma db push in development.',
        }),
      },
      { status: 500 }
    );
  }
}

