import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setSessionTokens } from '@/lib/auth/core/tokens';
import { ensureUserInDb } from '@/lib/auth/server';
import { sanitizeString, sanitizeUrl } from '@/lib/auth/core/validation';

/**
 * Sync Supabase session to server cookies and database
 *
 * Combined endpoint that:
 * 1. Validates the access token with Supabase (prevents forged requests)
 * 2. Syncs session tokens to server cookies (for server-side API compatibility)
 * 3. Ensures user exists in Prisma database using validated data from Supabase
 *
 * Called from client-side callback after Supabase SDK has set session in localStorage.
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { accessToken, refreshToken, expiresIn } = body;

    // Validate required fields
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }

    // Validate the access token with Supabase to prevent forged requests
    // Use the token to get the real user data — do NOT trust request body for user info
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { data: { user: validatedUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !validatedUser) {
      console.error('Sync: Invalid token provided:', authError?.message);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
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

    // Ensure user exists in database using VALIDATED data from Supabase, not request body
    try {
      const user = {
        id: validatedUser.id,
        email: validatedUser.email,
        user_metadata: {
          name: validatedUser.user_metadata?.name
            ? sanitizeString(validatedUser.user_metadata.name)
            : validatedUser.user_metadata?.full_name
              ? sanitizeString(validatedUser.user_metadata.full_name)
              : undefined,
          avatar_url: sanitizeUrl(validatedUser.user_metadata?.avatar_url),
        },
      } as any;

      await ensureUserInDb(user);
    } catch (dbError) {
      console.error('Error syncing user to database:', dbError);
      // Don't fail the request if DB sync fails - tokens are already set
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
