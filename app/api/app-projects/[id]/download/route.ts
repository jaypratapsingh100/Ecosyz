import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

/**
 * GET /api/app-projects/[id]/download
 * Export project files as a Vercel-ready ZIP (same structure as in DB).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: {
        files: { orderBy: { path: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const zip = new JSZip();
    for (const file of project.files) {
      zip.file(file.path, file.content);
    }

    // Generate as ArrayBuffer so it can be used directly as a Response body
    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    const slug = (project.title || 'project').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase() || 'project';
    const filename = `${slug}.zip`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting project:', error);
    return NextResponse.json(
      { error: 'Failed to export project' },
      { status: 500 }
    );
  }
}
