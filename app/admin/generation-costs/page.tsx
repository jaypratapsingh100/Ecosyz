'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, RefreshCw, LogIn, Loader2, ArrowLeft, Clock, Zap, Hash, ChevronDown, ChevronRight, User, FolderOpen } from 'lucide-react';

type ProviderStats = {
  provider: string;
  generations: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  avgTtfbMs: number | null;
};

type ModelStats = {
  provider: string;
  model: string;
  generations: number;
  costUsd: number;
  totalTokens: number;
  avgLatencyMs: number;
};

type UserProjectEntry = {
  projectId: string;
  title: string;
  description: string | null;
  framework: string | null;
  deploymentUrl: string | null;
  deploymentStatus: string | null;
  projectCreatedAt: string;
  generations: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  avgTtfbMs: number | null;
  firstGeneration: string | null;
  lastGeneration: string | null;
};

type UserCostEntry = {
  userId: string;
  email: string;
  name: string | null;
  totalCostUsd: number;
  totalTokens: number;
  totalGenerations: number;
  projects: UserProjectEntry[];
};

type RecentLog = {
  id: string;
  projectId: string;
  userId: string;
  projectTitle: string;
  userEmail: string;
  userName: string | null;
  provider: string;
  model: string;
  stage: string;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  costSource: string | null;
  durationMs: number;
  ttfbMs: number | null;
  filesCreated: number;
  usedFallback: boolean;
  createdAt: string;
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: 'text-violet-400',
  groq: 'text-emerald-400',
  openai: 'text-cyan-400',
  anthropic: 'text-amber-400',
};

const PROVIDER_BG: Record<string, string> = {
  openrouter: 'bg-violet-500/20',
  groq: 'bg-emerald-500/20',
  openai: 'bg-cyan-500/20',
  anthropic: 'bg-amber-500/20',
};

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

