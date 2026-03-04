import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----

const mockSignOut = vi.fn();
const mockClearSessionTokens = vi.fn();

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args: any[]) => mockSignOut(...args),
    },
  },
}));

vi.mock('@/lib/auth/core/tokens', () => ({
  clearSessionTokens: (...args: any[]) => mockClearSessionTokens(...args),
}));

describe('POST /api/auth/signout', () => {
  let POST: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockClearSessionTokens.mockResolvedValue(undefined);
    const mod = await import('@/app/api/auth/signout/route');
    POST = mod.POST;
  });

  it('returns 200 on successful sign out', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Signed out successfully');
    expect(mockClearSessionTokens).toHaveBeenCalled();
  });

  it('still succeeds even if Supabase signOut errors', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('signout failed') });

    const res = await POST();
    expect(res.status).toBe(200);
    // Cookies should still be cleared
    expect(mockClearSessionTokens).toHaveBeenCalled();
  });

  it('returns 500 on unexpected error', async () => {
    mockSignOut.mockRejectedValue(new Error('boom'));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
