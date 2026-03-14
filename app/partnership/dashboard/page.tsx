'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {
  Handshake,
  LogIn,
  Loader2,
  Copy,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  ExternalLink,
  Users,
} from 'lucide-react';

type CommissionItem = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  eligibleAt: string;
  createdAt: string;
  paymentAmount: number;
  paymentPlan: string;
};

type PayoutItem = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payoutMethod: string | null;
  transactionRef: string | null;
  paidAt: string | null;
  createdAt: string;
};

type TierInfo = {
  current: string;
  label: string;
  commissionPercent: number;
  icon: string;
  color: string;
  bgColor: string;
  progress: { percent: number; current: number; needed: number };
  nextTier: { label: string; commissionPercent: number; minReferrals: number } | null;
};

type Stats = {
  totalEarned: number;
  eligibleBalance: number;
  holdingBalance: number;
  totalPaidOut: number;
  totalReferrals: number;
  tier: TierInfo;
};

type PayoutDetails = {
  payoutVpa: string | null;
  payoutAccountNumber: string | null;
  payoutIfsc: string | null;
  payoutBeneficiaryName: string | null;
  payoutBankName: string | null;
  hasPayoutDetails: boolean;
};

export default function PartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [notPartner, setNotPartner] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);
  const [tab, setTab] = useState<'details' | 'commissions' | 'payouts'>('details');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Payout form state
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [vpa, setVpa] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [bankName, setBankName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [commRes, detailsRes] = await Promise.all([
        fetch('/api/partnership/commissions'),
        fetch('/api/partnership/payout-details'),
      ]);

      if (commRes.status === 404 || detailsRes.status === 404) {
        setNotPartner(true);
        return;
      }

      if (commRes.ok) {
        const data = await commRes.json();
        setAffiliateCode(data.affiliateCode);
        setStats(data.stats);
        setCommissions(data.commissions);
        setPayouts(data.payouts);
      }

      if (detailsRes.ok) {
        const details = await detailsRes.json();
        setPayoutDetails(details);
        if (details.payoutVpa) {
          setPayoutMethod('upi');
          setVpa(details.payoutVpa);
        } else if (details.payoutAccountNumber) {
          setPayoutMethod('bank');
        }
        if (details.payoutBeneficiaryName) setBeneficiaryName(details.payoutBeneficiaryName);
        if (details.payoutIfsc) setIfsc(details.payoutIfsc);
        if (details.payoutBankName) setBankName(details.payoutBankName);
      }
    } catch {
      setNotPartner(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const body =
        payoutMethod === 'upi'
          ? { vpa, beneficiaryName }
          : { accountNumber, ifsc, beneficiaryName, bankName };

      const res = await fetch('/api/partnership/payout-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!affiliateCode) return;
    const link = `${window.location.origin}/pricing?ref=${affiliateCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderLayout = (children: React.ReactNode) => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
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
          {children}
        </section>
      </main>
      <Footer />
    </div>
  );

  if (loading) {
    return renderLayout(
      <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (notPartner) {
    return renderLayout(
      <div className="relative z-10 max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 max-w-md w-full text-center">
            <Handshake className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-3">No active partnership</h2>
            <p className="text-slate-400 mb-6">You need an approved partnership to access this dashboard.</p>
            <Link
              href="/partnership"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
            >
              Apply for Partnership
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'text-amber-400 bg-amber-500/20';
      case 'eligible': return 'text-cyan-400 bg-cyan-500/20';
      case 'paid': case 'processing': return 'text-emerald-400 bg-emerald-500/20';
      case 'reversed': case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  return renderLayout(
    <div className="relative z-10 max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Handshake className="w-8 h-8 text-emerald-400" />
          Partner Dashboard
        </h1>
        {affiliateCode && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-slate-400 text-sm">Your code:</span>
            <code className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-mono">
              {affiliateCode}
            </code>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}
      </div>

      {/* Tier Progress */}
      {stats?.tier && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{stats.tier.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-white">{stats.tier.label} Partner</h3>
                <p className="text-sm text-slate-400">{stats.tier.commissionPercent}% commission rate</p>
              </div>
            </div>
            {stats.tier.nextTier && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Next tier</p>
                <p className="text-sm text-white font-medium">
                  {stats.tier.nextTier.label} ({stats.tier.nextTier.commissionPercent}%)
                </p>
              </div>
            )}
          </div>
          {stats.tier.nextTier ? (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>{stats.tier.progress.current} referrals</span>
                <span>{stats.tier.progress.needed} needed</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${stats.tier.progress.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-400">You have reached the highest tier. Maximum commission rate active.</p>
          )}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard icon={TrendingUp} label="Total Earned" value={`₹${stats.totalEarned}`} />
          <StatCard icon={CheckCircle} label="Eligible" value={`₹${stats.eligibleBalance}`} color="text-cyan-400" />
          <StatCard icon={Clock} label="On Hold" value={`₹${stats.holdingBalance}`} color="text-amber-400" />
          <StatCard icon={DollarSign} label="Paid Out" value={`₹${stats.totalPaidOut}`} color="text-emerald-400" />
          <StatCard icon={Users} label="Referrals" value={String(stats.totalReferrals)} color="text-purple-400" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['details', 'commissions', 'payouts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {t === 'details' ? 'Payout Details' : t === 'commissions' ? 'Commissions' : 'Payouts'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'details' && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Payout Details
          </h3>
          {payoutDetails?.hasPayoutDetails && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4 text-sm text-emerald-400">
              Payout details configured. Update below if needed.
            </div>
          )}

          {/* Method toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setPayoutMethod('upi')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                payoutMethod === 'upi'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              UPI
            </button>
            <button
              onClick={() => setPayoutMethod('bank')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                payoutMethod === 'bank'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Bank Transfer
            </button>
          </div>

          {payoutMethod === 'upi' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Beneficiary Name</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={payoutDetails?.payoutAccountNumber || 'Enter account number'}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="SBIN0001234"
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="State Bank of India"
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Beneficiary Name</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Your full name (as on bank account)"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSaveDetails}
            disabled={saving}
            className="mt-6 px-6 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            Save Payout Details
          </button>
        </div>
      )}

      {tab === 'commissions' && (
        <div>
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            {commissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No commissions yet. Share your referral link to start earning!</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Payment</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Commission</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left p-4 text-slate-400 font-medium">Eligible At</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="p-4 text-slate-300">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-slate-300">₹{c.paymentAmount} ({c.paymentPlan})</td>
                      <td className="p-4 text-white font-medium">₹{c.amount.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(c.eligibleAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span>Bronze: 5% (default)</span>
            <span>Silver: 7% (10+ referrals)</span>
            <span>Gold: 10% (25+ referrals)</span>
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          {payouts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No payouts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Method</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-4 text-slate-300">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-white font-medium">₹{p.amount.toFixed(2)}</td>
                    <td className="p-4 text-slate-300">{p.payoutMethod === 'upi' ? 'UPI' : 'Bank Transfer'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{p.transactionRef || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
