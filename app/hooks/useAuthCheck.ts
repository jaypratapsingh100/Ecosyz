/**
 * Shared Authentication Check Hook
 * Replaces duplicate auth check logic from both app-builder routes
 */

import { useState, useEffect } from 'react';

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
    maxRetries = 5,
    retryDelay = 300,
    enableRetry = true,
  } = options;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (isRetry = false) => {
    let retryCount = 0;

    const performCheck = async (): Promise<void> => {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          credentials: 'include',
        });

        if (response.ok) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          if (enableRetry && retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              performCheck();
            }, retryDelay);
          } else {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (enableRetry && retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            performCheck();
          }, retryDelay);
        } else {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    await performCheck();
  };

  useEffect(() => {
    // Small initial delay to allow cookies to be set after redirect
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 200);

    // Re-check when window gains focus (handles tab switching after login)
    const handleFocus = () => {
      if (isAuthenticated === false || isAuthenticated === null) {
        checkAuth();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return {
    isAuthenticated,
    isLoading,
    checkAuth,
  };
}
