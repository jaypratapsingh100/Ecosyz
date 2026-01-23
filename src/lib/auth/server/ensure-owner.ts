/**
 * Ensure user is owner of workspace
 * Throws error if not owner or workspace not found
 */

import { prisma } from '@/src/lib/db';
import { getUid } from './get-uid';

/**
 * Ensure the current user is the owner of the workspace
 * @throws Error if workspace not found or user is not owner
 */
export async function ensureOwner(workspaceId: string) {
  const uid = await getUid();
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  
  if (!ws) {
    throw new Error('Workspace not found');
  }
  
  if (ws.ownerId !== uid) {
    throw new Error('Forbidden: You are not the owner of this workspace');
  }
  
  return ws;
}
