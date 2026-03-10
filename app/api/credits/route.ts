import { NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCreditUsage } from '@/lib/app-builder/credits';

/**
 * GET /api/credits — returns credit usage for the logged-in user.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDb(user);

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!prismaUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const usage = await getCreditUsage(prismaUser.id, {
    subscriptionPlan: prismaUser.subscriptionPlan,
    subscriptionStatus: prismaUser.subscriptionStatus,
    subscriptionEndDate: prismaUser.subscriptionEndDate,
    trialStartDate: prismaUser.trialStartDate,
    trialEndDate: prismaUser.trialEndDate,
  });

  return NextResponse.json(usage);
}
