'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, LogIn, Loader2, ArrowLeft, Newspaper, Search, Cpu } from 'lucide-react';

type UsageRow = {
  provider: string;
  category: string;
  countToday: number;
  dailyLimit: number | null;
  status: 'ok' | 'near' | 'over';
};

const CATEGORY_ORDER = ['news', 'search', 'llm'] as const;
const CATEGORY_META: Record<string, { label: string; icon: typeof Newspaper; color: string; bg: string; barClass: string }> = {
  news: { label: 'News APIs', icon: Newspaper, color: 'text-cyan-400', bg: 'bg-cyan-500', barClass: 'bg-cyan-500/70' },
  search: { label: 'Search resources', icon: Search, color: 'text-emerald-400', bg: 'bg-emerald-500', barClass: 'bg-emerald-500/70' },
  llm: { label: 'LLM', icon: Cpu, color: 'text-violet-400', bg: 'bg-violet-500', barClass: 'bg-violet-500/70' },
};

const PROVIDER_LABELS: Record<string, string> = {
  hackernews: 'Hacker News',
  devto: 'Dev.to',
  gnews: 'GNews',
  openalex: 'OpenAlex',
  arxiv: 'arXiv',
  zenodo: 'Zenodo',
  swh: 'Software Heritage',
  github: 'GitHub',
  huggingface: 'Hugging Face',
  youtube: 'YouTube',
  hardware: 'Hardware',
  oshwa: 'OSHWA',
  wikifactory: 'Wikifactory',
  groq: 'Groq',
  openrouter: 'OpenRouter',
};

const PIE_COLORS = [
  'hsl(187, 90%, 45%)',
  'hsl(160, 84%, 45%)',
  'hsl(263, 70%, 55%)',
  'hsl(45, 93%, 50%)',
  'hsl(330, 81%, 55%)',
  'hsl(142, 71%, 45%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 67%, 50%)',
  'hsl(25, 95%, 53%)',
  'hsl(0, 0%, 65%)',
];

