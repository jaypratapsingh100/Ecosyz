import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----

const mockGetCurrentUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockPrismaDelete = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        deleteUser: (...args: any[]) => mockDeleteUser(...args),
      },
    },
  }),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      delete: (...args: any[]) => mockPrismaDelete(...args),
    },
  },
}));

describe('DELETE /api/auth/delete', () => {
  let DELETE: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    const mod = await import('@/app/api/auth/delete/route');
    DELETE = mod.DELETE;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful deletion', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'uid-1' });
    mockPrismaDelete.mockResolvedValue({});
    mockDeleteUser.mockResolvedValue({ error: null });

    const res = await DELETE();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('User deleted successfully');
  });

  it('continues Supabase deletion even if Prisma fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'uid-1' });
    mockPrismaDelete.mockRejectedValue(new Error('FK constraint'));
    mockDeleteUser.mockResolvedValue({ error: null });

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith('uid-1');
  });

  it('returns 500 when Supabase deletion fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'uid-1' });
    mockPrismaDelete.mockResolvedValue({});
    mockDeleteUser.mockResolvedValue({ error: { message: 'delete failed' } });

    const res = await DELETE();
    expect(res.status).toBe(500);
  });

  it('returns 503 when service config is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
    vi.doMock('@/lib/auth', () => ({
      getCurrentUser: mockGetCurrentUser,
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        auth: { admin: { deleteUser: mockDeleteUser } },
      }),
    }));
    vi.doMock('@/lib/db', () => ({
      prisma: { user: { delete: mockPrismaDelete } },
    }));

    const mod = await import('@/app/api/auth/delete/route');
    const res = await mod.DELETE();
    expect(res.status).toBe(503);
  });
});
