import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Today's stats by provider
    const todayByProvider = await prisma.generationLog.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: startOfToday } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true, totalTokens: true },
      _count: { id: true },
      _avg: { durationMs: true, ttfbMs: true },
    });

    // This month's stats by provider
    const monthByProvider = await prisma.generationLog.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true, totalTokens: true },
      _count: { id: true },
      _avg: { durationMs: true, ttfbMs: true },
    });

    // This month's stats by model
    const monthByModel = await prisma.generationLog.groupBy({
      by: ['provider', 'model'],
      where: { createdAt: { gte: startOfMonth } },
      _sum: { costUsd: true, totalTokens: true },
      _count: { id: true },
      _avg: { durationMs: true },
    });

    // ── Per-user, per-project cost breakdown (all time) ──
    const projectCosts = await prisma.generationLog.groupBy({
      by: ['projectId', 'userId'],
      _sum: { costUsd: true, inputTokens: true, outputTokens: true, totalTokens: true },
      _count: { id: true },
      _avg: { durationMs: true, ttfbMs: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { _sum: { costUsd: 'desc' } },
    });

    // Fetch all referenced projects with details
    const allProjectIds = [...new Set(projectCosts.map((p) => p.projectId))];
    const allProjects = allProjectIds.length > 0
      ? await prisma.appProject.findMany({
          where: { id: { in: allProjectIds } },
          select: {
            id: true,
            title: true,
            description: true,
            framework: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
            deploymentUrl: true,
            deploymentStatus: true,
          },
        })
      : [];
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));

    // Fetch all referenced users
    const allUserIds = [...new Set(projectCosts.map((p) => p.userId))];
    const allUsers = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // Build per-user structure: user → projects → cost
    const userProjectMap = new Map<string, {
      userId: string;
      email: string;
      name: string | null;
      totalCostUsd: number;
      totalTokens: number;
      totalGenerations: number;
      projects: Array<{
        projectId: string;
        title: string;
        description: string | null;
        framework: string | null;
        deploymentUrl: string | null;
        deploymentStatus: string | null;
        projectCreatedAt: string;
        generations: number;
        costUsd: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        avgLatencyMs: number;
        avgTtfbMs: number | null;
        firstGeneration: string | null;
        lastGeneration: string | null;
      }>;
    }>();

    for (const row of projectCosts) {
      const userInfo = userMap.get(row.userId);
      const projectInfo = projectMap.get(row.projectId);

      if (!userProjectMap.has(row.userId)) {
        userProjectMap.set(row.userId, {
          userId: row.userId,
          email: userInfo?.email ?? 'unknown',
          name: userInfo?.name ?? null,
          totalCostUsd: 0,
          totalTokens: 0,
          totalGenerations: 0,
          projects: [],
        });
      }

      const entry = userProjectMap.get(row.userId)!;
      const costUsd = row._sum.costUsd ?? 0;
      const totalTokens = row._sum.totalTokens ?? 0;
      const generations = row._count.id;

      entry.totalCostUsd += costUsd;
      entry.totalTokens += totalTokens;
      entry.totalGenerations += generations;

      entry.projects.push({
        projectId: row.projectId,
        title: projectInfo?.title ?? 'Untitled',
        description: projectInfo?.description ?? null,
        framework: projectInfo?.framework ?? null,
        deploymentUrl: projectInfo?.deploymentUrl ?? null,
        deploymentStatus: projectInfo?.deploymentStatus ?? null,
        projectCreatedAt: projectInfo?.createdAt?.toISOString() ?? '',
        generations,
        costUsd,
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        totalTokens,
        avgLatencyMs: Math.round(row._avg.durationMs ?? 0),
        avgTtfbMs: row._avg.ttfbMs ? Math.round(row._avg.ttfbMs) : null,
        firstGeneration: row._min.createdAt?.toISOString() ?? null,
        lastGeneration: row._max.createdAt?.toISOString() ?? null,
      });
    }

    // Sort users by total cost descending
    const byUser = Array.from(userProjectMap.values()).sort(
      (a, b) => b.totalCostUsd - a.totalCostUsd
    );

    // Recent generation logs (last 50) with project title + user
    const recentLogs = await prisma.generationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        projectId: true,
        userId: true,
        provider: true,
        model: true,
        stage: true,
        status: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true,
        costSource: true,
        durationMs: true,
        ttfbMs: true,
        filesCreated: true,
        usedFallback: true,
        createdAt: true,
      },
    });

    // Enrich recent logs with project title + user email
    const logProjectIds = [...new Set(recentLogs.map((l) => l.projectId))];
    const logUserIds = [...new Set(recentLogs.map((l) => l.userId))];
    const logProjects = logProjectIds.length > 0
      ? await prisma.appProject.findMany({
          where: { id: { in: logProjectIds } },
          select: { id: true, title: true },
        })
      : [];
    const logUsers = logUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: logUserIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const logProjectMap = new Map(logProjects.map((p) => [p.id, p]));
    const logUserMap = new Map(logUsers.map((u) => [u.id, u]));

    const enrichedLogs = recentLogs.map((log) => ({
      ...log,
      projectTitle: logProjectMap.get(log.projectId)?.title ?? 'Unknown',
      userEmail: logUserMap.get(log.userId)?.email ?? 'unknown',
      userName: logUserMap.get(log.userId)?.name ?? null,
    }));

    return NextResponse.json({
      today: todayByProvider.map((row) => ({
        provider: row.provider,
        generations: row._count.id,
        costUsd: row._sum.costUsd ?? 0,
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        totalTokens: row._sum.totalTokens ?? 0,
        avgLatencyMs: Math.round(row._avg.durationMs ?? 0),
        avgTtfbMs: row._avg.ttfbMs ? Math.round(row._avg.ttfbMs) : null,
      })),
      month: monthByProvider.map((row) => ({
        provider: row.provider,
        generations: row._count.id,
        costUsd: row._sum.costUsd ?? 0,
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        totalTokens: row._sum.totalTokens ?? 0,
        avgLatencyMs: Math.round(row._avg.durationMs ?? 0),
        avgTtfbMs: row._avg.ttfbMs ? Math.round(row._avg.ttfbMs) : null,
      })),
      byModel: monthByModel.map((row) => ({
        provider: row.provider,
        model: row.model,
        generations: row._count.id,
        costUsd: row._sum.costUsd ?? 0,
        totalTokens: row._sum.totalTokens ?? 0,
        avgLatencyMs: Math.round(row._avg.durationMs ?? 0),
      })),
      byUser,
      recentLogs: enrichedLogs,
      asOf: now.toISOString(),
    });
  } catch (error) {
    console.error('Admin generation costs error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load generation costs';
    return NextResponse.json(
      {
        error: 'Failed to load generation costs',
        ...(process.env.NODE_ENV === 'development' && { details: message }),
      },
      { status: 500 }
    );
  }
}
