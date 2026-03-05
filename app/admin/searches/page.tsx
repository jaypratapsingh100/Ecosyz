'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  LogIn,
  AlertCircle,
  Loader2,
  User as UserIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface SearchLogUser {
  id: string;
  email: string;
  name: string | null;
}

interface SearchLogRow {
  id: string;
  query: string;
  resourceType: string | null;
  resultCount: number;
  clicked: boolean;
  clickedResourceId: string | null;
  providers: string[];
  createdAt: string;
  user: SearchLogUser | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdminSearchesPage() {
  const [logs, setLogs] = useState<SearchLogRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [queryFilter, setQueryFilter] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const fetchSearches = async (opts?: { page?: number; query?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const targetPage = opts?.page ?? page;
      const query = opts?.query ?? appliedQuery;

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('pageSize', String(pageSize));
      if (query.trim()) {
        params.set('q', query.trim());
      }

      const res = await fetch(`/api/admin/searches?${params.toString()}`);

      if (res.status === 401) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (res.status === 403) {
        setIsAuthenticated(true);
        setIsAdmin(false);
        setError('Admin access required');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data.details || data.error || 'Failed to load search logs';
        throw new Error(msg);
      }

      setIsAuthenticated(true);
      setIsAdmin(true);

      const data = (await res.json()) as {
        logs: SearchLogRow[];
        pagination: PaginationInfo;
      };

      setLogs(data.logs ?? []);
      setPagination(data.pagination);
      setPage(data.pagination?.page ?? targetPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load search logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilter = () => {
    setAppliedQuery(queryFilter);
    setPage(1);
    void fetchSearches({ page: 1, query: queryFilter });
  };

  const handleClearFilter = () => {
    setQueryFilter('');
    setAppliedQuery('');
    setPage(1);
    void fetchSearches({ page: 1, query: '' });
  };

  const handlePageChange = (nextPage: number) => {
    if (!pagination) return;
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    setPage(nextPage);
    void fetchSearches({ page: nextPage });
  };

  // Not authenticated: show sign-in prompt
  if (isAuthenticated === false && !loading) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                <LogIn className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Sign in required
            </h2>
            <p className="text-slate-300 mb-6">
              You must be signed in as an admin to view search logs.
            </p>
            <Link
              href="/auth?redirect=%2Fadmin%2Fsearches"
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

  // Authenticated but not admin
  if (isAuthenticated === true && isAdmin === false && !loading) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/30">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Admin access required
            </h2>
            <p className="text-slate-300 mb-6">
              Only administrators can view detailed search logs. Contact an
              admin if you need access.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Search Logs
              </h1>
              <p className="text-slate-300 mt-1 text-sm md:text-base">
                View individual searches, who made them, and when.
              </p>
            </div>
          </div>
        </div>
        {pagination && (
          <div className="hidden md:flex flex-col items-end text-xs text-slate-400">
            <span>
              Total searches:{' '}
              <span className="text-cyan-400 font-semibold">
                {pagination.total.toLocaleString()}
              </span>
            </span>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="mb-6 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={queryFilter}
              onChange={(e) => setQueryFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilter();
                }
              }}
              placeholder="Filter by search query..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm"
            />
            {appliedQuery && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                Filtered
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleApplyFilter}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs md:text-sm transition-colors"
              disabled={loading}
            >
              <Search className="w-4 h-4" />
              Apply
            </button>
            {appliedQuery && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/70 text-slate-300 border border-slate-600 hover:bg-slate-800 text-xs md:text-sm transition-colors"
                disabled={loading}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {pagination && (
          <p className="mt-3 text-xs text-slate-400">
            Showing{' '}
            <span className="text-cyan-400 font-semibold">
              {pagination.total === 0
                ? 0
                : (pagination.page - 1) * pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="text-cyan-400 font-semibold">
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total,
              )}
            </span>{' '}
            of{' '}
            <span className="text-slate-300 font-semibold">
              {pagination.total.toLocaleString()}
            </span>{' '}
            searches
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-red-900/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table / loading / empty */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}

      {!loading && logs.length === 0 && !error && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-10 text-center">
          <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">
            No searches found yet.
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Once users start searching, their queries will appear here.
          </p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/80 border-b border-slate-700/70">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    Query
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    When
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    Results
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    Providers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">
                    Clicked
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const isLast = idx === logs.length - 1;
                  const userLabel = log.user
                    ? log.user.name || log.user.email
                    : 'Anonymous';
                  const created = new Date(log.createdAt);

                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-slate-800/70 ${
                        isLast ? '' : 'last:border-0'
                      } hover:bg-slate-800/60`}
                    >
                      <td className="px-4 py-3 align-top max-w-xs md:max-w-md">
                        <div className="text-slate-100 text-sm break-words">
                          {log.query}
                        </div>
                        {log.resourceType && (
                          <div className="mt-1 inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300 uppercase tracking-wide">
                            {log.resourceType}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          <UserIcon className="w-4 h-4 mt-0.5 text-slate-400" />
                          <div className="text-xs">
                            <div className="text-slate-100">{userLabel}</div>
                            {log.user?.email && (
                              <div className="text-slate-400 text-[11px] break-all">
                                {log.user.email}
                              </div>
                            )}
                            {!log.user && (
                              <div className="text-slate-500 text-[11px]">
                                Not signed in
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <div className="flex flex-col">
                            <span>
                              {created.toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {created.toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-slate-200">
                        {log.resultCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-200">
                        {log.providers.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {log.providers.map((provider) => (
                              <span
                                key={provider}
                                className="inline-flex items-center rounded-full bg-slate-800/80 border border-slate-600/70 px-2 py-0.5 text-[11px] capitalize text-slate-200"
                              >
                                {provider}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-slate-200">
                        {log.clicked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-300">
                            Yes
                            {log.clickedResourceId && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-200/80">
                                <ExternalLink className="w-3 h-3" />
                                {log.clickedResourceId.length > 12
                                  ? `${log.clickedResourceId.slice(
                                      0,
                                      4,
                                    )}…${log.clickedResourceId.slice(-4)}`
                                  : log.clickedResourceId}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 border border-slate-600/70 px-2 py-0.5 text-[11px] text-slate-300">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-700/60 bg-slate-900/90 text-xs text-slate-300">
              <div>
                Page{' '}
                <span className="text-cyan-400 font-semibold">
                  {pagination.page}
                </span>{' '}
                of{' '}
                <span className="text-slate-200 font-semibold">
                  {pagination.totalPages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-600/70 text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={
                    pagination.page >= pagination.totalPages || loading
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-600/70 text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

