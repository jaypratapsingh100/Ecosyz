import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../src/lib/auth';
import { CreateAppProject } from '../../../src/lib/validation';

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
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local. See QUICK_FIX_DATABASE.md for help.',
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
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local.',
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

    const projects = await prisma.appProject.findMany({
      where: { ownerId: prismaUser.id },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        framework: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { files: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching app projects:', error);
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
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local. See docs/FIX_DATABASE_CONNECTION.md for help.',
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
      if (dbError?.message?.includes('authentication failed') || dbError?.code === 'P1001') {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check your DATABASE_URL in .env.local.',
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
    const parse = CreateAppProject.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.message },
        { status: 400 }
      );
    }

    // Validate workspace ownership if workspaceId is provided
    if (parse.data.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: parse.data.workspaceId },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }

      if (workspace.ownerId !== prismaUser.id) {
        return NextResponse.json(
          { error: 'Not authorized to use this workspace' },
          { status: 403 }
        );
      }
    }

    const project = await prisma.appProject.create({
      data: {
        title: parse.data.title,
        description: parse.data.description,
        type: parse.data.type,
        framework: parse.data.framework,
        workspaceId: parse.data.workspaceId,
        config: parse.data.config,
        ownerId: prismaUser.id,
        // Questionnaire data
        questionnaireData: parse.data.questionnaireData || null,
        appType: parse.data.appType || null,
        targetAudience: parse.data.targetAudience || null,
        designStyle: parse.data.designStyle || null,
        colorScheme: parse.data.colorScheme || null,
        layoutStyle: parse.data.layoutStyle || null,
        requiredFeatures: parse.data.requiredFeatures || [],
        brandName: parse.data.brandName || null,
        tagline: parse.data.tagline || null,
        keyPoints: parse.data.keyPoints || null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        framework: true,
        workspaceId: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating app project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

