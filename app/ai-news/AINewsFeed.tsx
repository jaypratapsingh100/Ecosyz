'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import type { AiNewsItem } from '../api/ai-news/route';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const CATEGORY_ALL = 'All';

type SavedState = { includeInNewsletter: boolean };

export default function AINewsFeed() {
  const [items, setItems] = useState<AiNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(CATEGORY_ALL);
  const [savedMap, setSavedMap] = useState<Record<string, SavedState>>({});
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai-news');
        if (!res.ok) throw new Error('Failed to load news');
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load news');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (cancelled) return;
        const sessionData = sessionRes.ok ? await sessionRes.json() : null;
        if (!sessionData?.user) {
          setAuthChecked(true);
          return;
        }
        const savedRes = await fetch('/api/ai-news/saved');
        if (cancelled) return;
        const savedData = await savedRes.json().catch(() => ({ saved: [] }));
        const map: Record<string, SavedState> = {};
        for (const s of savedData.saved ?? []) {
          if (s?.url) map[s.url] = { includeInNewsletter: Boolean(s.includeInNewsletter) };
        }
        setSavedMap(map);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(items.map((i) => i.category).filter(Boolean));
    return [CATEGORY_ALL, ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    if (category === CATEGORY_ALL) return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

  const saveNews = useCallback(
    async (item: AiNewsItem, includeInNewsletter: boolean) => {
      const res = await fetch('/api/ai-news/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.url,
          title: item.title,
          summary: item.summary ?? item.description ?? undefined,
          source: item.source,
          category: item.category,
          imageUrl: item.imageUrl,
          includeInNewsletter,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to save');
        return;
      }
      setSavedMap((prev) => ({
        ...prev,
        [item.url]: { includeInNewsletter },
      }));
      if (includeInNewsletter) {
        toast.success('Added to newsletter', {
          description: 'This story will be considered for the next newsletter.',
        });
      } else {
        toast.success('Saved for later');
      }
    },
    []
  );

  const unsaveNews = useCallback(async (url: string) => {
    const res = await fetch(`/api/ai-news/saved?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Failed to remove');
      return;
    }
    setSavedMap((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    toast.success('Removed from saved');
  }, []);

  const handleSave = useCallback(
    (e: React.MouseEvent, item: AiNewsItem) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authChecked) return;
      const current = savedMap[item.url];
      if (current && !current.includeInNewsletter) {
        unsaveNews(item.url);
      } else if (!current) {
        saveNews(item, false);
      }
    },
    [authChecked, savedMap, saveNews, unsaveNews]
  );

  const handleAddToNewsletter = useCallback(
    (e: React.MouseEvent, item: AiNewsItem) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authChecked) return;
      saveNews(item, true);
    },
    [authChecked, saveNews]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#38bdf8]/30 border-t-[#38bdf8]" />
          <p className="text-sm text-teal-400/80">Loading news…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-amber-200 text-sm">
        {error}. Try again later.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-teal-400/70 text-sm">No news in this category. Try another.</p>
    );
  }

  return (
    <div className="w-full">
      {/* Category pills */}
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                category === cat
                  ? 'bg-[#38bdf8] text-[#0a1016]'
                  : 'bg-white/5 text-teal-300 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const saved = savedMap[item.url];
          const isSaved = Boolean(saved);

          return (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-[#38bdf8]/20 bg-gradient-to-b from-white/[0.06] to-white/[0.02] transition hover:border-[#38bdf8]/40"
            >
              <Link
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-1 flex-col"
              >
                {item.imageUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden bg-white/5">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c2321] via-transparent to-transparent opacity-60" />
                    <span className="absolute left-3 top-3 rounded-full bg-[#38bdf8]/90 px-2.5 py-0.5 text-xs font-semibold text-[#0a1016]">
                      {item.category}
                    </span>
                  </div>
                ) : (
                  <div className="relative aspect-video w-full bg-gradient-to-br from-[#38bdf8]/20 to-[#a78bfa]/20">
                    <span className="absolute left-3 top-3 rounded-full bg-[#38bdf8]/90 px-2.5 py-0.5 text-xs font-semibold text-[#0a1016]">
                      {item.category}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-semibold leading-snug text-teal-50 transition group-hover:text-[#38bdf8] line-clamp-2">
                    {item.title}
                  </h2>
                  <p className="mt-3 max-h-40 overflow-y-auto text-sm leading-relaxed text-teal-200/85">
                    {item.summary || item.description || 'Tap to read more.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#38bdf8]/10 pt-3">
                    <span className="text-xs text-teal-400/80">
                      {item.source} · {formatDate(item.date)}
                      {item.points != null && ` · ${item.points} pts`}
                    </span>
                    <span className="text-sm font-medium text-[#38bdf8] group-hover:underline">
                      Read more →
                    </span>
                  </div>
                </div>
              </Link>

              {/* Save & Add to newsletter actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-[#38bdf8]/10 px-4 py-2">
                <button
                  type="button"
                  onClick={(e) => handleSave(e, item)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isSaved
                      ? 'bg-[#38bdf8]/20 text-[#38bdf8]'
                      : 'bg-white/5 text-teal-400 hover:bg-white/10 hover:text-teal-300'
                  }`}
                  title={isSaved ? 'Unsave' : 'Save for later'}
                >
                  {isSaved ? (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      Saved
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleAddToNewsletter(e, item)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    saved?.includeInNewsletter
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 text-teal-400 hover:bg-white/10 hover:text-teal-300'
                  }`}
                  title="Add to newsletter"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {saved?.includeInNewsletter ? 'In newsletter' : 'Add to newsletter'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
