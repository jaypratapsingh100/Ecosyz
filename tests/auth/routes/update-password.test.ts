import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockUpdateUserById = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        updateUserById: (...args: any[]) => mockUpdateUserById(...args),
      },
    },
  }),
}));

const mockVerifyResetToken = vi.fn();

vi.mock('@/app/lib/utils/reset-token', () => ({
  verifyResetToken: (...args: any[]) => mockVerifyResetToken(...args),
}));

vi.mock('@/app/lib/utils/logger', () => ({
  maskEmail: vi.fn(() => '***@***'),
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/update-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/update-password', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    const mod = await import('@/app/api/auth/update-password/route');
    POST = mod.POST;
  });

  it('returns 400 for invalid input (missing token)', async () => {
    const res = await POST(buildRequest({ password: 'NewPass123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for weak password', async () => {
    const res = await POST(buildRequest({ token: 'valid', password: 'weak' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid/expired token', async () => {
    mockVerifyResetToken.mockReturnValue(null);

    const res = await POST(buildRequest({ token: 'expired', password: 'NewPass123' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('invalid or has expired');
  });

  it('returns 200 on successful password update', async () => {
    mockVerifyResetToken.mockReturnValue({ email: 'user@test.com', userId: 'uid-1' });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const res = await POST(buildRequest({ token: 'valid-token', password: 'NewPass123' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 400 when trying to reuse the same password', async () => {
    mockVerifyResetToken.mockReturnValue({ email: 'user@test.com', userId: 'uid-1' });
    mockUpdateUserById.mockResolvedValue({
      error: { message: 'New password should be different from the old password, same password' },
    });

    const res = await POST(buildRequest({ token: 'valid-token', password: 'OldPass123' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('different');
  });

  it('returns 500 on generic update failure', async () => {
    mockVerifyResetToken.mockReturnValue({ email: 'user@test.com', userId: 'uid-1' });
    mockUpdateUserById.mockResolvedValue({
      error: { message: 'Something went wrong' },
    });

    const res = await POST(buildRequest({ token: 'valid-token', password: 'NewPass123' }));
    expect(res.status).toBe(500);
  });

  it('returns 503 when service config is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
    const mod = await import('@/app/api/auth/update-password/route');
    const res = await mod.POST(buildRequest({ token: 'tok', password: 'NewPass123' }));
    expect(res.status).toBe(503);
  });
});
