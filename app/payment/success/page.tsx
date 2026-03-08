'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const paymentId = searchParams.get('razorpay_payment_id');
    const paymentLinkId = searchParams.get('razorpay_payment_link_id');
    
    setPlan(planParam || 'plus');
    
    // If payment was successful (Razorpay redirects with payment_id)
    if (paymentId || paymentLinkId) {
      const affiliateCode = typeof window !== 'undefined' ? window.sessionStorage.getItem('ecosyz_affiliate_code') : null;
      if (affiliateCode) window.sessionStorage.removeItem('ecosyz_affiliate_code'); // Use once
      // Activate subscription
      fetch('/api/payments/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: planParam || 'plus',
          paymentId: paymentId,
          paymentLinkId: paymentLinkId,
          affiliateCode: affiliateCode || undefined,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSuccess(true);
            setLoading(false);
          } else {
            setError(data.error || 'Failed to activate subscription');
            setLoading(false);
          }
        })
        .catch((error) => {
          console.error('Error activating subscription:', error);
          setError('Failed to activate subscription. Please contact support.');
          setLoading(false);
        });
    } else {
      // No payment ID - might be direct visit or payment pending
      setLoading(false);
      setError('Payment verification failed. If you completed payment, please contact support.');
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Activating your subscription...</p>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-[#121212] border border-red-500/30 rounded-xl p-8 text-center">
            <div className="mb-6">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Payment Verification Issue</h1>
            <p className="text-gray-400 mb-8">{error}</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/contact"
                className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 bg-transparent border-2 border-emerald-500/50 text-emerald-400 rounded-lg font-semibold hover:border-emerald-500 transition-colors"
              >
                Back to Pricing
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-[#121212] border border-emerald-500/30 rounded-xl p-8 text-center">
          <div className="mb-6">
            <svg
              className="w-16 h-16 text-emerald-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Payment Successful! 🎉</h1>
          <p className="text-gray-400 mb-2">
            Your <strong className="text-emerald-400 capitalize">{plan || 'Plus'}</strong> plan subscription has been activated.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            You now have access to all premium features!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/studio"
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
            >
              Start Building
            </Link>
            <Link
              href="/profile"
              className="px-6 py-3 bg-transparent border-2 border-emerald-500/50 text-emerald-400 rounded-lg font-semibold hover:border-emerald-500 transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
