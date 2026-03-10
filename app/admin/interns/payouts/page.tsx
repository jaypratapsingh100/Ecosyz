'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, IndianRupee, CheckCircle2, Clock, AlertCircle, Search, CreditCard, Users } from 'lucide-react';

type PayoutFellow = {
  id: string;
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  paymentDetails: {
    upiId: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    accountHolderName: string | null;
    isVerified: boolean;
  } | null;
};

type Payout = {
  id: string;
  fellowId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  transactionRef: string | null;
  approvedBy: string | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  fellow: PayoutFellow;
  task: { id: string; title: string } | null;
  milestone: { id: string; title: string } | null;
};

type Summary = {
  pendingCount: number;
  pendingAmount: number;
  totalPaidCount: number;
  totalPaidAmount: number;
  paidThisMonthCount: number;
  paidThisMonthAmount: number;
  failedCount: number;
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  processing: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400' },
  cancelled: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
};

export default function AdminPayoutsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Mark as paid modal
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markAction, setMarkAction] = useState<'paid' | 'failed'>('paid');
  const [transactionRef, setTransactionRef] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [submitting, setSubmitting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Razorpay X
  const [sendingRzpX, setSendingRzpX] = useState<string | null>(null);

  // Detail view
  const [detailPayout, setDetailPayout] = useState<Payout | null>(null);

  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin === true))
      .catch(() => setIsAdmin(false))
      .finally(() => setAuthLoading(false));
  }, []);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const res = await fetch(`/api/admin/interns/payouts?${params}`);
      const data = await res.json();
      if (res.ok) setPayouts(data.payouts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/interns/payouts/summary');
      const data = await res.json();
      if (res.ok) setSummary(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPayouts();
      fetchSummary();
    }
  }, [isAdmin, fetchPayouts, fetchSummary]);

  const handleMarkPayout = async () => {
    if (!markingId) return;
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        payoutId: markingId,
        action: markAction === 'paid' ? 'mark_paid' : 'mark_failed',
      };
      if (markAction === 'paid') {
        body.transactionRef = transactionRef;
        body.paymentMethod = paymentMethod;
      } else {
        body.failureReason = failureReason;
      }
      const res = await fetch('/api/admin/interns/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed');
        return;
      }
      setMarkingId(null);
      setTransactionRef('');
      setFailureReason('');
      fetchPayouts();
      fetchSummary();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkPaid = async () => {
    if (selectedIds.size === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/admin/interns/payouts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutIds: Array.from(selectedIds), paymentMethod }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchPayouts();
        fetchSummary();
      }
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleSendRazorpayX = async (payoutId: string) => {
    setSendingRzpX(payoutId);
    try {
      const res = await fetch('/api/admin/interns/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, action: 'send_razorpay_x' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Razorpay X payout failed');
        return;
      }
      alert(`Payout initiated via Razorpay X. Status: ${data.razorpayStatus || 'processing'}`);
      fetchPayouts();
      fetchSummary();
    } catch {
      alert('Failed to send via Razorpay X');
    } finally {
      setSendingRzpX(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredPayouts = payouts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fellow.user.name?.toLowerCase().includes(q) ||
      p.fellow.user.email.toLowerCase().includes(q) ||
      p.task?.title.toLowerCase().includes(q) ||
      p.milestone?.title.toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-red-500 text-lg font-semibold">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/interns" className="text-blue-400 hover:text-blue-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Stipend Payouts</h1>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{summary.pendingCount}</p>
              <p className="text-sm text-amber-400/70 flex items-center gap-1"><IndianRupee className="w-3 h-3" />{summary.pendingAmount}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Paid this month</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{summary.paidThisMonthCount}</p>
              <p className="text-sm text-emerald-400/70 flex items-center gap-1"><IndianRupee className="w-3 h-3" />{summary.paidThisMonthAmount}</p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400 font-medium">Total paid</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{summary.totalPaidCount}</p>
              <p className="text-sm text-blue-400/70 flex items-center gap-1"><IndianRupee className="w-3 h-3" />{summary.totalPaidAmount}</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400 font-medium">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{summary.failedCount}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {['pending', 'processing', 'paid', 'failed', ''].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => { setStatusFilter(s); setSelectedIds(new Set()); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search intern or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {selectedIds.size > 0 && statusFilter === 'pending' && (
            <button
              onClick={handleBulkPaid}
              disabled={bulkSubmitting}
              className="px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {bulkSubmitting ? 'Processing...' : `Mark ${selectedIds.size} as paid`}
            </button>
          )}
        </div>

        {/* Payouts table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payouts found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400">
                  {statusFilter === 'pending' && (
                    <th className="px-3 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredPayouts.length && filteredPayouts.length > 0}
                        onChange={() => {
                          if (selectedIds.size === filteredPayouts.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(filteredPayouts.map((p) => p.id)));
                          }
                        }}
                        className="accent-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-3 py-3 text-left">Intern</th>
                  <th className="px-3 py-3 text-left">For</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Payment info</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredPayouts.map((p) => {
                  const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                  return (
                    <tr key={p.id} className="hover:bg-gray-900/50">
                      {statusFilter === 'pending' && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="accent-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-100">{p.fellow.user.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{p.fellow.user.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-gray-300">{p.task?.title || p.milestone?.title || '—'}</p>
                        <p className="text-xs text-gray-500">{p.task ? 'Task' : 'Milestone'}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-100">₹{p.amount}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setDetailPayout(p)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {p.fellow.paymentDetails ? 'View' : 'None'}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {(p.status === 'pending' || p.status === 'processing') && (
                          <div className="flex gap-1 justify-end flex-wrap">
                            <button
                              onClick={() => handleSendRazorpayX(p.id)}
                              disabled={sendingRzpX === p.id || !p.fellow.paymentDetails}
                              className="px-2 py-1 text-xs bg-blue-600/80 text-white rounded hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={!p.fellow.paymentDetails ? 'No payment details' : 'Send via Razorpay X'}
                            >
                              {sendingRzpX === p.id ? 'Sending...' : 'Razorpay X'}
                            </button>
                            <button
                              onClick={() => { setMarkingId(p.id); setMarkAction('paid'); }}
                              className="px-2 py-1 text-xs bg-emerald-600/80 text-white rounded hover:bg-emerald-500"
                            >
                              Mark paid
                            </button>
                            <button
                              onClick={() => { setMarkingId(p.id); setMarkAction('failed'); }}
                              className="px-2 py-1 text-xs bg-red-600/80 text-white rounded hover:bg-red-500"
                            >
                              Failed
                            </button>
                          </div>
                        )}
                        {p.status === 'paid' && p.transactionRef && (
                          <span className="text-xs text-gray-500">Ref: {p.transactionRef}</span>
                        )}
                        {p.status === 'paid' && p.paymentMethod === 'razorpay_x' && (
                          <span className="text-xs text-blue-400 block">via Razorpay X</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mark paid/failed modal */}
        {markingId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">
                {markAction === 'paid' ? 'Mark as Paid' : 'Mark as Failed'}
              </h3>
              {markAction === 'paid' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Transaction reference (UTR)</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Enter UTR or reference number"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Payment method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="razorpay_x">Razorpay X</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Failure reason</label>
                  <textarea
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="Why did this payout fail?"
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleMarkPayout}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${
                    markAction === 'paid' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {submitting ? 'Processing...' : markAction === 'paid' ? 'Confirm Paid' : 'Confirm Failed'}
                </button>
                <button
                  onClick={() => { setMarkingId(null); setTransactionRef(''); setFailureReason(''); }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment details modal */}
        {detailPayout && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
              <p className="text-sm text-gray-400 mb-3">{detailPayout.fellow.user.name} ({detailPayout.fellow.user.email})</p>
              {detailPayout.fellow.paymentDetails ? (
                <div className="space-y-2 text-sm">
                  {detailPayout.fellow.paymentDetails.upiId && (
                    <div className="flex justify-between px-3 py-2 rounded bg-gray-800">
                      <span className="text-gray-400">UPI ID</span>
                      <span className="text-gray-100 font-medium">{detailPayout.fellow.paymentDetails.upiId}</span>
                    </div>
                  )}
                  {detailPayout.fellow.paymentDetails.bankName && (
                    <div className="flex justify-between px-3 py-2 rounded bg-gray-800">
                      <span className="text-gray-400">Bank</span>
                      <span className="text-gray-100 font-medium">{detailPayout.fellow.paymentDetails.bankName}</span>
                    </div>
                  )}
                  {detailPayout.fellow.paymentDetails.accountNumber && (
                    <div className="flex justify-between px-3 py-2 rounded bg-gray-800">
                      <span className="text-gray-400">Account</span>
                      <span className="text-gray-100 font-medium">{detailPayout.fellow.paymentDetails.accountNumber}</span>
                    </div>
                  )}
                  {detailPayout.fellow.paymentDetails.ifscCode && (
                    <div className="flex justify-between px-3 py-2 rounded bg-gray-800">
                      <span className="text-gray-400">IFSC</span>
                      <span className="text-gray-100 font-medium">{detailPayout.fellow.paymentDetails.ifscCode}</span>
                    </div>
                  )}
                  {detailPayout.fellow.paymentDetails.accountHolderName && (
                    <div className="flex justify-between px-3 py-2 rounded bg-gray-800">
                      <span className="text-gray-400">Name</span>
                      <span className="text-gray-100 font-medium">{detailPayout.fellow.paymentDetails.accountHolderName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No payment details submitted by this intern yet.</p>
              )}
              <button
                onClick={() => setDetailPayout(null)}
                className="mt-4 w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
