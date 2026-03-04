import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTokens, clearSessionTokens } from '@/lib/auth/core/tokens';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    // Get current tokens so we can properly invalidate the session on Supabase's side
    const { accessToken, refreshToken } = await getTokens();

    if (accessToken && refreshToken) {
      // Create a per-request client with the user's actual session
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

      // Set the session so signOut() actually invalidates it on Supabase's side
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error.message);
      }
    }

    // Clear session cookies regardless of Supabase response
    await clearSessionTokens();

    return NextResponse.json({
      message: 'Signed out successfully',
    });
  } catch (error) {
    // Still clear cookies even if Supabase signout fails
    try {
      await clearSessionTokens();
    } catch {
      // ignore cleanup errors
    }

    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
