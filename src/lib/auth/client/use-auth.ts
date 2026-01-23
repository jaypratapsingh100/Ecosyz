/**
 * Client-side auth hook
 * Provides authentication state and user data
 */

'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Main auth hook that fetches user from API
 * Replaces useSupabaseUser with API-based approach
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session');
        
        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          setState({
            user: data.user ? {
              id: data.user.id,
              email: data.user.email || null,
              user_metadata: {
                name: data.user.name,
                avatar_url: data.user.avatarUrl,
              },
            } as User : null,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Auth fetch error:', error);
        setState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch user',
        });
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
