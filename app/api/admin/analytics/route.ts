import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { getCurrentUser } from '../../../../src/lib/auth';
import { isAdmin } from '../../../../src/lib/admin';

export async function GET(req: NextRequest) {
  try {
    let user;
    try {
      user = await getCurrentUser();
    } catch (authError: any) {
      // Handle Supabase connection errors
      if (authError?.cause?.code === 'ENOTFOUND' || authError?.message?.includes('fetch failed') || authError?.message?.includes('getaddrinfo')) {
        console.error('Supabase connection error in analytics route:', authError);
        return NextResponse.json(
          { 
            error: 'Authentication service unavailable',
            details: 'Cannot connect to Supabase. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable and ensure your Supabase project is active.',
            code: 'SUPABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      // Re-throw other errors
      throw authError;
    }

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    let isUserAdmin = false;
    try {
      isUserAdmin = await isAdmin();
    } catch (adminError: any) {
      // Handle Supabase connection errors in admin check
      if (adminError?.cause?.code === 'ENOTFOUND' || adminError?.message?.includes('fetch failed') || adminError?.message?.includes('getaddrinfo')) {
        console.error('Supabase connection error in admin check:', adminError);
        return NextResponse.json(
          { 
            error: 'Authentication service unavailable',
            details: 'Cannot connect to Supabase. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable and ensure your Supabase project is active.',
            code: 'SUPABASE_CONNECTION_ERROR'
          },
          { status: 503 }
        );
      }
      // For other errors, default to not admin
      console.error('Error checking admin status:', adminError);
    }

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get date ranges for trends
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousMonth = new Date(lastMonth.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate core statistics in parallel
    let totalUsers, totalAppProjects, totalWorkspaces, totalGroups, totalDiscussions, totalEvents, totalChallenges, totalSubmissions, totalResources;
    let usersLast7Days, usersLast30Days, usersLast90Days, projectsLast7Days, projectsLast30Days, projectsLast90Days, activeUsersLast30Days;
    let deploymentStats, frameworkStats, appTypeStats, communityActivity, recentUsers, recentProjects;

    try {
      [
        totalUsers,
        totalAppProjects,
        totalWorkspaces,
        totalGroups,
        totalDiscussions,
        totalEvents,
        totalChallenges,
        totalSubmissions,
        totalResources,
        usersLast7Days,
        usersLast30Days,
        usersLast90Days,
        projectsLast7Days,
        projectsLast30Days,
        projectsLast90Days,
        activeUsersLast30Days,
        deploymentStats,
        frameworkStats,
        appTypeStats,
        communityActivity,
        recentUsers,
        recentProjects,
      ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.appProject.count(),
      prisma.workspace.count(),
      prisma.communityGroup.count(),
      prisma.discussion.count(),
      prisma.event.count(),
      prisma.challenge.count(),
      prisma.challengeSubmission.count(),
      prisma.resource.count(),

      // User growth
      prisma.user.count({
        where: { createdAt: { gte: last7Days } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: last30Days } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: last90Days } },
      }),

      // Project growth
      prisma.appProject.count({
        where: { createdAt: { gte: last7Days } },
      }),
      prisma.appProject.count({
        where: { createdAt: { gte: last30Days } },
      }),
      prisma.appProject.count({
        where: { createdAt: { gte: last90Days } },
      }),

      // Active users (users who created projects, discussions, or other activity in last 30 days)
      prisma.user.count({
        where: {
          OR: [
            { appProjects: { some: { createdAt: { gte: last30Days } } } },
            { discussions: { some: { createdAt: { gte: last30Days } } } },
            { activities: { some: { createdAt: { gte: last30Days } } } },
          ],
        },
      }),

      // Deployment statistics
      prisma.appProject.groupBy({
        by: ['deploymentStatus'],
        _count: true,
        where: {
          deploymentStatus: { not: null },
        },
      }),

      // Framework statistics
      prisma.appProject.groupBy({
        by: ['framework'],
        _count: true,
        where: {
          framework: { not: null },
        },
      }),

      // App type statistics
      prisma.appProject.groupBy({
        by: ['appType'],
        _count: true,
        where: {
          appType: { not: null },
        },
      }),

      // Community activity (last 30 days)
      prisma.activity.count({
        where: { createdAt: { gte: last30Days } },
      }),

      // Recent users (last 10)
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              appProjects: true,
              workspaces: true,
            },
          },
        },
      }),

      // Recent projects (last 10)
      prisma.appProject.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          framework: true,
          appType: true,
          deploymentStatus: true,
          createdAt: true,
          owner: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),

      ]);
    } catch (coreError: any) {
      console.error('Error fetching core analytics data:', coreError);
      throw new Error(`Failed to fetch core analytics: ${coreError?.message || String(coreError)}`);
    }

    // Fetch tracking data separately with error handling (tables might not exist yet)
    // Initialize with default values
    let totalPageVisits = 0;
    let dailyPageVisits = 0;
    let totalSearches = 0;
    let dailySearches = 0;
    let totalResourceViews = 0;
    let dailyResourceViews = 0;
    let searchStats: any[] = [];
    let popularSearches: any[] = [];
    let searchProviders: any[] = [];
    let uniqueVisitorsToday: any[] = [];
    let uniqueVisitorsLast7Days: any[] = [];
    let uniqueVisitorsLast30Days: any[] = [];

    // Check if tracking models exist in Prisma client (they might not if migration hasn't been run)
    let hasTrackingModels = false;
    try {
      const prismaAny = prisma as any;
      hasTrackingModels = 
        prismaAny.pageVisit !== undefined &&
        prismaAny.searchLog !== undefined &&
        prismaAny.resourceView !== undefined;
    } catch (error) {
      // Models don't exist in Prisma client - need to run "npx prisma generate"
      hasTrackingModels = false;
    }

    if (hasTrackingModels) {
      const prismaAny = prisma as any;
      try {
        const trackingPromises = [
          prismaAny.pageVisit.count().catch(() => 0),
          prismaAny.pageVisit.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
          prismaAny.searchLog.count().catch(() => 0),
          prismaAny.searchLog.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
          prismaAny.resourceView.count().catch(() => 0),
          prismaAny.resourceView.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
          prismaAny.searchLog.groupBy({ by: ['clicked'], _count: true }).catch(() => []),
          prismaAny.searchLog.findMany({ select: { query: true } }).catch(() => []),
          prismaAny.searchLog.findMany({ select: { providers: true } }).catch(() => []),
          prismaAny.pageVisit.findMany({
            where: { createdAt: { gte: today } },
            select: { sessionId: true },
            distinct: ['sessionId'],
          }).catch(() => []),
          prismaAny.pageVisit.findMany({
            where: { createdAt: { gte: last7Days } },
            select: { sessionId: true },
            distinct: ['sessionId'],
          }).catch(() => []),
          prismaAny.pageVisit.findMany({
            where: { createdAt: { gte: last30Days } },
            select: { sessionId: true },
            distinct: ['sessionId'],
          }).catch(() => []),
        ];

        const trackingResults = await Promise.allSettled(trackingPromises);
        
        [
          totalPageVisits,
          dailyPageVisits,
          totalSearches,
          dailySearches,
          totalResourceViews,
          dailyResourceViews,
          searchStats,
          popularSearches,
          searchProviders,
          uniqueVisitorsToday,
          uniqueVisitorsLast7Days,
          uniqueVisitorsLast30Days,
        ] = trackingResults.map((result, idx) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            // Return default values based on index
            if (idx < 6) return 0; // counts
            return []; // arrays
          }
        });
      } catch (error) {
        // Tracking tables don't exist yet - this is OK, will work after migration
        console.warn('Error fetching tracking data. Run "npx prisma generate" and migration:', error);
      }
    }

    // Calculate growth rates
    const userGrowth7Days = usersLast7Days;
    const userGrowth30Days = usersLast30Days;
    const userGrowth90Days = usersLast90Days;
    const projectGrowth7Days = projectsLast7Days;
    const projectGrowth30Days = projectsLast30Days;
    const projectGrowth90Days = projectsLast90Days;

    // Format deployment stats
    const deploymentStatsFormatted = deploymentStats.reduce((acc, item) => {
      acc[item.deploymentStatus || 'unknown'] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Format framework stats
    const frameworkStatsFormatted = frameworkStats.reduce((acc, item) => {
      acc[item.framework || 'unknown'] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Format app type stats
    const appTypeStatsFormatted = appTypeStats.reduce((acc, item) => {
      acc[item.appType || 'unknown'] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Get daily user registrations for the last 30 days
    const usersLast30DaysList = await prisma.user.findMany({
      where: { createdAt: { gte: last30Days } },
      select: { createdAt: true },
    });

    // Group by date
    const dailyUserRegistrationsMap = new Map<string, number>();
    usersLast30DaysList.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      dailyUserRegistrationsMap.set(date, (dailyUserRegistrationsMap.get(date) || 0) + 1);
    });
    const dailyUserRegistrations = Array.from(dailyUserRegistrationsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get daily project creations for the last 30 days
    const projectsLast30DaysList = await prisma.appProject.findMany({
      where: { createdAt: { gte: last30Days } },
      select: { createdAt: true },
    });

    // Group by date
    const dailyProjectCreationsMap = new Map<string, number>();
    projectsLast30DaysList.forEach((project) => {
      const date = project.createdAt.toISOString().split('T')[0];
      dailyProjectCreationsMap.set(date, (dailyProjectCreationsMap.get(date) || 0) + 1);
    });
    const dailyProjectCreations = Array.from(dailyProjectCreationsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process unique visitors
    const uniqueVisitorsTodayCount = Array.isArray(uniqueVisitorsToday) ? uniqueVisitorsToday.length : 0;
    const uniqueVisitorsLast7DaysCount = Array.isArray(uniqueVisitorsLast7Days) ? uniqueVisitorsLast7Days.length : 0;
    const uniqueVisitorsLast30DaysCount = Array.isArray(uniqueVisitorsLast30Days) ? uniqueVisitorsLast30Days.length : 0;

    // Process search statistics
    const searchStatsFormatted = Array.isArray(searchStats) 
      ? searchStats.reduce((acc, item) => {
          acc[item.clicked ? 'clicked' : 'not_clicked'] = item._count;
          return acc;
        }, {} as Record<string, number>)
      : {};

    const searchSuccessRate = searchStatsFormatted.clicked && totalSearches > 0
      ? (searchStatsFormatted.clicked / totalSearches) * 100
      : 0;

    // Process popular searches - group and sort manually
    const searchQueryMap = new Map<string, number>();
    if (Array.isArray(popularSearches)) {
      popularSearches.forEach((log: any) => {
        if (log && log.query) {
          const normalizedQuery = log.query.toLowerCase().trim();
          searchQueryMap.set(normalizedQuery, (searchQueryMap.get(normalizedQuery) || 0) + 1);
        }
      });
    }
    const popularSearchesFormatted = Array.from(searchQueryMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Process provider usage
    const providerUsageMap = new Map<string, number>();
    if (Array.isArray(searchProviders)) {
      searchProviders.forEach((log: any) => {
        if (log && log.providers && Array.isArray(log.providers)) {
          log.providers.forEach((provider: string) => {
            providerUsageMap.set(provider, (providerUsageMap.get(provider) || 0) + 1);
          });
        }
      });
    }
    const providerUsage = Array.from(providerUsageMap.entries())
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count);

    // Get daily visits for last 30 days (with error handling)
    let dailyVisits: Array<{ date: string; count: number }> = [];
    if (hasTrackingModels) {
      try {
        const prismaAny = prisma as any;
        const visitsLast30Days = await prismaAny.pageVisit.findMany({
          where: { createdAt: { gte: last30Days } },
          select: { createdAt: true },
        });
        const dailyVisitsMap = new Map<string, number>();
        visitsLast30Days.forEach((visit) => {
          const date = visit.createdAt.toISOString().split('T')[0];
          dailyVisitsMap.set(date, (dailyVisitsMap.get(date) || 0) + 1);
        });
        dailyVisits = Array.from(dailyVisitsMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } catch (error) {
        // Table might not exist yet, use empty array
        console.warn('PageVisit table not available:', error);
      }
    }

    // Get daily searches for last 30 days (with error handling)
    let dailySearchesData: Array<{ date: string; count: number }> = [];
    if (hasTrackingModels) {
      try {
        const prismaAny = prisma as any;
        const searchesLast30Days = await prismaAny.searchLog.findMany({
          where: { createdAt: { gte: last30Days } },
          select: { createdAt: true },
        });
        const dailySearchesMap = new Map<string, number>();
        searchesLast30Days.forEach((search) => {
          const date = search.createdAt.toISOString().split('T')[0];
          dailySearchesMap.set(date, (dailySearchesMap.get(date) || 0) + 1);
        });
        dailySearchesData = Array.from(dailySearchesMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
      } catch (error) {
        // Table might not exist yet, use empty array
        console.warn('SearchLog table not available:', error);
      }
    }

    // Calculate growth rates
    const usersLastMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: previousMonth,
          lt: lastMonth,
        },
      },
    });
    const userGrowthRateMoM = usersLastMonth > 0
      ? ((usersLast30Days - usersLastMonth) / usersLastMonth) * 100
      : 0;

    const projectsLastMonth = await prisma.appProject.count({
      where: {
        createdAt: {
          gte: previousMonth,
          lt: lastMonth,
        },
      },
    });
    const projectGrowthRateMoM = projectsLastMonth > 0
      ? ((projectsLast30Days - projectsLastMonth) / projectsLastMonth) * 100
      : 0;

    // Calculate average searches per user
    let avgSearchesPerUser = 0;
    if (totalSearches > 0 && totalUsers > 0) {
      // Use total users as denominator (simpler and works even if relation doesn't exist)
      avgSearchesPerUser = totalSearches / totalUsers;
    }

    // Calculate average resources per workspace
    const workspacesWithResources = await prisma.workspace.count({
      where: {
        resources: {
          some: {},
        },
      },
    });
    const avgResourcesPerWorkspace = workspacesWithResources > 0
      ? totalResources / workspacesWithResources
      : 0;

    // ========== ADDITIONAL KPIs - User Engagement ==========
    
    // User Retention Rates
    const usersCreated7DaysAgo = await prisma.user.count({
      where: {
        createdAt: {
          lt: last7Days,
        },
      },
    });
    const usersActiveLast7Days = await prisma.user.count({
      where: {
        OR: [
          { appProjects: { some: { updatedAt: { gte: last7Days } } } },
          { discussions: { some: { updatedAt: { gte: last7Days } } } },
          { activities: { some: { createdAt: { gte: last7Days } } } },
        ],
      },
    });
    const userRetention7Days = usersCreated7DaysAgo > 0
      ? (usersActiveLast7Days / usersCreated7DaysAgo) * 100
      : 0;

    const usersCreated30DaysAgo = await prisma.user.count({
      where: {
        createdAt: {
          lt: last30Days,
        },
      },
    });
    const userRetention30Days = usersCreated30DaysAgo > 0
      ? (activeUsersLast30Days / usersCreated30DaysAgo) * 100
      : 0;

    // User Churn Rate (users inactive for 30+ days)
    const usersInactive30Days = await prisma.user.count({
      where: {
        AND: [
          { createdAt: { lt: last30Days } },
          {
            NOT: {
              OR: [
                { appProjects: { some: { updatedAt: { gte: last30Days } } } },
                { discussions: { some: { updatedAt: { gte: last30Days } } } },
                { activities: { some: { createdAt: { gte: last30Days } } } },
              ],
            },
          },
        ],
      },
    });
    const userChurnRate = usersCreated30DaysAgo > 0
      ? (usersInactive30Days / usersCreated30DaysAgo) * 100
      : 0;

    // Workspaces per User
    const workspacesPerUser = totalUsers > 0 ? totalWorkspaces / totalUsers : 0;

    // ========== Resource Management KPIs ==========
    
    // Daily Resources Saved
    const dailyResourcesSaved = await prisma.resource.count({
      where: { createdAt: { gte: today } },
    });

    // Resource Annotation Rate
    const resourcesWithAnnotations = await prisma.resource.count({
      where: {
        annotations: {
          some: {},
        },
      },
    });
    const resourceAnnotationRate = totalResources > 0
      ? (resourcesWithAnnotations / totalResources) * 100
      : 0;

    // Most Saved Resource Types
    const resourcesByType = await prisma.resource.groupBy({
      by: ['type'],
      _count: true,
    });
    const resourceTypesDistribution = resourcesByType.reduce((acc, item) => {
      acc[item.type || 'unknown'] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Resource Share Rate
    const workspacesWithShareLinks = await prisma.workspace.count({
      where: {
        shares: {
          some: {},
        },
      },
    });
    const resourceShareRate = totalWorkspaces > 0
      ? (workspacesWithShareLinks / totalWorkspaces) * 100
      : 0;

    // Resource Engagement Rate (views per resource)
    const resourceEngagementRate = totalResources > 0 && totalResourceViews > 0
      ? totalResourceViews / totalResources
      : 0;

    // ========== App Builder KPIs ==========
    
    // Project Completion Rate (% deployed)
    const projectsWithDeployment = await prisma.appProject.count({
      where: {
        deploymentStatus: {
          in: ['deployed', 'building'],
        },
      },
    });
    const projectCompletionRate = totalAppProjects > 0
      ? (projectsWithDeployment / totalAppProjects) * 100
      : 0;

    // Deployment Success Rate
    const successfulDeployments = await prisma.appProject.count({
      where: {
        deploymentStatus: 'deployed',
      },
    });
    const deploymentSuccessRate = projectsWithDeployment > 0
      ? (successfulDeployments / projectsWithDeployment) * 100
      : 0;

    // Average Files per Project
    const totalFiles = await prisma.appFile.count();
    const avgFilesPerProject = totalAppProjects > 0
      ? totalFiles / totalAppProjects
      : 0;

    // Chat Interactions per Project
    const totalChats = await prisma.appChat.count();
    const chatInteractionsPerProject = totalAppProjects > 0
      ? totalChats / totalAppProjects
      : 0;

    // Project Abandonment Rate (% never deployed)
    const projectsNeverDeployed = await prisma.appProject.count({
      where: {
        OR: [
          { deploymentStatus: null },
          { deploymentStatus: 'pending' },
        ],
        createdAt: {
          lt: last30Days, // Projects older than 30 days
        },
      },
    });
    const projectAbandonmentRate = totalAppProjects > 0
      ? (projectsNeverDeployed / totalAppProjects) * 100
      : 0;

    // ========== Community KPIs ==========
    
    // Group Membership Rate
    const totalGroupMembers = await prisma.groupMember.count();
    const groupMembershipRate = totalGroups > 0
      ? totalGroupMembers / totalGroups
      : 0;

    // Discussion Engagement Rate (replies per discussion)
    const totalReplies = await prisma.discussionReply.count();
    const discussionEngagementRate = totalDiscussions > 0
      ? totalReplies / totalDiscussions
      : 0;

    // Event Registration Rate
    const totalEventRegistrations = await prisma.eventRegistration.count();
    const eventRegistrationRate = totalEvents > 0
      ? totalEventRegistrations / totalEvents
      : 0;

    // Challenge Participation Rate
    const challengeParticipationRate = totalChallenges > 0
      ? totalSubmissions / totalChallenges
      : 0;

    // User Follow Network Size
    const totalFollows = await prisma.userFollow.count();

    // Community Activity Score (composite: discussions + replies + events + challenges)
    const communityActivityScore = totalDiscussions + totalReplies + totalEvents + totalChallenges;

    // ========== Workspace KPIs ==========
    
    // Workspace Collaboration Rate
    const workspaceCollaborationRate = totalWorkspaces > 0
      ? (workspacesWithShareLinks / totalWorkspaces) * 100
      : 0;

    // Workspace Activity Rate (updated in last 30 days)
    const activeWorkspaces = await prisma.workspace.count({
      where: {
        OR: [
          { resources: { some: { createdAt: { gte: last30Days } } } },
          { appProjects: { some: { updatedAt: { gte: last30Days } } } },
        ],
      },
    });
    const workspaceActivityRate = totalWorkspaces > 0
      ? (activeWorkspaces / totalWorkspaces) * 100
      : 0;

    // ========== Search & Discovery Additional KPIs ==========
    
    // Zero-Result Searches (only if tracking models exist)
    let zeroResultSearches = 0;
    if (hasTrackingModels) {
      try {
        const prismaAny = prisma as any;
        zeroResultSearches = await prismaAny.searchLog.count({
          where: {
            resultCount: 0,
          },
        }).catch(() => 0);
      } catch (error) {
        console.warn('Error fetching zero-result searches:', error);
        zeroResultSearches = 0;
      }
    }
    const zeroResultSearchRate = totalSearches > 0
      ? (zeroResultSearches / totalSearches) * 100
      : 0;

    // Search-to-Save Conversion Rate (searches that led to resource saves)
    // This is approximate - we'll track searches followed by resource creation
    const searchToSaveConversionRate = 0; // Would need more sophisticated tracking

    // ========== User Engagement Additional ==========
    
    // Sessions per User (approximate using page visits)
    const totalSessions = uniqueVisitorsLast30DaysCount;
    const sessionsPerUser = totalUsers > 0 && totalSessions > 0
      ? totalSessions / totalUsers
      : 0;

    // User Engagement Score (composite: projects + discussions + activities)
    // Using communityActivityScore which is already calculated above
    const userEngagementScore = totalAppProjects * 2 + totalDiscussions * 1.5 + (communityActivity || 0);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalAppProjects,
        totalWorkspaces,
        totalGroups,
        totalDiscussions,
        totalEvents,
        totalChallenges,
        totalSubmissions,
        totalResources,
        activeUsersLast30Days,
        // Tracking KPIs
        totalPageVisits,
        totalSearches,
        totalResourceViews,
        dailyPageVisits,
        dailySearches,
        dailyResourceViews,
        uniqueVisitorsToday: uniqueVisitorsTodayCount,
        uniqueVisitorsLast7Days: uniqueVisitorsLast7DaysCount,
        uniqueVisitorsLast30Days: uniqueVisitorsLast30DaysCount,
      },
      growth: {
        users: {
          last7Days: userGrowth7Days,
          last30Days: userGrowth30Days,
          last90Days: userGrowth90Days,
        },
        projects: {
          last7Days: projectGrowth7Days,
          last30Days: projectGrowth30Days,
          last90Days: projectGrowth90Days,
        },
      },
      trends: {
        dailyUserRegistrations,
        dailyProjectCreations,
        dailyVisits,
        dailySearches: dailySearchesData,
      },
      deployments: deploymentStatsFormatted,
      frameworks: frameworkStatsFormatted,
      appTypes: appTypeStatsFormatted,
      community: {
        totalActivityLast30Days: communityActivity,
        totalGroups,
        totalDiscussions,
        totalEvents,
        totalChallenges,
        totalSubmissions,
      },
      // Search & Discovery KPIs
      search: {
        totalSearches,
        dailySearches,
        searchSuccessRate: Math.round(searchSuccessRate * 100) / 100,
        avgSearchesPerUser: Math.round(avgSearchesPerUser * 100) / 100,
        popularSearches: popularSearchesFormatted,
        providerUsage,
        searchStats: searchStatsFormatted,
      },

      // Visit Tracking KPIs
      visits: {
        totalPageVisits,
        dailyPageVisits,
        uniqueVisitorsToday: uniqueVisitorsTodayCount,
        uniqueVisitorsLast7Days: uniqueVisitorsLast7DaysCount,
        uniqueVisitorsLast30Days: uniqueVisitorsLast30DaysCount,
      },

      // Resource KPIs
      resources: {
        totalResources,
        totalResourceViews,
        dailyResourceViews,
        avgResourcesPerWorkspace: Math.round(avgResourcesPerWorkspace * 100) / 100,
      },

      // Growth Rates
      growthRates: {
        userGrowthRateMoM: Math.round(userGrowthRateMoM * 100) / 100,
        projectGrowthRateMoM: Math.round(projectGrowthRateMoM * 100) / 100,
      },

      // User Engagement KPIs (Complete)
      userEngagement: {
        totalUsers,
        dailyActiveUsers: uniqueVisitorsTodayCount,
        monthlyActiveUsers: uniqueVisitorsLast30DaysCount,
        dailyNewSignups: userGrowth7Days,
        retention7Days: Math.round(userRetention7Days * 100) / 100,
        retention30Days: Math.round(userRetention30Days * 100) / 100,
        churnRate: Math.round(userChurnRate * 100) / 100,
        sessionsPerUser: Math.round(sessionsPerUser * 100) / 100,
        engagementScore: Math.round(userEngagementScore),
      },

      // Resource Management KPIs (Complete)
      resourceManagement: {
        totalResources,
        dailyResourcesSaved,
        avgResourcesPerWorkspace: Math.round(avgResourcesPerWorkspace * 100) / 100,
        annotationRate: Math.round(resourceAnnotationRate * 100) / 100,
        resourceTypesDistribution,
        shareRate: Math.round(resourceShareRate * 100) / 100,
        engagementRate: Math.round(resourceEngagementRate * 100) / 100,
      },

      // App Builder KPIs (Complete)
      appBuilder: {
        totalProjects: totalAppProjects,
        dailyProjectCreations: projectGrowth7Days,
        completionRate: Math.round(projectCompletionRate * 100) / 100,
        deploymentSuccessRate: Math.round(deploymentSuccessRate * 100) / 100,
        avgFilesPerProject: Math.round(avgFilesPerProject * 100) / 100,
        chatInteractionsPerProject: Math.round(chatInteractionsPerProject * 100) / 100,
        abandonmentRate: Math.round(projectAbandonmentRate * 100) / 100,
        frameworks: frameworkStatsFormatted,
        appTypes: appTypeStatsFormatted,
        deployments: deploymentStatsFormatted,
      },

      // Community KPIs (Complete)
      community: {
        totalGroups,
        membershipRate: Math.round(groupMembershipRate * 100) / 100,
        totalDiscussions,
        discussionEngagementRate: Math.round(discussionEngagementRate * 100) / 100,
        totalReplies,
        totalEvents,
        eventRegistrationRate: Math.round(eventRegistrationRate * 100) / 100,
        totalEventRegistrations,
        totalChallenges,
        challengeParticipationRate: Math.round(challengeParticipationRate * 100) / 100,
        totalSubmissions,
        followNetworkSize: totalFollows,
        activityScore: communityActivityScore,
      },

      // Workspace KPIs (Complete)
      workspace: {
        totalWorkspaces,
        workspacesPerUser: Math.round(workspacesPerUser * 100) / 100,
        collaborationRate: Math.round(workspaceCollaborationRate * 100) / 100,
        activityRate: Math.round(workspaceActivityRate * 100) / 100,
        avgResourcesPerWorkspace: Math.round(avgResourcesPerWorkspace * 100) / 100,
      },

      // Search & Discovery KPIs (Complete)
      searchDiscovery: {
        totalSearches,
        dailySearches,
        avgSearchesPerUser: Math.round(avgSearchesPerUser * 100) / 100,
        successRate: Math.round(searchSuccessRate * 100) / 100,
        popularSearches: popularSearchesFormatted,
        zeroResultSearchRate: Math.round(zeroResultSearchRate * 100) / 100,
        searchToSaveConversionRate: Math.round(searchToSaveConversionRate * 100) / 100,
        providerUsage,
      },

      recent: {
        users: recentUsers.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          projectsCount: user._count.appProjects,
          workspacesCount: user._count.workspaces,
        })),
        projects: recentProjects.map((project) => ({
          id: project.id,
          title: project.title,
          type: project.type,
          framework: project.framework,
          appType: project.appType,
          deploymentStatus: project.deploymentStatus,
          createdAt: project.createdAt,
          owner: {
            email: project.owner.email,
            name: project.owner.name,
          },
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    console.error('Error type:', typeof error);
    console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Extract error information safely
    const errorMessage = error?.message || error?.toString() || 'Failed to fetch analytics data';
    const errorName = error?.name || 'Error';
    const errorCode = error?.code || error?.statusCode || 'UNKNOWN';
    
    const errorDetails: any = {
      message: errorMessage,
      name: errorName,
      code: String(errorCode),
    };
    
    if (process.env.NODE_ENV === 'development') {
      if (error?.stack) errorDetails.stack = error.stack;
      if (error?.cause) errorDetails.cause = String(error.cause);
      errorDetails.fullError = String(error);
    }
    
    return NextResponse.json(
      { 
        error: process.env.NODE_ENV === 'development' 
          ? `Failed to fetch analytics data: ${errorMessage}`
          : 'Failed to fetch analytics data',
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
