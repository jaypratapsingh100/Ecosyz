/**
 * Ensure user is owner of workspace
 * Throws error if not owner or workspace not found
 */

import { prisma } from '@/src/lib/db';
import { getCurrentUser } from './get-current-user';
import { ensureUserInDb } from '../core/user';

/**
 * Ensure the current user is the owner of the workspace
 * @throws Error if workspace not found or user is not owner
 */
export async function ensureOwner(workspaceId: string) {
  const supabaseUser = await getCurrentUser();
  
  if (!supabaseUser) {
    throw new Error('Not authenticated');
  }

  // Ensure user exists in database
  await ensureUserInDb(supabaseUser);

  // Get the Prisma user record to get the correct ID
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!prismaUser) {
    throw new Error('User not found in database');
  }

  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  
  if (!ws) {
    throw new Error('Workspace not found');
  }
  
  if (ws.ownerId !== prismaUser.id) {
    throw new Error('Forbidden: You are not the owner of this workspace');
  }
  
  return ws;
}
