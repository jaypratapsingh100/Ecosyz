'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Users, 
  FolderKanban, 
  Briefcase, 
  MessageSquare, 
  Calendar, 
  Trophy, 
  FileText, 
  TrendingUp,
  Activity,
  Globe,
  Code,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  X,
  LogIn
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalAppProjects: number;
    totalWorkspaces: number;
    totalGroups: number;
    totalDiscussions: number;
    totalEvents: number;
    totalChallenges: number;
    totalSubmissions: number;
    totalResources: number;
    activeUsersLast30Days: number;
    // Tracking KPIs
    totalPageVisits?: number;
    totalSearches?: number;
    totalResourceViews?: number;
    dailyPageVisits?: number;
    dailySearches?: number;
    dailyResourceViews?: number;
    uniqueVisitorsToday?: number;
    uniqueVisitorsLast7Days?: number;
    uniqueVisitorsLast30Days?: number;
  };
  growth: {
    users: {
      last7Days: number;
      last30Days: number;
      last90Days: number;
    };
    projects: {
      last7Days: number;
      last30Days: number;
      last90Days: number;
    };
  };
  trends: {
    dailyUserRegistrations: Array<{ date: string; count: number }>;
    dailyProjectCreations: Array<{ date: string; count: number }>;
    dailyVisits?: Array<{ date: string; count: number }>;
    dailySearches?: Array<{ date: string; count: number }>;
  };
  deployments: Record<string, number>;
  frameworks: Record<string, number>;
  appTypes: Record<string, number>;
  community: {
    totalActivityLast30Days: number;
    totalGroups: number;
    totalDiscussions: number;
    totalEvents: number;
    totalChallenges: number;
    totalSubmissions: number;
  };
  search?: {
    totalSearches: number;
    dailySearches: number;
    searchSuccessRate: number;
    avgSearchesPerUser: number;
    popularSearches: Array<{ query: string; count: number }>;
    providerUsage: Array<{ provider: string; count: number }>;
    searchStats: Record<string, number>;
  };
  visits?: {
    totalPageVisits: number;
    dailyPageVisits: number;
    uniqueVisitorsToday: number;
    uniqueVisitorsLast7Days: number;
    uniqueVisitorsLast30Days: number;
  };
  resources?: {
    totalResources: number;
    totalResourceViews: number;
    dailyResourceViews: number;
    avgResourcesPerWorkspace: number;
  };
  growthRates?: {
    userGrowthRateMoM: number;
    projectGrowthRateMoM: number;
  };
  userEngagement?: {
    totalUsers: number;
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
    dailyNewSignups: number;
    retention7Days: number;
    retention30Days: number;
    churnRate: number;
    sessionsPerUser: number;
    engagementScore: number;
  };
  resourceManagement?: {
    totalResources: number;
    dailyResourcesSaved: number;
    avgResourcesPerWorkspace: number;
    annotationRate: number;
    resourceTypesDistribution: Record<string, number>;
    shareRate: number;
    engagementRate: number;
  };
  appBuilder?: {
    totalProjects: number;
    dailyProjectCreations: number;
    completionRate: number;
    deploymentSuccessRate: number;
    avgFilesPerProject: number;
    chatInteractionsPerProject: number;
    abandonmentRate: number;
    frameworks: Record<string, number>;
    appTypes: Record<string, number>;
    deployments: Record<string, number>;
  };
  community?: {
    totalGroups: number;
    membershipRate: number;
    totalDiscussions: number;
    discussionEngagementRate: number;
    totalReplies: number;
    totalEvents: number;
    eventRegistrationRate: number;
    totalEventRegistrations: number;
    totalChallenges: number;
    challengeParticipationRate: number;
    totalSubmissions: number;
    followNetworkSize: number;
    activityScore: number;
  };
  workspace?: {
    totalWorkspaces: number;
    workspacesPerUser: number;
    collaborationRate: number;
    activityRate: number;
    avgResourcesPerWorkspace: number;
  };
  searchDiscovery?: {
    totalSearches: number;
    dailySearches: number;
    avgSearchesPerUser: number;
    successRate: number;
    popularSearches: Array<{ query: string; count: number }>;
    zeroResultSearchRate: number;
    searchToSaveConversionRate: number;
    providerUsage: Array<{ provider: string; count: number }>;
  };
  recent: {
    users: Array<{
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
      projectsCount: number;
      workspacesCount: number;
    }>;
    projects: Array<{
      id: string;
      title: string;
      type: string;
      framework: string | null;
      appType: string | null;
      deploymentStatus: string | null;
      createdAt: string;
      owner: {
        email: string;
        name: string | null;
      };
    }>;
  };
}

