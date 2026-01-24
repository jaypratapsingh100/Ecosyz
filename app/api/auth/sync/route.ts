import { NextRequest, NextResponse } from 'next/server';
import { setSessionTokens } from '@/lib/auth/core/tokens';
import { ensureUserInDb } from '@/lib/auth/server';

/**
 * Sync Supabase session to server cookies and database
 * 
 * Combined endpoint that:
 * 1. Syncs session tokens to server cookies (for server-side API compatibility)
 * 2. Ensures user exists in Prisma database
 * 
 * Called from client-side callback after Supabase SDK has set session in localStorage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, refreshToken, expiresIn, userId, email, name, avatarUrl } = body;

    // Validate required fields
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing user data' },
        { status: 400 }
      );
    }

    // Sync session tokens to cookies
    try {
      await setSessionTokens(accessToken, refreshToken, expiresIn);
    } catch (tokenError) {
      console.error('Error syncing tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to sync session tokens' },
        { status: 500 }
      );
    }

    // Ensure user exists in database
    try {
      const user = {
        id: userId,
        email,
        user_metadata: {
          name,
          avatar_url: avatarUrl,
        },
      } as any;

      await ensureUserInDb(user);
    } catch (dbError) {
      console.error('Error syncing user to database:', dbError);
      // Don't fail the request if DB sync fails - tokens are already set
      // Log error but continue
    }

    return NextResponse.json({
      success: true,
      message: 'Session and user synced successfully',
    });
  } catch (error: any) {
    console.error('Error syncing session:', error);
    return NextResponse.json(
      { error: 'Failed to sync session' },
      { status: 500 }
    );
  }
}
