/**
 * User management utilities
 * Handles user database operations and validation
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from '@/src/lib/db';

/**
 * Ensure user has exactly one workspace (create if doesn't exist, consolidate if multiple exist)
 * Each user should have exactly one workspace
 */
async function ensureUserWorkspace(userId: string): Promise<void> {
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' }, // Oldest first
    include: {
      resources: true,
      shares: true,
    },
  });

  if (workspaces.length === 0) {
    // No workspace exists, create one
    await prisma.workspace.create({
      data: {
        title: 'My Workspace',
        ownerId: userId,
      },
    });
  } else if (workspaces.length > 1) {
    // Multiple workspaces exist - consolidate into the oldest one
    const primaryWorkspace = workspaces[0];
    const extraWorkspaces = workspaces.slice(1);

    console.log(`User ${userId} has ${workspaces.length} workspaces. Consolidating into workspace ${primaryWorkspace.id}`);

    // Move all resources from extra workspaces to the primary workspace
    for (const extraWorkspace of extraWorkspaces) {
      if (extraWorkspace.resources.length > 0) {
        await prisma.resource.updateMany({
          where: { workspaceId: extraWorkspace.id },
          data: { workspaceId: primaryWorkspace.id },
        });
      }

      // Move share links (but keep only one active share link)
      if (extraWorkspace.shares.length > 0) {
        // Delete extra share links (keep only the primary workspace's share link)
        await prisma.shareLink.deleteMany({
          where: { workspaceId: extraWorkspace.id },
        });
      }

      // Delete the extra workspace
      await prisma.workspace.delete({
        where: { id: extraWorkspace.id },
      });
    }

    console.log(`Consolidated ${extraWorkspaces.length} extra workspaces into primary workspace ${primaryWorkspace.id}`);
  }
  // If workspaces.length === 1, user already has exactly one workspace - nothing to do
}

/**
 * Ensure user exists in database, create or update as needed
 */
export async function ensureUserInDb(user: SupabaseUser): Promise<void> {
  if (!user.email) {
    console.error('User email is required');
    throw new Error('User email is required');
  }

  try {
    // First, check if user exists by supabaseId
    const existingBySupabaseId = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    // Also check if user exists by email (in case of email change or duplicate)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: user.email },
    });

    let prismaUserId: string;

    if (existingBySupabaseId) {
      // User exists with this supabaseId, update it
      await prisma.user.update({
        where: { supabaseId: user.id },
        data: {
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
          updatedAt: new Date(),
        },
      });
      prismaUserId = existingBySupabaseId.id;
    } else if (existingByEmail) {
      // User exists with this email but different supabaseId - update the existing record
      const updatedUser = await prisma.user.update({
        where: { email: user.email },
        data: {
          supabaseId: user.id, // Update supabaseId to match current user
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
          updatedAt: new Date(),
        },
      });
      prismaUserId = updatedUser.id;
    } else {
      // User doesn't exist, create new one
      const newUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
        },
      });
      prismaUserId = newUser.id;
    }

    // Ensure user has a workspace (auto-create if missing)
    await ensureUserWorkspace(prismaUserId);
  } catch (error: any) {
    // Handle database authentication errors specifically
    if (error?.message?.includes('authentication failed') || error?.code === 'P1001' || error?.code === 'P1000') {
      console.error('Database authentication failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.');
      throw new Error('Database connection failed');
    }
    // Handle unique constraint errors
    if (error?.code === 'P2002') {
      console.error('Unique constraint violation - user may already exist:', error);
      // Try to find and update existing user
      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { supabaseId: user.id },
              { email: user.email },
            ],
          },
        });
        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              supabaseId: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
              avatarUrl: user.user_metadata?.avatar_url,
              updatedAt: new Date(),
            },
          });
          // Ensure workspace exists for this user
          await ensureUserWorkspace(existingUser.id);
          return; // Successfully updated
        }
      } catch (retryError) {
        console.error('Failed to recover from unique constraint error:', retryError);
      }
    }
    console.error('Error ensuring user in database:', error);
    throw error;
  }
}

/**
 * Get user name from Supabase user metadata
 */
export function getUserName(user: SupabaseUser): string {
  return (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User'
  );
}
