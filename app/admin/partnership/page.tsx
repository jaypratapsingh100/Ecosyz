'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Handshake,
  LogIn,
  Loader2,
  Check,
  X,
  Mail,
  ExternalLink,
  AlertCircle,
  Copy,
} from 'lucide-react';

type PartnershipApplication = {
  id: string;
  name: string;
  email: string;
  linkedin: string | null;
  coverNote: string | null;
  status: string;
  affiliateCode: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
};

export default function AdminPartnershipPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applications, setApplications] = useState<PartnershipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/check');
      if (res.ok) setIsAdmin(true);
    } catch {
      // not admin
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/partnership');
      const data = await res.json();
      if (res.ok) setApplications(data.applications || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAdmin) return;
    loadApplications();
  }, [isAdmin, loadApplications]);

  const handleApprove = async (id: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/partnership/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'approved', affiliateCode: data.affiliateCode || null, reviewedAt: new Date().toISOString(), reviewedBy: 'admin' }
            : a
        )
      );
      await loadApplications(); // Reload to get affiliateCode from server
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setUpdating(null);
    }
  };

  const copyAffiliateInfo = (code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/pricing?ref=${code}`;
    navigator.clipboard.writeText(`${code}\n\nOr share this link:\n${link}`);
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this application?')) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/partnership/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: 'admin' }
            : a
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading) {
    return (
      <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
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
              Sign in with an admin account to manage partnership applications.
            </p>
            <Link
              href="/auth?redirect=%2Fadmin%2Fpartnership"
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

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Handshake className="w-8 h-8 text-emerald-400" />
          Partnership Applications
        </h1>
        <p className="text-slate-300 mt-1">
          Review and approve affiliate partnership applications. Applications are also emailed to info@openidea.world.
        </p>
        {pendingCount > 0 && (
          <p className="text-amber-400 text-sm mt-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">{pendingCount}</span> pending
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-12 text-center">
          <Handshake className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No partnership applications yet.</p>
          <Link
            href="/partnership"
            className="inline-flex items-center gap-2 mt-4 text-cyan-400 hover:text-cyan-300"
          >
            View partnership page
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-5 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-white">{app.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        app.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : app.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <a
                    href={`mailto:${app.email}`}
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 mt-1 text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {app.email}
                  </a>
                  {app.status === 'approved' && app.affiliateCode && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Affiliate code:</span>
                      <code className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm font-mono">{app.affiliateCode}</code>
                      <button
                        type="button"
                        onClick={() => copyAffiliateInfo(app.affiliateCode!)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                  )}
                  {app.linkedin && (
                    <a
                      href={app.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 mt-1 text-sm ml-4"
                    >
                      LinkedIn
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {app.coverNote && (
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{app.coverNote}</p>
                  )}
                  <p className="text-slate-500 text-xs mt-2">
                    Applied {new Date(app.createdAt).toLocaleString()}
                    {app.reviewedAt && ` • Reviewed ${new Date(app.reviewedAt).toLocaleString()}`}
                  </p>
                </div>
                {app.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={updating === app.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      {updating === app.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={updating === app.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500/20 text-slate-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
