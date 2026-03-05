'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface Author {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface BarterPitch {
  id: string;
  content: string;
  authorId: string;
  author: Author;
  createdAt: string;
}

interface BarterAsk {
  id: string;
  title: string;
  description: string;
  whatINeed: string | null;
  whatIOffer: string | null;
  status: string;
  authorId: string;
  author: Author;
  createdAt: string;
  attachments?: {
    url: string;
    name: string;
    type: string;
    size?: number;
  }[];
  _count?: { pitches: number };
  pitches?: BarterPitch[];
}

export default function BarterList() {
  const [asks, setAsks] = useState<BarterAsk[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pitchContent, setPitchContent] = useState<Record<string, string>>({});
  const [submittingPitch, setSubmittingPitch] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWhatINeed, setFormWhatINeed] = useState('');
  const [formWhatIOffer, setFormWhatIOffer] = useState('');
  const fetchAsksIdRef = useRef(0);

  const fetchAsks = async () => {
    const requestId = ++fetchAsksIdRef.current;
    try {
      setLoading(true);
      setRequiresAuth(false);
      const params = new URLSearchParams();
      if (statusFilter === 'open' || statusFilter === 'closed') params.set('status', statusFilter);
      const res = await fetch(`/api/community/barter?${params}`);
      const data = await res.json().catch(() => ({}));
      if (requestId !== fetchAsksIdRef.current) return;
      if (res.ok) {
        setAsks(data.asks || []);
      } else {
        if (res.status === 401) {
          setRequiresAuth(true);
          setAsks([]);
          return;
        }
        const detailsStr = typeof data?.details === 'string' ? data.details.trim() : '';
        const hintStr = typeof data?.hint === 'string' ? data.hint.trim() : '';
        if (detailsStr || hintStr) {
          console.error('[barter] fetchAsks error details:', {
            error: data.error,
            details: data.details,
            hint: data.hint,
          });
        }
        toast.error(data?.error || 'Failed to load barter asks');
      }
    } catch (error) {
      if (requestId !== fetchAsksIdRef.current) return;
      console.error('Failed to fetch barter asks:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load barter asks');
    } finally {
      if (requestId === fetchAsksIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsks();
  }, [statusFilter]);

  const fetchAskDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/community/barter/${id}`);
      if (!res.ok) return;
      const ask = await res.json();
      setAsks((prev) => prev.map((a) => (a.id === id ? { ...a, ...ask, pitches: ask.pitches } : a)));
    } catch (error) {
      console.error('Failed to fetch ask detail:', error);
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const existing = asks.find((a) => a.id === id);
    if (existing && !existing.pitches) fetchAskDetail(id);
  };

  const handleCreateAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/community/barter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          whatINeed: formWhatINeed.trim() || undefined,
          whatIOffer: formWhatIOffer.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Please log in to post asks in the barter marketplace.');
        }
        throw new Error(data.error || 'Failed to create ask');
      }
      toast.success('Ask posted');
      setFormTitle('');
      setFormDescription('');
      setFormWhatINeed('');
      setFormWhatIOffer('');
      setShowCreateForm(false);
      fetchAsks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post ask');
    } finally {
      setCreating(false);
    }
  };

  const handlePitch = async (askId: string) => {
    const content = pitchContent[askId]?.trim();
    if (!content) {
      toast.error('Write a message to pitch in');
      return;
    }
    setSubmittingPitch(askId);
    try {
      const res = await fetch(`/api/community/barter/${askId}/pitches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Please log in to pitch on barter asks.');
        }
        throw new Error(data.error || 'Failed to pitch');
      }
      setPitchContent((prev) => ({ ...prev, [askId]: '' }));
      toast.success('Pitch added');
      fetchAskDetail(askId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add pitch');
    } finally {
      setSubmittingPitch(null);
    }
  };

  const handleCloseAsk = async (askId: string) => {
    try {
      setUpdatingStatusId(askId);
      const res = await fetch(`/api/community/barter/${askId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please log in to manage your barter asks.');
          return;
        }
        toast.error(data?.error || 'Failed to close ask');
        return;
      }
      toast.success('Ask closed');
      setAsks((prev) =>
        prev.map((a) => (a.id === askId ? { ...a, status: 'closed' } : a))
      );
    } catch (error) {
      console.error('Failed to close ask:', error);
      toast.error('Failed to close ask');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleMessageAuthor = async (ask: BarterAsk) => {
    try {
      setOpeningConversationId(ask.id);
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          otherUserId: ask.author.id,
          barterAskId: ask.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please log in to send a message');
          return;
        }
        toast.error(data?.error || 'Failed to open conversation');
        return;
      }
      if (typeof window !== 'undefined') {
        const workspaceLink = document.querySelector<HTMLAnchorElement>('a[href^="/workspaces/"]');
        if (workspaceLink?.href) {
          const url = new URL(workspaceLink.href);
          url.searchParams.set('conversationId', data.id);
          window.location.href = url.toString();
        } else {
          toast.success('Conversation started. Open your workspace inbox to continue chatting.');
        }
      }
    } catch (error) {
      console.error('Failed to open conversation:', error);
      toast.error('Failed to open conversation');
    } finally {
      setOpeningConversationId(null);
    }
  };

  return (
    <div className="space-y-6">
      {requiresAuth && !loading && (
        <div className="glass-card glass-border rounded-xl p-8 text-center space-y-4">
          <h3 className="text-xl font-semibold text-amber-300">
            Log in to access the barter marketplace
          </h3>
          <p className="text-teal-100/80 text-sm max-w-md mx-auto">
            Barter asks and pitches are only visible to community members. Sign in to
            see active barters and post your own.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/auth?redirect=%2Fcommunity%3Ftab%3Dbarter"
              className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition shadow-lg shadow-amber-400/20"
            >
              Log in / Sign up
            </Link>
          </div>
        </div>
      )}

      {!requiresAuth && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition shadow-lg shadow-amber-400/20"
            >
              {showCreateForm ? 'Cancel' : '+ Post an ask'}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={handleCreateAsk}
              className="glass-card glass-border p-6 rounded-xl space-y-4"
            >
              <h3 className="text-lg font-semibold text-amber-300">Post your ask</h3>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-amber-400"
                required
              />
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-amber-400 resize-none"
                required
              />
              <textarea
                value={formWhatINeed}
                onChange={(e) => setFormWhatINeed(e.target.value)}
                placeholder="What I need (optional)"
                rows={2}
                className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-amber-400 resize-none"
              />
              <textarea
                value={formWhatIOffer}
                onChange={(e) => setFormWhatIOffer(e.target.value)}
                placeholder="What I offer (optional)"
                rows={2}
                className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-amber-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-amber-400 text-gray-900 font-medium rounded-lg hover:bg-amber-300 disabled:opacity-50"
                >
                  {creating ? 'Posting...' : 'Post ask'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-teal-400/30 text-teal-100 rounded-lg hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-12 text-teal-100/80">Loading asks...</div>
          ) : asks.length === 0 ? (
            <div className="text-center py-12 text-teal-100/80">
              No barter asks yet. Post one to get started!
            </div>
          ) : (
            <div className="space-y-4">
          {asks.map((ask) => (
            <div
              key={ask.id}
              className="glass-card glass-border rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleExpand(ask.id)}
                className="w-full p-6 text-left flex items-start gap-4 hover:bg-white/5 transition"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400/30 to-orange-400/30 flex items-center justify-center text-lg font-bold text-amber-300 shrink-0">
                  {ask.title.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-amber-300">{ask.title}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        ask.status === 'open'
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {ask.status}
                    </span>
                  </div>
                  <p className="text-teal-100/80 text-sm line-clamp-2">{ask.description}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-teal-100/60 shrink-0 transition-transform ${
                    expandedId === ask.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-3 px-6 pb-4 text-sm text-teal-100/60 border-t border-teal-400/10">
                <Link
                  href={`/community/users/${ask.author.id}`}
                  className="hover:text-amber-300 transition-colors"
                >
                  {ask.author.name || ask.author.email?.split('@')[0] || 'Anonymous'}
                </Link>
                <span>·</span>
                <span>{ask._count?.pitches ?? ask.pitches?.length ?? 0} pitches</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleMessageAuthor(ask)}
                  disabled={openingConversationId === ask.id}
                  className="text-xs px-3 py-1 rounded-full border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {openingConversationId === ask.id ? 'Opening chat…' : 'Message author'}
                </button>
              </div>

              {expandedId === ask.id && (
                <div className="border-t border-teal-400/20 p-6 space-y-4 bg-[#0c2321]/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="prose prose-invert max-w-none text-sm text-teal-100/90 whitespace-pre-wrap">
                      {ask.description}
                    </div>
                    {ask.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleCloseAsk(ask.id)}
                        disabled={updatingStatusId === ask.id}
                        className="ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/80 hover:bg-rose-400 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {updatingStatusId === ask.id ? 'Closing...' : 'Close ask'}
                      </button>
                    )}
                  </div>
                  {ask.attachments && ask.attachments.length > 0 && (
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-amber-200/90">Attachments</p>
                      <div className="flex flex-wrap gap-3">
                        {ask.attachments.map((att, idx) => {
                          const isImage = att.type?.startsWith('image/');
                          return (
                            <a
                              key={`${att.url}-${idx}`}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block rounded-lg border border-teal-400/20 bg-[#172421]/80 p-2 hover:border-amber-400/60 hover:bg-[#1b2a27]/90 transition-colors max-w-[160px]"
                            >
                              {isImage ? (
                                <div className="relative w-full h-24 mb-1 overflow-hidden rounded-md bg-black/40">
                                  <Image
                                    src={att.url}
                                    alt={att.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-amber-400/20 text-amber-300 text-xs font-semibold">
                                    {att.name.split('.').pop()?.toUpperCase() || 'FILE'}
                                  </span>
                                  <span className="text-xs text-teal-100/80 line-clamp-1">
                                    {att.name}
                                  </span>
                                </div>
                              )}
                              {!isImage && (
                                <p className="text-[10px] text-teal-300/70 truncate">
                                  Open attachment
                                </p>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(ask.whatINeed || ask.whatIOffer) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {ask.whatINeed && (
                        <div>
                          <span className="font-medium text-amber-300/90">What they need</span>
                          <p className="text-teal-100/80 mt-1 whitespace-pre-wrap">{ask.whatINeed}</p>
                        </div>
                      )}
                      {ask.whatIOffer && (
                        <div>
                          <span className="font-medium text-amber-300/90">What they offer</span>
                          <p className="text-teal-100/80 mt-1 whitespace-pre-wrap">{ask.whatIOffer}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-teal-100 mb-2">
                      Pitches ({ask.pitches?.length ?? 0})
                    </h4>
                    {ask.pitches && ask.pitches.length > 0 ? (
                      <ul className="space-y-3">
                        {ask.pitches.map((pitch) => (
                          <li
                            key={pitch.id}
                            className="flex gap-3 p-3 rounded-lg bg-[#172421]/80 border border-teal-400/10"
                          >
                            <Link
                              href={`/community/users/${pitch.author.id}`}
                              className="shrink-0"
                            >
                              {pitch.author.avatarUrl ? (
                                <Image
                                  src={pitch.author.avatarUrl}
                                  alt={pitch.author.name || pitch.author.email || 'User avatar'}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 text-sm">
                                  {(pitch.author.name || pitch.author.email || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-teal-100/60 mb-1">
                                <Link
                                  href={`/community/users/${pitch.author.id}`}
                                  className="hover:text-amber-300 transition-colors"
                                >
                                  {pitch.author.name || pitch.author.email}
                                </Link>{' '}
                                · {new Date(pitch.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-teal-100/90 text-sm whitespace-pre-wrap">{pitch.content}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-teal-100/60 text-sm">No pitches yet. Be the first to pitch in!</p>
                    )}
                  </div>
                  {ask.status === 'open' && (
                    <div className="flex gap-2">
                      <textarea
                        value={pitchContent[ask.id] ?? ''}
                        onChange={(e) =>
                          setPitchContent((prev) => ({ ...prev, [ask.id]: e.target.value }))
                        }
                        placeholder="Your pitch or offer..."
                        rows={2}
                        className="flex-1 px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-amber-400 resize-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handlePitch(ask.id)}
                        disabled={submittingPitch === ask.id}
                        className="px-4 py-2 bg-amber-400 text-gray-900 font-medium rounded-lg hover:bg-amber-300 disabled:opacity-50 shrink-0 self-end"
                      >
                        {submittingPitch === ask.id ? 'Sending...' : 'Pitch in'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
