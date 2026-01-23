/**
 * Token management utilities
 * Handles token generation, validation, and refresh
 */

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SESSION_COOKIE, REFRESH_COOKIE } from './constants';

/**
 * Get tokens from cookies
 */
export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE)?.value || null;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value || null;
  
  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables not configured');
    return null;
  }

  // Create a fresh Supabase client for server-side token refresh
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error('Token refresh error:', error);
      return null;
    }

    return {
      accessToken: data.session.access_token,
      expiresIn: data.session.expires_in || 3600,
    };
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    return null;
  }
}

/**
 * Set session tokens in cookies
 */
export async function setSessionTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn?: number
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: expiresIn || 3600,
    path: '/',
  });

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

/**
 * Clear session tokens
 */
export async function clearSessionTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
