import { NextRequest, NextResponse } from 'next/server';
import { setSessionTokens } from '@/lib/auth/core/tokens';

/**
 * Sync Supabase session to server cookies
 * 
 * Called from client-side callback after Supabase SDK has set session in localStorage.
 * This maintains compatibility with server-side API routes that read cookies.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, refreshToken, expiresIn } = body;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }

    // Set cookies using the same method as email signin
    await setSessionTokens(accessToken, refreshToken, expiresIn);

    return NextResponse.json({
      success: true,
      message: 'Session synced to cookies',
    });
  } catch (error: any) {
    console.error('Error syncing session:', error);
    return NextResponse.json(
      { error: 'Failed to sync session' },
      { status: 500 }
    );
  }
}
