import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

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
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const subscriberCount = await prisma.newsletterSubscriber.count({
      where: { status: 'subscribed' },
    });

    return NextResponse.json({ subscriberCount });
  } catch (err) {
    console.error('[admin/newsletter/stats]', err);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter stats' },
      { status: 500 }
    );
  }
}
