import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockSignInWithPassword = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
    },
  },
}));

vi.mock('@/app/lib/utils/rate-limit', () => ({
  rateLimit: vi.fn(() => true),
  getClientKey: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/app/lib/utils/logger', () => ({
  maskEmail: vi.fn((e: string) => '***@***'),
}));

vi.mock('@/lib/auth/core/tokens', () => ({
  setSessionTokens: vi.fn(),
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---- Tests ----

describe('POST /api/auth/signin', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/auth/signin/route');
    POST = mod.POST;
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(buildRequest({ email: 'bad', password: '123' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing password', async () => {
    const res = await POST(buildRequest({ email: 'user@test.com', password: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when Supabase returns invalid credentials error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const res = await POST(buildRequest({ email: 'user@test.com', password: 'wrongpass' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid email or password');
  });

  it('returns 400 when email not confirmed', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Email not confirmed', status: 400 },
    });

    const res = await POST(buildRequest({ email: 'user@test.com', password: 'Pass1234' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('verify your email');
  });

  it('returns 200 with user data on successful sign in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
        },
        user: {
          id: 'uid-1',
          email: 'user@test.com',
          user_metadata: { name: 'Test User' },
        },
      },
      error: null,
    });

    const res = await POST(buildRequest({ email: 'user@test.com', password: 'Pass1234' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Signed in successfully');
    expect(json.user.email).toBe('user@test.com');
    expect(json.user.id).toBe('uid-1');
  });

  it('returns 500 when session data is missing', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    const res = await POST(buildRequest({ email: 'user@test.com', password: 'Pass1234' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.code).toBe('SESSION_ERROR');
  });

  it('returns 429 when rate limited', async () => {
    const { rateLimit: rl } = await import('@/app/lib/utils/rate-limit');
    (rl as any).mockReturnValueOnce(false);

    const res = await POST(buildRequest({ email: 'user@test.com', password: 'Pass1234' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe('RATE_LIMITED');
  });

  it('returns 503 when Supabase throws an exception', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

    const res = await POST(buildRequest({ email: 'user@test.com', password: 'Pass1234' }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe('AUTH_SERVICE_ERROR');
  });
});
