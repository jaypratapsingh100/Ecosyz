'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Handshake,
  LogIn,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  Users,
  Send,
  AlertCircle,
} from 'lucide-react';

type PartnerBalance = {
  id: string;
  name: string;
  email: string;
  affiliateCode: string | null;
  tier: string;
  tierLabel: string;
  tierIcon: string;
  commissionPercent: number;
  tierUpgradedAt: string | null;
  hasPayoutDetails: boolean;
  payoutMethod: string | null;
  eligibleBalance: number;
  holdingBalance: number;
  totalEarned: number;
  totalPaid: number;
  referralCount: number;
};

type CommissionLog = {
  id: string;
  affiliateCode: string;
  amount: number;
  currency: string;
  status: string;
  eligibleAt: string;
  createdAt: string;
  reversedAt: string | null;
  subscriberEmail: string;
  subscriberName: string | null;
  paymentAmount: number;
  paymentPlan: string;
};

type PayoutRecord = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payoutMethod: string | null;
  razorpayPayoutId: string | null;
  transactionRef: string | null;
  initiatedBy: string | null;
  initiatedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  partnership: {
    id: string;
    name: string;
    email: string;
    affiliateCode: string | null;
  };
};

type Stats = {
  totalEligible: number;
  totalOnHold: number;
  totalPaidOut: number;
  activeAffiliates: number;
  totalCommissions: number;
};

export default function AdminAffiliateCommissionsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerBalance[]>([]);
  const [commissions, setCommissions] = useState<CommissionLog[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<'balances' | 'commissions' | 'payouts'>('balances');
  const [payingOut, setPayingOut] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/check');
      if (res.ok) setIsAdmin(true);
    } catch {
      // not admin
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [commRes, payoutRes] = await Promise.all([
        fetch('/api/admin/affiliate-commissions'),
        fetch('/api/admin/affiliate-payouts'),
      ]);

      if (commRes.ok) {
        const data = await commRes.json();
        setPartners(data.partners || []);
        setStats(data.stats || null);
        setCommissions(data.commissions || []);
      }

      if (payoutRes.ok) {
        const data = await payoutRes.json();
        setPayouts(data.payouts || []);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, loadData]);

  const handlePayout = async (partnershipId: string, partnerName: string, amount: number) => {
    if (!confirm(`Send payout of ₹${amount.toFixed(2)} to ${partnerName}?`)) return;
    setPayingOut(partnershipId);
    try {
      const res = await fetch('/api/admin/affiliate-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnershipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Payout failed');
    } finally {
      setPayingOut(null);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'text-amber-400 bg-amber-500/20';
      case 'eligible': return 'text-cyan-400 bg-cyan-500/20';
      case 'paid': case 'processing': return 'text-emerald-400 bg-emerald-500/20';
      case 'reversed': case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  if (authLoading) {
    return (
      <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                <LogIn className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin access required</h2>
            <p className="text-slate-300 mb-6">Sign in with an admin account to manage affiliate commissions.</p>
            <Link
              href="/auth?redirect=%2Fadmin%2Faffiliate-commissions"
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

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Handshake className="w-8 h-8 text-emerald-400" />
          Affiliate Commissions
        </h1>
        <p className="text-slate-300 mt-1">Manage affiliate partner commissions and payouts.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={CheckCircle} label="Eligible for Payout" value={`₹${stats.totalEligible}`} color="text-cyan-400" />
              <StatCard icon={Clock} label="On Hold (< 30 days)" value={`₹${stats.totalOnHold}`} color="text-amber-400" />
              <StatCard icon={DollarSign} label="Total Paid Out" value={`₹${stats.totalPaidOut}`} color="text-emerald-400" />
              <StatCard icon={Users} label="Active Affiliates" value={String(stats.activeAffiliates)} />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['balances', 'commissions', 'payouts'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {t === 'balances' ? 'Partner Balances' : t === 'commissions' ? 'Commission Log' : 'Payout History'}
              </button>
            ))}
          </div>

          {/* Partner Balances */}
          {tab === 'balances' && (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              {partners.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No active affiliate partners.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-slate-400 font-medium">Partner</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Code</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Tier</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Referrals</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Eligible</th>
                      <th className="text-right p-4 text-slate-400 font-medium">On Hold</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Total Paid</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Payout</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((p) => (
                      <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-4">
                          <div className="text-white font-medium">{p.name}</div>
                          <div className="text-slate-400 text-xs">{p.email}</div>
                        </td>
                        <td className="p-4">
                          <code className="text-emerald-400 text-xs font-mono">{p.affiliateCode}</code>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <span>{p.tierIcon}</span>
                            <span className="text-slate-300">{p.tierLabel}</span>
                            <span className="text-slate-500">({p.commissionPercent}%)</span>
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-300">{p.referralCount}</td>
                        <td className="p-4 text-right text-cyan-400 font-medium">₹{p.eligibleBalance}</td>
                        <td className="p-4 text-right text-amber-400">₹{p.holdingBalance}</td>
                        <td className="p-4 text-right text-emerald-400">₹{p.totalPaid}</td>
                        <td className="p-4">
                          {p.hasPayoutDetails ? (
                            <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                              {p.payoutMethod === 'upi' ? 'UPI' : 'Bank'}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3" />
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handlePayout(p.id, p.name, p.eligibleBalance)}
                            disabled={!p.hasPayoutDetails || p.eligibleBalance <= 0 || payingOut === p.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              !p.hasPayoutDetails
                                ? 'Partner has not configured payout details'
                                : p.eligibleBalance <= 0
                                ? 'No eligible balance'
                                : `Pay ₹${p.eligibleBalance}`
                            }
                          >
                            {payingOut === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Pay Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Commission Log */}
          {tab === 'commissions' && (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              {commissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No commissions recorded yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Subscriber</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Payment</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Commission</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Code</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Eligible At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-4 text-slate-300">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="text-white text-xs">{c.subscriberName || '—'}</div>
                          <div className="text-slate-400 text-xs">{c.subscriberEmail}</div>
                        </td>
                        <td className="p-4 text-right text-slate-300">₹{c.paymentAmount}</td>
                        <td className="p-4 text-right text-white font-medium">₹{c.amount.toFixed(2)}</td>
                        <td className="p-4">
                          <code className="text-emerald-400 text-xs font-mono">{c.affiliateCode}</code>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-xs">{new Date(c.eligibleAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Payout History */}
          {tab === 'payouts' && (
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No payouts sent yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Partner</th>
                      <th className="text-right p-4 text-slate-400 font-medium">Amount</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Method</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Reference</th>
                      <th className="text-left p-4 text-slate-400 font-medium">Initiated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-4 text-slate-300">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="text-white text-xs">{p.partnership.name}</div>
                          <div className="text-slate-400 text-xs">{p.partnership.email}</div>
                        </td>
                        <td className="p-4 text-right text-white font-medium">₹{p.amount.toFixed(2)}</td>
                        <td className="p-4 text-slate-300">{p.payoutMethod === 'upi' ? 'UPI' : 'Bank'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-xs">{p.transactionRef || p.razorpayPayoutId || '—'}</td>
                        <td className="p-4 text-slate-400 text-xs">{p.initiatedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-white',
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
