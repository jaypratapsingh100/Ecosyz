'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

interface Author {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface GigRequest {
  id: string;
  message: string;
  budget?: number | null;
  status: string;
  authorId: string;
  author: Author;
  createdAt: string;
}

interface Gig {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  currency?: string | null;
  deliveryTimeDays?: number | null;
  tags?: string[];
  status: string;
  authorId: string;
  author: Author;
  createdAt: string;
  _count?: { requests: number };
  requests?: GigRequest[];
}

export default function GigsList() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<Record<string, string>>({});
  const [requestBudget, setRequestBudget] = useState<Record<string, string>>({});
  const [submittingRequest, setSubmittingRequest] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPriceFrom, setFormPriceFrom] = useState('');
  const [formPriceTo, setFormPriceTo] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formDeliveryTime, setFormDeliveryTime] = useState('');
  const [formTags, setFormTags] = useState('');

  const fetchGigsIdRef = useRef(0);

  const fetchGigs = async () => {
    const requestId = ++fetchGigsIdRef.current;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/community/gigs?${params}`);
      const data = await res.json().catch(() => ({}));
      if (requestId !== fetchGigsIdRef.current) return;
      if (res.ok) {
        setGigs(data.gigs || []);
      } else {
        if (data?.details || data?.hint) {
          console.error('[gigs] fetchGigs error details:', {
            error: data.error,
            details: data.details,
            hint: data.hint,
          });
        }
        toast.error(data?.error || 'Failed to load gigs');
      }
    } catch (error) {
      if (requestId !== fetchGigsIdRef.current) return;
      console.error('Failed to fetch gigs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load gigs');
    } finally {
      if (requestId === fetchGigsIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchGigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGigs();
  };

  const fetchGigDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/community/gigs/${id}`);
      if (!res.ok) return;
      const gig = await res.json();
      setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, ...gig, requests: gig.requests } : g)));
    } catch (error) {
      console.error('Failed to fetch gig detail:', error);
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    const existing = gigs.find((g) => g.id === id);
    if (existing && !existing.requests) fetchGigDetail(id);
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setCreating(true);
    try {
      const priceFrom = formPriceFrom ? parseInt(formPriceFrom, 10) : undefined;
      const priceTo = formPriceTo ? parseInt(formPriceTo, 10) : undefined;
      const deliveryTimeDays = formDeliveryTime ? parseInt(formDeliveryTime, 10) : undefined;
      const tags =
        formTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean) || undefined;

      const res = await fetch('/api/community/gigs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory.trim() || undefined,
          priceFrom: Number.isFinite(priceFrom) ? priceFrom : undefined,
          priceTo: Number.isFinite(priceTo) ? priceTo : undefined,
          currency: formCurrency || undefined,
          deliveryTimeDays: Number.isFinite(deliveryTimeDays) ? deliveryTimeDays : undefined,
          tags,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create gig');
      }
      toast.success('Gig posted');
      setFormTitle('');
      setFormDescription('');
      setFormCategory('');
      setFormPriceFrom('');
      setFormPriceTo('');
      setFormCurrency('USD');
      setFormDeliveryTime('');
      setFormTags('');
      setShowCreateForm(false);
      fetchGigs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post gig');
    } finally {
      setCreating(false);
    }
  };

  const handleRequestGig = async (gigId: string) => {
    const message = requestMessage[gigId]?.trim();
    if (!message) {
      toast.error('Write a short message for this gig');
      return;
    }
    const budgetValue = requestBudget[gigId]?.trim();
    const budget = budgetValue ? parseInt(budgetValue, 10) : undefined;
    setSubmittingRequest(gigId);
    try {
      const res = await fetch(`/api/community/gigs/${gigId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message,
          budget: Number.isFinite(budget) ? budget : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send request');
      }
      setRequestMessage((prev) => ({ ...prev, [gigId]: '' }));
      setRequestBudget((prev) => ({ ...prev, [gigId]: '' }));
      toast.success('Request sent');
      fetchGigDetail(gigId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSubmittingRequest(null);
    }
  };

  const handleCloseGig = async (gigId: string, newStatus: 'paused' | 'closed') => {
    try {
      setUpdatingStatusId(gigId);
      const res = await fetch(`/api/community/gigs/${gigId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Failed to update gig');
        return;
      }
      toast.success(newStatus === 'closed' ? 'Gig closed' : 'Gig paused');
      setGigs((prev) =>
        prev.map((g) => (g.id === gigId ? { ...g, status: newStatus } : g))
      );
    } catch (error) {
      console.error('Failed to update gig:', error);
      toast.error('Failed to update gig');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const formatPrice = (gig: Gig) => {
    if (gig.priceFrom == null && gig.priceTo == null) return 'Custom pricing';
    const cur = gig.currency || 'USD';
    if (gig.priceFrom != null && gig.priceTo != null) {
      if (gig.priceFrom === gig.priceTo) return `${cur} ${gig.priceFrom}`;
      return `${cur} ${gig.priceFrom}–${gig.priceTo}`;
    }
    if (gig.priceFrom != null) return `From ${cur} ${gig.priceFrom}`;
    return `Up to ${cur} ${gig.priceTo}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-emerald-400"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
            <option value="">All</option>
          </select>
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gigs (e.g. landing page, UI design)"
              className="w-56 sm:w-72 px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400 text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg border border-emerald-400/40 text-emerald-200 text-sm hover:bg-emerald-400/10"
            >
              Search
            </button>
          </form>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition shadow-lg shadow-emerald-400/20"
        >
          {showCreateForm ? 'Cancel' : '+ Create a gig'}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreateGig}
          className="glass-card glass-border p-6 rounded-xl space-y-4"
        >
          <h3 className="text-lg font-semibold text-emerald-300">Create a gig</h3>
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="I will build your AI-powered research dashboard"
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
            required
          />
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Describe what you offer, what is included, and what you need from the buyer."
            rows={4}
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400 resize-none text-sm"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-teal-100/80">Category</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="Web development, Design, Data, etc."
                className="w-full px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-teal-100/80">
                Price range (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={formPriceFrom}
                  onChange={(e) => setFormPriceFrom(e.target.value)}
                  placeholder="From"
                  className="w-full px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="number"
                  min={0}
                  value={formPriceTo}
                  onChange={(e) => setFormPriceTo(e.target.value)}
                  placeholder="To"
                  className="w-full px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-teal-100/80">
                Delivery time (days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={formDeliveryTime}
                onChange={(e) => setFormDeliveryTime(e.target.value)}
                placeholder="e.g. 7"
                className="w-full px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-teal-100/80">Currency</label>
              <input
                type="text"
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                className="w-32 px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-teal-100/80">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="nextjs, landing page, dashboards"
                className="w-full px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-emerald-400 text-gray-900 font-medium rounded-lg hover:bg-emerald-300 disabled:opacity-50"
            >
              {creating ? 'Publishing...' : 'Publish gig'}
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
        <div className="text-center py-12 text-teal-100/80">Loading gigs...</div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-12 text-teal-100/80">
          No gigs yet. Be the first to offer your skills!
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig) => (
            <div
              key={gig.id}
              className="glass-card glass-border rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleExpand(gig.id)}
                className="w-full p-6 text-left flex items-start gap-4 hover:bg-white/5 transition"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 flex items-center justify-center text-lg font-bold text-emerald-300 shrink-0">
                  {gig.title.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-emerald-300">{gig.title}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        gig.status === 'active'
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : gig.status === 'paused'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {gig.status}
                    </span>
                    {gig.category && (
                      <span className="px-2 py-0.5 text-xs rounded bg-teal-400/10 text-teal-200">
                        {gig.category}
                      </span>
                    )}
                  </div>
                  <p className="text-teal-100/80 text-sm line-clamp-2">{gig.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-teal-100/60">
                    <span>
                      {gig.author.name || gig.author.email?.split('@')[0] || 'Anonymous'}
                    </span>
                    <span>·</span>
                    <span>{formatPrice(gig)}</span>
                    {gig.deliveryTimeDays && (
                      <>
                        <span>·</span>
                        <span>Delivery in {gig.deliveryTimeDays} days</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{gig._count?.requests ?? gig.requests?.length ?? 0} requests</span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-teal-100/60 shrink-0 transition-transform ${
                    expandedId === gig.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedId === gig.id && (
                <div className="border-t border-teal-400/20 p-6 space-y-4 bg-[#061a18]/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="prose prose-invert max-w-none text-sm text-teal-100/90 whitespace-pre-wrap">
                      {gig.description}
                    </div>
                    {gig.status === 'active' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCloseGig(gig.id, 'paused')}
                          disabled={updatingStatusId === gig.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/80 hover:bg-amber-400 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {updatingStatusId === gig.id ? 'Updating...' : 'Pause gig'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseGig(gig.id, 'closed')}
                          disabled={updatingStatusId === gig.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/80 hover:bg-rose-400 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {updatingStatusId === gig.id ? 'Updating...' : 'Close gig'}
                        </button>
                      </div>
                    )}
                  </div>
                  {gig.tags && gig.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {gig.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-200 border border-teal-400/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-teal-100 mb-2">
                      Requests ({gig.requests?.length ?? 0})
                    </h4>
                    {gig.requests && gig.requests.length > 0 ? (
                      <ul className="space-y-3">
                        {gig.requests.map((req) => (
                          <li
                            key={req.id}
                            className="flex gap-3 p-3 rounded-lg bg-[#172421]/80 border border-teal-400/10"
                          >
                            {req.author.avatarUrl ? (
                              <Image
                                src={req.author.avatarUrl}
                                alt=""
                                width={32}
                                height={32}
                                className="rounded-full shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300 text-sm shrink-0">
                                {(req.author.name || req.author.email || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-teal-100/60 mb-1">
                                {req.author.name || req.author.email} ·{' '}
                                {new Date(req.createdAt).toLocaleDateString()}
                                {req.budget != null && (
                                  <>
                                    {' '}
                                    · Budget {gig.currency || 'USD'} {req.budget}
                                  </>
                                )}
                              </p>
                              <p className="text-teal-100/90 text-sm whitespace-pre-wrap">
                                {req.message}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-teal-100/60 text-sm">
                        No requests yet. Be the first to reach out!
                      </p>
                    )}
                  </div>
                  {gig.status === 'active' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <textarea
                        value={requestMessage[gig.id] ?? ''}
                        onChange={(e) =>
                          setRequestMessage((prev) => ({ ...prev, [gig.id]: e.target.value }))
                        }
                        placeholder="Tell the seller what you need..."
                        rows={2}
                        className="flex-1 px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400 resize-none text-sm"
                      />
                      <div className="flex flex-col sm:w-48 gap-2">
                        <input
                          type="number"
                          min={0}
                          value={requestBudget[gig.id] ?? ''}
                          onChange={(e) =>
                            setRequestBudget((prev) => ({ ...prev, [gig.id]: e.target.value }))
                          }
                          placeholder="Budget (optional)"
                          className="px-3 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-emerald-400 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRequestGig(gig.id)}
                          disabled={submittingRequest === gig.id}
                          className="px-4 py-2 bg-emerald-400 text-gray-900 font-medium rounded-lg hover:bg-emerald-300 disabled:opacity-50"
                        >
                          {submittingRequest === gig.id ? 'Sending...' : 'Request this gig'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

