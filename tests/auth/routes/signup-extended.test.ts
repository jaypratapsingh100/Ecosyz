import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockSignUp = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue({});

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
      upsert: (...args: any[]) => mockUpsert(...args),
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

// Track fetch calls for welcome email
const originalFetch = globalThis.fetch;
let fetchSpy: ReturnType<typeof vi.fn>;

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockSuccessfulSignup(email = 'new@test.com', name = 'New User') {
  mockSignUp.mockResolvedValue({
    data: {
      user: {
        id: 'uid-ext-1',
        email,
        email_confirmed_at: null,
        user_metadata: { name },
      },
    },
    error: null,
  });
}

describe('POST /api/auth/signup — extended tests', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock global fetch for welcome email calls
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email-123' }),
    });
    globalThis.fetch = fetchSpy;

    // Set RESEND_API_KEY for email tests
    process.env.RESEND_API_KEY = 'test-resend-key';

    const mod = await import('@/app/api/auth/signup/route');
    POST = mod.POST;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
  });

  it('sends welcome email on successful signup (Resend called)', async () => {
    mockSuccessfulSignup('welcome@test.com', 'Welcome User');

    const res = await POST(buildRequest({
      email: 'welcome@test.com',
      password: 'Pass1234',
      name: 'Welcome User',
    }));
    expect(res.status).toBe(200);

    // Wait for non-blocking email send
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that fetch was called with Resend API
    const resendCall = fetchSpy.mock.calls.find(
      (call: any[]) => call[0] === 'https://api.resend.com/emails'
    );
    expect(resendCall).toBeDefined();
    const body = JSON.parse(resendCall![1].body);
    expect(body.to).toBe('welcome@test.com');
    expect(body.subject).toContain('Welcome');
  });

  it('signup succeeds even if welcome email fails', async () => {
    fetchSpy.mockRejectedValue(new Error('Resend down'));
    mockSuccessfulSignup();

    const res = await POST(buildRequest({
      email: 'new@test.com',
      password: 'Pass1234',
    }));
    // Signup should still succeed — email is non-blocking
    expect(res.status).toBe(200);
  });

  it('rejects password with only spaces', async () => {
    const res = await POST(buildRequest({
      email: 'u@t.com',
      password: '        ', // 8 spaces
    }));
    expect(res.status).toBe(400);
  });

  it('accepts password with special characters meeting all criteria', async () => {
    mockSuccessfulSignup('special@test.com');

    const res = await POST(buildRequest({
      email: 'special@test.com',
      password: 'P@ss1!#$',
    }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when user already exists (duplicate email)', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', status: 422 },
    });

    const res = await POST(buildRequest({
      email: 'dup@test.com',
      password: 'Pass1234',
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('already exists');
  });

  it('signup succeeds even when Prisma upsert fails (graceful degradation)', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('DB down'));
    mockSuccessfulSignup('dbfail@test.com');

    const res = await POST(buildRequest({
      email: 'dbfail@test.com',
      password: 'Pass1234',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.email).toBe('dbfail@test.com');
  });
});
