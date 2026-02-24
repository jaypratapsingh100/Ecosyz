import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CreateBarterPitch } from '@/lib/validation';

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

    const { id: askId } = await params;
    const body = await req.json();
    const parse = CreateBarterPitch.safeParse(body);
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

    const ask = await prisma.barterAsk.findUnique({
      where: { id: askId },
    });
    if (!ask) {
      return NextResponse.json(
        { error: 'Barter ask not found' },
        { status: 404 }
      );
    }
    if (ask.status === 'closed') {
      return NextResponse.json(
        { error: 'This ask is closed' },
        { status: 403 }
      );
    }

    const pitch = await prisma.barterPitch.create({
      data: {
        askId,
        content: parse.data.content,
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

    return NextResponse.json(pitch, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message || 'Unknown error';
    const tableMissing = /(relation|table|does not exist|Unknown arg)/i.test(message);
    console.error('[barter] create barter pitch:', message);
    if (err.stack) console.error(err.stack);
    return NextResponse.json(
      {
        error: 'Failed to create barter pitch',
        code: tableMissing ? 'DATABASE_SCHEMA' : 'SERVER_ERROR',
        details: message,
        ...(tableMissing && {
          hint: 'Barter tables may not exist. Run: pnpm prisma migrate dev --name add_barter_models',
        }),
      },
      { status: 500 }
    );
  }
}
