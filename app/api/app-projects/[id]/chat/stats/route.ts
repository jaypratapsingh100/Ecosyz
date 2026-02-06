import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLoadBalancer } from '@/lib/llm-load-balancer';

/**
 * Get load balancer statistics and provider health
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const loadBalancer = getLoadBalancer();
    const stats = Array.from(loadBalancer.getStats().entries()).map(([provider, stat]) => ({
      provider,
      requestsHandled: stat.requestsHandled,
      requestsFailed: stat.requestsFailed,
      currentUsage: stat.currentUsage,
      lastUsed: stat.lastUsed,
      successRate: stat.requestsHandled > 0 
        ? (stat.requestsHandled / (stat.requestsHandled + stat.requestsFailed)) * 100 
        : 0,
    }));

    const recommendedDistribution = loadBalancer.getRecommendedDistribution();

    return NextResponse.json({
      stats,
      recommendedDistribution,
      totalRequests: stats.reduce((sum, s) => sum + s.requestsHandled, 0),
      totalFailures: stats.reduce((sum, s) => sum + s.requestsFailed, 0),
    });
  } catch (error: unknown) {
    console.error('Load balancer stats error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error) || 'Failed to get load balancer stats';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}






