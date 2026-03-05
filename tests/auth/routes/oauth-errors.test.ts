import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockInitiateOAuth = vi.fn();

vi.mock('@/lib/auth/utils', () => ({
  initiateOAuth: (...args: any[]) => mockInitiateOAuth(...args),
}));

function buildRequest(provider: string, redirect?: string) {
  const url = new URL(`http://localhost:3000/api/auth/oauth/${provider}`);
  if (redirect) url.searchParams.set('redirect', redirect);
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/auth/oauth/[provider] — error scenarios', () => {
  let GET: (req: NextRequest, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/auth/oauth/[provider]/route');
    GET = mod.GET;
  });

  it('returns 400 for empty provider string', async () => {
    const res = await GET(buildRequest(''), {
      params: Promise.resolve({ provider: '' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Unsupported OAuth provider');
  });

  it('returns 400 for provider with special characters', async () => {
    const res = await GET(buildRequest('goo<script>gle'), {
      params: Promise.resolve({ provider: 'goo<script>gle' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns supportedProviders list on unsupported provider', async () => {
    const res = await GET(buildRequest('linkedin'), {
      params: Promise.resolve({ provider: 'linkedin' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.supportedProviders).toEqual(expect.arrayContaining(['google', 'github']));
  });

  it('returns 503 when initiateOAuth returns 503 (Supabase unavailable)', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Authentication service unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await GET(buildRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });
    expect(res.status).toBe(503);
  });

  it('returns 400 when initiateOAuth returns Supabase error', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Provider configuration error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await GET(buildRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Provider configuration error');
  });

  it('returns 500 when initiateOAuth returns 500 (no redirect URL)', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Failed to initiate google login' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await GET(buildRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });
    expect(res.status).toBe(500);
  });

  it('returns 500 when initiateOAuth throws unexpected exception', async () => {
    mockInitiateOAuth.mockRejectedValue(new Error('network timeout'));

    // The route doesn't have its own try/catch — it relies on initiateOAuth.
    // The rejected promise should propagate as an unhandled error (500 in Next.js).
    await expect(
      GET(buildRequest('google'), {
        params: Promise.resolve({ provider: 'google' }),
      })
    ).rejects.toThrow('network timeout');
  });

  it('handles redirect param with special characters properly', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    await GET(buildRequest('google', '/search?q=hello world&sort=date'), {
      params: Promise.resolve({ provider: 'google' }),
    });

    const callbackUrl = mockInitiateOAuth.mock.calls[0][2] as string;
    expect(callbackUrl).toContain('/auth/callback');
    // The redirect param should be set on the callback URL
    expect(callbackUrl).toContain('redirect=');
  });
});
