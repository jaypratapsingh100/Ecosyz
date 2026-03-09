'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  plan: string;
  createdAt: string;
}

interface SubscriptionData {
  plan: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
}

export default function SubscriptionSection({ subscription }: { subscription: SubscriptionData }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/payments/history')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.payments) setPayments(data.payments);
      })
      .catch(() => {});
  }, []);

  const now = new Date();
  const isTrialActive = subscription.trialEndDate && new Date(subscription.trialEndDate) > now && subscription.status !== 'active';
  const trialDaysLeft = subscription.trialEndDate
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isSubscriptionActive = subscription.status === 'active' || subscription.status === 'cancelled';
  const isCancelled = subscription.status === 'cancelled';
  const accessEndDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const hasAccess = isSubscriptionActive && accessEndDate && accessEndDate > now;

  const effectivePlan = hasAccess ? subscription.plan : isTrialActive ? 'plus (trial)' : 'free';

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch('/api/payments/cancel', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCancelSuccess(true);
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch {
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'INR') return `₹${amount}`;
    return `${currency} ${amount}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Subscription</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your plan and billing</p>
      </div>

      {/* Current Plan */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
            {effectivePlan || 'Free'}
          </p>
          {isTrialActive && (
            <p className="text-sm text-emerald-500 mt-1">
              Trial active — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </p>
          )}
          {isCancelled && accessEndDate && !cancelSuccess && (
            <p className="text-sm text-yellow-500 mt-1">
              Cancelled — access until {formatDate(accessEndDate.toISOString())}
            </p>
          )}
          {cancelSuccess && (
            <p className="text-sm text-yellow-500 mt-1">
              Cancellation confirmed — access continues until end of billing period
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {(!subscription.plan || subscription.plan === 'free' || effectivePlan === 'free') && !isTrialActive && (
            <Link
              href="/pricing"
              className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Upgrade Plan
            </Link>
          )}
          {subscription.status === 'active' && !cancelSuccess && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 text-sm font-medium rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Billing Period */}
      {subscription.startDate && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Billing Start</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(subscription.startDate)}
            </p>
          </div>
          {subscription.endDate && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Next Billing / Expires</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(subscription.endDate)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Payment History</h3>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    payment.status === 'captured' ? 'bg-emerald-500' :
                    payment.status === 'refunded' ? 'bg-yellow-500' :
                    payment.status === 'failed' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {payment.plan} Plan
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(payment.createdAt)} via {payment.provider}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className={`text-xs capitalize ${
                    payment.status === 'captured' ? 'text-emerald-500' :
                    payment.status === 'refunded' ? 'text-yellow-500' :
                    'text-gray-500'
                  }`}>
                    {payment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