type KPICategory = 'all' | 'user-engagement' | 'search-discovery' | 'resource-management' | 'app-builder' | 'community' | 'workspace' | 'growth-performance';

interface KPIDefinition {
  id: string;
  name: string;
  category: KPICategory;
  value: number | string | Record<string, number> | Array<any>;
  format: 'number' | 'percentage' | 'decimal' | 'array' | 'object';
  description?: string;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KPICategory>('all');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication status first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/analytics');
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch analytics';
        let errorDetails: any = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || null;
          
          if (errorDetails) {
            console.error('Analytics API error details:', errorDetails);
            console.error('Error message:', errorDetails.message);
            console.error('Error code:', errorDetails.code);
            console.error('Error name:', errorDetails.name);
          }
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const text = await response.text();
            console.error('Non-JSON error response:', text);
            errorMessage = text || response.statusText || errorMessage;
          } catch (textError) {
            errorMessage = response.statusText || errorMessage;
          }
        }

        if (response.status === 401) {
          // User is not authenticated - show login prompt instead of error
          setIsAuthenticated(false);
          setLoading(false);
          return; // Exit early, don't throw error
        }
        if (response.status === 403) {
          // User is authenticated but not admin
          setError('Unauthorized - Admin access required. Please contact an administrator.');
          setLoading(false);
          return; // Exit early
        }
        if (response.status === 503) {
          // Service unavailable (e.g., Supabase connection issue)
          setError(errorDetails?.details || errorMessage || 'Authentication service is currently unavailable. Please try again later.');
          setLoading(false);
          return; // Exit early
        }
        
        // Include details in error message for debugging
        const fullErrorMessage = errorDetails?.message 
          ? `${errorMessage}: ${errorDetails.message}`
          : errorMessage;
        throw new Error(fullErrorMessage);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch analytics if authenticated
    if (isAuthenticated === true) {
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  // Extract all KPIs from data
  const allKPIs = useMemo((): KPIDefinition[] => {
    if (!data) return [];

    const kpis: KPIDefinition[] = [];

    // User Engagement KPIs
    if (data.userEngagement) {
      kpis.push(
        { id: 'total-users', name: 'Total Registered Users', category: 'user-engagement', value: data.userEngagement.totalUsers, format: 'number' },
        { id: 'dau', name: 'Daily Active Users (DAU)', category: 'user-engagement', value: data.userEngagement.dailyActiveUsers, format: 'number' },
        { id: 'mau', name: 'Monthly Active Users (MAU)', category: 'user-engagement', value: data.userEngagement.monthlyActiveUsers, format: 'number' },
        { id: 'daily-signups', name: 'Daily New User Sign-ups', category: 'user-engagement', value: data.userEngagement.dailyNewSignups, format: 'number' },
        { id: 'retention-7d', name: '7-Day User Retention Rate', category: 'user-engagement', value: data.userEngagement.retention7Days, format: 'percentage' },
        { id: 'retention-30d', name: '30-Day User Retention Rate', category: 'user-engagement', value: data.userEngagement.retention30Days, format: 'percentage' },
        { id: 'churn-rate', name: 'User Churn Rate', category: 'user-engagement', value: data.userEngagement.churnRate, format: 'percentage' },
        { id: 'sessions-per-user', name: 'Sessions per User', category: 'user-engagement', value: data.userEngagement.sessionsPerUser, format: 'decimal' },
        { id: 'engagement-score', name: 'User Engagement Score', category: 'user-engagement', value: data.userEngagement.engagementScore, format: 'number' },
      );
    }

    // Search & Discovery KPIs
    if (data.searchDiscovery) {
      kpis.push(
        { id: 'total-searches', name: 'Total Resource Searches', category: 'search-discovery', value: data.searchDiscovery.totalSearches, format: 'number' },
        { id: 'daily-searches', name: 'Daily Resource Searches', category: 'search-discovery', value: data.searchDiscovery.dailySearches, format: 'number' },
        { id: 'avg-searches-user', name: 'Average Searches per User', category: 'search-discovery', value: data.searchDiscovery.avgSearchesPerUser, format: 'decimal' },
        { id: 'search-success-rate', name: 'Search Success Rate', category: 'search-discovery', value: data.searchDiscovery.successRate, format: 'percentage' },
        { id: 'zero-result-rate', name: 'Zero-Result Search Rate', category: 'search-discovery', value: data.searchDiscovery.zeroResultSearchRate, format: 'percentage' },
        { id: 'search-to-save', name: 'Search-to-Save Conversion Rate', category: 'search-discovery', value: data.searchDiscovery.searchToSaveConversionRate, format: 'percentage' },
        { id: 'popular-searches', name: 'Popular Searches', category: 'search-discovery', value: data.searchDiscovery.popularSearches, format: 'array' },
        { id: 'provider-usage', name: 'Search Provider Usage', category: 'search-discovery', value: data.searchDiscovery.providerUsage, format: 'array' },
      );
    }

    // Resource Management KPIs
    if (data.resourceManagement) {
      kpis.push(
        { id: 'total-resources', name: 'Total Resources Saved', category: 'resource-management', value: data.resourceManagement.totalResources, format: 'number' },
        { id: 'daily-resources', name: 'Daily Resources Saved', category: 'resource-management', value: data.resourceManagement.dailyResourcesSaved, format: 'number' },
        { id: 'avg-resources-workspace', name: 'Average Resources per Workspace', category: 'resource-management', value: data.resourceManagement.avgResourcesPerWorkspace, format: 'decimal' },
        { id: 'annotation-rate', name: 'Resource Annotation Rate', category: 'resource-management', value: data.resourceManagement.annotationRate, format: 'percentage' },
        { id: 'resource-types', name: 'Most Saved Resource Types', category: 'resource-management', value: data.resourceManagement.resourceTypesDistribution, format: 'object' },
        { id: 'resource-share-rate', name: 'Resource Share Rate', category: 'resource-management', value: data.resourceManagement.shareRate, format: 'percentage' },
        { id: 'resource-engagement', name: 'Resource Engagement Rate', category: 'resource-management', value: data.resourceManagement.engagementRate, format: 'decimal' },
      );
    }

    // App Builder KPIs
    if (data.appBuilder) {
      kpis.push(
        { id: 'total-projects', name: 'Total App Projects Created', category: 'app-builder', value: data.appBuilder.totalProjects, format: 'number' },
        { id: 'daily-projects', name: 'Daily Project Creations', category: 'app-builder', value: data.appBuilder.dailyProjectCreations, format: 'number' },
        { id: 'completion-rate', name: 'Project Completion Rate', category: 'app-builder', value: data.appBuilder.completionRate, format: 'percentage' },
        { id: 'deployment-success', name: 'Deployment Success Rate', category: 'app-builder', value: data.appBuilder.deploymentSuccessRate, format: 'percentage' },
        { id: 'avg-files-project', name: 'Average Files per Project', category: 'app-builder', value: data.appBuilder.avgFilesPerProject, format: 'decimal' },
        { id: 'chat-interactions', name: 'Chat Interactions per Project', category: 'app-builder', value: data.appBuilder.chatInteractionsPerProject, format: 'decimal' },
        { id: 'abandonment-rate', name: 'Project Abandonment Rate', category: 'app-builder', value: data.appBuilder.abandonmentRate, format: 'percentage' },
        { id: 'frameworks', name: 'Framework Distribution', category: 'app-builder', value: data.appBuilder.frameworks, format: 'object' },
        { id: 'app-types', name: 'App Type Distribution', category: 'app-builder', value: data.appBuilder.appTypes, format: 'object' },
        { id: 'deployments', name: 'Deployment Status', category: 'app-builder', value: data.appBuilder.deployments, format: 'object' },
      );
    }

    // Community KPIs
    if (data.community) {
      kpis.push(
        { id: 'total-groups', name: 'Total Community Groups', category: 'community', value: data.community.totalGroups, format: 'number' },
        { id: 'membership-rate', name: 'Group Membership Rate', category: 'community', value: data.community.membershipRate, format: 'decimal' },
        { id: 'total-discussions', name: 'Total Discussions', category: 'community', value: data.community.totalDiscussions, format: 'number' },
        { id: 'discussion-engagement', name: 'Discussion Engagement Rate', category: 'community', value: data.community.discussionEngagementRate, format: 'decimal' },
        { id: 'total-replies', name: 'Total Discussion Replies', category: 'community', value: data.community.totalReplies, format: 'number' },
        { id: 'total-events', name: 'Total Events', category: 'community', value: data.community.totalEvents, format: 'number' },
        { id: 'event-registration-rate', name: 'Event Registration Rate', category: 'community', value: data.community.eventRegistrationRate, format: 'decimal' },
        { id: 'total-registrations', name: 'Total Event Registrations', category: 'community', value: data.community.totalEventRegistrations, format: 'number' },
        { id: 'total-challenges', name: 'Total Challenges', category: 'community', value: data.community.totalChallenges, format: 'number' },
        { id: 'challenge-participation', name: 'Challenge Participation Rate', category: 'community', value: data.community.challengeParticipationRate, format: 'decimal' },
        { id: 'total-submissions', name: 'Total Challenge Submissions', category: 'community', value: data.community.totalSubmissions, format: 'number' },
        { id: 'follow-network', name: 'User Follow Network Size', category: 'community', value: data.community.followNetworkSize, format: 'number' },
        { id: 'activity-score', name: 'Community Activity Score', category: 'community', value: data.community.activityScore, format: 'number' },
      );
    }

    // Workspace KPIs
    if (data.workspace) {
      kpis.push(
        { id: 'total-workspaces', name: 'Total Workspaces Created', category: 'workspace', value: data.workspace.totalWorkspaces, format: 'number' },
        { id: 'workspaces-per-user', name: 'Workspaces per User', category: 'workspace', value: data.workspace.workspacesPerUser, format: 'decimal' },
        { id: 'collaboration-rate', name: 'Workspace Collaboration Rate', category: 'workspace', value: data.workspace.collaborationRate, format: 'percentage' },
        { id: 'workspace-activity', name: 'Workspace Activity Rate', category: 'workspace', value: data.workspace.activityRate, format: 'percentage' },
        { id: 'workspace-avg-resources', name: 'Average Resources per Workspace', category: 'workspace', value: data.workspace.avgResourcesPerWorkspace, format: 'decimal' },
      );
    }

    // Growth & Performance KPIs
    if (data.growthRates) {
      kpis.push(
        { id: 'user-growth-mom', name: 'User Growth Rate (MoM)', category: 'growth-performance', value: data.growthRates.userGrowthRateMoM, format: 'percentage' },
        { id: 'project-growth-mom', name: 'Project Growth Rate (MoM)', category: 'growth-performance', value: data.growthRates.projectGrowthRateMoM, format: 'percentage' },
      );
    }

    if (data.visits) {
      kpis.push(
        { id: 'total-visits', name: 'Total Platform Visits', category: 'growth-performance', value: data.visits.totalPageVisits, format: 'number' },
        { id: 'daily-visits', name: 'Daily Platform Visits', category: 'growth-performance', value: data.visits.dailyPageVisits, format: 'number' },
      );
    }

    return kpis;
  }, [data]);

  // Filter KPIs based on search and category
  const filteredKPIs = useMemo(() => {
    return allKPIs.filter(kpi => {
      const matchesCategory = selectedCategory === 'all' || kpi.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allKPIs, searchQuery, selectedCategory]);

  const categories: Array<{ value: KPICategory; label: string; count: number }> = [
    { value: 'all', label: 'All Categories', count: allKPIs.length },
    { value: 'user-engagement', label: 'User Engagement', count: allKPIs.filter(k => k.category === 'user-engagement').length },
    { value: 'search-discovery', label: 'Search & Discovery', count: allKPIs.filter(k => k.category === 'search-discovery').length },
    { value: 'resource-management', label: 'Resource Management', count: allKPIs.filter(k => k.category === 'resource-management').length },
    { value: 'app-builder', label: 'App Builder', count: allKPIs.filter(k => k.category === 'app-builder').length },
    { value: 'community', label: 'Community', count: allKPIs.filter(k => k.category === 'community').length },
    { value: 'workspace', label: 'Workspace', count: allKPIs.filter(k => k.category === 'workspace').length },
    { value: 'growth-performance', label: 'Growth & Performance', count: allKPIs.filter(k => k.category === 'growth-performance').length },
  ];

  const formatKPIValue = (kpi: KPIDefinition): string => {
    if (kpi.format === 'percentage') {
      return `${typeof kpi.value === 'number' ? kpi.value.toFixed(1) : '0'}%`;
    }
    if (kpi.format === 'decimal') {
      return typeof kpi.value === 'number' ? kpi.value.toFixed(2) : '0';
    }
    if (kpi.format === 'number') {
      return typeof kpi.value === 'number' ? kpi.value.toLocaleString() : String(kpi.value);
    }
    if (kpi.format === 'array') {
      return Array.isArray(kpi.value) ? `${kpi.value.length} items` : '0 items';
    }
    if (kpi.format === 'object') {
      return typeof kpi.value === 'object' && kpi.value !== null 
        ? `${Object.keys(kpi.value).length} types` 
        : '0 types';
    }
    return String(kpi.value);
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendLabel 
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    trend?: number;
    trendLabel?: string;
  }) => (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50 hover:border-cyan-500/50 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value.toLocaleString()}</p>
          {trend !== undefined && trendLabel && (
            <p className="text-xs text-cyan-400 mt-1">
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} {trendLabel}
            </p>
          )}
        </div>
        <div className="p-3 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
      </div>
    </div>
  );

  const SimpleBarChart = ({ data, title }: { data: Record<string, number>; title: string }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxValue = Math.max(...entries.map(([, v]) => v), 1);

    return (
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-300 capitalize">
                  {key === 'null' ? 'Unknown' : key}
                </span>
                <span className="text-sm text-cyan-400 font-semibold">{value}</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 h-2.5 rounded-full transition-all shadow-lg shadow-cyan-500/30"
                  style={{ width: `${(value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const LineChart = ({ 
    data, 
    title 
  }: { 
    data: Array<{ date: string; count: number }>; 
    title: string;
  }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
          <p className="text-slate-400">No data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.count), 1);
    const minValue = Math.min(...data.map((d) => d.count), 0);
    const range = maxValue - minValue || 1;
    const padding = 40;
    const chartWidth = Math.max(data.length * 30, 600);
    const chartHeight = 240;
    const graphHeight = chartHeight - padding * 2;
    const graphWidth = chartWidth - padding * 2;

    // Calculate grid lines (5 horizontal lines)
    const gridLines = 5;
    const gridValues: number[] = [];
    for (let i = 0; i <= gridLines; i++) {
      gridValues.push(minValue + (range * i) / gridLines);
    }

    return (
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
        <div className="h-64 relative overflow-x-auto">
          <svg 
            className="w-full" 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            preserveAspectRatio="xMidYMid meet"
            style={{ minHeight: '240px' }}
          >
            {/* Grid lines */}
            {gridValues.map((value, idx) => {
              const y = padding + (graphHeight - ((value - minValue) / range) * graphHeight);
              return (
                <g key={idx}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    fill="rgb(148, 163, 184)"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {Math.round(value)}
                  </text>
                </g>
              );
            })}

            {/* Area fill under the line */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            {/* Area fill */}
            <path
              d={`M ${padding},${padding + graphHeight} ${data
                .map((d, i) => {
                  const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
                  const y = padding + graphHeight - ((d.count - minValue) / range) * graphHeight;
                  return `L ${x},${y}`;
                })
                .join(' ')} L ${padding + graphWidth},${padding + graphHeight} Z`}
              fill="url(#lineGradient)"
            />

            {/* Main line */}
            <polyline
              fill="none"
              stroke="rgb(34, 211, 238)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data
                .map((d, i) => {
                  const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
                  const y = padding + graphHeight - ((d.count - minValue) / range) * graphHeight;
                  return `${x},${y}`;
                })
                .join(' ')}
              style={{ filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.5))' }}
            />

            {/* Data points */}
            {data.map((d, i) => {
              const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
              const y = padding + graphHeight - ((d.count - minValue) / range) * graphHeight;
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill="rgb(34, 211, 238)"
                    stroke="rgb(15, 23, 42)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.8))' }}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="2"
                    fill="white"
                  />
                </g>
              );
            })}

            {/* X-axis line */}
            <line
              x1={padding}
              y1={padding + graphHeight}
              x2={chartWidth - padding}
              y2={padding + graphHeight}
              stroke="rgba(148, 163, 184, 0.4)"
              strokeWidth="1"
            />
          </svg>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-700/50">
          <span className="font-medium">{data[0]?.date}</span>
          <span className="font-medium">{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] p-8">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-slate-300">Checking authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] p-8">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                  <LogIn className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Authentication Required</h2>
              <p className="text-slate-300 mb-6">
                You need to be signed in to access the admin analytics dashboard.
              </p>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors backdrop-blur-sm font-medium"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] p-8">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-slate-300">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && isAuthenticated !== false) {
    // Only show error if user is authenticated (not showing login prompt)
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] p-8">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-200">Error</h3>
                <p className="text-red-300 mt-1">{error}</p>
                {error.includes('Admin access required') && (
                  <p className="text-red-200 text-sm mt-2">
                    If you believe you should have admin access, please contact the administrator.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setError(null);
                  fetchAnalytics();
                }}
                className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] p-8">
      {/* Globe background image */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/hero-globe.png"
          alt="Digital Globe Background"
          fill
          className="object-cover object-right opacity-30"
          quality={100}
          priority
        />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white gradient-text">Admin Analytics</h1>
              <p className="text-slate-300 mt-2">
                Overall platform statistics and insights
              </p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          {lastUpdated && (
            <p className="text-sm text-slate-400 mt-2">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-8 bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search KPIs by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as KPICategory)}
                className="pl-10 pr-8 py-2.5 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all appearance-none cursor-pointer min-w-[200px]"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-slate-800">
                    {cat.label} ({cat.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              Showing <span className="text-cyan-400 font-semibold">{filteredKPIs.length}</span> of{' '}
              <span className="text-slate-300 font-semibold">{allKPIs.length}</span> KPIs
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={data.overview.totalUsers}
            icon={Users}
            trend={data.growth.users.last7Days}
            trendLabel="new (7d)"
          />
          <StatCard
            title="App Projects"
            value={data.overview.totalAppProjects}
            icon={FolderKanban}
            trend={data.growth.projects.last7Days}
            trendLabel="new (7d)"
          />
          <StatCard
            title="Workspaces"
            value={data.overview.totalWorkspaces}
            icon={Briefcase}
          />
          <StatCard
            title="Active Users (30d)"
            value={data.overview.activeUsersLast30Days}
            icon={Activity}
          />
        </div>

        {/* Visit & Search Tracking Stats */}
        {data.overview.totalPageVisits !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title="Total Visits"
              value={data.overview.totalPageVisits}
              icon={Globe}
            />
            <StatCard
              title="Total Searches"
              value={data.overview.totalSearches || 0}
              icon={BarChart3}
            />
            <StatCard
              title="Resource Views"
              value={data.overview.totalResourceViews || 0}
              icon={FileText}
            />
            <StatCard
              title="Unique Visitors (Today)"
              value={data.overview.uniqueVisitorsToday || 0}
              icon={Users}
            />
            <StatCard
              title="Unique Visitors (7d)"
              value={data.overview.uniqueVisitorsLast7Days || 0}
              icon={Users}
            />
          </div>
        )}

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Groups"
            value={data.overview.totalGroups}
            icon={Users}
          />
          <StatCard
            title="Discussions"
            value={data.overview.totalDiscussions}
            icon={MessageSquare}
          />
          <StatCard
            title="Events"
            value={data.overview.totalEvents}
            icon={Calendar}
          />
          <StatCard
            title="Challenges"
            value={data.overview.totalChallenges}
            icon={Trophy}
          />
          <StatCard
            title="Submissions"
            value={data.overview.totalSubmissions}
            icon={FileText}
          />
        </div>

        {/* Growth Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <LineChart
            data={data.trends.dailyUserRegistrations}
            title="Daily User Registrations (Last 30 Days)"
          />
          <LineChart
            data={data.trends.dailyProjectCreations}
            title="Daily Project Creations (Last 30 Days)"
          />
        </div>

        {/* Visit & Search Trends */}
        {data.trends.dailyVisits && data.trends.dailySearches && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <LineChart
              data={data.trends.dailyVisits}
              title="Daily Page Visits (Last 30 Days)"
            />
            <LineChart
              data={data.trends.dailySearches}
              title="Daily Resource Searches (Last 30 Days)"
            />
          </div>
        )}

        {/* Growth Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              User Growth
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last 7 days</span>
                <span className="text-lg font-semibold text-cyan-400">
                  +{data.growth.users.last7Days}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last 30 days</span>
                <span className="text-lg font-semibold text-cyan-400">
                  +{data.growth.users.last30Days}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last 90 days</span>
                <span className="text-lg font-semibold text-cyan-400">
                  +{data.growth.users.last90Days}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Project Growth
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last 7 days</span>
                <span className="text-lg font-semibold text-cyan-400">
                  +{data.growth.projects.last7Days}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last 30 days</span>
                <span className="text-lg font-semibold text-cyan-400">
                  +{data.growth.projects.last30Days}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Last 90 days</span>
                <span className="text-lg font-semibold text-cyan-400">
                  +{data.growth.projects.last90Days}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SimpleBarChart data={data.deployments} title="Deployment Status" />
          <SimpleBarChart data={data.frameworks} title="Framework Distribution" />
          <SimpleBarChart data={data.appTypes} title="App Type Distribution" />
        </div>

        {/* Search Analytics */}
        {data.search && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Search Performance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Searches</span>
                  <span className="text-lg font-semibold text-cyan-400">
                    {data.search.totalSearches.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Success Rate</span>
                  <span className="text-lg font-semibold text-green-400">
                    {data.search.searchSuccessRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Avg Searches/User</span>
                  <span className="text-lg font-semibold text-cyan-400">
                    {data.search.avgSearchesPerUser.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Daily Searches</span>
                  <span className="text-lg font-semibold text-cyan-400">
                    {data.search.dailySearches.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Popular Searches (Top 10)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.search.popularSearches.slice(0, 10).map((search, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-slate-800/70 rounded border border-slate-700/30"
                  >
                    <span className="text-sm text-slate-300 truncate flex-1">
                      {idx + 1}. {search.query}
                    </span>
                    <span className="text-sm text-cyan-400 ml-2">{search.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Provider Usage */}
        {data.search && data.search.providerUsage.length > 0 && (
          <div className="mb-8">
            <SimpleBarChart
              data={data.search.providerUsage.reduce((acc, item) => {
                acc[item.provider] = item.count;
                return acc;
              }, {} as Record<string, number>)}
              title="Search Provider Usage"
            />
          </div>
        )}

        {/* Growth Rates */}
        {data.growthRates && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Month-over-Month Growth
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">User Growth Rate</span>
                  <span className={`text-lg font-semibold ${
                    data.growthRates.userGrowthRateMoM >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {data.growthRates.userGrowthRateMoM >= 0 ? '+' : ''}
                    {data.growthRates.userGrowthRateMoM.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Project Growth Rate</span>
                  <span className={`text-lg font-semibold ${
                    data.growthRates.projectGrowthRateMoM >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {data.growthRates.projectGrowthRateMoM >= 0 ? '+' : ''}
                    {data.growthRates.projectGrowthRateMoM.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {data.resources && (
              <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Resource Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Resources</span>
                    <span className="text-lg font-semibold text-cyan-400">
                      {data.resources.totalResources.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Views</span>
                    <span className="text-lg font-semibold text-cyan-400">
                      {data.resources.totalResourceViews.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Avg Resources/Workspace</span>
                    <span className="text-lg font-semibold text-cyan-400">
                      {data.resources.avgResourcesPerWorkspace.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Daily Views</span>
                    <span className="text-lg font-semibold text-cyan-400">
                      {data.resources.dailyResourceViews.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Users */}
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Recent Users
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.recent.users.map((user) => (
                <div
                  key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-800/70 rounded-lg border border-slate-700/40"
                >
                  <div>
                    <p className="font-medium text-white">
                      {user.name || user.email}
                    </p>
                    <p className="text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-cyan-400">
                      {user.projectsCount} projects
                    </p>
                    <p className="text-xs text-slate-400">
                      {user.workspacesCount} workspaces
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-cyan-400" />
              Recent Projects
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.recent.projects.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-slate-800/70 rounded-lg border border-slate-700/40"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {project.title}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {project.framework && (
                          <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
                            {project.framework}
                          </span>
                        )}
                        {project.appType && (
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded">
                            {project.appType}
                          </span>
                        )}
                        {project.deploymentStatus && (
                          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                            {project.deploymentStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        by {project.owner.name || project.owner.email} • {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All KPIs Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 gradient-text">All KPIs</h2>
          
          {filteredKPIs.length === 0 ? (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-12 border border-slate-700/50 text-center">
              <Search className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No KPIs found matching your search criteria</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your search query or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredKPIs.map((kpi) => {
                const categoryColors: Record<KPICategory, { bg: string; border: string; text: string }> = {
                  'all': { bg: 'bg-slate-800/70', border: 'border-slate-700/50', text: 'text-slate-300' },
                  'user-engagement': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300' },
                  'search-discovery': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300' },
                  'resource-management': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300' },
                  'app-builder': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300' },
                  'community': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300' },
                  'workspace': { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300' },
                  'growth-performance': { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300' },
                };

                const colors = categoryColors[kpi.category] || categoryColors['all'];

                return (
                  <div
                    key={kpi.id}
                    className={`${colors.bg} ${colors.border} border rounded-lg p-4 backdrop-blur-sm hover:scale-[1.02] transition-transform cursor-pointer group`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-sm font-semibold ${colors.text} group-hover:text-white transition-colors line-clamp-2 flex-1`}>
                        {kpi.name}
                      </h3>
                    </div>
                    
                    <div className="mt-3">
                      {kpi.format === 'array' && Array.isArray(kpi.value) ? (
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-white">{kpi.value.length}</p>
                          <div className="text-xs text-slate-400 max-h-20 overflow-y-auto">
                            {kpi.value.slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="truncate">
                                {item.query || item.provider || JSON.stringify(item)}
                              </div>
                            ))}
                            {kpi.value.length > 3 && (
                              <div className="text-slate-500">+{kpi.value.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      ) : kpi.format === 'object' && typeof kpi.value === 'object' && kpi.value !== null ? (
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-white">{Object.keys(kpi.value).length}</p>
                          <div className="text-xs text-slate-400 max-h-20 overflow-y-auto">
                            {Object.entries(kpi.value as Record<string, number>).slice(0, 3).map(([key, val]) => (
                              <div key={key} className="flex justify-between">
                                <span className="truncate">{key}:</span>
                                <span className="ml-2 font-semibold">{val}</span>
                              </div>
                            ))}
                            {Object.keys(kpi.value).length > 3 && (
                              <div className="text-slate-500">+{Object.keys(kpi.value).length - 3} more</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-white">{formatKPIValue(kpi)}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/30">
                      <span className={`text-xs px-2 py-1 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {categories.find(c => c.value === kpi.category)?.label || kpi.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
