/**
 * Session management utilities
 * Handles anonymous sessions and session ID generation
 */

import { cookies } from 'next/headers';
import { ANON_SESSION_COOKIE, ANON_SESSION_MAX_AGE } from './constants';

/**
 * Generate a new anonymous session ID
 */
export function newAnonymousSessionId(): string {
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

/**
 * Get or create anonymous session ID
 */
export async function getAnonymousUid(): Promise<string> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ANON_SESSION_COOKIE);
  let uid = cookie?.value;

  // If no session cookie exists, create a new one
  if (!uid) {
    uid = newAnonymousSessionId();
    // Set the cookie for future requests
    cookieStore.set({
      name: ANON_SESSION_COOKIE,
      value: uid,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ANON_SESSION_MAX_AGE,
    });
  }

  return uid;
}
