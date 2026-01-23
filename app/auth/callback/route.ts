import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables not configured');
    return NextResponse.redirect(new URL('/auth?error=config_error', req.url));
  }

  try {
    // Parse URL to handle both code exchange and hash fragments
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    const hash = url.hash; // This will contain access_token in fragment

    // Handle error parameter if present
    if (error) {
      console.error('OAuth error parameter:', error, errorDescription);
      return NextResponse.redirect(new URL(`/auth?error=${error}&description=${errorDescription || ''}`, req.url));
    }

    // Create Supabase client for server-side operations
    const cookieStore = await cookies();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: false, // We handle sessions via cookies
      },
    });

    // Code-based flow (PKCE) - This is the standard flow for server-side
    if (code) {
      console.log('Authorization code found, exchanging for session');
      
      // Exchange code for session
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Code exchange error:', sessionError);
        return NextResponse.redirect(new URL(`/auth?error=code_exchange_failed&message=${encodeURIComponent(sessionError.message)}`, req.url));
      }

      if (!sessionData?.session) {
        console.error('No session returned from code exchange');
        return NextResponse.redirect(new URL('/auth?error=no_session', req.url));
      }

      // Create response with cookies
      const response = NextResponse.redirect(new URL('/app-builder', req.url));
      
      // Set session cookies on response object
      const isProduction = process.env.NODE_ENV === 'production';
      const { SESSION_COOKIE, REFRESH_COOKIE, REFRESH_TOKEN_MAX_AGE } = await import('@/lib/auth/core/constants');
      
      response.cookies.set(SESSION_COOKIE, sessionData.session.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: sessionData.session.expires_in || 3600,
        path: '/',
      });

      response.cookies.set(REFRESH_COOKIE, sessionData.session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        path: '/',
      });

      console.log('Session established successfully from code exchange');
      return response;
    }

    // Handle hash fragments (client-side flow fallback)
    if (hash && hash.includes('access_token=')) {
      console.log('Hash fragment found in URL, processing OAuth tokens directly');
      try {
        // Extract tokens from hash fragment
        const accessToken = hash.match(/access_token=([^&]*)/)?.[1];
        const refreshToken = hash.match(/refresh_token=([^&]*)/)?.[1];
        
        if (accessToken && refreshToken) {
          // Create response with cookies
          const response = NextResponse.redirect(new URL('/app-builder', req.url));
          const isProduction = process.env.NODE_ENV === 'production';
          const { SESSION_COOKIE, REFRESH_COOKIE, REFRESH_TOKEN_MAX_AGE } = await import('@/lib/auth/core/constants');
          
          // Set session cookies on response object
          response.cookies.set(SESSION_COOKIE, decodeURIComponent(accessToken), {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 3600, // 1 hour default
            path: '/',
          });

          response.cookies.set(REFRESH_COOKIE, decodeURIComponent(refreshToken), {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: REFRESH_TOKEN_MAX_AGE,
            path: '/',
          });

          console.log('Session established successfully from hash tokens');
          return response;
        }
      } catch (hashError) {
        console.error('Error processing hash fragment:', hashError);
      }
    }

    // No code or hash found
    console.error('No code or hash fragments found in callback URL');
    return NextResponse.redirect(new URL('/auth?error=no_code_found', req.url));
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/auth?error=callback_error&message=${encodeURIComponent(error?.message || 'Unknown error')}`, req.url));
  }
}
