import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Ensure user exists in database
    const { ensureUserInDb } = await import('../../../../src/lib/auth');
    await ensureUserInDb(user);

    // Get the Prisma user record
    const postPrismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!postPrismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // For now, just generate a random avatar URL instead of actual file upload
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;

    // Update profile with avatar URL
    const profile = await prisma.profile.upsert({
      where: { userId: postPrismaUser.id },
      update: {
        avatarUrl,
        updatedAt: new Date(),
      },
      create: {
        userId: postPrismaUser.id,
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

    // Ensure user exists in database
    const { ensureUserInDb } = await import('../../../../src/lib/auth');
    await ensureUserInDb(user);

    // Get the Prisma user record for PUT
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

    // Update profile with avatar URL
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