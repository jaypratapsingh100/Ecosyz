# Analytics Tracking System Implementation

## Overview
This document outlines the comprehensive analytics tracking system implemented for Open Idea, including visit tracking, search tracking, and resource view tracking.

## ✅ Completed Implementation

### 1. Database Schema Updates
Added three new tracking models to `prisma/schema.prisma`:

- **PageVisit**: Tracks page visits with user, path, referrer, user agent, IP, and session tracking
- **SearchLog**: Tracks search queries with results, clicks, providers used, and session tracking
- **ResourceView**: Tracks resource views with user, workspace, and session tracking

### 2. Tracking API Endpoints
Created three new API endpoints:

- **POST `/api/analytics/track/visit`**: Tracks page visits
- **POST `/api/analytics/track/search`**: Tracks search queries and clicks
- **POST `/api/analytics/track/resource-view`**: Tracks resource views

### 3. Client-Side Tracking Utilities
Created `src/lib/analytics.ts` with functions:
- `trackPageVisit()`: Track page visits
- `trackSearchClick()`: Track when users click search results
- `trackResourceView()`: Track resource views

### 4. Automatic Page Visit Tracking
Created `app/components/AnalyticsTracker.tsx` component that automatically tracks page visits using Next.js `usePathname()` hook. Added to root layout.

### 5. Search Route Integration
Updated `app/api/search/route.ts` to automatically track all search queries with:
- Query text
- Resource type
- Result count
- Providers used
- Session ID

### 6. Enhanced Admin Analytics API
Updated `app/api/admin/analytics/route.ts` to include:

#### New KPIs Added:
1. **Total Page Visits** - Cumulative visit count
2. **Daily Page Visits** - Visits per day
3. **Total Resource Searches** - Cumulative search count
4. **Daily Resource Searches** - Searches per day
5. **Total Resource Views** - Cumulative view count
6. **Daily Resource Views** - Views per day
7. **Unique Visitors (Today)** - Unique sessions today
8. **Unique Visitors (7d)** - Unique sessions last 7 days
9. **Unique Visitors (30d)** - Unique sessions last 30 days
10. **Search Success Rate** - % of searches with clicks
11. **Average Searches per User** - Mean searches per active user
12. **Popular Searches** - Top 20 most searched queries
13. **Search Provider Usage** - Usage by provider (OpenAlex, ArXiv, etc.)
14. **User Growth Rate (MoM)** - Month-over-month user growth %
15. **Project Growth Rate (MoM)** - Month-over-month project growth %
16. **Average Resources per Workspace** - Mean resources per workspace

### 7. Enhanced Analytics Dashboard
Updated `app/admin/analytics/page.tsx` to display:
- Visit tracking statistics
- Search analytics with success rates
- Popular searches list
- Search provider usage charts
- Growth rate metrics
- Resource view metrics
- Daily trends for visits and searches

## 📊 KPIs Now Available (16 of 50)

### User Engagement (4 KPIs)
- ✅ Total Registered Users
- ✅ Daily Active Users (via unique visitors)
- ✅ Monthly Active Users (via unique visitors)
- ✅ Daily New User Sign-ups

### Search & Discovery (6 KPIs)
- ✅ Total Resource Searches
- ✅ Daily Resource Searches
- ✅ Average Searches per User
- ✅ Search Success Rate
- ✅ Popular Search Terms (Top 20)
- ✅ Search Provider Performance

### Resource Management (2 KPIs)
- ✅ Total Resources Saved
- ✅ Average Resources per Workspace

### Growth & Performance (4 KPIs)
- ✅ User Growth Rate (MoM)
- ✅ Project Growth Rate (MoM)
- ✅ Daily Platform Visits
- ✅ Total Platform Visits

## 🚀 Next Steps

### 1. Run Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_analytics_tracking
```

### 2. Add Search Click Tracking
Update search result components to call `trackSearchClick()` when users click on results:

```typescript
import { trackSearchClick } from '@/src/lib/analytics';

// In search result click handler
trackSearchClick(query, resourceType, resourceId, providers);
```

### 3. Add Resource View Tracking
Update resource components to call `trackResourceView()` when resources are viewed:

```typescript
import { trackResourceView } from '@/src/lib/analytics';

// When resource is viewed
trackResourceView(resourceId, workspaceId);
```

### 4. Additional KPIs to Add (Incremental)
The following KPIs can be added incrementally:

#### User Engagement (6 remaining)
- 7-Day User Retention Rate
- 30-Day User Retention Rate
- User Churn Rate
- Average Session Duration
- Sessions per User
- User Engagement Score

#### Resource Management (5 remaining)
- Daily Resources Saved
- Resource Annotation Rate
- Most Saved Resource Types
- Resource Share Rate
- Resource Engagement Rate

#### App Builder (8 KPIs)
- Project Completion Rate
- Deployment Success Rate
- Average Files per Project
- Chat Interactions per Project
- Project Abandonment Rate
- Most Popular Frameworks (already tracked, needs display)

#### Community (8 KPIs)
- Group Membership Rate
- Discussion Engagement Rate
- Event Registration Rate
- Challenge Participation Rate
- User Follow Network Size
- Community Activity Score

#### Workspace (5 KPIs)
- Workspaces per User
- Workspace Collaboration Rate
- Workspace Activity Rate
- Average Workspace Size

## 📝 Usage Examples

### Track Page Visit (Automatic)
The `AnalyticsTracker` component automatically tracks all page visits. No manual tracking needed.

### Track Search Click
```typescript
import { trackSearchClick } from '@/src/lib/analytics';

// When user clicks a search result
trackSearchClick(
  'machine learning',
  'paper',
  'resource-id-123',
  ['openalex', 'arxiv']
);
```

### Track Resource View
```typescript
import { trackResourceView } from '@/src/lib/analytics';

// When user views a resource
trackResourceView('resource-id-123', 'workspace-id-456');
```

## 🔍 Analytics Dashboard Access

Access the analytics dashboard at: `/admin/analytics`

**Admin Access**: Only users with emails in `ADMIN_EMAILS` environment variable can access.

## 📈 Data Retention

- All tracking data is stored in PostgreSQL
- Data is indexed for fast queries
- Consider implementing data retention policies for old data (e.g., archive after 1 year)

## 🎯 Future Enhancements

1. **Real-time Analytics**: Add WebSocket support for real-time dashboard updates
2. **Export Functionality**: Add CSV/JSON export for analytics data
3. **Custom Date Ranges**: Allow admins to select custom date ranges
4. **User Segmentation**: Add user segmentation analytics
5. **A/B Testing**: Add A/B test tracking capabilities
6. **Funnel Analysis**: Track user journeys through the platform
7. **Cohort Analysis**: Analyze user cohorts over time

## 🐛 Troubleshooting

### Tracking Not Working
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database connection
4. Ensure Prisma client is generated

### Missing Data
1. Verify tracking calls are being made
2. Check database for records
3. Verify session storage is working
4. Check API endpoint logs

## 📚 Related Files

- `prisma/schema.prisma` - Database schema
- `app/api/analytics/track/*` - Tracking endpoints
- `app/api/admin/analytics/route.ts` - Analytics API
- `app/admin/analytics/page.tsx` - Analytics dashboard
- `src/lib/analytics.ts` - Client-side tracking utilities
- `app/components/AnalyticsTracker.tsx` - Auto page visit tracking




