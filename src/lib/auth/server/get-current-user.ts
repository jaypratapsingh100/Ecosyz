/**
 * Get current authenticated user
 * Handles session validation and token refresh
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { getTokens, refreshAccessToken, setSessionTokens } from '../core/tokens';

/**
 * Get the current authenticated user from session
 * Automatically refreshes token if expired
 */
export async function getCurrentUser(): Promise<SupabaseUser | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    return null;
  }

  try {
    const { accessToken, refreshToken } = await getTokens();

    if (!accessToken) return null;

    if (!refreshToken) {
      console.error('No refresh token found');
      return null;
    }

    // Try to set session with current tokens
    let sessionResult = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // If session is invalid, try refreshing the token
    if (sessionResult.error || !sessionResult.data.user) {
      console.log('Session invalid, attempting token refresh...');
      const refreshed = await refreshAccessToken(refreshToken);
      
      if (refreshed) {
        // Update cookies with new access token
        await setSessionTokens(refreshed.accessToken, refreshToken, refreshed.expiresIn);
        
        // Try setting session again with refreshed token
        sessionResult = await supabase.auth.setSession({
          access_token: refreshed.accessToken,
          refresh_token: refreshToken,
        });
      }
    }

    const { data: { user }, error } = sessionResult;

    if (error) {
      // Check for network/DNS errors
      if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
        console.error('Supabase connection error - DNS/Network issue:', error.message);
        console.error('Please check:');
        console.error('1. NEXT_PUBLIC_SUPABASE_URL is correct');
        console.error('2. Supabase project is active (not paused)');
        console.error('3. Network connectivity is available');
      } else {
        console.error('Error setting session:', error);
      }
      return null;
    }

    if (!user) {
      console.error('No user found in session');
      return null;
    }

    return user;
  } catch (error: any) {
    // Handle network/DNS errors specifically
    if (error?.cause?.code === 'ENOTFOUND' || error?.message?.includes('fetch failed') || error?.message?.includes('getaddrinfo')) {
      console.error('Supabase DNS/Network error:', error.cause || error.message);
      console.error('Cannot resolve Supabase hostname. Check NEXT_PUBLIC_SUPABASE_URL environment variable.');
    } else {
      console.error('Error getting current user:', error);
    }
    return null;
  }
}
