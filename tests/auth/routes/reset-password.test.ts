import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockListUsers = vi.fn();
const mockFetch = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        listUsers: (...args: any[]) => mockListUsers(...args),
      },
    },
  }),
}));

vi.mock('@/app/lib/utils/reset-token', () => ({
  generateResetToken: vi.fn(() => 'mock-token'),
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/reset-password', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock global fetch for Resend API
    globalThis.fetch = mockFetch as any;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend-msg-123' }),
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.RESEND_API_KEY = 'test-resend-key';

    const mod = await import('@/app/api/auth/reset-password/route');
    POST = mod.POST;
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(buildRequest({ email: 'bad' }));
    expect(res.status).toBe(400);
  });

  it('returns success even if user not found (security)', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const res = await POST(buildRequest({ email: 'noone@test.com' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('sends reset email when user is found', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'uid-1', email: 'user@test.com' },
        ],
      },
      error: null,
    });

    const res = await POST(buildRequest({ email: 'user@test.com' }));
    expect(res.status).toBe(200);

    // Verify Resend API was called
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('returns 500 when Resend API fails', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'uid-1', email: 'user@test.com' }],
      },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Resend error',
    });

    const res = await POST(buildRequest({ email: 'user@test.com' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Failed to send');
  });

  it('returns 503 when Supabase config is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Re-import to pick up env change
    vi.resetModules();
    const mod = await import('@/app/api/auth/reset-password/route');
    const res = await mod.POST(buildRequest({ email: 'user@test.com' }));
    expect(res.status).toBe(503);
  });
});
