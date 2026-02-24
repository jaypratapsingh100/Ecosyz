import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CreateBarterAsk } from '@/lib/validation';

/** Build an elaborate 500 response so clients and logs can understand the failure */
function elaborateServerError(
  context: string,
  error: unknown
): { status: number; body: { error: string; code: string; details?: string; hint?: string } } {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message || 'Unknown error';
  const prismaCode = (err as { code?: string }).code;
  const tableMissing =
    /(relation|table|does not exist|Unknown arg|underlying table for model)/i.test(message) ||
    prismaCode === 'P1014' ||
    prismaCode === 'P2021';

  console.error(`[barter] ${context}:`, message);
  if (err.stack) console.error(err.stack);

  const code = tableMissing ? 'DATABASE_SCHEMA' : 'SERVER_ERROR';
  const hint = tableMissing
    ? 'Barter tables may not exist yet. Run: pnpm prisma migrate dev --name add_barter_models (or pnpm prisma db push for dev).'
    : undefined;

  return {
    status: 500,
    body: {
      error: `Failed to ${context}`,
      code,
      details: message,
      ...(hint && { hint }),
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    const where: { status?: string } = {};
    if (status === 'open' || status === 'closed') where.status = status;

    const [asks, total] = await Promise.all([
      prisma.barterAsk.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { pitches: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.barterAsk.count({ where }),
    ]);

    return NextResponse.json({
      asks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const { status, body } = elaborateServerError('fetch barter asks', error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parse = CreateBarterAsk.safeParse(body);
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

    const ask = await prisma.barterAsk.create({
      data: {
        title: parse.data.title,
        description: parse.data.description,
        whatINeed: parse.data.whatINeed ?? null,
        whatIOffer: parse.data.whatIOffer ?? null,
        attachments: parse.data.attachments ?? null,
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
        _count: {
          select: { pitches: true },
        },
      },
    });

    return NextResponse.json(ask, { status: 201 });
  } catch (error) {
    const { status, body } = elaborateServerError('create barter ask', error);
    return NextResponse.json(body, { status });
  }
}
