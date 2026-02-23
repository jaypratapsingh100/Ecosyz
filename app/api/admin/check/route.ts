import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

/**
 * Lightweight admin check. Use this instead of /api/admin/analytics when you only
 * need to know if the current user is an admin (e.g. for dashboard or newsletter gate).
 * Returns 200 { ok: true } if admin, 401 if not authenticated, 403 if not admin.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/check]', err);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
