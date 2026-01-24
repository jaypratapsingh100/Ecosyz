/**
 * Shared OAuth utilities
 * Common logic for OAuth provider routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

/**
 * Supported OAuth providers
 * Add new providers here as they're added to Supabase
 */
export const SUPPORTED_OAUTH_PROVIDERS = ['google', 'github'] as const;

export type OAuthProvider = typeof SUPPORTED_OAUTH_PROVIDERS[number];

/**
 * Validate if a provider is supported
 */
export function isValidOAuthProvider(provider: string): provider is OAuthProvider {
  return SUPPORTED_OAUTH_PROVIDERS.includes(provider as OAuthProvider);
}

/**
 * Initiate OAuth flow for a provider
 * Returns redirect response or error response
 */
export async function initiateOAuth(
  req: NextRequest,
  provider: OAuthProvider
): Promise<NextResponse> {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const redirectUrl = `${req.nextUrl.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        // Let Supabase handle the flow automatically
      },
    });

    if (error) {
      console.error(`❌ ${provider} OAuth initiation error:`, error);
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
      { error: `Failed to initiate ${provider} login` },
      { status: 500 }
    );
  } catch (error) {
    console.error(`${provider} login error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
