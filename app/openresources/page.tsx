"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';
import { Container } from '../components/ui/Container';
import AuthModal from '../components/AuthModal';
import SaveToWorkspace from '../components/workspace/SaveToWorkspace';
import OpenResourcesChat from '../components/OpenResourcesChat';
import { useAuth } from '@/lib/auth/client';

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Papers', value: 'paper' },
  { label: 'Datasets', value: 'dataset' },
  { label: 'Code', value: 'code' },
  { label: 'Models', value: 'model' },
  { label: 'Hardware', value: 'hardware' },
  { label: 'Videos', value: 'video' },
];

export default function OpenResourcesPageWrapper() {
  // Wrap the client-side search params consumer in Suspense per Next.js guidance
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-cyan-200">Loading search…</div>
        </main>
      </div>
    }>
      <OpenResourcesPage />
    </Suspense>
  );
}

function OpenResourcesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  // Query we actually ran search for (used for chat/session). Only set on Enter, Search click, or URL load.
  const [committedQuery, setCommittedQuery] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverage, setCoverage] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(30);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const activeAbort = useRef<AbortController | null>(null);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'error'|'info'; message: string } | null>(null);
  /** General summary about the *resources* (not topic), in 3 levels so users can understand the subject at basic / college / expert. */
  const [generalSummary, setGeneralSummary] = useState<{ basic: string; intermediate: string; expert: string } | null>(null);
  const [generalSummaryLevel, setGeneralSummaryLevel] = useState<'basic' | 'intermediate' | 'expert'>('basic');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generalSummaryModal, setGeneralSummaryModal] = useState(false);
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

  // Chat sidebar collapse state
  const [chatCollapsed, setChatCollapsed] = useState(false);
  // Chat search results state
  const [chatSearchActive, setChatSearchActive] = useState(false);
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [chatSearchFilter, setChatSearchFilter] = useState('all');
  // Tab state for resource cards
  const [activeCardTabs, setActiveCardTabs] = useState<Record<string, 'overview' | 'qa' | 'mindmap'>>({});
  // Inline Q&A per card: input text, loading, and list of { q, a } pairs
  const [cardQaInput, setCardQaInput] = useState<Record<string, string>>({});
  const [cardQaLoading, setCardQaLoading] = useState<Record<string, boolean>>({});
  const [cardQaPairs, setCardQaPairs] = useState<Record<string, Array<{ q: string; a: string }>>>({});

  // Authentication and modal state
  const { user, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [resourceToSave, setResourceToSave] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Handle save button click
  const handleSaveClick = (resource: any) => {
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
  const modalRef = useRef<HTMLDivElement | null>(null);

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

  function updateURL(nextQ: string, nextType: string, nextLimit: number) {
    const sp = new URLSearchParams();
    if (nextQ) sp.set('q', nextQ);
    if (nextType && nextType !== 'all') sp.set('type', nextType);
    if (nextLimit && nextLimit !== 30) sp.set('limit', String(nextLimit));
    const qs = sp.toString();
    // Use replace to avoid stacking history on every pagination
    router.replace(`/openresources${qs ? `?${qs}` : ''}` as any, { scroll: false } as any);
  }

  // Format a single resource for the chat API (same shape as OpenResourcesChat)
  function formatResourceForChat(r: any) {
    return {
      title: r.title || r.name || 'Untitled',
      type: r.type || 'unknown',
      source: r.source || 'unknown',
      description: r.description || r.summary || '',
      authors: Array.isArray(r.authors) ? r.authors : (r.author ? [r.author] : []),
      tags: Array.isArray(r.tags) ? r.tags : [],
      url: r.url || r.link || '',
      year: r.year || null,
      license: r.license || null,
    };
  }

  async function handleCardAsk(resource: any, resKey: string) {
    const question = (cardQaInput[resKey] || '').trim();
    if (!question) return;
    setCardQaLoading((prev) => ({ ...prev, [resKey]: true }));
    try {
      const detailedResult = [formatResourceForChat(resource)];
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          context: {
            searchQuery: resource.title || 'This resource',
            resultsCount: 1,
            results: detailedResult,
            hasContext: true,
          },
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      const answer = data.response || 'No response received.';
      setCardQaPairs((prev) => ({
        ...prev,
        [resKey]: [...(prev[resKey] || []), { q: question, a: answer }],
      }));
      setCardQaInput((prev) => ({ ...prev, [resKey]: '' }));
    } catch (e: any) {
      setCardQaPairs((prev) => ({
        ...prev,
        [resKey]: [...(prev[resKey] || []), { q: question, a: `Error: ${e?.message || 'Failed to get answer.'}` }],
      }));
      setCardQaInput((prev) => ({ ...prev, [resKey]: '' }));
    } finally {
      setCardQaLoading((prev) => ({ ...prev, [resKey]: false }));
    }
  }

  function sanitizeText(s: any) {
    return cleanDescription(typeof s === 'string' ? s : '');
  }

  /** Build mind map data for any resource: code repo, paper, dataset, model, video, hardware. */
  function getMindMapData(r: any): { centerLabel: string; innerNodes: string[]; outerNodes: string[] } {
    const centerLabel = (r.title || 'Resource').substring(0, 14);
    const inner: string[] = [];
    const outer: string[] = [];

    // Inner ring: type, source, year, license + type-specific meta
    if (r.type) inner.push(r.type === 'model' ? 'Model' : r.type === 'video' ? 'Video' : r.type === 'hardware' ? 'Hardware' : (r.type as string).charAt(0).toUpperCase() + (r.type as string).slice(1));
    if (r.source) inner.push(PROVIDER_LABELS[r.source] || String(r.source));
    if (r.year) inner.push(String(r.year));
    if (r.license) inner.push(String(r.license).substring(0, 10));
    if (r.meta && typeof r.meta === 'object') {
      if (r.type === 'code' && (r.meta.language || r.meta.languages)) {
        const lang = r.meta.language ?? (Array.isArray(r.meta.languages) ? r.meta.languages[0] : r.meta.languages);
        if (lang) inner.push(String(lang).substring(0, 10));
      }
      if (r.type === 'model' && r.meta.pipeline) inner.push(String(r.meta.pipeline).substring(0, 12));
      if (r.type === 'video' && (r.meta.duration || r.meta.channel)) inner.push(r.meta.duration ? String(r.meta.duration) : String(r.meta.channel).substring(0, 10));
      if (r.type === 'hardware' && r.meta.cert_id) inner.push(`Cert ${String(r.meta.cert_id).substring(0, 6)}`);
    }

    // Outer ring: topics (tags) and people (authors)
    if (r.tags && r.tags.length) outer.push(...r.tags.slice(0, 4).map((t: string) => String(t).substring(0, 10)));
    if (r.authors && r.authors.length) {
      r.authors.slice(0, 2).forEach((a: string) => {
        const s = String(a);
        outer.push(s.length > 12 ? s.substring(0, 10) + '…' : s);
      });
    }

    return { centerLabel, innerNodes: inner, outerNodes: outer };
  }

  async function search(
    customQ = q,
    customType = type,
    customLimit = limit
  ) {
    if (!customQ) return; // Prevent search if query is empty
    setCommittedQuery(customQ); // So chat/session use the query we actually searched for, not per-keystroke input
    // Abort any in-flight request
    if (activeAbort.current) {
      activeAbort.current.abort();
    }
    const controller = new AbortController();
    activeAbort.current = controller;
    setLoading(true); setError('');
    setGeneralSummary(null); // Clear previous summary
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(customQ)}&type=${customType}&limit=${customLimit}` , { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const searchResults = Array.isArray(data.results) ? data.results : [];
      setResults(searchResults);
      setCoverage(data.coverage || null);
      setTotal(data.total || 0);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      // Sync URL
      updateURL(customQ, customType, customLimit);
      
      // Generate summary if we have results
      if (searchResults.length > 0 && customQ) {
        generateSearchSummary(customQ, searchResults);
      }
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

  // Generate resource summary (what these resources are and how they help) at 3 understanding levels: basic, intermediate, expert
  async function generateSearchSummary(query: string, searchResults: any[]) {
    setSummaryLoading(true);
    try {
      const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('ai_api_key') : null;
      const userModel = typeof window !== 'undefined' ? localStorage.getItem('ai_model') : null;
      const userProvider = typeof window !== 'undefined' ? localStorage.getItem('ai_provider') : null;

      const resourceOverview = searchResults.slice(0, 15).map((r, idx) => ({
        title: r.title || 'Untitled',
        type: r.type || 'unknown',
        description: (r.description || r.summary || '').substring(0, 200),
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are summarizing the RESOURCES (not the topic) so the user can understand what these resources are and how they help—especially when the topic is unfamiliar.

Return a valid JSON object with exactly these three keys (each value is a string, 2–4 sentences):

- "basic": Explain what these resources are and what they help you do, in the simplest terms—so a 5-year-old could get the idea. No jargon. Focus on: what you can do with these resources.
- "intermediate": College-level explanation of what kinds of resources are available (papers, code, datasets, etc.), what they cover, and how someone could use them to learn or build.
- "expert": Concise expert-level summary: resource landscape, types, quality signals, and how to leverage them. Technical but brief.

Output ONLY the JSON object, no markdown code fence, no extra text. Example shape: {"basic":"...","intermediate":"...","expert":"..."}`,
          apiKey: userApiKey,
          model: userModel || 'deepseek/deepseek-chat-v3-0324',
          provider: userProvider || 'openrouter',
          context: {
            searchQuery: query,
            resultsCount: searchResults.length,
            results: resourceOverview,
            hasContext: true,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const raw = (data.response || '').trim();
        try {
          // Strip optional markdown code block if present
          const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          const parsed = JSON.parse(jsonStr) as { basic?: string; intermediate?: string; expert?: string };
          const basic = typeof parsed.basic === 'string' ? parsed.basic : '';
          const intermediate = typeof parsed.intermediate === 'string' ? parsed.intermediate : '';
          const expert = typeof parsed.expert === 'string' ? parsed.expert : '';
          if (basic || intermediate || expert) {
            setGeneralSummary({
              basic: basic || '—',
              intermediate: intermediate || '—',
              expert: expert || '—',
            });
            return;
          }
        } catch (_) {
          // Fall through to use fallback
        }
      }

      // Fallback: build 3-level summary from result types
      const types = [...new Set(searchResults.map(r => r.type).filter(Boolean))];
      const typeLabels = types.map(t => {
        const labels: Record<string, string> = {
          paper: 'research papers',
          dataset: 'datasets',
          code: 'code repositories',
          model: 'AI models',
          video: 'videos',
          hardware: 'hardware designs',
        };
        return labels[t] || t;
      });
      const joinTypes = typeLabels.slice(0, 3).join(', ') + (types.length > 3 ? ', and more' : '');
      setGeneralSummary({
        basic: `These ${searchResults.length} resources help you learn and use things about "${query}". You can find stuff to read, try, and build with.`,
        intermediate: `Found ${searchResults.length} open resources about "${query}": ${joinTypes}. They cover research, tools, data, and learning materials you can use for projects or study.`,
        expert: `${searchResults.length} resources (${joinTypes}) for "${query}". Mix of papers, code, datasets, and tools; explore by type and relevance for implementation or research.`,
      });
    } catch (error) {
      console.error('Summary generation error:', error);
      const types = [...new Set(searchResults.map(r => r.type).filter(Boolean))];
      const typeLabels = types.map(t => {
        const labels: Record<string, string> = {
          paper: 'research papers',
          dataset: 'datasets',
          code: 'code repositories',
          model: 'AI models',
          video: 'videos',
          hardware: 'hardware designs',
        };
        return labels[t] || t;
      });
      const joinTypes = typeLabels.slice(0, 3).join(', ') + (types.length > 3 ? ', and more' : '');
      setGeneralSummary({
        basic: `These resources are about "${query}". You can use them to learn and try things.`,
        intermediate: `Found ${searchResults.length} resources: ${joinTypes} for "${query}".`,
        expert: `${searchResults.length} resources (${joinTypes}) for "${query}".`,
      });
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    // Cancel any in-flight
    if (activeAbort.current) activeAbort.current.abort();
    const controller = new AbortController();
    activeAbort.current = controller;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/search?cursor=${encodeURIComponent(nextCursor)}`, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error('Load more failed');
      const data = await res.json();
      const newItems = Array.isArray(data.results) ? data.results : [];
      setResults(prev => [...prev, ...newItems]);
      setTotal(data.total || total);
      setNextCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      // Do not update URL during load more to avoid scrolling to top
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e.message || 'Load more failed');
    } finally {
      setLoading(false);
      if (activeAbort.current === controller) activeAbort.current = null;
    }
  }

  // Initialize state from URL on first mount
  useEffect(() => {
    const qp = params?.get('q') || '';
    const tp = (params?.get('type') as string) || 'all';
    const lm = parseInt(params?.get('limit') || '30', 10) || 30;
    if (qp) {
      setQ(qp);
      setType(tp);
      setLimit(lm);
      setCommittedQuery(qp);
      // Kick off initial search
      search(qp, tp, lm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow">
        <section
          id="open-resources"
          className="text-white relative min-h-[calc(100vh-56px)] overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]"
        >
          {/* Globe background image */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row h-auto md:h-[calc(100vh-80px)] min-h-[calc(100vh-80px)]">
            {/* Floating Chat Toggle Button - Shows when collapsed */}
            {chatCollapsed && (
              <button
                onClick={() => setChatCollapsed(false)}
                className="fixed left-2 md:left-4 bottom-4 md:top-1/2 md:-translate-y-1/2 z-30 w-12 h-12 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-gray-900 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
                aria-label="Open chat"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {/* Chat Sidebar - Always mounted so session is preserved when closed (like ChatGPT) */}
            <div
              className={`flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-white/10 ${
                chatCollapsed
                  ? 'w-0 max-w-0 min-w-0 opacity-0 pointer-events-none md:h-full'
                  : 'w-full md:w-[40%] h-[50vh] md:h-full'
              }`}
            >
              <OpenResourcesChat
                searchResults={results}
                searchQuery={committedQuery}
                isCollapsed={chatCollapsed}
                onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
                onSwitchSession={(query: string) => {
                  setQ(query);
                  search(query, type, limit);
                }}
                onFilterResources={(filters) => {
                  let filtered = [...results];
                  if (filters.type) filtered = filtered.filter(r => r.type === filters.type);
                  if (filters.year) filtered = filtered.filter(r => r.year && r.year >= filters.year!);
                  if (filters.license) filtered = filtered.filter(r => r.license && r.license.toLowerCase().includes('open'));
                  if (filters.source) filtered = filtered.filter(r => r.source === filters.source);
                  setResults(filtered);
                  setTotal(filtered.length);
                }}
                onChatSearch={async (query: string) => {
                  setChatSearchActive(true);
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all&limit=20`, { cache: 'no-store' });
                    if (!res.ok) throw new Error('Search failed');
                    const data = await res.json();
                    const searchResults = Array.isArray(data.results) ? data.results : [];
                    setChatSearchResults(searchResults);
                    return searchResults;
                  } catch (e: any) {
                    setError(e.message || 'Search failed');
                    setChatSearchResults([]);
                    return [];
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </div>
            
            {/* Content - Right side (60%) */}
            <div className={`flex-1 flex flex-col px-2 sm:px-4 md:px-6 lg:px-8 transition-all duration-300 md:h-full md:overflow-y-auto hide-scrollbar ${chatCollapsed ? 'w-full' : 'w-full md:w-[60%]'}`}>
              {/* Chat Search Results - Horizontal Scrolling Cards */}
              {chatSearchActive && chatSearchResults.length > 0 && (
                <div className="pt-4 md:pt-6 pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6 px-2">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Search Results</h2>
                    <button
                      onClick={() => {
                        setChatSearchActive(false);
                        setChatSearchResults([]);
                        setChatSearchFilter('all');
                      }}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg text-xs md:text-sm text-white font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  
                  {/* Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-4 md:mb-6 px-2 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Resource type filter">
                    {TABS.map(tab => {
                      const filteredCount = chatSearchFilter === 'all' 
                        ? chatSearchResults.length 
                        : chatSearchResults.filter(r => r.type === tab.value).length;
                      
                      return (
                        <button
                          key={tab.value}
                          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 whitespace-nowrap ${
                            chatSearchFilter === tab.value
                              ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 text-emerald-300 shadow-lg shadow-emerald-500/20'
                              : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
                          }`}
                          role="tab"
                          aria-selected={chatSearchFilter === tab.value}
                          onClick={() => setChatSearchFilter(tab.value)}
                        >
                          {tab.label} {filteredCount > 0 && `(${filteredCount})`}
                        </button>
                      );
                    })}
                  </div>
                  
                  {chatSearchResults.filter(r => chatSearchFilter === 'all' || r.type === chatSearchFilter).length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
                        <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No {chatSearchFilter === 'all' ? '' : TABS.find(t => t.value === chatSearchFilter)?.label.toLowerCase() || ''} results found</h3>
                      <p className="text-white/60 max-w-md mx-auto">
                        Try selecting a different filter to see more results.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2 snap-x snap-mandatory scroll-smooth">
                      <div className="flex gap-3 md:gap-5 pb-4" style={{ width: 'max-content' }}>
                        {chatSearchResults
                          .filter(r => chatSearchFilter === 'all' || r.type === chatSearchFilter)
                          .map((r, i) => {
                        const resKey = String(r.id || r.url || i);
                        return (
                          <div id={`resource-card-${i}`} key={`resource-card-${i}`} className="flex-shrink-0 w-[85vw] sm:w-[400px] md:w-[500px] group rounded-xl glass-card glass-border p-4 sm:p-5 md:p-6 hover:border-emerald-400/30 transition-all duration-300 relative overflow-hidden snap-start">
                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-emerald-500/5 group-hover:via-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                            
                            <div className="relative flex-1 min-w-0">
                              {/* Header with badges */}
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-gray-800/80 to-gray-900/80 font-medium text-gray-200 border border-gray-700/50">
                                  {PROVIDER_LABELS[r.source] || r.source}
                                </span>
                                {r.type && (
                                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                                    r.type === 'paper' ? 'bg-blue-900/40 text-blue-200 border-blue-700/50' :
                                    r.type === 'dataset' ? 'bg-yellow-900/40 text-yellow-200 border-yellow-700/50' :
                                    r.type === 'code' ? 'bg-purple-900/40 text-purple-200 border-purple-700/50' :
                                    r.type === 'model' ? 'bg-pink-900/40 text-pink-200 border-pink-700/50' :
                                    r.type === 'video' ? 'bg-red-900/40 text-red-200 border-red-700/50' :
                                    r.type === 'hardware' ? 'bg-green-900/40 text-green-200 border-green-700/50' :
                                    'bg-gray-800/80 text-gray-200 border-gray-700'
                                  }`}>
                                    {r.type === 'model' ? 'Model'
                                      : r.type === 'video' ? 'Video'
                                      : r.type === 'hardware' ? 'Hardware'
                                      : r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                                  </span>
                                )}
                                {r.license && (
                                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-900/40 text-emerald-200 border border-emerald-700/50 font-medium">
                                    {r.license}
                                  </span>
                                )}
                                <div className="ml-auto flex items-center gap-3 text-xs text-white/50">
                                  {r.year && (
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {r.year}
                                    </span>
                                  )}
                                  {typeof r.score === 'number' && (
                                    <span className="flex items-center gap-1 text-emerald-300">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      {r.score.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Title */}
                              <h3 className="text-lg sm:text-xl font-bold text-white leading-tight mb-2 group-hover:text-emerald-300 transition-colors duration-200">
                                {r.title}
                              </h3>
                              
                              {/* Special metadata fields */}
                              {r.type === 'model' && r.meta?.pipeline && (
                                <div className="text-xs text-pink-200 font-mono mb-2 px-2 py-1 rounded bg-pink-900/20 border border-pink-800/30 inline-block">
                                  Pipeline: {r.meta.pipeline}
                                </div>
                              )}
                              {r.type === 'hardware' && r.meta?.cert_id && (
                                <div className="text-xs text-green-200 font-mono mb-2 px-2 py-1 rounded bg-green-900/20 border border-green-800/30 inline-block">
                                  Cert ID: {r.meta.cert_id}
                                </div>
                              )}
                              {r.type === 'video' && (r.meta?.duration || r.meta?.channel) && (
                                <div className="text-xs text-red-200 font-mono mb-2 px-2 py-1 rounded bg-red-900/20 border border-red-800/30 inline-block">
                                  {r.meta?.duration && <>Duration: {r.meta.duration} </>}
                                  {r.meta?.channel && <>Channel: {r.meta.channel}</>}
                                </div>
                              )}
                              
                              {/* Authors */}
                              {r.authors && r.authors.length > 0 && (
                                <div className="text-sm text-white/70 font-medium mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span>{r.authors.join(', ')}</span>
                                </div>
                              )}
                              
                              {/* Tags */}
                              {r.tags && r.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {r.tags.slice(0, 5).map((tag: string, idx: number) => (
                                    <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-cyan-900/30 text-cyan-200 border border-cyan-800/50 font-medium">
                                      {tag}
                                    </span>
                                  ))}
                                  {r.tags.length > 5 && (
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800/50 text-gray-400 border border-gray-700/50">
                                      +{r.tags.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Tabs */}
                              <div className="flex gap-2 mb-4 border-b border-white/10">
                                <button
                                  onClick={() => setActiveCardTabs(prev => ({ ...prev, [resKey]: 'overview' }))}
                                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                                    activeCardTabs[resKey] === 'overview' || !activeCardTabs[resKey]
                                      ? 'border-emerald-400 text-emerald-300'
                                      : 'border-transparent text-white/60 hover:text-white/80'
                                  }`}
                                >
                                  Overview
                                </button>
                                <button
                                  onClick={() => setActiveCardTabs(prev => ({ ...prev, [resKey]: 'qa' }))}
                                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                                    activeCardTabs[resKey] === 'qa'
                                      ? 'border-emerald-400 text-emerald-300'
                                      : 'border-transparent text-white/60 hover:text-white/80'
                                  }`}
                                >
                                  Q&A
                                </button>
                                <button
                                  onClick={() => setActiveCardTabs(prev => ({ ...prev, [resKey]: 'mindmap' }))}
                                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                                    activeCardTabs[resKey] === 'mindmap'
                                      ? 'border-emerald-400 text-emerald-300'
                                      : 'border-transparent text-white/60 hover:text-white/80'
                                  }`}
                                >
                                  Mind Map
                                </button>
                              </div>

                              {/* Tab Content */}
                              {(!activeCardTabs[resKey] || activeCardTabs[resKey] === 'overview') && (
                                <div className="mb-4">
                                  {/* Description */}
                                  <div className="text-sm text-white/70 line-clamp-4 mb-4 leading-relaxed">
                                    {sanitizeText(r.description)}
                                  </div>
                                </div>
                              )}

                              {activeCardTabs[resKey] === 'qa' && (
                                <div className="mb-4 min-h-[200px]">
                                  <div className="space-y-4">
                                    <div className="text-center py-2">
                                      <svg className="w-10 h-10 mx-auto mb-2 text-emerald-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <h4 className="text-white font-semibold mb-2 text-sm">Q&A</h4>
                                    </div>
                                    <div className="space-y-3">
                                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                        <div className="flex items-start gap-2">
                                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-emerald-400 text-xs font-bold">Q</span>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-white text-xs font-medium mb-1">What is this resource about?</p>
                                            <p className="text-white/70 text-xs leading-relaxed">{sanitizeText(r.description).substring(0, 120)}...</p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                        <div className="flex items-start gap-2">
                                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-cyan-400 text-xs font-bold">Q</span>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-white text-xs font-medium mb-1">How can I use this resource?</p>
                                            <p className="text-white/70 text-xs leading-relaxed">This resource can be used for research, development, or learning. Check the license for usage terms.</p>
                                          </div>
                                        </div>
                                      </div>
                                      {(cardQaPairs[resKey] || []).map((pair, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                          <div className="flex items-start gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                              <span className="text-emerald-400 text-xs font-bold">Q</span>
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-white text-xs font-medium mb-1">{pair.q}</p>
                                              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{pair.a}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          placeholder="Ask a question about this resource..."
                                          value={cardQaInput[resKey] || ''}
                                          onChange={(e) => setCardQaInput((prev) => ({ ...prev, [resKey]: e.target.value }))}
                                          onKeyDown={(e) => e.key === 'Enter' && handleCardAsk(r, resKey)}
                                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-white/40 focus:outline-none focus:border-emerald-500/50"
                                          disabled={cardQaLoading[resKey]}
                                        />
                                        <button
                                          onClick={() => handleCardAsk(r, resKey)}
                                          disabled={cardQaLoading[resKey] || !(cardQaInput[resKey] || '').trim()}
                                          className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                        >
                                          {cardQaLoading[resKey] ? '…' : 'Ask'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {activeCardTabs[resKey] === 'mindmap' && (() => {
                                const { centerLabel, innerNodes, outerNodes } = getMindMapData(r);
                                const R_INNER = 48;
                                const R_OUTER = 72;
                                const toXY = (angleDeg: number, radius: number) => {
                                  const rad = (angleDeg * Math.PI) / 180;
                                  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
                                };
                                const allInner = innerNodes.map((label, i) => ({ label, ...toXY((360 / Math.max(1, innerNodes.length)) * i, R_INNER), ring: 'inner' as const }));
                                const outerStart = outerNodes.length ? (360 / Math.max(1, innerNodes.length)) / 2 : 0;
                                const allOuter = outerNodes.map((label, i) => ({ label, ...toXY(outerStart + (360 / Math.max(1, outerNodes.length)) * i, R_OUTER), ring: 'outer' as const }));
                                const nodes = [...allInner, ...allOuter];
                                return (
                                  <div className="mb-4 min-h-[200px]">
                                    <div className="relative w-full h-[180px] bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 rounded-lg border border-emerald-500/20 p-4 overflow-hidden">
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <svg className="absolute w-full h-full pointer-events-none" viewBox="-100 -90 200 180" preserveAspectRatio="xMidYMid meet" style={{ zIndex: 1 }}>
                                          {nodes.map((n, idx) => (
                                            <line key={idx} x1={0} y1={0} x2={n.x} y2={n.y} stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.5" />
                                          ))}
                                        </svg>
                                        <div className="absolute w-14 h-14 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg z-10" style={{ transform: 'translate(-50%, -50%)' }}>
                                          <span className="text-gray-900 text-[10px] font-bold text-center px-1 leading-tight">{centerLabel}{(r.title || '').length > 14 ? '…' : ''}</span>
                                        </div>
                                        {nodes.map((n, idx) => (
                                          <div
                                            key={idx}
                                            className={`absolute w-12 min-w-0 rounded-md flex items-center justify-center shadow-md z-10 px-1 py-0.5 ${n.ring === 'inner' ? 'bg-emerald-500/40 border border-emerald-400/50 text-emerald-100' : 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100'}`}
                                            style={{ transform: `translate(calc(-50% + ${n.x}px), calc(-50% + ${n.y}px))`, fontSize: '9px' }}
                                            title={n.label}
                                          >
                                            <span className="truncate max-w-full">{n.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-white/60 text-xs mt-2 text-center">Type, source, tags &amp; authors — code repos show language; models show pipeline</p>
                                  </div>
                                );
                              })()}
                              
                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                                {r.url ? (
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 inline-flex items-center justify-center gap-1.5 sm:gap-2"
                                  >
                                    <span>Open</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" focusable="false">
                                      <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69l-6.72 6.72a.75.75 0 1 0 1.06 1.06l6.72-6.72V7.5a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 17.75 2h-5.25z" />
                                      <path d="M6.25 4A2.25 2.25 0 0 0 4 6.25v7.5A2.25 2.25 0 0 0 6.25 16h7.5A2.25 2.25 0 0 0 16 13.75V10a.75.75 0 0 0-1.5 0v3.75c0 .414-.336.75-.75.75h-7.5a.75.75 0 0 1-.75-.75v-7.5c0-.414.336-.75.75-.75H10a.75.75 0 0 0 0-1.5H6.25z" />
                                    </svg>
                                  </a>
                                ) : (
                                  <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-800/60 rounded-lg text-xs sm:text-sm text-gray-400 font-semibold cursor-not-allowed border border-gray-700/50" title="No link available" disabled>
                                    Open
                                  </button>
                                )}
                                <button
                                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500 hover:to-purple-600 rounded-lg text-xs sm:text-sm text-white font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 inline-flex items-center justify-center gap-1.5 sm:gap-2"
                                  disabled={authLoading}
                                  onClick={() => handleSaveClick(r)}
                                >
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  <span>Save</span>
                                </button>
                                {r.type === 'paper' && (
                                  <button
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-500 hover:to-blue-600 rounded-lg text-xs sm:text-sm text-white font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 inline-flex items-center justify-center gap-1.5 sm:gap-2"
                                    disabled={summarizingId === resKey}
                                    onClick={async () => {
                                      setToast(null);
                                      setSummarizingId(resKey);
                                      const mode = (r.source === 'arxiv' || r.source === 'openalex' || r.source === 'zenodo') ? 'deep' : 'quick';
                                      try {
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
                                          setSummarizingId(null);
                                        });
                                      } catch (err: any) {
                                        setToast({ type: 'error', message: err.message || 'Failed to start summarization' });
                                        setSummarizingId(null);
                                      }
                                    }}
                                  >
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="hidden sm:inline">Summarize</span>
                                    <span className="sm:hidden">Summary</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Normal Content - Hidden when chat search is active */}
              {!chatSearchActive && (
                <>
                  {/* Hero Section */}
                  <div className="text-center mb-6 sm:mb-8 md:mb-12 pt-4 sm:pt-6 md:pt-8">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-3 sm:mb-4 md:mb-6 px-2">
                  Open Resources
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-teal-100/90 max-w-3xl mx-auto font-medium leading-relaxed px-4">
                      Discover freely accessible, reusable, and modifiable assets to power your next big idea.
                </p>
              </div>

          {/* --- Enhanced Search Bar + Federated Results --- */}
          <div className="flex flex-col mb-6 sm:mb-8 md:mb-10 w-full max-w-5xl mx-auto">
            <div className="w-full">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-4 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Resource type">
                {TABS.map(tab => (
                  <button
                    key={tab.value}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 whitespace-nowrap ${
                      type === tab.value
                        ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 text-emerald-300 shadow-lg shadow-emerald-500/20'
                        : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
                    }`}
                    role="tab"
                    aria-selected={type === tab.value}
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
              
              {/* Action Buttons - Distinct section below filter tabs */}
              {(q && results.length > 0) || results.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start mb-4 md:mb-6 pt-3 border-t border-white/10">
                  {/* General Summary Button */}
                  {q && results.length > 0 && (
                    <button
                      className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm md:text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/60 whitespace-nowrap bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-2 border-blue-400/50 text-blue-200 hover:from-blue-500/40 hover:to-cyan-500/40 hover:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105"
                      onClick={() => setGeneralSummaryModal(true)}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        General Summary
                      </span>
                    </button>
                  )}
                  
                  {/* Explore connections (Knowledge Graph) Button */}
                  {results.length > 0 && (
                    <div className="flex flex-col items-start gap-0.5">
                      <button
                        className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm md:text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400/60 whitespace-nowrap bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-2 border-purple-400/50 text-purple-200 hover:from-purple-500/40 hover:to-pink-500/40 hover:border-purple-400/70 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem('kg-results', JSON.stringify(results));
                            sessionStorage.setItem('kg-query', committedQuery || '');
                          }
                          router.push(`/openresources/knowledge-graph?q=${encodeURIComponent(committedQuery || '')}`);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Explore connections
                        </span>
                      </button>
                      <span className="text-xs text-white/50 px-1">See how results connect by topic, author, and source</span>
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Search Bar */}
              <div className="relative w-full mb-4 md:mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 sm:p-1 focus-within:border-emerald-400/50 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all duration-200 shadow-lg">
                  <div className="flex-1 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 ml-2 sm:ml-3 mr-1 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                <input
                  id="query"
                      className="flex-1 bg-transparent h-10 sm:h-12 px-1 sm:px-2 placeholder-white/40 text-white focus:outline-none text-sm sm:text-base"
                  placeholder="Search papers, datasets..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                />
                  </div>
                  <button 
                    className="h-10 sm:h-10 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-xs sm:text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                    onClick={() => search()} 
                    disabled={loading || !q.trim()}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Searching</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Search</span>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                </button>
              </div>
              </div>
            </div>
            {/* Federated search results */}
            {(q || loading) && (
              <div className="w-full mt-8 max-w-full" aria-busy={loading}>
                {/* Provider Coverage Stats */}
                {coverage && Object.keys(coverage.receivedCounts || {}).length > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Sources:
                      </span>
                    {Object.entries(coverage.receivedCounts || {}).map(([provider, count]) => (
                        <span key={String(provider)} className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/50 text-cyan-200 font-medium">
                          {PROVIDER_LABELS[String(provider)] || String(provider)}: {Number(count)}
                        </span>
                    ))}
                    </div>
                  </div>
                )}
                
                {/* Error State */}
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                
                {/* Empty State */}
                {!loading && results.length === 0 && q && (
                  <div className="text-center py-12 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                    <p className="text-white/60 max-w-md mx-auto">
                      Try adjusting your search terms or filters to find what you're looking for.
                    </p>
                  </div>
                )}
                
                {/* Results Grid */}
                <div className="space-y-4 sm:space-y-5">
                  {results.map((r, i) => {
                    // Use index as key since it's always unique, even if IDs/URLs duplicate
                    const resKey = String(r.id || r.url || i);
                    return (
                      <div id={`resource-card-${i}`} key={`resource-${i}`} className="group rounded-xl glass-card glass-border p-5 sm:p-6 hover:border-emerald-400/30 transition-all duration-300 relative overflow-hidden">
                        {/* Subtle gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-emerald-500/5 group-hover:via-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300 pointer-events-none"></div>
                        
                        <div className="relative flex-1 min-w-0">
                          {/* Header with badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-gray-800/80 to-gray-900/80 font-medium text-gray-200 border border-gray-700/50">
                              {PROVIDER_LABELS[r.source] || r.source}
                            </span>
                            {r.type && (
                              <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                                r.type === 'paper' ? 'bg-blue-900/40 text-blue-200 border-blue-700/50' :
                                r.type === 'dataset' ? 'bg-yellow-900/40 text-yellow-200 border-yellow-700/50' :
                                r.type === 'code' ? 'bg-purple-900/40 text-purple-200 border-purple-700/50' :
                                r.type === 'model' ? 'bg-pink-900/40 text-pink-200 border-pink-700/50' :
                                r.type === 'video' ? 'bg-red-900/40 text-red-200 border-red-700/50' :
                                r.type === 'hardware' ? 'bg-green-900/40 text-green-200 border-green-700/50' :
                                'bg-gray-800/80 text-gray-200 border-gray-700'
                              }`}>
                                {r.type === 'model' ? 'Model'
                                  : r.type === 'video' ? 'Video'
                                  : r.type === 'hardware' ? 'Hardware'
                                  : r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                              </span>
                            )}
                            {r.license && (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-900/40 text-emerald-200 border border-emerald-700/50 font-medium">
                                {r.license}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-3 text-xs text-white/50">
                              {r.year && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {r.year}
                                </span>
                              )}
                              {typeof r.score === 'number' && (
                                <span className="flex items-center gap-1 text-emerald-300">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                  {r.score.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Title */}
                          <h3 className="text-lg sm:text-xl font-bold text-white leading-tight mb-2 group-hover:text-emerald-300 transition-colors duration-200">
                            {r.title}
                          </h3>
                          {/* Special metadata fields */}
                          {r.type === 'model' && r.meta?.pipeline && (
                            <div className="text-xs text-pink-200 font-mono mb-2 px-2 py-1 rounded bg-pink-900/20 border border-pink-800/30 inline-block">
                              Pipeline: {r.meta.pipeline}
                            </div>
                          )}
                          {r.type === 'hardware' && r.meta?.cert_id && (
                            <div className="text-xs text-green-200 font-mono mb-2 px-2 py-1 rounded bg-green-900/20 border border-green-800/30 inline-block">
                              Cert ID: {r.meta.cert_id}
                            </div>
                          )}
                          {r.type === 'video' && (r.meta?.duration || r.meta?.channel) && (
                            <div className="text-xs text-red-200 font-mono mb-2 px-2 py-1 rounded bg-red-900/20 border border-red-800/30 inline-block">
                              {r.meta?.duration && <>Duration: {r.meta.duration} </>}
                              {r.meta?.channel && <>Channel: {r.meta.channel}</>}
                            </div>
                          )}
                          
                          {/* Authors */}
                          {r.authors && r.authors.length > 0 && (
                            <div className="text-sm text-white/70 font-medium mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span>{r.authors.join(', ')}</span>
                            </div>
                          )}
                          
                          {/* Tags */}
                          {r.tags && r.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {r.tags.slice(0, 5).map((tag: string, idx: number) => (
                                <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-cyan-900/30 text-cyan-200 border border-cyan-800/50 font-medium">
                                  {tag}
                                </span>
                              ))}
                              {r.tags.length > 5 && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800/50 text-gray-400 border border-gray-700/50">
                                  +{r.tags.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Tabs */}
                          <div className="flex gap-2 mb-4 border-b border-white/10">
                            <button
                              onClick={() => setActiveCardTabs(prev => ({ ...prev, [resKey]: 'overview' }))}
                              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                                activeCardTabs[resKey] === 'overview' || !activeCardTabs[resKey]
                                  ? 'border-emerald-400 text-emerald-300'
                                  : 'border-transparent text-white/60 hover:text-white/80'
                              }`}
                            >
                              Overview
                            </button>
                            <button
                              onClick={() => setActiveCardTabs(prev => ({ ...prev, [resKey]: 'qa' }))}
                              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                                activeCardTabs[resKey] === 'qa'
                                  ? 'border-emerald-400 text-emerald-300'
                                  : 'border-transparent text-white/60 hover:text-white/80'
                              }`}
                            >
                              Q&A
                            </button>
                            <button
                              onClick={() => setActiveCardTabs(prev => ({ ...prev, [resKey]: 'mindmap' }))}
                              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                                activeCardTabs[resKey] === 'mindmap'
                                  ? 'border-emerald-400 text-emerald-300'
                                  : 'border-transparent text-white/60 hover:text-white/80'
                              }`}
                            >
                              Mind Map
                            </button>
                          </div>

                          {/* Tab Content */}
                          {(!activeCardTabs[resKey] || activeCardTabs[resKey] === 'overview') && (
                            <div className="mb-4">
                              {/* Description */}
                              <div className="text-sm text-white/70 line-clamp-3 mb-4 leading-relaxed">
                                {cleanDescription(r.description)}
                              </div>
                            </div>
                          )}

                          {activeCardTabs[resKey] === 'qa' && (
                            <div className="mb-4 min-h-[200px]">
                              <div className="space-y-4">
                                <div className="text-center py-2">
                                  <svg className="w-10 h-10 mx-auto mb-2 text-emerald-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <h4 className="text-white font-semibold mb-2 text-sm">Q&A</h4>
                                </div>
                                <div className="space-y-3">
                                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-emerald-400 text-xs font-bold">Q</span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-white text-xs font-medium mb-1">What is this resource about?</p>
                                        <p className="text-white/70 text-xs leading-relaxed">{cleanDescription(r.description).substring(0, 120)}...</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-cyan-400 text-xs font-bold">Q</span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-white text-xs font-medium mb-1">How can I use this resource?</p>
                                        <p className="text-white/70 text-xs leading-relaxed">This resource can be used for research, development, or learning. Check the license for usage terms.</p>
                                      </div>
                                    </div>
                                  </div>
                                  {(cardQaPairs[resKey] || []).map((pair, idx) => (
                                    <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                      <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <span className="text-emerald-400 text-xs font-bold">Q</span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-white text-xs font-medium mb-1">{pair.q}</p>
                                          <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{pair.a}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Ask a question about this resource..."
                                      value={cardQaInput[resKey] || ''}
                                      onChange={(e) => setCardQaInput((prev) => ({ ...prev, [resKey]: e.target.value }))}
                                      onKeyDown={(e) => e.key === 'Enter' && handleCardAsk(r, resKey)}
                                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-white/40 focus:outline-none focus:border-emerald-500/50"
                                      disabled={cardQaLoading[resKey]}
                                    />
                                    <button
                                      onClick={() => handleCardAsk(r, resKey)}
                                      disabled={cardQaLoading[resKey] || !(cardQaInput[resKey] || '').trim()}
                                      className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    >
                                      {cardQaLoading[resKey] ? '…' : 'Ask'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeCardTabs[resKey] === 'mindmap' && (() => {
                            const { centerLabel, innerNodes, outerNodes } = getMindMapData(r);
                            const R_INNER = 48;
                            const R_OUTER = 72;
                            const toXY = (angleDeg: number, radius: number) => {
                              const rad = (angleDeg * Math.PI) / 180;
                              return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
                            };
                            const allInner = innerNodes.map((label, i) => ({ label, ...toXY((360 / Math.max(1, innerNodes.length)) * i, R_INNER), ring: 'inner' as const }));
                            const outerStart = outerNodes.length ? (360 / Math.max(1, innerNodes.length)) / 2 : 0;
                            const allOuter = outerNodes.map((label, i) => ({ label, ...toXY(outerStart + (360 / Math.max(1, outerNodes.length)) * i, R_OUTER), ring: 'outer' as const }));
                            const nodes = [...allInner, ...allOuter];
                            return (
                              <div className="mb-4 min-h-[200px]">
                                <div className="relative w-full h-[180px] bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 rounded-lg border border-emerald-500/20 p-4 overflow-hidden">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="absolute w-full h-full pointer-events-none" viewBox="-100 -90 200 180" preserveAspectRatio="xMidYMid meet" style={{ zIndex: 1 }}>
                                      {nodes.map((n, idx) => (
                                        <line key={idx} x1={0} y1={0} x2={n.x} y2={n.y} stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.5" />
                                      ))}
                                    </svg>
                                    <div className="absolute w-14 h-14 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg z-10" style={{ transform: 'translate(-50%, -50%)' }}>
                                      <span className="text-gray-900 text-[10px] font-bold text-center px-1 leading-tight">{centerLabel}{(r.title || '').length > 14 ? '…' : ''}</span>
                                    </div>
                                    {nodes.map((n, idx) => (
                                      <div
                                        key={idx}
                                        className={`absolute w-12 min-w-0 rounded-md flex items-center justify-center shadow-md z-10 px-1 py-0.5 ${n.ring === 'inner' ? 'bg-emerald-500/40 border border-emerald-400/50 text-emerald-100' : 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100'}`}
                                        style={{ transform: `translate(calc(-50% + ${n.x}px), calc(-50% + ${n.y}px))`, fontSize: '9px' }}
                                        title={n.label}
                                      >
                                        <span className="truncate max-w-full">{n.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-white/60 text-xs mt-2 text-center">Type, source, tags &amp; authors — code repos show language; models show pipeline</p>
                              </div>
                            );
                          })()}
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-white/10">
                            {r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 inline-flex items-center gap-2"
                              >
                                <span>Open</span>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true" focusable="false">
                                  <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69l-6.72 6.72a.75.75 0 1 0 1.06 1.06l6.72-6.72V7.5a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 17.75 2h-5.25z" />
                                  <path d="M6.25 4A2.25 2.25 0 0 0 4 6.25v7.5A2.25 2.25 0 0 0 6.25 16h7.5A2.25 2.25 0 0 0 16 13.75V10a.75.75 0 0 0-1.5 0v3.75c0 .414-.336.75-.75.75h-7.5a.75.75 0 0 1-.75-.75v-7.5c0-.414.336-.75.75-.75H10a.75.75 0 0 0 0-1.5H6.25z" />
                                </svg>
                              </a>
                            ) : (
                              <button className="px-4 py-2 bg-gray-800/60 rounded-lg text-sm text-gray-400 font-semibold cursor-not-allowed border border-gray-700/50" title="No link available" disabled>
                                Open
                              </button>
                            )}
                            <button
                              className="px-4 py-2 bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-500 hover:to-purple-600 rounded-lg text-sm text-white font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 inline-flex items-center gap-2"
                              disabled={authLoading}
                              onClick={() => handleSaveClick(r)}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              <span>Save</span>
                            </button>
                            {r.type === 'paper' ? (
                              <button
                                className="px-4 py-2 bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-500 hover:to-blue-600 rounded-lg text-sm text-white font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 inline-flex items-center gap-2"
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
                                {summarizingId === resKey ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Summarizing…</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Summarize</span>
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                          {/* Summary Section */}
                          {summaries[resKey] && (
                            <div className="mt-4 rounded-xl bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border border-emerald-500/20 p-4">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Summary
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                                  summaries[resKey].modeUsed === 'deep' 
                                    ? 'bg-blue-900/40 text-blue-200 border-blue-700/50' 
                                    : 'bg-gray-800/60 text-gray-200 border-gray-700/50'
                                }`}>
                                  {summaries[resKey].modeUsed === 'deep' ? 'Deep summary' : 'Quick summary'}
                                </span>
                                {summaries[resKey].fromCache && (
                                  <span className="text-xs px-2.5 py-1 rounded-md border bg-emerald-900/40 text-emerald-200 border-emerald-700/50 font-medium">
                                    Cached: {summaries[resKey].cache}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-white/90 mb-3 leading-relaxed">{sanitizeText(summaries[resKey].tldr)}</div>
                              {Array.isArray(summaries[resKey].bullets) && summaries[resKey].bullets.length > 0 && (
                                <ul className="list-disc pl-5 text-sm text-white/80 space-y-1.5 mb-3">
                                  {summaries[resKey].bullets.map((b: string, idx: number) => (
                                    <li key={idx} className="leading-relaxed">{sanitizeText(b)}</li>
                                  ))}
                                </ul>
                              )}
                              {Array.isArray(summaries[resKey].tags) && summaries[resKey].tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-emerald-500/20">
                                  {summaries[resKey].tags.map((t: string, idx: number) => (
                                    <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-cyan-900/30 text-cyan-200 border border-cyan-800/50 font-medium">
                                      {sanitizeText(t)}
                                    </span>
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
                  {/* Loading Skeletons */}
                  {loading && results.length === 0 && (
                    <>
                      {Array.from({ length: Math.min(3, Math.max(1, Math.ceil(limit / 10))) }).map((_, idx) => (
                        <div key={`skeleton-${idx}`} className="rounded-xl glass-card glass-border p-5 sm:p-6 animate-pulse">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <div className="h-6 w-20 bg-white/10 rounded-md" />
                            <div className="h-6 w-16 bg-white/10 rounded-md" />
                            <div className="ml-auto flex gap-3">
                            <div className="h-4 w-12 bg-white/10 rounded" />
                              <div className="h-4 w-16 bg-white/10 rounded" />
                          </div>
                          </div>
                          <div className="h-6 w-3/4 bg-white/10 rounded mb-3" />
                          <div className="h-4 w-1/2 bg-white/10 rounded mb-2" />
                          <div className="h-4 w-full bg-white/10 rounded mb-2" />
                          <div className="h-4 w-5/6 bg-white/10 rounded mb-4" />
                          <div className="flex gap-2.5 pt-4 border-t border-white/10">
                            <div className="h-9 w-20 bg-white/10 rounded-lg" />
                            <div className="h-9 w-20 bg-white/10 rounded-lg" />
                            <div className="h-9 w-24 bg-white/10 rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {/* Load More Controls */}
                {q && total > 0 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10 pt-8 border-t border-white/10">
                    <button
                      className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      onClick={loadMore}
                      disabled={!nextCursor || loading}
                      title="Load more results"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading…</span>
                        </>
                      ) : (
                        <>
                          <span>Load More</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </button>
                    {/* Results Count */}
                    <span className="text-sm text-white/60 font-medium px-4 py-2 rounded-lg bg-white/5 border border-white/10" aria-live="polite" aria-atomic="true">
                      Showing <span className="text-emerald-300 font-semibold">1–{Math.min(total, results.length).toLocaleString()}</span> of <span className="text-cyan-300 font-semibold">{total.toLocaleString()}</span> results
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* --- End Neon Search Bar + Federated Results --- */}

            {/* Enhanced Toast Notifications */}
            {toast && (
              <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl border backdrop-blur-sm flex items-center gap-3 min-w-[300px] max-w-md ${
                toast.type === 'error' 
                  ? 'bg-red-900/90 border-red-500/50 text-red-100' 
                  : 'bg-cyan-900/90 border-cyan-500/50 text-cyan-100'
              }`} role="status" aria-live="polite">
                {toast.type === 'error' ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="font-medium">{toast.message}</span>
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

            {/* General Summary Modal — resource summary at 3 understanding levels */}
            {generalSummaryModal && (
              <div
                className="fixed inset-0 z-40 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                onKeyDown={(e) => { if (e.key === 'Escape') setGeneralSummaryModal(false); }}
                tabIndex={-1}
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGeneralSummaryModal(false)} />
                <div className="relative z-10 w-full max-w-3xl rounded-2xl glass-strong glass-border max-h-[90vh] flex flex-col">
                  <button
                    aria-label="Close"
                    className="absolute top-2 right-2 p-2 rounded-md bg-white/10 hover:bg-white/15 text-white"
                    onClick={() => setGeneralSummaryModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="p-5 sm:p-6 pb-3">
                    <h3 className="text-lg font-semibold text-white">General Summary</h3>
                    <p className="text-white/60 text-xs mt-1">What these resources are and how they help</p>
                  </div>
                  {generalSummary && !summaryLoading && (
                    <div className="px-5 sm:px-6 pb-2">
                      <p className="text-white/50 text-xs mb-2">Difficulty level</p>
                      <div className="flex gap-2 flex-wrap">
                        {(['basic', 'intermediate', 'expert'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setGeneralSummaryLevel(level)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              generalSummaryLevel === level
                                ? level === 'basic'
                                  ? 'bg-cyan-500/30 border border-cyan-400/60 text-cyan-200'
                                  : level === 'intermediate'
                                    ? 'bg-amber-500/30 border border-amber-400/60 text-amber-200'
                                    : 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-200'
                                : 'bg-white/10 border border-white/10 text-white/70 hover:bg-white/15 hover:border-white/20'
                            }`}
                          >
                            {level === 'basic' && "Basic — Explain like I'm 5"}
                            {level === 'intermediate' && 'Intermediate — College'}
                            {level === 'expert' && 'Expert'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-5 sm:px-6 py-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                    {summaryLoading ? (
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-300">Generating resource summary...</span>
                      </div>
                    ) : generalSummary ? (
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          {generalSummaryLevel === 'basic' && (
                            <span className="text-cyan-300 rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs">Basic</span>
                          )}
                          {generalSummaryLevel === 'intermediate' && (
                            <span className="text-amber-300 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs">Intermediate</span>
                          )}
                          {generalSummaryLevel === 'expert' && (
                            <span className="text-emerald-300 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs">Expert</span>
                          )}
                          {generalSummaryLevel === 'basic' && "Explain like I'm 5"}
                          {generalSummaryLevel === 'intermediate' && 'College level'}
                          {generalSummaryLevel === 'expert' && 'Technical summary'}
                        </h4>
                        <p className="text-white/90 text-sm leading-relaxed">
                          {generalSummary[generalSummaryLevel]}
                        </p>
                      </div>
                    ) : (
                      <p className="text-white/60 text-sm">No summary available. Run a search first to see a resource summary at basic, intermediate, and expert levels.</p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 p-3 border-t border-white/10 bg-black/20">
                    <button 
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15" 
                      onClick={() => setGeneralSummaryModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* --- Enhanced Resource Type Cards --- */}
          <div className="overflow-hidden mt-12 sm:mt-16 pb-6 hide-scrollbar">
            <div className="flex gap-5 sm:gap-6 animate-scroll-cards">
              {/* First set of cards */}
              {/* Card 1 */}
              <div className="rounded-xl glass-card glass-border p-5 sm:p-6 flex items-start gap-4 flex-shrink-0 w-[300px] sm:w-[340px] hover:border-cyan-400/30 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-code text-xl sm:text-2xl text-cyan-400"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">Open Source Software</h3>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">GitHub, GitLab, SourceForge, PyPI, npm, Maven — reusable code for every stack.</p>
                </div>
              </div>
              {/* Card 2 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-database text-2xl sm:text-3xl text-emerald-400 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Data</h3>
                  <p className="text-xs sm:text-sm text-white/60">Portals like data.gov, EU Open Data, Kaggle Datasets — structured data for insights and analysis.</p>
                </div>
              </div>
              {/* Card 3 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-book text-2xl sm:text-3xl text-purple-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Access Research</h3>
                  <p className="text-xs sm:text-sm text-white/60">Access papers on arXiv, PubMed Central, DOAJ — cutting-edge science at your fingertips.</p>
                </div>
              </div>
              {/* Card 4 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-graduation-cap text-2xl sm:text-3xl text-yellow-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Educational Resources</h3>
                  <p className="text-xs sm:text-sm text-white/60">MIT OCW, OpenStax, Wikibooks — free courses and textbooks for lifelong learners.</p>
                </div>
              </div>
              {/* Card 5 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-microchip text-2xl sm:text-3xl text-pink-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Hardware</h3>
                  <p className="text-xs sm:text-sm text-white/60">Arduino, Hackaday, OpenCompute — open designs and 3D models for hardware projects.</p>
                </div>
              </div>
              {/* Card 6 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-brain text-2xl sm:text-3xl text-indigo-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">AI Models & APIs</h3>
                  <p className="text-xs sm:text-sm text-white/60">Hugging Face, TensorFlow Hub, OpenAI code samples — models and tools to build intelligent apps.</p>
                </div>
              </div>
              {/* Duplicate set for seamless loop */}
              {/* Card 1 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-code text-2xl sm:text-3xl text-cyan-400 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Source Software</h3>
                  <p className="text-xs sm:text-sm text-white/60">GitHub, GitLab, SourceForge, PyPI, npm, Maven — reusable code for every stack.</p>
                </div>
              </div>
              {/* Card 2 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-database text-2xl sm:text-3xl text-emerald-400 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Data</h3>
                  <p className="text-xs sm:text-sm text-white/60">Portals like data.gov, EU Open Data, Kaggle Datasets — structured data for insights and analysis.</p>
                </div>
              </div>
              {/* Card 3 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-book text-2xl sm:text-3xl text-purple-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Access Research</h3>
                  <p className="text-xs sm:text-sm text-white/60">Access papers on arXiv, PubMed Central, DOAJ — cutting-edge science at your fingertips.</p>
                </div>
              </div>
              {/* Card 4 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-graduation-cap text-2xl sm:text-3xl text-yellow-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Educational Resources</h3>
                  <p className="text-xs sm:text-sm text-white/60">MIT OCW, OpenStax, Wikibooks — free courses and textbooks for lifelong learners.</p>
                </div>
              </div>
              {/* Card 5 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-microchip text-2xl sm:text-3xl text-pink-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Open Hardware</h3>
                  <p className="text-xs sm:text-sm text-white/60">Arduino, Hackaday, OpenCompute — open designs and 3D models for hardware projects.</p>
                </div>
              </div>
              {/* Card 6 */}
              <div className="rounded-xl glass-card glass-border p-4 sm:p-5 flex items-start gap-3 flex-shrink-0 w-[280px] sm:w-[320px]">
                <i className="fas fa-brain text-2xl sm:text-3xl text-indigo-300 mt-1"></i>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">AI Models & APIs</h3>
                  <p className="text-xs sm:text-sm text-white/60">Hugging Face, TensorFlow Hub, OpenAI code samples — models and tools to build intelligent apps.</p>
                </div>
              </div>
            </div>
          </div>
          {/* --- End Original Resource Cards --- */}
                </>
              )}
            </div>
          </div>
      </section>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

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
    </div>
  );
}