function PieChart({
  data,
  size = 120,
  strokeWidth = 16,
  colors = PIE_COLORS,
}: {
  data: Array<{ label: string; value: number }>;
  size?: number;
  strokeWidth?: number;
  colors?: string[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        className="rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }
  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const segment = { ...d, start: offset, pct, color: colors[i % colors.length] };
    offset += pct;
    return segment;
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {segments.map((seg, i) => {
          const r = (size - strokeWidth) / 2;
          const circumference = 2 * Math.PI * r;
          const dash = seg.pct * circumference;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={-seg.start * circumference}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-bold text-white">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

function BarChart({
  data,
  maxVal,
  barColor = 'bg-cyan-500/70',
}: {
  data: Array<{ label: string; value: number; limit: number | null }>;
  maxVal: number;
  barColor?: string;
}) {
  const scale = maxVal > 0 ? 100 / maxVal : 0;
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="min-w-[8.5rem] max-w-[10rem] text-slate-400 text-xs shrink-0 break-words" title={d.label}>{d.label}</span>
          <div className="flex-1 h-5 min-w-[60px] bg-slate-800 rounded overflow-hidden flex relative">
            <div
              className={`h-full ${barColor} rounded transition-all duration-500`}
              style={{ width: `${Math.min(100, d.value * scale)}%` }}
            />
            {d.limit != null && d.limit > 0 && d.limit * scale <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10"
                style={{ left: `${Math.min(99, d.limit * scale)}%` }}
                title={`Limit: ${d.limit.toLocaleString()}`}
              />
            )}
          </div>
          <span className="text-slate-300 text-xs tabular-nums min-w-[4.5rem] text-right shrink-0">
            {d.value.toLocaleString()}
            {d.limit != null && d.limit > 0 && <span className="text-slate-500">/ {d.limit.toLocaleString()}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminApiUsagePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/api-usage');
      if (res.status === 401) {
        setIsAdmin(false);
        return;
      }
      if (res.status === 403) {
        setIsAdmin(false);
        setError('Admin access required.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to load API usage');
        throw new Error(msg);
      }
      setIsAdmin(true);
      const data = await res.json();
      setUsage(data.usage ?? []);
      setAsOf(data.asOf ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) fetchUsage();
  }, [mounted]);

  const byCategory = useMemo(() => {
    const map: Record<string, UsageRow[]> = { news: [], search: [], llm: [] };
    for (const row of usage) {
      if (map[row.category]) map[row.category].push(row);
    }
    return map;
  }, [usage]);

  const categoryTotals = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      total: byCategory[cat]?.reduce((s, r) => s + r.countToday, 0) ?? 0,
    }));
  }, [byCategory]);

  const totalRequests = useMemo(() => categoryTotals.reduce((s, c) => s + c.total, 0), [categoryTotals]);

  const pieByCategory = useMemo(
    () => categoryTotals.map((c) => ({ label: CATEGORY_META[c.category]?.label ?? c.category, value: c.total })),
    [categoryTotals]
  );

  // Single shell on server and first client render to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex flex-col">
        <div className="shrink-0 w-full border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  if (isAdmin === false && !error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        <p className="text-slate-300 mb-4">Sign in with an admin account to view API usage.</p>
        <Link
          href="/auth?redirect=%2Fadmin%2Fapi-usage"
          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Top bar: full width */}
      <header className="shrink-0 w-full border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg border border-slate-600/50 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              aria-label="Back to Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Activity className="w-7 h-7 text-cyan-400" />
              <div>
                <h1 className="text-xl font-bold text-white">External API Usage</h1>
                <p className="text-slate-400 text-xs">By category: News · Search · LLM</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!loading && usage.length > 0 && (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <PieChart data={pieByCategory} size={56} strokeWidth={10} />
                  <div className="text-xs">
                    <span className="text-white font-semibold">{totalRequests.toLocaleString()}</span>
                    <span className="text-slate-400 ml-1">total today</span>
                  </div>
                </div>
                {asOf && (
                  <span className="text-slate-500 text-xs hidden md:inline">
                    Updated {new Date(asOf).toLocaleTimeString()}
                  </span>
                )}
              </>
            )}
            <button
              type="button"
              onClick={fetchUsage}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600/50 text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm">
            {error}
          </div>
        )}
      </header>

      {/* Main: full height, three category columns */}
      <main className="flex-1 w-full overflow-auto">
        {loading && usage.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="w-full p-4 sm:p-6 lg:p-8">
            {/* Three category panels: use full width grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {CATEGORY_ORDER.map((cat) => {
                const rows = byCategory[cat] ?? [];
                const meta = CATEGORY_META[cat];
                const Icon = meta?.icon ?? Activity;
                const totalInCat = rows.reduce((s, r) => s + r.countToday, 0);
                const totalLimitInCat = rows.reduce((s, r) => s + (r.dailyLimit ?? 0), 0);
                const maxInCat = Math.max(
                  ...rows.map((r) => r.countToday),
                  ...rows.map((r) => r.dailyLimit ?? 0).filter((l) => l > 0),
                  1
                );
                const pieData = rows.map((r) => ({
                  label: PROVIDER_LABELS[r.provider] ?? r.provider,
                  value: r.countToday,
                }));
                const barData = rows.map((r) => ({
                  label: PROVIDER_LABELS[r.provider] ?? r.provider,
                  value: r.countToday,
                  limit: r.dailyLimit,
                }));

                return (
                  <section
                    key={cat}
                    className={`flex flex-col rounded-xl border border-slate-700/50 bg-slate-900/80 overflow-hidden min-h-[420px] ${meta?.bg}/5`}
                  >
                    {/* Category header */}
                    <div className={`shrink-0 px-5 py-4 border-b border-slate-700/50 flex items-center gap-3 ${meta?.bg}/10`}>
                      <div className={`p-2.5 rounded-lg ${meta?.bg}/20`}>
                        <Icon className={`w-6 h-6 ${meta?.color}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{meta?.label}</h2>
                        <p className="text-slate-400 text-xs">
                          {totalInCat.toLocaleString()} today · {rows.length} provider{rows.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Content: pie + bar + table + limits */}
                    <div className="flex-1 p-5 flex flex-col gap-5 overflow-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-xs font-medium text-slate-400 mb-2">Share</h3>
                          <PieChart data={pieData} size={100} strokeWidth={14} />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-slate-400">Usage vs limit</h3>
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {totalInCat.toLocaleString()}
                              {totalLimitInCat > 0 && (
                                <span className="text-slate-500">/ {totalLimitInCat.toLocaleString()}</span>
                              )}
                            </span>
                          </div>
                          <BarChart data={barData} maxVal={maxInCat} barColor={meta?.barClass} />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-medium text-slate-400 mb-2">Requests today</h3>
                        <div className="rounded-lg border border-slate-700/30 overflow-x-auto">
                          <table className="w-full text-xs min-w-[320px]">
                            <thead>
                              <tr className="bg-slate-800/50 border-b border-slate-700/50">
                                <th className="px-3 py-2 text-left font-medium text-slate-400">Provider</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-400">Today</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-400">Limit</th>
                                <th className="px-3 py-2 font-medium text-slate-400">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => (
                                <tr key={row.provider} className="border-b border-slate-700/20 last:border-0">
                                  <td className="px-3 py-2 text-slate-200 min-w-[8rem] max-w-[11rem] break-words" title={PROVIDER_LABELS[row.provider]}>{PROVIDER_LABELS[row.provider] ?? row.provider}</td>
                                  <td className="px-3 py-2 text-slate-300 text-right tabular-nums">{row.countToday.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-slate-400 text-right tabular-nums">{row.dailyLimit != null ? row.dailyLimit.toLocaleString() : '—'}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded text-xs ${
                                        row.status === 'over' ? 'bg-red-500/20 text-red-400' : row.status === 'near' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                      }`}
                                    >
                                      {row.status === 'over' ? 'Over' : row.status === 'near' ? 'Near' : 'OK'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-medium text-slate-400 mb-2">Daily limits (reference)</h3>
                        <div className="rounded-lg border border-slate-700/30 overflow-x-auto">
                          <table className="w-full text-xs min-w-[280px]">
                            <thead>
                              <tr className="bg-slate-800/30 border-b border-slate-700/30">
                                <th className="px-3 py-1.5 text-left font-medium text-slate-400">Provider</th>
                                <th className="px-3 py-1.5 text-right font-medium text-slate-400">Limit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r) => (
                                <tr key={r.provider} className="border-b border-slate-700/20 last:border-0">
                                  <td className="px-3 py-1.5 text-slate-300 min-w-[8rem] max-w-[11rem] break-words">{PROVIDER_LABELS[r.provider] ?? r.provider}</td>
                                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">
                                    {r.dailyLimit != null ? (
                                      <span className="text-cyan-400/90">{r.dailyLimit.toLocaleString()}</span>
                                    ) : (
                                      <span className="text-slate-500 italic">No strict limit</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            {asOf && (
              <p className="text-slate-500 text-xs text-center mt-6">
                Last updated: {new Date(asOf).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
