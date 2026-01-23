import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

/**
 * Google OAuth Initiation Route
 * 
 * Uses Supabase's standard client-side OAuth flow:
 * - Calls signInWithOAuth (no custom PKCE settings)
 * - Redirects to Supabase-provided OAuth URL
 * - Supabase handles token delivery via URL hash to /auth/callback
 * - Client-side callback page handles session persistence
 */
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const redirectUrl = `${req.nextUrl.origin}/auth/callback`;
    
    // Use Supabase's standard OAuth flow - no custom PKCE settings
    // Supabase will handle token delivery via URL hash to callback
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Let Supabase handle the flow automatically
        // No skipBrowserRedirect - we want browser redirect
        // No custom flowType - use Supabase defaults
      },
    });

    if (error) {
      console.error('❌ Google OAuth initiation error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data.url) {
      // Redirect to Supabase OAuth URL
      // Supabase will redirect back to /auth/callback with tokens in hash
      return NextResponse.redirect(data.url);
    }

    return NextResponse.json(
      { error: 'Failed to initiate Google login' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Google login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
