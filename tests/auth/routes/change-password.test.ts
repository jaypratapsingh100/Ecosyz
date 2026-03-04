import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockGetCurrentUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      admin: {
        updateUserById: (...args: any[]) => mockUpdateUserById(...args),
      },
    },
  }),
}));

vi.mock('@/app/lib/utils/logger', () => ({
  maskEmail: vi.fn(() => '***@***'),
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/change-password', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    mockGetCurrentUser.mockResolvedValue({
      id: 'uid-1',
      email: 'user@test.com',
    });

    const mod = await import('@/app/api/auth/change-password/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await POST(
      buildRequest({ currentPassword: 'Old1234!', newPassword: 'NewPass123' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid input', async () => {
    const res = await POST(
      buildRequest({ currentPassword: '', newPassword: 'weak' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when current password is wrong', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const res = await POST(
      buildRequest({ currentPassword: 'WrongPass1', newPassword: 'NewPass123' })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('incorrect');
  });

  it('returns 200 on successful password change', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const res = await POST(
      buildRequest({ currentPassword: 'OldPass123', newPassword: 'NewPass123' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 400 for same password error', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockUpdateUserById.mockResolvedValue({
      error: { message: 'same password' },
    });

    const res = await POST(
      buildRequest({ currentPassword: 'Pass1234', newPassword: 'Pass1234' })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('different');
  });

  it('returns 503 when service config is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    // Re-mock dependencies for the fresh module
    vi.doMock('@/lib/auth', () => ({
      getCurrentUser: mockGetCurrentUser,
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        auth: {
          signInWithPassword: mockSignInWithPassword,
          admin: { updateUserById: mockUpdateUserById },
        },
      }),
    }));
    vi.doMock('@/app/lib/utils/logger', () => ({
      maskEmail: vi.fn(() => '***@***'),
    }));

    const mod = await import('@/app/api/auth/change-password/route');
    const res = await mod.POST(
      buildRequest({ currentPassword: 'OldPass123', newPassword: 'NewPass123' })
    );
    expect(res.status).toBe(503);
  });
});
