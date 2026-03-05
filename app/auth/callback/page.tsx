'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { toast } from 'sonner';
import { getSafeRedirectUrl } from '@/src/lib/auth/utils/redirect';

/**
 * Client-side OAuth Callback Page
 * 
 * Handles Supabase OAuth redirects with tokens in URL hash.
 * Supabase SDK automatically extracts tokens from hash and persists session.
 * 
 * Flow:
 * 1. Google redirects to /auth/callback#access_token=...&refresh_token=...
 * 2. Supabase SDK detects tokens in hash automatically
 * 3. SDK automatically persists session (localStorage)
 * 4. We verify session exists and sync to server cookies
 * 5. Redirect to /studio
 */
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine where to redirect after successful OAuth
  const redirectTo = getSafeRedirectUrl(searchParams?.get('redirect'));

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) {
        router.replace('/auth?error=config_error');
        return;
      }

      try {
        // Check for error parameters in URL query string
        const error = searchParams?.get('error');
        const errorDescription = searchParams?.get('error_description') || searchParams?.get('description');

        if (error) {
          console.error('❌ OAuth error in callback:', error, errorDescription);
          toast.error('Authentication failed', {
            description: errorDescription || 'Please try again.',
            duration: 6000,
          });
          router.replace('/auth');
          return;
        }

        // Supabase SDK automatically handles tokens in URL hash
        // When tokens are in hash (#access_token=...), Supabase SDK:
        // 1. Extracts tokens from hash
        // 2. Sets session automatically
        // 3. Persists to localStorage
        // 4. Clears hash from URL

        console.log('🔄 Checking for Supabase session...');
        
        // Get session - Supabase SDK should have already processed hash tokens
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Error getting session:', sessionError);
          toast.error('Session error', {
            description: sessionError.message,
            duration: 6000,
          });
          router.replace('/auth?error=session_error');
          return;
        }

        if (!session) {
          console.error('❌ No session found after OAuth callback');
          toast.error('Authentication failed', {
            description: 'No session found. Please try again.',
            duration: 6000,
          });
          router.replace('/auth?error=no_session_found');
          return;
        }

        console.log('✅ Supabase session found!', {
          userId: session.user.id,
          email: session.user.email,
        });

        // Sync session to server cookies and database (combined endpoint)
        try {
          const syncResponse = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              expiresIn: session.expires_in,
              userId: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name,
              avatarUrl: session.user.user_metadata?.avatar_url,
            }),
          });

          if (!syncResponse.ok) {
            console.warn('⚠️ Failed to sync session, but Supabase session exists');
          } else {
            console.log('✅ Session and user synced successfully');
          }
        } catch (syncError) {
          console.warn('⚠️ Error syncing session:', syncError);
          // Don't fail - Supabase session exists in localStorage
        }

        toast.success('Signed in successfully!', {
          description: `Welcome, ${session.user.email}`,
          duration: 3000,
        });

        // Small delay to ensure cookies are set before redirect
        // This helps the app-builder page detect authentication immediately
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use window.location for full page reload to ensure cookies are picked up
        window.location.href = redirectTo;
      } catch (error: any) {
        console.error('❌ OAuth callback error:', error);
        toast.error('Authentication error', {
          description: error.message || 'Please try again.',
          duration: 6000,
        });
        router.replace('/auth?error=callback_error');
      }
    }

    handleCallback();
  }, [router, searchParams, redirectTo]);

  // Listen for auth state changes (recommended by Supabase)
  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in via auth state change');
        router.replace(redirectTo);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        router.replace('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
