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

describe('POST /api/auth/signout — cookie clearing', () => {
  let POST: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockClearSessionTokens.mockResolvedValue(undefined);
    const mod = await import('@/app/api/auth/signout/route');
    POST = mod.POST;
  });

  it('calls clearSessionTokens on successful signout', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockClearSessionTokens).toHaveBeenCalledTimes(1);
  });

  it('calls clearSessionTokens even when Supabase signout errors', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('provider error') });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockClearSessionTokens).toHaveBeenCalledTimes(1);
  });

  it('returns JSON with success message', async () => {
    const res = await POST();
    const json = await res.json();
    expect(json.message).toBe('Signed out successfully');
  });

  it('returns content-type application/json', async () => {
    const res = await POST();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('does not crash when signOut rejects (returns 500)', async () => {
    mockSignOut.mockRejectedValue(new Error('unexpected'));
    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('does not crash when clearSessionTokens rejects', async () => {
    mockClearSessionTokens.mockRejectedValue(new Error('cookie jar broken'));
    const res = await POST();
    // clearSessionTokens rejection is caught by the try/catch
    expect(res.status).toBe(500);
  });

  it('calls signOut before clearSessionTokens', async () => {
    const callOrder: string[] = [];
    mockSignOut.mockImplementation(async () => {
      callOrder.push('signOut');
      return { error: null };
    });
    mockClearSessionTokens.mockImplementation(async () => {
      callOrder.push('clearTokens');
    });

    await POST();
    expect(callOrder).toEqual(['signOut', 'clearTokens']);
  });

  it('returns 200 status code (not 204 or other)', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(204);
  });
});
