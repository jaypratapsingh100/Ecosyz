/**
 * Get current authenticated user
 * Handles session validation and token refresh
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { getTokens, refreshAccessToken, setSessionTokens } from '../core/tokens';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Get the current authenticated user from session
 * Automatically refreshes token if expired
 */
export async function getCurrentUser(): Promise<SupabaseUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    return null;
  }

  // Create a fresh Supabase client for server-side operations
  // This ensures proper configuration for server-side token validation
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false, // We handle refresh manually
      persistSession: false, // We handle sessions via cookies
      detectSessionInUrl: false, // Don't auto-detect, we handle it manually
    },
  });

  try {
    const { accessToken, refreshToken } = await getTokens();

    if (!accessToken) {
      console.log('🔍 No access token found in cookies');
      return null;
    }

    if (!refreshToken) {
      console.error('❌ No refresh token found in cookies');
      return null;
    }

    console.log('🔍 Attempting to validate session with tokens', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken.length,
    });

    // Try to set session with current tokens
    let sessionResult = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // If session is invalid, try refreshing the token
    if (sessionResult.error || !sessionResult.data.user) {
      console.log('⚠️ Session invalid, attempting token refresh...', {
        error: sessionResult.error?.message,
        hasUser: !!sessionResult.data.user,
      });
      
      const refreshed = await refreshAccessToken(refreshToken);
      
      if (refreshed) {
        console.log('✅ Token refreshed successfully');
        // Update cookies with new access token
        await setSessionTokens(refreshed.accessToken, refreshToken, refreshed.expiresIn);
        
        // Try setting session again with refreshed token
        sessionResult = await supabase.auth.setSession({
          access_token: refreshed.accessToken,
          refresh_token: refreshToken,
        });
      } else {
        console.error('❌ Failed to refresh token');
      }
    }

    const { data: { user }, error } = sessionResult;

    if (error) {
      // Check for network/DNS errors
      if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
        console.error('❌ Supabase connection error - DNS/Network issue:', error.message);
        console.error('Please check:');
        console.error('1. NEXT_PUBLIC_SUPABASE_URL is correct');
        console.error('2. Supabase project is active (not paused)');
        console.error('3. Network connectivity is available');
      } else {
        console.error('❌ Error setting session:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
      }
      return null;
    }

    if (!user) {
      console.error('❌ No user found in session after validation');
      return null;
    }

    console.log('✅ Session validated successfully', {
      userId: user.id,
    });
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
