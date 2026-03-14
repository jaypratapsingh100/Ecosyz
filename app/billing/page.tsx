'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  Loader2,
  CreditCard,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
} from 'lucide-react';

type SubscriptionData = {
  plan: string;
  rawPlan: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  price: string;
};

type CreditData = {
  plan: string;
  creditBalance: number;
  creditsUsed: number;
  creditsAllocated: number;
  isUnlimited: boolean;
};

type PaymentRecord = {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  plan: string;
  createdAt: string;
};

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, creditsRes, historyRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/credits'),
        fetch('/api/payments/history'),
      ]);

      if (subRes.status === 401) {
        router.push('/auth?redirect=%2Fbilling');
        return;
      }

      if (subRes.ok) setSubscription(await subRes.json());
      if (creditsRes.ok) setCredits(await creditsRes.json());
      if (historyRes.ok) {
        const data = await historyRes.json();
        setPayments(data.payments || []);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/payments/cancel', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel');
      }
      setCancelModalOpen(false);
      await loadBillingData();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'text-emerald-400 bg-emerald-500/20';
      case 'cancelled': return 'text-amber-400 bg-amber-500/20';
      case 'trialing': return 'text-cyan-400 bg-cyan-500/20';
      case 'captured': return 'text-emerald-400 bg-emerald-500/20';
      case 'refunded': return 'text-amber-400 bg-amber-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDisplayStatus = () => {
    if (!subscription) return 'free';
    if (subscription.status === 'active') return 'active';
    if (subscription.status === 'cancelled' && subscription.endDate && new Date(subscription.endDate) > new Date()) return 'cancelled';
    if (subscription.trialEndDate && new Date(subscription.trialEndDate) > new Date()) return 'trialing';
    return 'free';
  };

  const displayStatus = getDisplayStatus();
  const isFreePlan = subscription?.plan === 'free';
  const canCancel = displayStatus === 'active';

  // Credit usage percentage
  const creditPercent = credits
    ? credits.isUnlimited
      ? 100
      : credits.creditsAllocated > 0
        ? Math.min(100, Math.round(((credits.creditsAllocated - credits.creditBalance) / credits.creditsAllocated) * 100))
        : 0
    : 0;
  const creditBarColor = creditPercent > 90 ? 'from-red-500 to-red-400' : creditPercent > 70 ? 'from-yellow-500 to-amber-400' : 'from-emerald-500 to-teal-400';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image src="/hero-globe.png" alt="Digital Globe Background" fill className="object-cover object-right opacity-30" quality={100} priority />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl" />
          </div>

          {loading ? (
            <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : (
            <div className="relative z-10 max-w-5xl mx-auto p-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-emerald-400" />
                  Billing
                </h1>
                <p className="text-slate-400 mt-1">Manage your subscription, credits, and payment history.</p>
              </div>

              {/* Subscription Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">Plan</span>
                  </div>
                  <div className="text-xl font-bold text-white capitalize">
                    {subscription?.rawPlan || subscription?.plan || 'Free'}
                  </div>
                </div>
                <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">Status</span>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(displayStatus)}`}>
                      {displayStatus}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {displayStatus === 'cancelled' ? 'Expires' : displayStatus === 'trialing' ? 'Trial Ends' : 'Next Billing'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {displayStatus === 'trialing'
                      ? formatDate(subscription?.trialEndDate ?? null)
                      : formatDate(subscription?.endDate ?? null)}
                  </div>
                </div>
                <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">Price</span>
                  </div>
                  <div className="text-xl font-bold text-white">{subscription?.price || '₹0'}</div>
                </div>
              </div>

              {/* Credit Usage */}
              <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Credit Usage</h3>
                {credits?.isUnlimited ? (
                  <p className="text-emerald-400 font-medium">Unlimited credits (Enterprise plan)</p>
                ) : credits ? (
                  <>
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>{credits.creditsUsed.toFixed(1)} used</span>
                      <span>{credits.creditsAllocated.toFixed(1)} total</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 mb-4">
                      <div
                        className={`h-3 rounded-full bg-gradient-to-r ${creditBarColor} transition-all duration-500`}
                        style={{ width: `${creditPercent}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-400">{credits.creditBalance.toFixed(1)}</div>
                        <div className="text-xs text-slate-400">Remaining</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-400">{credits.creditsUsed.toFixed(1)}</div>
                        <div className="text-xs text-slate-400">Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{credits.creditsAllocated.toFixed(1)}</div>
                        <div className="text-xs text-slate-400">Allocated</div>
                      </div>
                    </div>
                    {credits.creditBalance <= 0 && (
                      <Link
                        href="/pricing"
                        className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Get More Credits <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </>
                ) : null}
              </div>

              {/* Plan Management */}
              <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 mb-8">
                <span className="text-sm text-slate-400">Manage Your Plan</span>
                <div className="flex gap-3">
                  {(isFreePlan || displayStatus === 'trialing') && (
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                    >
                      Upgrade Plan <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => setCancelModalOpen(true)}
                      className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white">Payment History</h3>
                </div>
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No payments yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                        <th className="text-left p-4 text-slate-400 font-medium">Plan</th>
                        <th className="text-right p-4 text-slate-400 font-medium">Amount</th>
                        <th className="text-left p-4 text-slate-400 font-medium">Provider</th>
                        <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="p-4 text-slate-300">{formatDate(p.createdAt)}</td>
                          <td className="p-4 text-white capitalize">{p.plan} Plan</td>
                          <td className="p-4 text-right text-white font-medium">
                            {p.currency === 'INR' ? '₹' : p.currency + ' '}{p.amount}
                          </td>
                          <td className="p-4 text-slate-300 capitalize">{p.provider}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {cancelModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/10 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Cancel Subscription?</h3>
                </div>
                <p className="text-slate-400 mb-6">
                  Are you sure you want to cancel your subscription? You will retain access to all features until{' '}
                  <strong className="text-white">{formatDate(subscription?.endDate ?? null)}</strong>. After that, you will be downgraded to the Free plan.
                </p>
                {cancelError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {cancelError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setCancelModalOpen(false); setCancelError(null); }}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium disabled:opacity-50"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors font-medium disabled:opacity-50"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                    Yes, Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
