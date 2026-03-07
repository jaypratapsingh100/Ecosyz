import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { supabaseServer } from '@/lib/supabaseServer';
import { INTERN_TRACKS } from '@/lib/intern-tracks';

const BUCKET = 'intern-resumes';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * POST: Upload resume for intern fellowship.
 * Creates InternFellow + InternTrack if needed, stores resume in Supabase.
 * Basic parsing: extract filename, store metadata. Full parsing can be added later.
 */
export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const file = formData.get('resume') as File | null;
    const trackSlug = (formData.get('track') as string)?.trim() || 'platform-development';

    const existingFellow = await prisma.internFellow.findUnique({
      where: { userId: prismaUser.id },
      include: { track: true },
    });
    if (existingFellow && existingFellow.track.slug !== trackSlug) {
      return NextResponse.json(
        { error: 'Resume must be for your selected track. You cannot change tracks.' },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'No resume file provided. Use form field "resume".' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB.' },
        { status: 400 }
      );
    }

    const isValidType =
      ALLOWED_TYPES.includes(file.type) ||
      file.name.match(/\.(pdf|doc|docx)$/i);
    if (!isValidType) {
      return NextResponse.json(
        { error: 'Invalid file type. Use PDF or DOC/DOCX.' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json(
        {
          error:
            'Resume storage not configured. Create bucket "intern-resumes" in Supabase Storage.',
        },
        { status: 503 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const safeExt = ['pdf', 'doc', 'docx'].includes(ext) ? ext : 'pdf';
    const path = `${prismaUser.id}/resume-${Date.now()}.${safeExt}`;
    const buf = await file.arrayBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[intern-fellowship/resume] upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload resume. Ensure bucket "intern-resumes" exists.' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const resumeUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

    // Ensure track exists
    let track = await prisma.internTrack.findUnique({
      where: { slug: trackSlug },
    });
    if (!track) {
      const trackDef = INTERN_TRACKS.find((t) => t.slug === trackSlug);
      track = await prisma.internTrack.create({
        data: {
          slug: trackSlug,
          name: trackDef?.name || trackSlug,
          description: trackDef?.description || null,
          stipendRange: trackDef?.stipendRange || null,
        },
      });
    }

    // Upsert fellow
    const fellow = await prisma.internFellow.upsert({
      where: { userId: prismaUser.id },
      create: {
        userId: prismaUser.id,
        trackId: track.id,
        resumeUrl,
        resumeParsed: { fileName: file.name, uploadedAt: new Date().toISOString() },
        status: 'active',
      },
      update: {
        resumeUrl,
        resumeParsed: { fileName: file.name, uploadedAt: new Date().toISOString() },
      },
      include: { track: true },
    });

    return NextResponse.json({
      success: true,
      fellow: {
        id: fellow.id,
        track: fellow.track,
        resumeUrl: fellow.resumeUrl,
        status: fellow.status,
      },
    });
  } catch (err) {
    console.error('[intern-fellowship/resume]', err);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}
