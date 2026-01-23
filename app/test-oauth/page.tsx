'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';

/**
 * OAuth Test Page
 * Use this to verify OAuth configuration locally
 * Access at: http://localhost:3000/test-oauth
 */
export default function TestOAuthPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }

    checkSession();
  }, []);

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('OAuth error:', error);
      alert(`Error: ${error.message}`);
    } else if (data.url) {
      window.location.href = data.url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">OAuth Test Page</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration Check</h2>
          <div className="space-y-2">
            <p>
              <strong>Supabase URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ Not set'}
            </p>
            <p>
              <strong>Supabase Client:</strong>{' '}
              {supabase ? '✅ Initialized' : '❌ Not initialized'}
            </p>
            <p>
              <strong>Callback URL:</strong>{' '}
              {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          {session ? (
            <div className="space-y-2">
              <p className="text-green-400">✅ Authenticated</p>
              <p><strong>User ID:</strong> {session.user.id}</p>
              <p><strong>Email:</strong> {session.user.email}</p>
              <p><strong>Name:</strong> {session.user.user_metadata?.name || 'N/A'}</p>
              <p><strong>Session expires:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-yellow-400">⚠️ Not authenticated</p>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-4">
            {!session ? (
              <button
                onClick={handleGoogleLogin}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
              >
                Test Google OAuth Login
              </button>
            ) : (
              <button
                onClick={async () => {
                  await supabase?.auth.signOut();
                  setSession(null);
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
              >
                Sign Out
              </button>
            )}
            
            <div>
              <button
                onClick={() => window.location.href = '/auth'}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold ml-4"
              >
                Go to Auth Page
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Ensure Supabase redirect URLs include: <code className="bg-gray-700 px-2 py-1 rounded">http://localhost:3000/auth/callback</code></li>
            <li>Click "Test Google OAuth Login" button above</li>
            <li>Complete Google authentication</li>
            <li>You should be redirected back to <code className="bg-gray-700 px-2 py-1 rounded">/auth/callback</code></li>
            <li>Check browser console for logs</li>
            <li>Verify session appears above after successful login</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
