import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

/**
 * GET: List all partnership applications (admin only)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const applications = await prisma.partnershipApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (err) {
    console.error('[admin/partnership]', err);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
