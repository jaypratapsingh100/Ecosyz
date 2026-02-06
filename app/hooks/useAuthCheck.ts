/**
 * Shared Authentication Check Hook
 * Replaces duplicate auth check logic from both app-builder routes
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAuthCheckOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableRetry?: boolean;
}

interface UseAuthCheckResult {
  isAuthenticated: boolean | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
}

export function useAuthCheck(options: UseAuthCheckOptions = {}): UseAuthCheckResult {
  const {
    maxRetries = 3,
    retryDelay = 500,
    enableRetry = false, // Disable retry by default to prevent hanging
  } = options;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticatedRef = useRef<boolean | null>(null);

  // Update ref when state changes
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Auth check timed out');
      } else {
        console.error('Auth check error:', error);
      }
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Small initial delay to allow cookies to be set after redirect
    const timeoutId = setTimeout(() => {
      if (mounted) {
        checkAuth();
      }
    }, 200);

    // Re-check when window gains focus (handles tab switching after login)
    const handleFocus = () => {
      if (mounted && (isAuthenticatedRef.current === false || isAuthenticatedRef.current === null)) {
        checkAuth();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAuth]);

  return {
    isAuthenticated,
    isLoading,
    checkAuth,
  };
}
