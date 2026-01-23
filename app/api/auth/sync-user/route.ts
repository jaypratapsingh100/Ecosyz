import { NextRequest, NextResponse } from 'next/server';
import { ensureUserInDb } from '@/lib/auth/server';

/**
 * Sync user to database after OAuth
 * 
 * Called from client-side callback to ensure user exists in Prisma DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, name, avatarUrl } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing user data' },
        { status: 400 }
      );
    }

    // Create user object matching Supabase User type
    const user = {
      id: userId,
      email,
      user_metadata: {
        name,
        avatar_url: avatarUrl,
      },
    } as any;

    await ensureUserInDb(user);

    return NextResponse.json({
      success: true,
      message: 'User synced to database',
    });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}
