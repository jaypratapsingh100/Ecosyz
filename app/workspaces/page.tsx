import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../src/lib/auth';
import { ensureUserInDb } from '../../src/lib/auth/core/user';
import { prisma } from '../../src/lib/db';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  const supabaseUser = await getCurrentUser();
  
  if (!supabaseUser) {
    redirect('/auth');
  }

  // Ensure user exists in database
  await ensureUserInDb(supabaseUser);

  // Get the Prisma user record
  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!prismaUser) {
    redirect('/auth');
  }

  // Get user's workspace (should be exactly one after ensureUserInDb consolidation)
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: prismaUser.id },
    orderBy: { createdAt: 'asc' },
  });

  let workspace;
  if (workspaces.length === 0) {
    // This shouldn't happen due to ensureUserWorkspace, but handle it gracefully
    redirect('/auth');
  } else {
    // Use the primary workspace (oldest one)
    // If multiple exist, consolidation will happen on next ensureUserInDb call
    workspace = workspaces[0];
  }

  // Redirect directly to the workspace page
  redirect(`/workspaces/${workspace.id}`);
}
