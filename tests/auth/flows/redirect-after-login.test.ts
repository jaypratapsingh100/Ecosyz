import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getSafeRedirectUrl, buildAuthUrl } from '@/src/lib/auth/utils/redirect';
import { middleware } from '@/middleware';

// ---- Mocks for OAuth route ----

const mockInitiateOAuth = vi.fn();

vi.mock('@/lib/auth/utils', () => ({
  initiateOAuth: (...args: any[]) => mockInitiateOAuth(...args),
}));

function buildOAuthRequest(provider: string, redirect?: string) {
  const url = new URL(`http://localhost:3000/api/auth/oauth/${provider}`);
  if (redirect) url.searchParams.set('redirect', redirect);
  return new NextRequest(url, { method: 'GET' });
}

describe('Redirect-after-login flow — integration', () => {
  let OAuthGET: (req: NextRequest, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/auth/oauth/[provider]/route');
    OAuthGET = mod.GET;
  });

  // --- Redirect utility tests ---

  it('getSafeRedirectUrl blocks absolute URL https://evil.com', () => {
    expect(getSafeRedirectUrl('https://evil.com')).toBe('/studio');
  });

  it('getSafeRedirectUrl blocks protocol-relative //evil.com', () => {
    expect(getSafeRedirectUrl('//evil.com')).toBe('/studio');
  });

  it('getSafeRedirectUrl blocks javascript: scheme', () => {
    expect(getSafeRedirectUrl('/javascript:alert(1)')).toBe('/studio');
  });

  it('getSafeRedirectUrl allows valid path with query params', () => {
    expect(getSafeRedirectUrl('/community?tab=barter')).toBe('/community?tab=barter');
  });

  it('buildAuthUrl returns /auth for default /studio redirect', () => {
    expect(buildAuthUrl('/studio')).toBe('/auth');
  });

  it('buildAuthUrl properly encodes /community?tab=barter', () => {
    const url = buildAuthUrl('/community?tab=barter');
    expect(url).toBe('/auth?redirect=%2Fcommunity%3Ftab%3Dbarter');
  });

  // --- OAuth route redirect passthrough ---

  it('OAuth route builds callback URL with redirect param embedded', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    await OAuthGET(buildOAuthRequest('google', '/community?tab=barter'), {
      params: Promise.resolve({ provider: 'google' }),
    });

    const callbackUrl = mockInitiateOAuth.mock.calls[0][2] as string;
    expect(callbackUrl).toContain('/auth/callback');
    expect(callbackUrl).toContain('redirect=%2Fcommunity%3Ftab%3Dbarter');
  });

  it('OAuth route without redirect param passes undefined callbackUrl', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    await OAuthGET(buildOAuthRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });

    expect(mockInitiateOAuth.mock.calls[0][2]).toBeUndefined();
  });

  // --- Full redirect chain ---

  it('middleware → auth page → OAuth → callback preserves original path', async () => {
    // Step 1: Middleware redirects /studio?project=abc to /auth?redirect=/studio?project=abc
    const req = new NextRequest('http://localhost:3000/studio?project=abc');
    const mwRes = middleware(req);
    expect(mwRes.status).toBe(307);
    const authUrl = new URL(mwRes.headers.get('location')!);
    expect(authUrl.pathname).toBe('/auth');
    const redirectParam = authUrl.searchParams.get('redirect')!;
    expect(redirectParam).toBe('/studio?project=abc');

    // Step 2: Auth page validates redirect (simulated)
    const safeRedirect = getSafeRedirectUrl(redirectParam);
    expect(safeRedirect).toBe('/studio?project=abc');

    // Step 3: OAuth route passes redirect through to callback
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );
    await OAuthGET(buildOAuthRequest('google', safeRedirect), {
      params: Promise.resolve({ provider: 'google' }),
    });
    const callbackUrl = mockInitiateOAuth.mock.calls[0][2] as string;
    expect(callbackUrl).toContain('/auth/callback');
    // The redirect should survive the round trip
    const cbUrl = new URL(callbackUrl);
    expect(cbUrl.searchParams.get('redirect')).toBe('/studio?project=abc');
  });
});
