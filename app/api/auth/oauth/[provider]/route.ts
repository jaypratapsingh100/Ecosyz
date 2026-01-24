import { NextRequest } from 'next/server';
import { initiateOAuth } from '@/lib/auth/utils';

/**
 * Dynamic OAuth Provider Route
 * 
 * Handles OAuth initiation for any supported provider (google, github, etc.)
 * 
 * Usage:
 * - GET /api/auth/oauth/google
 * - GET /api/auth/oauth/github
 * 
 * Uses Supabase's standard client-side OAuth flow:
 * - Calls signInWithOAuth
 * - Redirects to Supabase-provided OAuth URL
 * - Supabase handles token delivery via URL hash to /auth/callback
 * - Client-side callback page handles session persistence
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  // Validate provider
  const validProviders = ['google', 'github'] as const;
  type ValidProvider = typeof validProviders[number];
  
  if (!validProviders.includes(provider as ValidProvider)) {
    return new Response(
      JSON.stringify({ 
        error: `Unsupported OAuth provider: ${provider}`,
        supportedProviders: validProviders 
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return initiateOAuth(req, provider as ValidProvider);
}
