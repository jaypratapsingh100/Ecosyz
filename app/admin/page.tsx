'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BarChart3, Mail, LogIn, Loader2, Activity, Search as SearchIcon, Users } from 'lucide-react';

export default function AdminPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) setIsAdmin(true);
      } catch {
        // not admin or not authenticated
      } finally {
        setAuthLoading(false);
      }
    };
    check();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                <LogIn className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin access required</h2>
            <p className="text-slate-300 mb-6">
              Sign in with an admin account to access the dashboard.
            </p>
            <Link
              href="/auth?redirect=%2Fadmin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-300 mt-1">Manage analytics, searches, newsletters, API usage, and architecture docs</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/analytics"
          className="group block p-6 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Analytics</h2>
              <p className="text-slate-400 text-sm mt-1">View platform KPIs, users, and trends</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/searches"
          className="group block p-6 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
              <SearchIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Searches</h2>
              <p className="text-slate-400 text-sm mt-1">Inspect individual search logs, users, and timestamps</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/newsletter"
          className="group block p-6 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
              <Mail className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Newsletter</h2>
              <p className="text-slate-400 text-sm mt-1">Compose and send emails to subscribers</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/api-usage"
          className="group block p-6 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">API Usage</h2>
              <p className="text-slate-400 text-sm mt-1">Track requests and daily limits for news, search, and LLM APIs</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/architecture"
          className="group block p-6 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Architecture</h2>
              <p className="text-slate-400 text-sm mt-1">View the system architecture and C4 model docs</p>
            </div>
          </div>
        </Link>
        <Link
          href="/admin/interns"
          className="group block p-6 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Office Interns</h2>
              <p className="text-slate-400 text-sm mt-1">Manage fellowship interns, add tasks by track</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
