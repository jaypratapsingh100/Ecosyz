import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '../../../src/lib/auth';
import { prisma } from '../../../src/lib/db';
import { UpdateProfile } from '../../../src/lib/validation';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Ensure user exists in database before profile operations
    await ensureUserInDb(user);

    // Get the Prisma user record to get the correct ID
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Get or create profile
    let profile = await prisma.profile.findUnique({
      where: { userId: prismaUser.id },
    });

    if (!profile) {
      // Create default profile
      profile = await prisma.profile.create({
        data: {
          userId: prismaUser.id,
          displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          preferences: {
            theme: 'system',
            language: 'en-IN',
            emailNotifications: true,
            marketingEmails: false,
          },
        },
      });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        preferences: profile.preferences,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile GET error:', error);
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

    // Ensure user exists in our database before creating profile
    await ensureUserInDb(user);

    // Get the Prisma user record to get the correct ID
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

    // Validate input
    const validationResult = UpdateProfile.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { displayName, bio, preferences } = validationResult.data;

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId: prismaUser.id },
      update: {
        displayName,
        bio,
        preferences,
        updatedAt: new Date(),
      },
      create: {
        userId: prismaUser.id,
        displayName,
        bio,
        preferences,
      },
    });

    return NextResponse.json({
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        preferences: profile.preferences,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}