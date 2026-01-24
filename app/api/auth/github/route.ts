import { NextRequest } from 'next/server';
import { initiateOAuth } from '@/lib/auth/utils';

/**
 * GitHub OAuth Initiation Route
 * 
 * Uses Supabase's standard client-side OAuth flow
 */
export async function GET(req: NextRequest) {
  return initiateOAuth(req, 'github');
}