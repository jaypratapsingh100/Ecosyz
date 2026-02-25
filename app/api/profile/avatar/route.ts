import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { supabaseServer } from '@/lib/supabaseServer';

const BUCKET = 'avatars';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
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
            'Avatar upload not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create a public bucket "avatars" in Supabase Storage.',
        },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'No image file provided. Use form field "avatar".' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 2MB.' },
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
    const path = `${prismaUser.id}/avatar.${safeExt}`;
    const buf = await file.arrayBuffer();

    const { error } = await supabaseServer.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Avatar upload error:', error);
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');
    const avatarUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

    const profile = await prisma.profile.upsert({
      where: { userId: prismaUser.id },
      update: {
        avatarUrl,
        updatedAt: new Date(),
      },
      create: {
        userId: prismaUser.id,
        displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatarUrl,
        preferences: {
          theme: 'system',
          language: 'en-IN',
          emailNotifications: true,
          marketingEmails: false,
        },
      },
    });

    // Sync Supabase auth user metadata so session/header avatar matches profile.
    try {
      const { data: authUser, error: getUserError } =
        await supabaseServer.auth.admin.getUserById(user.id);

      if (getUserError) {
        console.error('Failed to fetch auth user for avatar sync:', getUserError);
      } else if (authUser?.user) {
        const existingMetadata = authUser.user.user_metadata || {};
        const { error: updateError } =
          await supabaseServer.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...existingMetadata,
              avatar_url: avatarUrl,
            },
          });

        if (updateError) {
          console.error('Failed to update auth user avatar metadata:', updateError);
        }
      }
    } catch (syncError) {
      console.error('Error syncing avatar to auth metadata:', syncError);
    }

    return NextResponse.json({
      avatarUrl,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        preferences: profile.preferences,
      },
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    const putPrismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!putPrismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { avatarUrl } = body;

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return NextResponse.json(
        { error: 'avatarUrl is required and must be a string' },
        { status: 400 }
      );
    }

    const profile = await prisma.profile.upsert({
      where: { userId: putPrismaUser.id },
      update: {
        avatarUrl,
        updatedAt: new Date(),
      },
      create: {
        userId: putPrismaUser.id,
        displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatarUrl,
        preferences: {
          theme: 'system',
          language: 'en-IN',
          emailNotifications: true,
          marketingEmails: false,
        },
      },
    });

    return NextResponse.json({
      avatarUrl,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        preferences: profile.preferences,
      },
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
