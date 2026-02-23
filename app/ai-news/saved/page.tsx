'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
  buildNewsletterHtml,
  buildNewsletterBodyFromArticles,
  type NewsletterArticleItem,
} from '@/app/lib/newsletter-email-template';
import { Mail, Send, Eye, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

type SavedItem = {
  url: string;
  title: string;
  summary?: string | null;
  source?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  includeInNewsletter: boolean;
  createdAt: string;
};

export default function SavedNewsPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai-news/saved?full=1');
        if (!res.ok) {
          if (res.status === 401 && !cancelled) setItems([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setItems(data.saved ?? []);
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
    fetch('/api/admin/check')
      .then((r) => {
        if (!cancelled) setIsAdmin(r.ok);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const newsletterItems = items.filter((i) => i.includeInNewsletter);

  useEffect(() => {
    if (composeOpen && newsletterItems.length > 0) {
      const articles: NewsletterArticleItem[] = newsletterItems.map((i) => ({
        title: i.title,
        url: i.url,
        summary: i.summary,
        source: i.source,
        category: i.category,
      }));
      setBodyHtml(buildNewsletterBodyFromArticles(articles));
    }
  }, [composeOpen, newsletterItems]);

  const toggleIncludeInNewsletter = async (item: SavedItem) => {
    const next = !item.includeInNewsletter;
    const res = await fetch('/api/ai-news/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: item.url,
        title: item.title,
        summary: item.summary ?? undefined,
        source: item.source ?? undefined,
        category: item.category ?? undefined,
        imageUrl: item.imageUrl ?? undefined,
        includeInNewsletter: next,
      }),
    });
    if (!res.ok) {
      toast.error('Failed to update');
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.url === item.url ? { ...i, includeInNewsletter: next } : i))
    );
    toast.success(next ? 'Added to newsletter' : 'Removed from newsletter');
  };

  const remove = async (url: string) => {
    const res = await fetch(`/api/ai-news/saved?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to remove');
      return;
    }
    setItems((prev) => prev.filter((i) => i.url !== url));
    toast.success('Removed from saved');
  };

  const handlePreview = () => {
    const html = buildNewsletterHtml({
      bodyHtml: bodyHtml || '<p>No content.</p>',
      headline: headline || undefined,
    });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const handlePublish = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      toast.error('Subject is required');
      return;
    }
    const html = buildNewsletterHtml({
      bodyHtml: bodyHtml || '<p>No content.</p>',
      headline: headline || undefined,
    });
    setSendResult(null);
    setSending(true);
    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: trimmedSubject,
          html,
          text: (trimmedSubject + '\n\n' + (headline ? headline + '\n\n' : '') + bodyHtml.replace(/<[^>]+>/g, ' ')).slice(0, 2000),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendResult({ ok: false, message: data.error || 'Failed to send' });
        toast.error(data.error || 'Failed to send');
        return;
      }
      setSendResult({
        ok: true,
        message: data.message || `Sent to ${data.sent ?? 0} subscriber(s).`,
      });
      toast.success(data.message || 'Newsletter sent');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setSendResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1016]">
      <Header />
      <main className="flex-1">
        <section className="border-b border-[#38bdf8]/10 bg-gradient-to-b from-[#0c2321] to-[#0a1016] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-[#a78bfa] via-[#38bdf8] to-[#0ff0fc] bg-clip-text">
                  Saved News
                </h1>
                <p className="mt-1 text-teal-200/70 text-sm">
                  Your saved articles and items added to the newsletter.
                </p>
              </div>
              <Link
                href="/ai-news"
                className="rounded-lg border border-[#38bdf8]/30 px-4 py-2 text-sm font-medium text-teal-200 hover:bg-[#38bdf8]/10"
              >
                ← Back to AI News
              </Link>
            </div>
          </div>
        </section>
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {newsletterItems.length > 0 && (
              <div className="rounded-xl border border-[#38bdf8]/20 bg-white/[0.02] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setComposeOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium text-teal-100">
                    <Mail className="w-5 h-5 text-[#38bdf8]" />
                    Compose newsletter
                    <span className="text-teal-400 font-normal">
                      ({newsletterItems.length} article{newsletterItems.length !== 1 ? 's' : ''} selected)
                    </span>
                  </span>
                  {composeOpen ? (
                    <ChevronUp className="w-5 h-5 text-teal-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-teal-400" />
                  )}
                </button>
                {composeOpen && (
                  <div className="border-t border-[#38bdf8]/10 p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-teal-300 mb-1">Subject line</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Open Idea AI News — February 2025"
                        className="w-full px-4 py-2.5 rounded-lg bg-[#0a1016] border border-[#38bdf8]/30 text-teal-50 placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-teal-300 mb-1">Headline (optional)</label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. This week's top picks"
                        className="w-full px-4 py-2.5 rounded-lg bg-[#0a1016] border border-[#38bdf8]/30 text-teal-50 placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-teal-300 mb-1">Body (HTML, editable)</label>
                      <textarea
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        rows={12}
                        className="w-full px-4 py-2.5 rounded-lg bg-[#0a1016] border border-[#38bdf8]/30 text-teal-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50"
                      />
                    </div>
                    {sendResult && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          sendResult.ok
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/10 border border-red-500/30 text-red-300'
                        }`}
                      >
                        {sendResult.message}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePreview}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#38bdf8]/30 text-teal-200 hover:bg-[#38bdf8]/10 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={handlePublish}
                        disabled={sending || !subject.trim() || isAdmin !== true}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/50 hover:bg-[#38bdf8]/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {sending ? 'Sending…' : 'Publish newsletter'}
                      </button>
                      {isAdmin === false && (
                        <span className="text-teal-500 text-sm">Only admins can send the newsletter.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#38bdf8]/30 border-t-[#38bdf8]" />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-[#38bdf8]/20 bg-white/[0.02] p-12 text-center">
                <p className="text-teal-400/80">No saved articles yet.</p>
                <Link href="/ai-news" className="mt-4 inline-block text-[#38bdf8] hover:underline text-sm">
                  Browse AI News and save articles
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.url}
                    className="flex flex-col overflow-hidden rounded-xl border border-[#38bdf8]/20 bg-gradient-to-b from-white/[0.06] to-white/[0.02]"
                  >
                    <Link href={item.url} target="_blank" rel="noopener noreferrer" className="group flex flex-1 flex-col">
                      {item.imageUrl ? (
                        <div className="relative aspect-video w-full overflow-hidden bg-white/5">
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            className="object-cover transition group-hover:scale-[1.02]"
                            sizes="(max-width: 640px) 100vw, 33vw"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c2321] via-transparent to-transparent opacity-60" />
                          {item.category && (
                            <span className="absolute left-3 top-3 rounded-full bg-[#38bdf8]/90 px-2.5 py-0.5 text-xs font-semibold text-[#0a1016]">
                              {item.category}
                            </span>
                          )}
                          {item.includeInNewsletter && (
                            <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white">
                              In newsletter
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full bg-gradient-to-br from-[#38bdf8]/20 to-[#a78bfa]/20">
                          {item.category && (
                            <span className="absolute left-3 top-3 rounded-full bg-[#38bdf8]/90 px-2.5 py-0.5 text-xs font-semibold text-[#0a1016]">
                              {item.category}
                            </span>
                          )}
                          {item.includeInNewsletter && (
                            <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-semibold text-white">
                              In newsletter
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-4">
                        <h2 className="font-semibold leading-snug text-teal-50 line-clamp-2 group-hover:text-[#38bdf8]">
                          {item.title}
                        </h2>
                        {item.summary && (
                          <p className="mt-2 max-h-24 overflow-y-auto text-sm text-teal-200/85 line-clamp-4">
                            {item.summary}
                          </p>
                        )}
                        {item.source && (
                          <span className="mt-2 block text-xs text-teal-400/80">{item.source}</span>
                        )}
                        <span className="mt-2 inline-block text-sm font-medium text-[#38bdf8] group-hover:underline">
                          Read more →
                        </span>
                      </div>
                    </Link>
                    <div className="border-t border-[#38bdf8]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-teal-300">
                        <input
                          type="checkbox"
                          checked={item.includeInNewsletter}
                          onChange={() => toggleIncludeInNewsletter(item)}
                          className="rounded border-[#38bdf8]/50 bg-[#0a1016] text-[#38bdf8] focus:ring-[#38bdf8]/50"
                        />
                        <span>Include in newsletter</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => remove(item.url)}
                        className="text-xs text-teal-400 hover:text-red-400"
                      >
                        Remove from saved
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
