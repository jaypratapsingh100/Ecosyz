import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from './db';
import { supabase } from './supabase';

const SESSION_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    return null;
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_COOKIE)?.value;
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

    if (!accessToken) return null;

    // Set the session in Supabase
    if (!refreshToken) {
      console.error('No refresh token found');
      return null;
    }

    const { data: { user }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

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

export async function getUid(): Promise<string> {
  const user = await getCurrentUser();

  if (user) {
    // Ensure user exists in our database
    await ensureUserInDb(user);
    return user.id;
  }

  // Fallback to anonymous session for backwards compatibility
  return getAnonymousUid();
}

async function getAnonymousUid(): Promise<string> {
  // Read the session/owner cookie
  const cookieStore = await cookies();
  const cookie = cookieStore.get('anon_session');
  let uid = typeof cookie === 'object' && cookie !== null ? cookie.value : undefined;

  // If no session cookie exists, create a new one
  if (!uid) {
    uid = newAnonymousSessionId();
    // Set the cookie for future requests
    cookieStore.set({
      name: 'anon_session',
      value: uid,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180 days
    });
  }

  return uid;
}

export async function ensureUserInDb(user: SupabaseUser) {
  if (!user.email) {
    console.error('User email is required');
    return;
  }

  try {
    await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url,
        updatedAt: new Date(),
      },
      create: {
        supabaseId: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url,
      },
    });
  } catch (error) {
    console.error('Error ensuring user in database:', error);
  }
}

function newAnonymousSessionId() {
  // Use crypto.randomUUID when available
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Secure fallback using Web Crypto
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16);
    (crypto as Crypto).getRandomValues(bytes);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bytes).toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  // If secure randomness is not available, fail rather than issue weak IDs
  throw new Error('Secure randomness unavailable');
}

export async function ensureOwner(workspaceId: string) {
  const uid = await getUid();
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }
  if (ws.ownerId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return ws;
}
