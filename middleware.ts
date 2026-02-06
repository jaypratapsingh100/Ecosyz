import { NextRequest, NextResponse } from 'next/server';

// Name of the anonymous session cookie
const SESSION_COOKIE = 'anon_session';

// 180 days in seconds
const MAX_AGE = 60 * 60 * 24 * 180;

function isAsset(pathname: string) {
  // Skip static assets and Next internals
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/public')
  );
}

function newSessionId() {
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

function isValidSessionId(id: string) {
  if (!id || id.length > 128) return false;
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const b64url16 = /^[A-Za-z0-9\-_]{22}$/; // 16-byte base64url
  return uuidV4.test(id) || b64url16.test(id);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isAsset(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const existing = req.cookies.get(SESSION_COOKIE)?.value;

  if (!existing || !isValidSessionId(existing)) {
    const sid = newSessionId();
    res.cookies.set({
      name: SESSION_COOKIE,
      value: sid,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
  }

  return res;
}

export const config = {
  // Run for all routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
