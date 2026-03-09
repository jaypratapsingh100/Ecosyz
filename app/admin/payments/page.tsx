'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Loader2,
  LogIn,
  TrendingUp,
  Users,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  referredByAffiliateCode: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId: string;
  providerOrderId: string | null;
  status: string;
  plan: string;
  affiliateCode: string | null;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

interface Stats {
  totalRevenue: number;
  totalPayments: number;
  monthlyRevenue: number;
  monthlyPayments: number;
  activeSubscribers: number;
  cancelledSubscribers: number;
}

interface SubscriptionData {
  subscribers: Subscriber[];
  payments: Payment[];
  stats: Stats;
}

function StatCard({ label, value, subValue, icon: Icon, color }: {
  label: string;
  value: string;
  subValue?: string;
  icon: any;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-400">{label}</span>
        <div className={`p-2 rounded-lg border ${colorMap[color] || colorMap.cyan}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    cancelled: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    captured: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    refunded: 'bg-red-500/20 text-red-400 border-red-500/40',
    failed: 'bg-red-500/20 text-red-400 border-red-500/40',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/40'}`}>
      {status}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const isStripe = provider === 'stripe';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      isStripe ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
    }`}>
      {provider === 'razorpay' ? 'Razorpay' : 'Stripe'}
    </span>
  );
}

function formatCurrency(amount: number, currency = 'INR') {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPaymentsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'payments'>('overview');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
          setIsAdmin(true);
        }
      } catch {
        // not admin
      } finally {
        setAuthLoading(false);
      }
    };
    check();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
            <p className="text-slate-300 mb-6">Sign in with an admin account to access payments data.</p>
            <Link
              href="/auth?redirect=%2Fadmin%2Fpayments"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, subscribers, payments } = data;

  const filteredSubscribers = subscribers.filter(s =>
    !searchQuery ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.referredByAffiliateCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    !searchQuery ||
    p.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.providerPaymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.affiliateCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            Payments & Subscriptions
          </h1>
          <p className="text-slate-400 mt-1">Revenue, subscribers, and payment history</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subValue={`${stats.totalPayments} payments`}
          icon={IndianRupee}
          color="emerald"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(stats.monthlyRevenue)}
          subValue={`${stats.monthlyPayments} payments`}
          icon={TrendingUp}
          color="cyan"
        />
        <StatCard
          label="Active Subs"
          value={String(stats.activeSubscribers)}
          icon={Users}
          color="emerald"
        />
        <StatCard
          label="Cancelled"
          value={String(stats.cancelledSubscribers)}
          icon={Users}
          color="amber"
        />
        <StatCard
          label="Avg Revenue"
          value={stats.totalPayments > 0 ? formatCurrency(Math.round(stats.totalRevenue / stats.totalPayments)) : '₹0'}
          subValue="Per payment"
          icon={ArrowUpRight}
          color="purple"
        />
        <StatCard
          label="MRR Estimate"
          value={formatCurrency(stats.activeSubscribers * 999)}
          subValue={`${stats.activeSubscribers} x ₹999`}
          icon={ArrowUpRight}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-700/50 mb-6">
        {(['overview', 'subscribers', 'payments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'text-cyan-400 border-cyan-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'subscribers' ? `Subscribers (${subscribers.length})` : `Payments (${payments.length})`}
          </button>
        ))}

        {activeTab !== 'overview' && (
          <div className="ml-auto pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by email, name, or code..."
                className="pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-64"
              />
            </div>
          </div>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Subscribers */}
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Subscribers</h3>
              <button onClick={() => setActiveTab('subscribers')} className="text-xs text-cyan-400 hover:text-cyan-300">
                View all
              </button>
            </div>
            <div className="space-y-3">
              {subscribers.slice(0, 5).map(sub => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm text-white">{sub.name || sub.email}</p>
                    <p className="text-xs text-slate-400">{sub.email}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={sub.subscriptionStatus || 'unknown'} />
                    <p className="text-xs text-slate-500 mt-1">{sub.subscriptionPlan || '—'}</p>
                  </div>
                </div>
              ))}
              {subscribers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No subscribers yet</p>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
              <button onClick={() => setActiveTab('payments')} className="text-xs text-cyan-400 hover:text-cyan-300">
                View all
              </button>
            </div>
            <div className="space-y-3">
              {payments.slice(0, 5).map(pmt => (
                <div key={pmt.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm text-white">{pmt.user.name || pmt.user.email}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(pmt.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(pmt.amount, pmt.currency)}</p>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <StatusBadge status={pmt.status} />
                      <ProviderBadge provider={pmt.provider} />
                    </div>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No payments yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">User</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Plan</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Start Date</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">End Date</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Last Payment</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Trial</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Affiliate</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map(sub => {
                  const trialActive = sub.trialEndDate && new Date(sub.trialEndDate) > new Date();
                  return (
                    <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white">{sub.name || '—'}</p>
                        <p className="text-xs text-slate-400">{sub.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white capitalize">{sub.subscriptionPlan || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.subscriptionStatus || 'unknown'} />
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(sub.subscriptionStartDate)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(sub.subscriptionEndDate)}</td>
                      <td className="px-4 py-3">
                        {sub.lastPaymentAmount ? (
                          <div>
                            <span className="text-white">{formatCurrency(sub.lastPaymentAmount)}</span>
                            <p className="text-xs text-slate-400">{formatDate(sub.lastPaymentDate)}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sub.trialEndDate ? (
                          <span className={`text-xs ${trialActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {trialActive ? 'Active' : 'Expired'}
                            <br />
                            <span className="text-slate-500">ends {formatDate(sub.trialEndDate)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sub.referredByAffiliateCode ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/20 text-cyan-400">
                            {sub.referredByAffiliateCode}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredSubscribers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      {searchQuery ? 'No subscribers match your search' : 'No subscribers yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Date</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">User</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Amount</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Plan</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Provider</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Payment ID</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Affiliate</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(pmt => (
                  <tr key={pmt.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatDateTime(pmt.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-white">{pmt.user.name || '—'}</p>
                      <p className="text-xs text-slate-400">{pmt.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{formatCurrency(pmt.amount, pmt.currency)}</td>
                    <td className="px-4 py-3 text-white capitalize">{pmt.plan}</td>
                    <td className="px-4 py-3"><ProviderBadge provider={pmt.provider} /></td>
                    <td className="px-4 py-3"><StatusBadge status={pmt.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-400 max-w-[120px] truncate block" title={pmt.providerPaymentId}>
                        {pmt.providerPaymentId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {pmt.affiliateCode ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/20 text-cyan-400">
                          {pmt.affiliateCode}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      {searchQuery ? 'No payments match your search' : 'No payments yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
