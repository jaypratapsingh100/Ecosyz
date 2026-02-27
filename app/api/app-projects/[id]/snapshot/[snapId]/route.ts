import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

/** POST /api/app-projects/[id]/snapshot/[snapId] — restore files from snapshot */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; snapId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!prismaUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id, snapId } = await params;

    const project = await prisma.appProject.findUnique({ where: { id }, select: { ownerId: true } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.ownerId !== prismaUser.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const snapshot = await prisma.appSnapshot.findUnique({ where: { id: snapId } });
    if (!snapshot || snapshot.projectId !== id) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const files = snapshot.filesJson as Array<{ path: string; name: string; content: string; language: string | null; isMain: boolean }>;

    // Delete existing files, then recreate from snapshot
    await prisma.appFile.deleteMany({ where: { projectId: id } });
    for (const f of files) {
      await prisma.appFile.create({
        data: {
          projectId: id,
          path: f.path,
          name: f.name,
          content: f.content,
          language: f.language,
          isMain: f.isMain,
        },
      });
    }

    return NextResponse.json({ ok: true, filesRestored: files.length });
  } catch (err) {
    console.error('Snapshot restore error:', err);
    return NextResponse.json({ error: 'Failed to restore snapshot' }, { status: 500 });
  }
}
