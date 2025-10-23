"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Container } from '../components/ui/Container';
import AuthModal from '../components/AuthModal';
import SaveToWorkspace from '../components/workspace/SaveToWorkspace';
import { useSupabaseUser } from '../../src/lib/useSupabaseUser';
import KnowledgeGraph from '../components/KnowledgeGraph';
import GenerateButtonWithAuth from '../components/GenerateButtonWithAuth';
import { SortOptions, type SortOption } from '../components/ui/SortOptions';
import { SearchResultSkeleton } from '../components/ui/SearchResultSkeleton';
import { LimitSelector } from '../components/ui/LimitSelector';
import { ProviderCountSelector } from '../components/ui/ProviderCountSelector';

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Papers', value: 'paper' },
  { label: 'Datasets', value: 'dataset' },
  { label: 'Code', value: 'code' },
  { label: 'Models', value: 'model' },
  { label: 'Hardware', value: 'hardware' },
  { label: 'Videos', value: 'video' },
];

// Cache structure for storing search results
const resultCache = new Map<string, {
  timestamp: number;
  results: any[];
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
  coverage: any;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function OpenResourcesPageWrapper() {
  // Wrap the client-side search params consumer in Suspense per Next.js guidance
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-cyan-200">Loading search…</div>
    }>
      <OpenResourcesPage />
    </Suspense>
  );
}

function OpenResourcesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverage, setCoverage] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(30);
  const [providerCount, setProviderCount] = useState(30);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const activeAbort = useRef<AbortController | null>(null);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'error'|'info'; message: string } | null>(null);
  const [summaryModal, setSummaryModal] = useState<{
    open: boolean;
    key: string | null;
    data: {
      modeUsed?: 'quick'|'deep';
      summary?: string;
      error?: string;
      fromCache?: boolean;
      cache?: string;
      tldr?: string;
      bullets?: string[];
      tags?: string[];
    };
  }>({
    open: false,
    key: null,
    data: {},
  });
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const graphModalRef = useRef<HTMLDivElement | null>(null);

  // Authentication and modal state
  const { user, loading: authLoading } = useSupabaseUser();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [resourceToSave, setResourceToSave] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // AI Generation state
  const [selectedResources, setSelectedResources] = useState<any[]>([]);
  const [aiGenerationMode, setAiGenerationMode] = useState(false);

  // Handle save button click
  const handleSaveClick = (resource: any) => {
    setIsGraphModalOpen(false); // Close graph modal
    if (!user) {
      setResourceToSave(resource);
      setAuthModalOpen(true);
    } else {
      setResourceToSave(resource);
      setShowSaveModal(true);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    if (resourceToSave) {
      setShowSaveModal(true);
    }
  };

  // Handle save modal close
  const handleSaveModalClose = () => {
    setShowSaveModal(false);
    setResourceToSave(null);
  };
  const getFilteredResources = () => {
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }
    const typesToShow = ['paper', 'dataset', 'code', 'model', 'hardware', 'video'];
    const filtered: any[] = [];
    typesToShow.forEach(type => {
      const typeResults = results.filter(r => r.type === type).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3);
      filtered.push(...typeResults);
    });
    return filtered.slice(0, 9); // Limit total to 9 for graph performance
  };

  // Friendly display names for providers
  const PROVIDER_LABELS: Record<string, string> = {
    openalex: 'OpenAlex',
    arxiv: 'arXiv',
    zenodo: 'Zenodo',
    swh: 'Software Heritage',
    ckan: 'CKAN',
    huggingface: 'Hugging Face',
    paperswithcode: 'Papers with Code',
    youtube: 'YouTube',
    github: 'GitHub',
    gitlab: 'GitLab',
    figshare: 'Figshare',
    kaggle: 'Kaggle',
    custom: 'Custom',
  };

  // Utility: convert potential HTML description to plain text
  function cleanDescription(input: any): string {
    if (typeof input !== 'string') return '';
    // remove script/style blocks first
    const noScripts = input
      .replace(new RegExp('<script[^>]*>[\\s\\S]*?<\\/script>', 'gi'), '')
      .replace(new RegExp('<style[^>]*>[\\s\\S]*?<\\/style>', 'gi'), '');
    // strip remaining tags
    const stripped = noScripts.replace(/<[^>]+>/g, ' ');
    // decode HTML entities in the browser safely
    if (typeof window !== 'undefined') {
      const el = document.createElement('textarea');
      el.innerHTML = stripped;
      const text = (el.value || el.textContent || '').toString();
      return text.replace(/\s+/g, ' ').trim();
    }
    return stripped.replace(/\s+/g, ' ').trim();
  }

  function updateURL(nextQ: string, nextType: string, nextLimit: number, nextProviderCount: number) {
    const sp = new URLSearchParams();
    if (nextQ) sp.set('q', nextQ);
    if (nextType && nextType !== 'all') sp.set('type', nextType);
    if (nextLimit && nextLimit !== 30) sp.set('limit', String(nextLimit));
    if (nextProviderCount && nextProviderCount !== 30) sp.set('providerCount', String(nextProviderCount));
    const qs = sp.toString();
    // Use replace to avoid stacking history on every pagination
    router.replace(`/openresources${qs ? `?${qs}` : ''}` as any, { scroll: false } as any);
  }

  function sanitizeText(s: any) {
    return cleanDescription(typeof s === 'string' ? s : '');
  }

  async function search(
    customQ = q,
    customType = type,
    customLimit = limit,
    customProviderCount = providerCount,
    resetResults = true
  ) {
    if (!customQ) return; // Prevent search if query is empty
    
    // Check cache first
    const cacheKey = `${customQ}:${customType}:${sortOption}:${customLimit}:${customProviderCount}`;
    const now = Date.now();
    const cached = resultCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL && resetResults) {
      setResults(cached.results);
      setCoverage(cached.coverage);
      setTotal(cached.total);
      setNextCursor(cached.nextCursor);
      return;
    }

    // Abort any in-flight request
    if (activeAbort.current) {
      activeAbort.current.abort();
    }
    const controller = new AbortController();
    activeAbort.current = controller;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({
        q: customQ,
        type: customType,
        limit: customLimit.toString(),
        providerCount: customProviderCount.toString(),
        sort: sortOption,
        ...(resetResults ? {} : { cursor: nextCursor || '' })
      });
      
      const res = await fetch(`/api/search?${params}`, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      
      const newResults = resetResults ? data.results : [...results, ...data.results];
      setResults(Array.isArray(newResults) ? newResults : []);
      setCoverage(data.coverage || null);
      setTotal(data.total || 0);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      
      // Cache the results
      if (resetResults) {
        resultCache.set(cacheKey, {
          timestamp: now,
          results: data.results,
          hasMore: !!data.nextCursor,
          nextCursor: data.nextCursor,
          total: data.total,
          coverage: data.coverage
        });
      }
      
      // Sync URL
      updateURL(customQ, customType, customLimit, customProviderCount);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e.message || 'Search failed');
      }
    } finally {
      setLoading(false);
      // Clear only if this controller is still the active one
      if (activeAbort.current === controller) activeAbort.current = null;
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    await search(q, type, limit, providerCount, false);
  }

  // Clear cache entries older than CACHE_TTL
  useEffect(() => {
    const now = Date.now();
    for (const [key, value] of resultCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        resultCache.delete(key);
      }
    }
  }, [q]); // Only run when query changes

  // Handle sort changes
  useEffect(() => {
    if (q && Array.isArray(results) && results.length > 0) {
      search(q, type, limit, providerCount, true);
    }
  }, [sortOption]); // Re-search when sort changes

  // Initialize state from URL on first mount
  useEffect(() => {
    const qp = params?.get('q') || '';
    const tp = (params?.get('type') as string) || 'all';
    const lm = parseInt(params?.get('limit') || '30', 10) || 30;
    const pc = parseInt(params?.get('providerCount') || '30', 10) || 30;
    if (qp) {
      setQ(qp);
      setType(tp);
      setLimit(lm);
      setProviderCount(pc);
      // Kick off initial search
      search(qp, tp, lm, pc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modalRef = useRef<HTMLDivElement | null>(null);

  // Focus trap for summary modal when open
  useEffect(() => {
    if (!summaryModal.open) return;
    const panel = modalRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          (last || first).focus();
        }
      } else {
        if (!active || active === last) {
          e.preventDefault();
          (first || last).focus();
        }
      }
    };
    panel.addEventListener('keydown', onKeyDown);
    // initial focus to the first focusable (close button should be first)
    first?.focus();
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [summaryModal.open]);

  // Focus trap for graph modal when open
  useEffect(() => {
    if (!isGraphModalOpen) return;
    const panel = graphModalRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          (last || first).focus();
        }
      } else {
        if (!active || active === last) {
          e.preventDefault();
          (first || last).focus();
        }
      }
    };
    panel.addEventListener('keydown', onKeyDown);
    first?.focus();
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [isGraphModalOpen]);

  return (
  <div className="min-h-screen flex flex-col overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <Header />
      <section
        id="open-resources"
        className="py-6 sm:py-10 bg-zinc-950 text-white relative"
      >
        {/* Soft spot background */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-radial from-emerald-400/10 to-transparent blur-2xl pointer-events-none" />
        <Container>
          <div className="text-center mb-6 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-3 sm:mb-4 text-center uppercase">
              Open Resources
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-xl text-teal-100/90 max-w-2xl mx-auto font-medium">
              Freely accessible, reusable, and modifiable assets to power your next big idea.
            </p>
          </div>

          {/* --- Neon Search Bar + Federated Results --- */}
          <div className="flex flex-col items-center mb-10 w-full">
            <div className="w-full max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-4" role="tablist" aria-label="Resource type">
                {TABS.map(tab => (
                  <button
                    key={tab.value}
                    className="px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-300/90 hover:bg-emerald-500/10 active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    role="tab"
                    aria-selected={type === tab.value}
                    data-active={type === tab.value}
                    style={type === tab.value ? { background: 'rgba(16, 185, 129, 0.12)' } : {}}
                    onClick={() => {
                      setType(tab.value);
                      setNextCursor(null);
                      search(q, tab.value);
                    }}
                    disabled={loading}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-3 w-full">
                <input
                  id="query"
                  className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 placeholder-white/40 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  placeholder="Search papers, datasets, code, models, videos..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                />
                <button className="h-11 rounded-lg bg-emerald-500 text-black font-medium px-4 sm:px-5 disabled:opacity-50 w-full sm:w-auto" onClick={() => search()} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              {/* Sorting Options and Limit Selector */}
              {q && (
                <div className="flex justify-between items-center mt-4 flex-wrap gap-4">
                  <SortOptions
                    currentSort={sortOption}
                    onSortChange={(newSort) => {
                      setSortOption(newSort);
                      if (q) search(q, type, limit, providerCount, true);
                    }}
                    disabled={loading || !Array.isArray(results) || !results.length}
                  />
                  <LimitSelector
                    value={limit}
                    onChange={(newLimit) => {
                      setLimit(newLimit);
                      if (q) search(q, type, newLimit, providerCount, true);
                    }}
                  />
                  <ProviderCountSelector
                    value={providerCount}
                    onChange={(newProviderCount) => {
                      setProviderCount(newProviderCount);
                      if (q) search(q, type, limit, newProviderCount, true);
                    }}
                  />
                </div>
              )}
              {/* Page size selector removed per request */}
            </div>
            {/* Federated search results */}
            {(q || loading) && (
              <div className="w-full max-w-2xl mt-8" aria-busy={loading}>
                {coverage && (
                  <div className="mb-4 text-xs text-cyan-200 flex flex-wrap gap-3">
                    <span className="font-bold text-cyan-300">Provider counts:</span>
                    {Object.entries(coverage.receivedCounts || {}).map(([provider, count]) => (
                      <span key={String(provider)} className="bg-cyan-900/40 px-2 py-1 rounded border border-cyan-800 text-cyan-100">{PROVIDER_LABELS[String(provider)] || String(provider)}: {Number(count)}</span>
                    ))}
                  </div>
                )}
                {error && <div className="text-red-500 mb-4">{error}</div>}
                {!loading && Array.isArray(results) && results.length > 0 && (
                  <div className="mb-6 flex flex-col items-center space-y-4">
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => setIsGraphModalOpen(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      >
                        Show Knowledge Graph
                      </button>
                      <button
                        onClick={() => {
                          setAiGenerationMode(!aiGenerationMode);
                          setSelectedResources([]);
                        }}
                        className={`px-4 py-2 rounded-lg transition font-semibold ${
                          aiGenerationMode 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        🚀 AI Generation Mode {aiGenerationMode ? '(ON)' : '(OFF)'}
                      </button>
                    </div>
                    {aiGenerationMode && (
                      <div className="flex flex-col items-center space-y-3 p-4 bg-gray-800/50 rounded-lg border border-purple-500/30">
                        <p className="text-sm text-cyan-200 text-center">
                          Select resources below, then generate complete applications from them
                        </p>
                        <GenerateButtonWithAuth resources={selectedResources} />
                        <p className="text-xs text-gray-400 text-center">
                          Selected: {selectedResources.length} resources
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {!loading && Array.isArray(results) && results.length === 0 && (
                  <div className="text-gray-400 text-lg text-center">
                    No results.
                  </div>
                )}
                <div className="space-y-4 sm:space-y-6">
                  {Array.isArray(results) && results.map((r, i) => {
                      const resKey = String(r.id || r.url || i);
                      return (
                        <div key={r.id || i} className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 relative">
                          {aiGenerationMode && (
                            <div className="flex items-start pt-1">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                                checked={selectedResources.some(selected => selected.id === r.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedResources(prev => [...prev, r]);
                                  } else {
                                    setSelectedResources(prev => prev.filter(selected => selected.id !== r.id));
                                  }
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-1 rounded bg-gray-800/80 font-mono text-gray-100 border border-gray-700">{PROVIDER_LABELS[r.source] || r.source}</span>
                              {r.type && (
                                <span className={`text-xs px-2 py-1 rounded font-bold border ${
                                  r.type === 'paper' ? 'bg-blue-900/30 text-blue-200 border-blue-800' :
                                  r.type === 'dataset' ? 'bg-yellow-900/30 text-yellow-200 border-yellow-800' :
                                  r.type === 'code' ? 'bg-purple-900/30 text-purple-200 border-purple-800' :
                                  r.type === 'model' ? 'bg-pink-900/30 text-pink-200 border-pink-800' :
                                  r.type === 'video' ? 'bg-red-900/30 text-red-200 border-red-800' :
                                  r.type === 'hardware' ? 'bg-green-900/30 text-green-200 border-green-800' :
                                  'bg-gray-800/80 text-gray-200 border-gray-700'
                                }`}>
                                  {r.type === 'model' ? 'Model'
                                    : r.type === 'video' ? 'Video'
                                    : r.type === 'hardware' ? 'Hardware'
                                    : r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                                </span>
                              )}
                              {r.license && <span className="text-xs px-2 py-1 rounded bg-emerald-900/30 text-emerald-200 border border-emerald-800">{r.license}</span>}
                              <div className="ml-auto flex items-center gap-3 text-xs text-white/60 font-semibold">
                                {r.year && <span>{r.year}</span>}
                                {typeof r.score === 'number' && (
                                  <span className="text-emerald-400 font-mono">Score: {r.score.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-base sm:text-lg font-semibold text-white leading-snug mb-1">{r.title}</div>
                            {/* Special fields for model/hardware/video */}
                            {r.type === 'model' && r.meta?.pipeline && (
                              <div className="text-xs text-pink-200 font-mono mb-1">Pipeline: {r.meta.pipeline}</div>
                            )}
                            {r.type === 'hardware' && r.meta?.cert_id && (
                              <div className="text-xs text-green-200 font-mono mb-1">Cert ID: {r.meta.cert_id}</div>
                            )}
                            {r.type === 'video' && (r.meta?.duration || r.meta?.channel) && (
                              <div className="text-xs text-red-200 font-mono mb-1">
                                {r.meta?.duration && <>Duration: {r.meta.duration} </>}
                                {r.meta?.channel && <>Channel: {r.meta.channel}</>}
                              </div>
                            )}
                            <div className="text-xs sm:text-sm text-white/60 font-medium mb-1">{r.authors?.join(', ')}</div>
                            {r.tags && r.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {r.tags.map((tag: string, idx: number) => (
                                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-200 border border-cyan-800">{tag}</span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs sm:text-sm text-white/60 line-clamp-2 mb-2">{cleanDescription(r.description)}</div>
                            <div className="flex gap-2 mt-2">
                              {r.url ? (
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-emerald-700 transition inline-flex items-center gap-1.5"
                                >
                                  <span>Open</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-90" aria-hidden="true" focusable="false">
                                    <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69l-6.72 6.72a.75.75 0 1 0 1.06 1.06l6.72-6.72V7.5a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 17.75 2h-5.25z" />
                                    <path d="M6.25 4A2.25 2.25 0 0 0 4 6.25v7.5A2.25 2.25 0 0 0 6.25 16h7.5A2.25 2.25 0 0 0 16 13.75V10a.75.75 0 0 0-1.5 0v3.75c0 .414-.336.75-.75.75h-7.5a.75.75 0 0 1-.75-.75v-7.5c0-.414.336-.75.75-.75H10a.75.75 0 0 0 0-1.5H6.25z" />
                                  </svg>
                                </a>
                              ) : (
                                <button className="px-4 py-1.5 bg-gray-800/60 rounded-lg text-xs text-gray-300 font-semibold cursor-not-allowed" title="No link available" disabled>Open</button>
                              )}
                              <button
                                className="px-4 py-1.5 bg-purple-600/80 hover:bg-purple-600 rounded-lg text-xs text-white font-semibold disabled:opacity-60"
                                disabled={authLoading}
                                onClick={() => handleSaveClick(r)}
                              >
                                Save
                              </button>
                              {r.type === 'paper' ? (
                                <button
                                  className="px-4 py-1.5 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-xs text-white font-semibold disabled:opacity-60"
                                  disabled={summarizingId === resKey}
                                  onClick={async () => {
                                    setToast(null);
                                    setSummarizingId(resKey);
                                    const mode = (r.source === 'arxiv' || r.source === 'openalex' || r.source === 'zenodo') ? 'deep' : 'quick';
                                    try {
                                      // Stream via SSE (GET)
                                      const usp = new URLSearchParams({
                                        id: String(r.id || ''),
                                        source: String(r.source || ''),
                                        title: String(r.title || ''),
                                        abstract: String(r.description || ''),
                                        url: String(r.url || ''),
                                        mode,
                                      });
                                      const es = new EventSource(`/api/summarize?${usp.toString()}`);
                                      const state: any = { tldr: '', bullets: [] as string[], tags: [] as string[], modeUsed: mode, fromCache: false, cache: 'none' };
                                      es.addEventListener('meta', (ev: MessageEvent) => {
                                        try {
                                          const m = JSON.parse(ev.data);
                                          state.modeUsed = m.modeUsed || m.modeRequested || state.modeUsed;
                                          state.fromCache = Boolean(m.fromCache);
                                          state.cache = (m.cache || 'none');
                                          setSummaryModal({ open: true, key: resKey, data: { ...state } });
                                        } catch {}
                                      });
                                      es.addEventListener('tldr', (ev: MessageEvent) => {
                                        state.tldr = sanitizeText(ev.data);
                                        setSummaryModal(prev => prev.open && prev.key === resKey ? { ...prev, data: { ...state } } : prev);
                                      });
                                      es.addEventListener('bullets', (ev: MessageEvent) => {
                                        try {
                                          const arr = JSON.parse(ev.data);
                                          state.bullets = Array.isArray(arr) ? arr.map((x: string) => sanitizeText(x)) : [];
                                          setSummaryModal(prev => prev.open && prev.key === resKey ? { ...prev, data: { ...state } } : prev);
                                        } catch {}
                                      });
                                      es.addEventListener('tags', (ev: MessageEvent) => {
                                        try {
                                          const arr = JSON.parse(ev.data);
                                          state.tags = Array.isArray(arr) ? arr.map((x: string) => sanitizeText(x)) : [];
                                          setSummaryModal(prev => prev.open && prev.key === resKey ? { ...prev, data: { ...state } } : prev);
                                        } catch {}
                                      });
                                      es.addEventListener('error', (ev: MessageEvent) => {
                                        try {
                                          const d = JSON.parse(ev.data);
                                          setToast({ type: 'error', message: d.message || 'Summarization failed' });
                                        } catch {
                                          setToast({ type: 'error', message: 'Summarization failed' });
                                        }
                                        es.close();
                                        setSummarizingId(null);
                                      });
                                      es.addEventListener('done', () => {
                                        es.close();
                                        setSummaries(prev => ({ ...prev, [resKey]: { ...state } }));
                                        setSummarizingId(null);
                                      });
                                    } catch (e: any) {
                                      setToast({ type: 'error', message: e?.message || 'Summarization failed' });
                                      setSummarizingId(null);
                                    }
                                  }}
                                >
                                  {summarizingId === resKey ? 'Summarizing…' : 'Summarize'}
                                </button>
                              ) : null}
                            </div>
                            {summaries[resKey] && (
                              <div className="mt-3 rounded-lg glass-card glass-border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-sm font-semibold text-emerald-300">Summary</div>
                                  <span className={`text-[10px] px-2 py-0.5 rounded border ${summaries[resKey].modeUsed === 'deep' ? 'bg-blue-900/30 text-blue-200 border-blue-800' : 'bg-gray-800/60 text-gray-200 border-gray-700'}`}>{summaries[resKey].modeUsed === 'deep' ? 'Deep summary' : 'Quick summary'}</span>
                                  {summaries[resKey].fromCache && (
                                    <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-900/30 text-emerald-200 border-emerald-800">Cached: {summaries[resKey].cache}</span>
                                  )}
                                </div>
                                <div className="text-sm text-white/80 mb-2">{sanitizeText(summaries[resKey].tldr)}</div>
                                {Array.isArray(summaries[resKey].bullets) && (
                                  <ul className="list-disc pl-5 text-xs text-white/70 space-y-1">
                                    {summaries[resKey].bullets.map((b: string, idx: number) => (
                                      <li key={idx}>{sanitizeText(b)}</li>
                                    ))}
                                  </ul>
                                )}
                                {Array.isArray(summaries[resKey].tags) && summaries[resKey].tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {summaries[resKey].tags.map((t: string, idx: number) => (
                                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-200 border border-cyan-800">{sanitizeText(t)}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Score moved to header row to prevent overlap with year */}
                          </div>
                        </div>
                      );
                    })}
                    {/* Skeletons while loading */}
                    {loading && (
                      <>
                        {Array.from({ length: Math.min(3, Math.max(1, Math.ceil(limit / 10))) }).map((_, idx) => (
                          <SearchResultSkeleton key={`skeleton-${idx}`} />
                        ))}
                      </>
                    )}
                  </div>
                {/* Load more controls */}
                {q && total > 0 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-8">
                    <button
                      className="px-3 py-1 rounded bg-emerald-600 text-black disabled:opacity-50"
                      onClick={loadMore}
                      disabled={!nextCursor || loading}
                      title="Append more results using cursor"
                    >
                      {loading ? 'Loading…' : 'Load more'}
                    </button>
                    {/* Range indicator now based on accumulated results */}
                    <span className="text-xs text-cyan-300 font-medium" aria-live="polite" aria-atomic="true">
                      {`Showing 1–${Math.min(total, Array.isArray(results) ? results.length : 0).toLocaleString()} of ${total.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* --- End Neon Search Bar + Federated Results --- */}

          {/* Toasts */}
          {toast && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg border ${toast.type === 'error' ? 'bg-red-900/60 border-red-700 text-red-100' : 'bg-cyan-900/60 border-cyan-700 text-cyan-100'}`} role="status" aria-live="polite">
              {toast.message}
            </div>
          )}

          {/* Glassy summary modal */}
          {summaryModal.open && summaryModal.data && (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              onKeyDown={(e) => { if (e.key === 'Escape') setSummaryModal({ open: false, key: null, data: {} }); }}
              tabIndex={-1}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSummaryModal({ open: false, key: null, data: {} })} />
              <div ref={modalRef} className="relative z-10 w-full max-w-3xl rounded-2xl glass-strong glass-border max-h-[90vh] flex flex-col" aria-labelledby="summary-modal-title">
                {/* Top-right close button */}
                <button
                  aria-label="Close"
                  className="absolute top-2 right-2 p-2 rounded-md bg-white/10 hover:bg-white/15 text-white"
                  onClick={() => setSummaryModal({ open: false, key: null, data: {} })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {/* Header (static) */}
                <div className="p-5 sm:p-6 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 id="summary-modal-title" className="text-lg font-semibold text-white">Summary</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${summaryModal.data.modeUsed === 'deep' ? 'bg-blue-900/30 text-blue-200 border-blue-800' : 'bg-gray-800/60 text-gray-200 border-gray-700'}`}>{summaryModal.data.modeUsed === 'deep' ? 'Deep summary' : 'Quick summary'}</span>
                    {summaryModal.data.fromCache && (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-900/30 text-emerald-200 border-emerald-800">Cached: {summaryModal.data.cache}</span>
                    )}
                  </div>
                </div>
                {/* Scrollable body */}
                <div id="summary-modal-printable" className="px-5 sm:px-6 py-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                  {summaryModal.data.tldr ? (
                    <p className="text-white/90 text-sm mb-3 leading-relaxed">{sanitizeText(summaryModal.data.tldr)}</p>
                  ) : (
                    <p className="text-white/60 text-sm mb-3 leading-relaxed">Preparing summary…</p>
                  )}
                  {Array.isArray(summaryModal.data.bullets) && summaryModal.data.bullets.length > 0 && (
                    <ul className="list-disc pl-5 text-xs text-white/80 space-y-1 leading-relaxed">
                      {summaryModal.data.bullets.map((b, i) => (
                        <li key={i}>{sanitizeText(b)}</li>
                      ))}
                    </ul>
                  )}
                  {Array.isArray(summaryModal.data.tags) && summaryModal.data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {summaryModal.data.tags.map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-200 border border-cyan-800">{sanitizeText(t)}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Footer (static) */}
                <div className="flex items-center justify-between gap-2 p-3 border-t border-white/10 bg-black/20">
                  <div className="text-[11px] text-white/50">
                    Tip: Copy or print the summary for later.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15"
                      onClick={async () => {
                        try {
                          const textParts: string[] = [];
                          if (summaryModal.data?.tldr) textParts.push(sanitizeText(summaryModal.data.tldr));
                          if (Array.isArray(summaryModal.data?.bullets) && summaryModal.data!.bullets!.length) {
                            textParts.push('\n' + summaryModal.data!.bullets!.map(b => `• ${sanitizeText(b)}`).join('\n'));
                          }
                          if (Array.isArray(summaryModal.data?.tags) && summaryModal.data!.tags!.length) {
                            textParts.push('\nTags: ' + summaryModal.data!.tags!.map(t => sanitizeText(t)).join(', '));
                          }
                          const toCopy = textParts.join('\n\n').trim();
                          await navigator.clipboard.writeText(toCopy || '');
                          setToast({ type: 'info', message: 'Summary copied to clipboard' });
                        } catch (e) {
                          setToast({ type: 'error', message: 'Copy failed' });
                        }
                      }}
                    >
                      Copy summary
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15"
                      onClick={() => {
                        try {
                          window.print();
                        } catch {}
                      }}
                    >
                      Print
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15" onClick={() => setSummaryModal({ open: false, key: null, data: {} })}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Original Resource Cards --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-10">
            {/* Card 1 */}
            <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3">
              <i className="fas fa-code text-2xl sm:text-3xl text-cyan-400 mt-1"></i>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Source Software</h3>
                <p className="text-xs sm:text-sm text-white/60">GitHub, GitLab, SourceForge, PyPI, npm, Maven — reusable code for every stack.</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3">
              <i className="fas fa-database text-2xl sm:text-3xl text-emerald-400 mt-1"></i>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Data</h3>
                <p className="text-xs sm:text-sm text-white/60">Portals like data.gov, EU Open Data, Kaggle Datasets — structured data for insights and analysis.</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3">
              <i className="fas fa-book text-2xl sm:text-3xl text-purple-300 mt-1"></i>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Access Research</h3>
                <p className="text-xs sm:text-sm text-white/60">Access papers on arXiv, PubMed Central, DOAJ — cutting-edge science at your fingertips.</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3">
              <i className="fas fa-graduation-cap text-2xl sm:text-3xl text-yellow-300 mt-1"></i>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Educational Resources</h3>
                <p className="text-xs sm:text-sm text-white/60">MIT OCW, OpenStax, Wikibooks — free courses and textbooks for lifelong learners.</p>
              </div>
            </div>
            {/* Card 5 */}
            <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3">
              <i className="fas fa-microchip text-2xl sm:text-3xl text-pink-300 mt-1"></i>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Hardware</h3>
                <p className="text-xs sm:text-sm text-white/60">Arduino, Hackaday, OpenCompute — open designs and 3D models for hardware projects.</p>
              </div>
            </div>
            {/* Card 6 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 flex items-start gap-3">
              <i className="fas fa-brain text-2xl sm:text-3xl text-indigo-300 mt-1"></i>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">AI Models & APIs</h3>
                <p className="text-xs sm:text-sm text-white/60">Hugging Face, TensorFlow Hub, OpenAI code samples — models and tools to build intelligent apps.</p>
              </div>
            </div>
          </div>
          {/* --- End Original Resource Cards --- */}
        </Container>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Knowledge Graph Modal */}
      {isGraphModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsGraphModalOpen(false)}>
          <div 
            className="bg-transparent w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <KnowledgeGraph 
              resources={getFilteredResources()} 
              onSelect={(id, type) => console.log(`Selected ${type}: ${id}`)} 
              onSave={handleSaveClick}
              onClose={() => setIsGraphModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Save to Workspace Modal */}
      {showSaveModal && resourceToSave && (
        <SaveToWorkspace
          result={{
            title: resourceToSave.title || '',
            url: resourceToSave.url || '',
            type: resourceToSave.type,
            tags: resourceToSave.tags,
            description: resourceToSave.description,
            authors: resourceToSave.authors,
            year: resourceToSave.year,
            source: resourceToSave.source,
          }}
          onSaved={handleSaveModalClose}
        />
      )}

      <Footer />
    </div>
  );
}