function formatLatency(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${ms}ms`;
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-cyan-400' }: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof DollarSign;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Expandable user row with nested project details */
function UserRow({ entry }: { entry: UserCostEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-b border-slate-700/20 hover:bg-slate-800/30 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{entry.name || entry.email}</div>
              {entry.name && <div className="text-slate-500 text-[10px] truncate">{entry.email}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-slate-300 tabular-nums text-xs">{entry.projects.length}</td>
        <td className="px-4 py-3 text-right text-slate-300 tabular-nums text-xs">{entry.totalGenerations.toLocaleString()}</td>
        <td className="px-4 py-3 text-right text-white font-medium tabular-nums text-xs">{formatCost(entry.totalCostUsd)}</td>
        <td className="px-4 py-3 text-right text-slate-300 tabular-nums text-xs">{formatTokens(entry.totalTokens)}</td>
      </tr>
      {open && entry.projects.map((proj) => (
        <tr key={proj.projectId} className="bg-slate-800/20 border-b border-slate-700/10">
          <td className="pl-12 pr-4 py-2.5" colSpan={1}>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3 h-3 text-violet-400/60 shrink-0" />
              <div className="min-w-0">
                <div className="text-slate-300 text-xs truncate max-w-[220px]" title={proj.title}>{proj.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {proj.framework && (
                    <span className="text-[10px] text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded">{proj.framework}</span>
                  )}
                  {proj.deploymentStatus === 'deployed' && proj.deploymentUrl && (
                    <a
                      href={proj.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-500 hover:text-emerald-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Live
                    </a>
                  )}
                  {proj.lastGeneration && (
                    <span className="text-[10px] text-slate-600">
                      Last: {new Date(proj.lastGeneration).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums text-[11px]">—</td>
          <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums text-[11px]">{proj.generations}</td>
          <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums text-[11px]">{formatCost(proj.costUsd)}</td>
          <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums text-[11px]">
            {formatTokens(proj.totalTokens)}
            <span className="text-slate-600 ml-1">({formatLatency(proj.avgLatencyMs)} avg)</span>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminGenerationCostsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [today, setToday] = useState<ProviderStats[]>([]);
  const [month, setMonth] = useState<ProviderStats[]>([]);
  const [byModel, setByModel] = useState<ModelStats[]>([]);
  const [byUser, setByUser] = useState<UserCostEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [tab, setTab] = useState<'today' | 'month'>('month');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/generation-costs');
      if (res.status === 401) { setIsAdminUser(false); return; }
      if (res.status === 403) { setIsAdminUser(false); setError('Admin access required.'); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || 'Failed to load');
      }
      setIsAdminUser(true);
      const data = await res.json();
      setToday(data.today ?? []);
      setMonth(data.month ?? []);
      setByModel(data.byModel ?? []);
      setByUser(data.byUser ?? []);
      setRecentLogs(data.recentLogs ?? []);
      setAsOf(data.asOf ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchData(); }, [mounted]);

  const activeStats = tab === 'today' ? today : month;

  const totals = useMemo(() => ({
    cost: activeStats.reduce((s, r) => s + r.costUsd, 0),
    tokens: activeStats.reduce((s, r) => s + r.totalTokens, 0),
    generations: activeStats.reduce((s, r) => s + r.generations, 0),
    avgLatency: activeStats.length > 0
      ? Math.round(activeStats.reduce((s, r) => s + r.avgLatencyMs * r.generations, 0) / Math.max(1, activeStats.reduce((s, r) => s + r.generations, 0)))
      : 0,
  }), [activeStats]);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (isAdminUser === false && !error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        <p className="text-slate-300 mb-4">Sign in with an admin account to view generation costs.</p>
        <Link
          href="/auth?redirect=%2Fadmin%2Fgeneration-costs"
          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header */}
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
              <DollarSign className="w-7 h-7 text-violet-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Generation Costs</h1>
                <p className="text-slate-400 text-xs">LLM cost, tokens & latency per user, project, and provider</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setTab('today')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'today' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-white'}`}
              >
                Today
              </button>
              <button
                onClick={() => setTab('month')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'month' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-white'}`}
              >
                This Month
              </button>
            </div>
            {asOf && (
              <span className="text-slate-500 text-xs hidden md:inline">
                Updated {new Date(asOf).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={fetchData}
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

      {/* Main */}
      <main className="flex-1 w-full overflow-auto">
        {loading && today.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Cost" value={formatCost(totals.cost)} sub={tab === 'today' ? 'today' : 'this month'} icon={DollarSign} color="text-violet-400" />
              <StatCard label="Total Tokens" value={formatTokens(totals.tokens)} sub={`${formatTokens(activeStats.reduce((s, r) => s + r.inputTokens, 0))} in / ${formatTokens(activeStats.reduce((s, r) => s + r.outputTokens, 0))} out`} icon={Hash} color="text-cyan-400" />
              <StatCard label="Generations" value={totals.generations.toLocaleString()} icon={Zap} color="text-emerald-400" />
              <StatCard label="Avg Latency" value={formatLatency(totals.avgLatency)} icon={Clock} color="text-amber-400" />
            </div>

            {/* Provider breakdown */}
            <section className="rounded-xl border border-slate-700/50 bg-slate-900/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/50">
                <h2 className="text-sm font-semibold text-white">By Provider</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-700/50">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-400">Provider</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Generations</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Cost</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Input Tokens</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Output Tokens</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Avg Latency</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Avg TTFB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStats.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No data yet</td></tr>
                    ) : activeStats.map((row) => (
                      <tr key={row.provider} className="border-b border-slate-700/20 last:border-0 hover:bg-slate-800/30">
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${PROVIDER_BG[row.provider] ?? 'bg-slate-700/50'} ${PROVIDER_COLORS[row.provider] ?? 'text-slate-300'}`}>
                            {row.provider}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{row.generations.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-white font-medium tabular-nums">{formatCost(row.costUsd)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{formatTokens(row.inputTokens)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{formatTokens(row.outputTokens)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{formatLatency(row.avgLatencyMs)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">{row.avgTtfbMs ? formatLatency(row.avgTtfbMs) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── User → Projects cost breakdown (all time) ── */}
            <section className="rounded-xl border border-slate-700/50 bg-slate-900/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Cost by User & Project (All Time)</h2>
                <span className="text-[10px] text-slate-500">{byUser.length} user{byUser.length !== 1 ? 's' : ''} · {byUser.reduce((s, u) => s + u.projects.length, 0)} projects</span>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-slate-700/50">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-400">User / Project</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Projects</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Generations</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Cost</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-400">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byUser.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No data yet</td></tr>
                    ) : byUser.map((entry) => (
                      <UserRow key={entry.userId} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* By Model */}
            <section className="rounded-xl border border-slate-700/50 bg-slate-900/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/50">
                <h2 className="text-sm font-semibold text-white">By Model (This Month)</h2>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800/80 backdrop-blur-sm">
                    <tr className="border-b border-slate-700/50">
                      <th className="px-4 py-2 text-left font-medium text-slate-400">Model</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-400">Gens</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-400">Cost</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-400">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byModel.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No data yet</td></tr>
                    ) : byModel.sort((a, b) => b.costUsd - a.costUsd).map((row) => (
                      <tr key={`${row.provider}/${row.model}`} className="border-b border-slate-700/20 last:border-0 hover:bg-slate-800/30">
                        <td className="px-4 py-2 text-slate-300 max-w-[200px] truncate" title={row.model}>
                          <span className={`text-[10px] ${PROVIDER_COLORS[row.provider] ?? 'text-slate-500'}`}>{row.provider}/</span>
                          {row.model.replace(`${row.provider}/`, '')}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-300 tabular-nums">{row.generations}</td>
                        <td className="px-4 py-2 text-right text-white tabular-nums">{formatCost(row.costUsd)}</td>
                        <td className="px-4 py-2 text-right text-slate-400 tabular-nums">{formatLatency(row.avgLatencyMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent Logs */}
            <section className="rounded-xl border border-slate-700/50 bg-slate-900/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/50">
                <h2 className="text-sm font-semibold text-white">Recent Generations (last 50)</h2>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800/80 backdrop-blur-sm">
                    <tr className="border-b border-slate-700/50">
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">User</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Project</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Provider</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Model</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Status</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Tokens</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Cost</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Latency</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.length === 0 ? (
                      <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No generations yet</td></tr>
                    ) : recentLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700/20 last:border-0 hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-400 tabular-nums whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 text-slate-300 max-w-[120px] truncate" title={log.userEmail}>
                          {log.userName || log.userEmail.split('@')[0]}
                        </td>
                        <td className="px-3 py-2 text-slate-300 max-w-[140px] truncate" title={log.projectTitle}>
                          {log.projectTitle}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`${PROVIDER_COLORS[log.provider] ?? 'text-slate-300'}`}>{log.provider}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 max-w-[130px] truncate" title={log.model}>
                          {log.model.replace(`${log.provider}/`, '')}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            log.status === 'fallback' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300 tabular-nums">
                          {log.totalTokens ? formatTokens(log.totalTokens) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {log.costUsd != null ? (
                            <span className="text-white">{formatCost(log.costUsd)}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                          {log.costSource && (
                            <span className="text-[9px] text-slate-600 ml-0.5">{log.costSource === 'openrouter-api' ? 'OR' : ''}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300 tabular-nums">{formatLatency(log.durationMs)}</td>
                        <td className="px-3 py-2 text-right text-slate-300 tabular-nums">{log.filesCreated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {asOf && (
              <p className="text-slate-500 text-xs text-center mt-4">
                Last updated: {new Date(asOf).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
