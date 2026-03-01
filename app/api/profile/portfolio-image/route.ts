import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { supabaseServer } from '@/lib/supabaseServer';

const BUCKET = 'avatars';
const MAX_SIZE = 4 * 1024 * 1024; // 4MB (larger for cover images)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { ensureUserInDb } = await import('../../../../src/lib/auth');
    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json(
        {
          error:
            'Portfolio image upload not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('portfolioImage') as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'No image file provided. Use form field "portfolioImage".' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 4MB.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPG, PNG or WebP.' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const path = `${prismaUser.id}/portfolio.${safeExt}`;
    const buf = await file.arrayBuffer();

    const { error } = await supabaseServer.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Portfolio image upload error:', error);
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
    const portfolioImageUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

    await prisma.profile.upsert({
      where: { userId: prismaUser.id },
      update: {
        portfolioImageUrl,
        updatedAt: new Date(),
      },
      create: {
        userId: prismaUser.id,
        displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        portfolioImageUrl,
        preferences: {
          theme: 'system',
          language: 'en-IN',
          emailNotifications: true,
          marketingEmails: false,
        },
      },
    });

    return NextResponse.json({
      portfolioImageUrl,
    });
  } catch (error) {
    console.error('Portfolio image upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { ensureUserInDb } = await import('../../../../src/lib/auth');
    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { portfolioImageUrl } = body;

    if (!portfolioImageUrl || typeof portfolioImageUrl !== 'string') {
      return NextResponse.json(
        { error: 'portfolioImageUrl is required' },
        { status: 400 }
      );
    }

    const trimmed = portfolioImageUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      );
    }

    if (!isValidImageUrl(trimmed)) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      );
    }

    await prisma.profile.upsert({
      where: { userId: prismaUser.id },
      update: {
        portfolioImageUrl: trimmed,
        updatedAt: new Date(),
      },
      create: {
        userId: prismaUser.id,
        displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        portfolioImageUrl: trimmed,
        preferences: {
          theme: 'system',
          language: 'en-IN',
          emailNotifications: true,
          marketingEmails: false,
        },
      },
    });

    return NextResponse.json({ portfolioImageUrl: trimmed });
  } catch (error) {
    console.error('Portfolio image update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { ensureUserInDb } = await import('../../../../src/lib/auth');
    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: prismaUser.id },
    });

    if (profile?.portfolioImageUrl) {
      await prisma.profile.update({
        where: { userId: prismaUser.id },
        data: {
          portfolioImageUrl: null,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ portfolioImageUrl: null });
  } catch (error) {
    console.error('Portfolio image delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
