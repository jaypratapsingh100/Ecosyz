import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../src/lib/auth';
import { CreateWorkspace } from '../../../src/lib/validation';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001' || dbError?.code === 'P1000') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables. See VERCEL_DATABASE_FIX.md for help.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001' || dbError?.code === 'P1000') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: prismaUser.id },
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: {
          select: { resources: true, shares: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(workspaces);
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    if (error?.message?.includes('authentication failed') || error?.code === 'P1001' || error?.code === 'P1000') {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.',
          code: 'DATABASE_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001' || dbError?.code === 'P1000') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables. See VERCEL_DATABASE_FIX.md for help.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001' || dbError?.code === 'P1000') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.',
            code: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parse = CreateWorkspace.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 });
    }
    
    const ws = await prisma.workspace.create({
      data: {
        title: parse.data.title,
        ownerId: prismaUser.id,
      },
      select: { id: true, title: true, createdAt: true },
    });
    return NextResponse.json(ws, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    if (error?.message?.includes('authentication failed') || error?.code === 'P1001' || error?.code === 'P1000') {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.',
          code: 'DATABASE_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
