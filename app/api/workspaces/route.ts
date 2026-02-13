import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../src/lib/auth';

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

    // Ensure user has exactly one workspace (consolidate if multiple exist)
    // This will be handled by ensureUserInDb -> ensureUserWorkspace, but we'll double-check here
    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: prismaUser.id },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    let workspace;
    if (workspaces.length === 0) {
      // No workspace exists, create one
      workspace = await prisma.workspace.create({
        data: {
          title: 'My Workspace',
          ownerId: prismaUser.id,
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: {
            select: { resources: true, shares: true },
          },
        },
      });
    } else if (workspaces.length > 1) {
      // Multiple workspaces exist - consolidate into the oldest one
      const primaryWorkspace = workspaces[0];
      const extraWorkspaces = workspaces.slice(1);

      console.log(`User ${prismaUser.id} has ${workspaces.length} workspaces. Consolidating into workspace ${primaryWorkspace.id}`);

      // Move all resources from extra workspaces to the primary workspace
      for (const extraWorkspace of extraWorkspaces) {
        const resourceCount = await prisma.resource.count({
          where: { workspaceId: extraWorkspace.id },
        });

        if (resourceCount > 0) {
          await prisma.resource.updateMany({
            where: { workspaceId: extraWorkspace.id },
            data: { workspaceId: primaryWorkspace.id },
          });
        }

        // Delete share links from extra workspaces (keep only primary workspace's share link)
        await prisma.shareLink.deleteMany({
          where: { workspaceId: extraWorkspace.id },
        });

        // Delete the extra workspace
        await prisma.workspace.delete({
          where: { id: extraWorkspace.id },
        });
      }

      // Fetch the consolidated workspace
      workspace = await prisma.workspace.findUnique({
        where: { id: primaryWorkspace.id },
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: {
            select: { resources: true, shares: true },
          },
        },
      });

      console.log(`Consolidated ${extraWorkspaces.length} extra workspaces into primary workspace ${primaryWorkspace.id}`);
    } else {
      // Exactly one workspace exists - use it
      workspace = await prisma.workspace.findUnique({
        where: { id: workspaces[0].id },
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: {
            select: { resources: true, shares: true },
          },
        },
      });
    }

    // Return single workspace object (not array)
    return NextResponse.json(workspace);
  } catch (error: any) {
    console.error('Error fetching workspace:', error);
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
  // Workspace creation is disabled - users get one workspace automatically
  return NextResponse.json(
    { error: 'Workspace creation is not allowed. Each user has one workspace automatically created.' },
    { status: 403 }
  );
}
