'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageVisit } from '../../src/lib/analytics';

/**
 * Component to automatically track page visits
 * Add this to your root layout or app component
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      // Track page visit with a small delay to avoid blocking
      setTimeout(() => {
        trackPageVisit(pathname);
      }, 100);
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}




