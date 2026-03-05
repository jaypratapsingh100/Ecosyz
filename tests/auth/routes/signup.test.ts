import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockSignUp = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSignUp(...args),
    },
  },
}));

vi.mock('@/src/lib/db', () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({}),
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

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/signup', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/auth/signup/route');
    POST = mod.POST;
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(buildRequest({ email: 'bad', password: 'Pass1234' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for weak password (no uppercase)', async () => {
    const res = await POST(buildRequest({ email: 'u@t.com', password: 'pass1234' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for weak password (no number)', async () => {
    const res = await POST(buildRequest({ email: 'u@t.com', password: 'Password' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await POST(buildRequest({ email: 'u@t.com', password: 'Pa1' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful signup', async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: {
          id: 'uid-new',
          email: 'new@test.com',
          email_confirmed_at: null,
          user_metadata: { name: 'New User' },
        },
      },
      error: null,
    });

    const res = await POST(
      buildRequest({ email: 'new@test.com', password: 'Pass1234', name: 'New User' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain('Account created');
    expect(json.user.email).toBe('new@test.com');
  });

  it('returns 400 when user already exists', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', status: 422 },
    });

    const res = await POST(buildRequest({ email: 'dup@test.com', password: 'Pass1234' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('already exists');
  });

  it('returns 500 when no user is returned', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await POST(buildRequest({ email: 'u@t.com', password: 'Pass1234' }));
    expect(res.status).toBe(500);
  });

  it('returns 429 when rate limited', async () => {
    const { rateLimit: rl } = await import('@/app/lib/utils/rate-limit');
    (rl as any).mockReturnValueOnce(false);

    const res = await POST(buildRequest({ email: 'u@t.com', password: 'Pass1234' }));
    expect(res.status).toBe(429);
  });

  it('succeeds even if prisma upsert fails (graceful degradation)', async () => {
    const { prisma } = await import('@/src/lib/db');
    (prisma.user.upsert as any).mockRejectedValueOnce(new Error('DB down'));

    mockSignUp.mockResolvedValue({
      data: {
        user: {
          id: 'uid-2',
          email: 'u@t.com',
          email_confirmed_at: null,
          user_metadata: {},
        },
      },
      error: null,
    });

    const res = await POST(buildRequest({ email: 'u@t.com', password: 'Pass1234' }));
    expect(res.status).toBe(200);
  });
});
