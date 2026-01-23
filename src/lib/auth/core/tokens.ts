/**
 * Token management utilities
 * Handles token generation, validation, and refresh
 */

import { cookies } from 'next/headers';
import { supabase } from '@/src/lib/supabase';
import { SESSION_COOKIE, REFRESH_COOKIE } from './constants';

/**
 * Get tokens from cookies
 */
export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(SESSION_COOKIE)?.value || null,
    refreshToken: cookieStore.get(REFRESH_COOKIE)?.value || null,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

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
    console.error('Error refreshing token:', error);
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
