'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  Send,
  Eye,
  LogIn,
  AlertCircle,
  Loader2,
  Users,
  FileCode,
  Type,
} from 'lucide-react';
import { buildNewsletterHtml, DEFAULT_BODY_PLACEHOLDER } from '@/app/lib/newsletter-email-template';

type Mode = 'template' | 'custom';

export default function AdminNewsletterPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState<Mode>('template');
  const [headline, setHeadline] = useState('');
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_BODY_PLACEHOLDER);
  const [customHtml, setCustomHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const [checkRes, statsRes] = await Promise.all([
        fetch('/api/admin/check'),
        fetch('/api/admin/newsletter/stats'),
      ]);
      if (checkRes.status === 401) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }
      if (checkRes.status === 403 || !checkRes.ok) {
        setIsAuthenticated(true);
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }
      setIsAuthenticated(true);
      setIsAdmin(true);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setSubscriberCount(data.subscriberCount);
      }
    } catch {
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const getFinalHtml = useCallback((): string => {
    if (mode === 'custom') return customHtml;
    return buildNewsletterHtml({
      bodyHtml: bodyHtml || '<p>No content.</p>',
      headline: headline || undefined,
    });
  }, [mode, customHtml, bodyHtml, headline]);

  const handlePreview = () => {
    const html = getFinalHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const handleSend = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setError('Subject is required');
      return;
    }
    const html = getFinalHtml();
    if (!html.trim()) {
      setError('Please add content (body or custom HTML).');
      return;
    }
    setError(null);
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
          text: trimmedSubject + '\n\n' + (mode === 'template' ? (headline ? headline + '\n\n' : '') + bodyHtml.replace(/<[^>]+>/g, ' ') : customHtml.replace(/<[^>]+>/g, ' ')).slice(0, 2000),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to send newsletter');
        setSendResult({ ok: false, message: data.error || 'Send failed' });
        return;
      }
      setSendResult({
        ok: true,
        message: data.message || `Sent to ${data.sent ?? 0} subscriber(s).`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
      setSendResult({ ok: false, message: msg });
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                <LogIn className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Sign in required</h2>
            <p className="text-slate-300 mb-6">
              You must be signed in as an admin to send newsletters.
            </p>
            <Link
              href="/auth"
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

  if (isAuthenticated === true && !isAdmin) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/30">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin access required</h2>
            <p className="text-slate-300 mb-6">
              Only administrators can send newsletters. Contact an admin if you need access.
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Mail className="w-8 h-8 text-cyan-400" />
          Newsletter
        </h1>
        <p className="text-slate-300 mt-1">
          Compose and send a newsletter to all subscribed emails. Use the branded template or your own HTML.
        </p>
        {subscriberCount !== null && (
          <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-cyan-400 font-medium">{subscriberCount}</span> subscribers
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-4">
          <p className="text-slate-300 text-sm font-medium mb-3">Compose mode</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'template'}
                onChange={() => setMode('template')}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <Type className="w-4 h-4 text-slate-400" />
              <span className="text-white">Branded template</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <FileCode className="w-4 h-4 text-slate-400" />
              <span className="text-white">Custom HTML</span>
            </label>
          </div>
        </div>

        {/* Subject */}
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <label className="block text-slate-300 font-medium mb-2">Subject line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Open Idea Update — February 2025"
            className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
        </div>

        {mode === 'template' ? (
          <>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
              <label className="block text-slate-300 font-medium mb-2">Headline (optional)</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. This month's update"
                className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
              <label className="block text-slate-300 font-medium mb-2">Body (HTML)</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm"
                placeholder="<p>Your content here...</p>"
              />
              <p className="text-slate-500 text-xs mt-2">
                Use simple HTML: &lt;p&gt;, &lt;strong&gt;, &lt;a href="..."&gt;, &lt;ul&gt;, etc.
              </p>
            </div>
          </>
        ) : (
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
            <label className="block text-slate-300 font-medium mb-2">Full HTML</label>
            <textarea
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              rows={18}
              className="w-full px-4 py-3 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm"
              placeholder="<!DOCTYPE html>..."
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {sendResult && (
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${
              sendResult.ok
                ? 'bg-emerald-900/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-red-900/20 border border-red-500/50 text-red-300'
            }`}
          >
            {sendResult.ok ? (
              <Mail className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{sendResult.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700/80 text-slate-200 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !subject.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Sending…' : `Send to ${subscriberCount ?? 0} subscribers`}
          </button>
        </div>
      </div>
    </div>
  );
}
