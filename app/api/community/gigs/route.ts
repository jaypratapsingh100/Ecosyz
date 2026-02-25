import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CreateGig } from '@/lib/validation';

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

  console.error(`[gigs] ${context}:`, message);
  if (err.stack) console.error(err.stack);

  const code = tableMissing ? 'DATABASE_SCHEMA' : 'SERVER_ERROR';
  const hint = tableMissing
    ? 'Gig tables may not exist yet. Run: pnpm prisma db push in development.'
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
    const category = searchParams.get('category');
    const search = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    const where: {
      status?: string;
      category?: string;
      title?: { contains: string; mode: 'insensitive' };
    } = {};

    if (status === 'active' || status === 'paused' || status === 'closed') {
      where.status = status;
    } else {
      where.status = 'active';
    }
    if (category) where.category = category;
    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    const [gigs, total] = await Promise.all([
      prisma.gig.findMany({
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
            select: { requests: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.gig.count({ where }),
    ]);

    return NextResponse.json({
      gigs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const { status, body } = elaborateServerError('fetch gigs', error);
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
    const parse = CreateGig.safeParse(body);
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

    const gig = await prisma.gig.create({
      data: {
        title: parse.data.title,
        description: parse.data.description,
        category: parse.data.category ?? null,
        priceFrom: parse.data.priceFrom ?? null,
        priceTo: parse.data.priceTo ?? null,
        currency: parse.data.currency ?? 'USD',
        deliveryTimeDays: parse.data.deliveryTimeDays ?? null,
        tags: parse.data.tags ?? [],
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
          select: { requests: true },
        },
      },
    });

    return NextResponse.json(gig, { status: 201 });
  } catch (error) {
    const { status, body } = elaborateServerError('create gig', error);
    return NextResponse.json(body, { status });
  }
}

