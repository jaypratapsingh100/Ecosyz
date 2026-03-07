import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * POST: Add sub-track to a track (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const trackId = (body.trackId as string)?.trim();
    const name = (body.name as string)?.trim();
    const description = (body.description as string)?.trim();
    const slug = (body.slug as string)?.trim() || name?.toLowerCase().replace(/\s+/g, '-') || '';

    if (!trackId || !name) {
      return NextResponse.json(
        { error: 'trackId and name are required' },
        { status: 400 }
      );
    }

    const track = await prisma.internTrack.findUnique({ where: { id: trackId } });
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const subTrack = await prisma.internSubTrack.create({
      data: {
        trackId,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        name,
        description: description || undefined,
      },
      include: { track: true },
    });

    return NextResponse.json({ subTrack });
  } catch (err) {
    console.error('[admin/interns/subtracks]', err);
    return NextResponse.json(
      { error: 'Failed to add sub-track' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove sub-track (admin only). Cascades to milestones and tasks.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Sub-track id is required' }, { status: 400 });
    }

    const subTrack = await prisma.internSubTrack.findUnique({ where: { id } });
    if (!subTrack) {
      return NextResponse.json({ error: 'Sub-track not found' }, { status: 404 });
    }

    await prisma.internSubTrack.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/interns/subtracks DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to delete sub-track' },
      { status: 500 }
    );
  }
}
