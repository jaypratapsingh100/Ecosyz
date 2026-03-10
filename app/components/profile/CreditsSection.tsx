'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CreditData {
  plan: string;
  creditBalance: number;
  creditsUsed: number;
  creditsAllocated: number;
  isUnlimited: boolean;
}

export default function CreditsSection() {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credits')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCredits(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!credits) return null;

  if (credits.isUnlimited) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Credits Usage</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Your AI generation credit balance</p>
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Unlimited credits — Enterprise Plan
          </span>
        </div>
      </div>
    );
  }

  const usagePercent =
    credits.creditsAllocated > 0
      ? Math.min(100, (credits.creditsUsed / credits.creditsAllocated) * 100)
      : 0;

  const barColor =
    usagePercent > 90
      ? 'bg-red-500'
      : usagePercent > 70
        ? 'bg-yellow-500'
        : 'bg-emerald-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Credits Usage</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your AI generation credit balance</p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>{Math.round(credits.creditsUsed)} used</span>
          <span>{Math.round(credits.creditsAllocated)} total</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Remaining</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {Math.round(credits.creditBalance)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Used</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {Math.round(credits.creditsUsed)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {Math.round(credits.creditsAllocated)}
          </p>
        </div>
      </div>

      {/* Plan info + upgrade prompt */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Plan: <span className="font-medium text-gray-900 dark:text-white capitalize">{credits.plan}</span>
        </p>
        {credits.creditBalance <= 0 && (
          <Link
            href="/pricing"
            className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Get More Credits
          </Link>
        )}
      </div>
    </div>
  );
}
