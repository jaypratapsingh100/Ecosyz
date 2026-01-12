/**
 * Client-side analytics tracking utilities
 * Tracks page visits, searches, and resource views
 */

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Track a page visit
 */
export async function trackPageVisit(path: string, referrer?: string) {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch('/api/analytics/track/visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        referrer: referrer || document.referrer || null,
        userAgent: navigator.userAgent,
        sessionId: getSessionId(),
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to track page visit:', error);
    }
  }
}

/**
 * Track a search query click (when user clicks on a search result)
 */
export async function trackSearchClick(
  query: string,
  resourceType: string | null,
  clickedResourceId: string,
  providers: string[]
) {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch('/api/analytics/track/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        resourceType,
        clicked: true,
        clickedResourceId,
        providers,
        sessionId: getSessionId(),
      }),
    });
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to track search click:', error);
    }
  }
}

/**
 * Track a resource view
 */
export async function trackResourceView(
  resourceId: string,
  workspaceId?: string
) {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch('/api/analytics/track/resource-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resourceId,
        workspaceId: workspaceId || null,
        sessionId: getSessionId(),
      }),
    });
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to track resource view:', error);
    }
  }
}




