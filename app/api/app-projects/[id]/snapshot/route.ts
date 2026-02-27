import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

async function getAuthorizedProject(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated', status: 401 };
  await ensureUserInDb(user);
  const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!prismaUser) return { error: 'User not found', status: 404 };
  const project = await prisma.appProject.findUnique({
    where: { id },
    include: { files: { orderBy: { path: 'asc' } } },
  });
  if (!project) return { error: 'Project not found', status: 404 };
  if (project.ownerId !== prismaUser.id) return { error: 'Unauthorized', status: 403 };
  return { project };
}

/** GET /api/app-projects/[id]/snapshot — list snapshots */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAuthorizedProject(id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const snapshots = await prisma.appSnapshot.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, createdAt: true, filesJson: true },
    });

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        label: s.label,
        createdAt: s.createdAt,
        fileCount: Array.isArray(s.filesJson) ? (s.filesJson as unknown[]).length : 0,
      })),
    });
  } catch (err) {
    console.error('Snapshot GET error:', err);
    return NextResponse.json({ error: 'Failed to list snapshots' }, { status: 500 });
  }
}

/** POST /api/app-projects/[id]/snapshot — create snapshot from current files */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAuthorizedProject(id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const body = await req.json().catch(() => ({}));
    const label = typeof body.label === 'string' ? body.label.trim() || null : null;

    const filesJson = result.project.files.map((f: { path: string; name: string; content: string; language: string | null; isMain: boolean }) => ({
      path: f.path,
      name: f.name,
      content: f.content,
      language: f.language,
      isMain: f.isMain,
    }));

    const snapshot = await prisma.appSnapshot.create({
      data: { projectId: id, label, filesJson },
    });

    return NextResponse.json({ id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt });
  } catch (err) {
    console.error('Snapshot POST error:', err);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
