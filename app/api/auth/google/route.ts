import { NextRequest } from 'next/server';
import { initiateOAuth } from '@/lib/auth/utils';

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
  return initiateOAuth(req, 'google');
}
