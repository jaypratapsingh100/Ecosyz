'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '../components/Header'
import Footer from '../components/Footer'

const AFFILIATE_STORAGE_KEY = 'ecosyz_affiliate_code'

type PaymentProvider = 'razorpay' | 'stripe'

function Tier({ title, price, priceUsd, description, features, ctaHref, isPopular, isPaid, onSubscribe, subscribing }: {
  title: string;
  price: string;
  priceUsd?: string;
  description: string;
  features: string[];
  ctaHref?: string;
  isPopular?: boolean;
  isPaid?: boolean;
  onSubscribe?: () => void;
  subscribing?: boolean;
}) {
  const btnClass = `w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
    isPopular
      ? 'bg-transparent border-2 border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400'
      : 'bg-transparent border-2 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400'
  } disabled:opacity-50 disabled:cursor-not-allowed`

  return (
    <div className={`relative p-8 rounded-xl flex flex-col border backdrop-blur-sm ${
      isPopular
        ? 'border-emerald-500 bg-black/60'
        : 'border-emerald-400/30 bg-black/50 hover:border-emerald-400/50 hover:bg-black/60'
    } transition-all duration-300`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-emerald-500 text-xs font-medium px-3 py-1 rounded-full text-white">
            Most popular
          </span>
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-white">{price}</span>
          {price !== 'Custom' && <span className="text-gray-400 ml-1">/month</span>}
        </div>
        {priceUsd && (
          <p className="text-sm text-gray-500 mt-1">{priceUsd}/month</p>
        )}
      </div>
      <ul className="space-y-3 text-sm flex-1 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 items-start text-gray-300">
            <svg className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M7.75 12.75L10 15.25L16.25 8.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {isPaid && onSubscribe ? (
        <button
          onClick={onSubscribe}
          disabled={subscribing}
          className={btnClass}
        >
          {subscribing ? 'Processing...' : `Subscribe for ${price}${priceUsd ? ` (${priceUsd})` : ''}/month`}
        </button>
      ) : ctaHref?.includes('contact') ? (
        <Link href={ctaHref || '/contact'} className={btnClass}>
          Contact Sales
        </Link>
      ) : (
        <Link href={ctaHref || '/auth?plan=free'} className={btnClass}>
          Get Started
        </Link>
      )}
    </div>
  );
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function PricingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [affiliateCode, setAffiliateCode] = useState('')
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('razorpay')
  const [subscribing, setSubscribing] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  // Pre-fill from ?ref= URL param
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      const code = ref.trim().toUpperCase()
      setAffiliateCode(code)
      if (typeof window !== 'undefined') window.sessionStorage.setItem(AFFILIATE_STORAGE_KEY, code)
    } else if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(AFFILIATE_STORAGE_KEY)
      if (stored) setAffiliateCode(stored)
    }
  }, [searchParams])

  const handleAffiliateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim().toUpperCase()
    setAffiliateCode(v)
    if (typeof window !== 'undefined') {
      if (v) window.sessionStorage.setItem(AFFILIATE_STORAGE_KEY, v)
      else window.sessionStorage.removeItem(AFFILIATE_STORAGE_KEY)
    }
  }

  const handleSubscribe = useCallback(async (plan: string) => {
    setSubscribing(true)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, provider: paymentProvider }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth?redirect=${encodeURIComponent('/pricing')}&plan=${plan}`)
          return
        }
        const text = await res.text()
        let errorMsg = 'Failed to create order'
        try {
          const data = JSON.parse(text)
          errorMsg = data.error || errorMsg
        } catch {
          // Server returned HTML error page
        }
        alert(errorMsg)
        return
      }

      const data = await res.json()

      if (paymentProvider === 'stripe') {
        // Redirect to Stripe Checkout
        if (data.sessionUrl) {
          window.location.href = data.sessionUrl
        }
        return
      }

      // Razorpay Checkout
      if (!window.Razorpay) {
        alert('Payment system is loading. Please try again.')
        return
      }

      const affiliate = typeof window !== 'undefined'
        ? window.sessionStorage.getItem(AFFILIATE_STORAGE_KEY)
        : null

      const options = {
        key: data.key,
        amount: data.amount,
        currency: 'INR',
        name: 'Open Idea',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`,
        order_id: data.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                affiliateCode: affiliate || undefined,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              if (affiliate) window.sessionStorage.removeItem(AFFILIATE_STORAGE_KEY)
              router.push(`/payment/success?plan=${plan}&provider=razorpay&verified=true`)
            } else {
              alert(verifyData.error || 'Payment verification failed. Please contact support.')
            }
          } catch {
            alert('Payment verification failed. Please contact support.')
          }
        },
        theme: { color: '#10b981' },
        display: {
          hide: [{ method: 'currency_conversion' }],
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error('Subscribe error:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }, [paymentProvider, router])

  const tiers = [
    {
      title: "Free",
      price: "₹0",
      priceUsd: "$0",
      description: "Basic access for individuals getting started",
      features: [
        "3 workspaces",
        "Basic AI search capabilities",
        "Public knowledge graph access",
        "Standard support",
        "Community features",
        "1GB storage per workspace"
      ],
      ctaHref: "/auth?plan=free"
    },
    {
      title: "Basic",
      price: "₹200",
      priceUsd: "$2.50",
      description: "Essential tools for getting more done",
      features: [
        "Everything in Free",
        "5 workspaces",
        "Enhanced AI search",
        "Priority support",
        "2GB storage per workspace"
      ],
      isPaid: true,
      planId: "basic"
    },
    {
      title: "Plus",
      price: "₹999",
      priceUsd: "$12",
      description: "Enhanced capabilities for power users",
      features: [
        "Everything in Free",
        "Unlimited workspaces",
        "Advanced AI research tools",
        "Full knowledge graph access",
        "Priority support",
        "5GB storage per workspace",
        "API access (100K requests/month)"
      ],
      isPaid: true,
      isPopular: true,
      planId: "plus"
    },
    {
      title: "Enterprise",
      price: "Custom",
      description: "Advanced features for organizations",
      features: [
        "Everything in Plus",
        "Custom workspace limits",
        "Dedicated support",
        "Custom AI model training",
        "Advanced security & compliance",
        "Unlimited storage",
        "Custom API limits",
        "SSO & team management"
      ],
      ctaHref: "/contact?enquiry=enterprise"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />
      <Header />

      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          {/* Globe background image */}
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

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold text-white mb-3">
              Get Access to Open Idea
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Simple, transparent pricing that grows with you. Try any plan free for 14 days.
            </p>
          </div>

          {/* Payment method toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border border-emerald-500/30 bg-black/40 p-1">
              <button
                onClick={() => setPaymentProvider('razorpay')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  paymentProvider === 'razorpay'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Razorpay (UPI/Cards)
              </button>
              <button
                onClick={() => setPaymentProvider('stripe')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  paymentProvider === 'stripe'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Stripe (International)
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <label htmlFor="affiliate-code" className="block text-sm text-gray-400 mb-2 text-center">
              Have a referral or affiliate code?
            </label>
            <input
              id="affiliate-code"
              type="text"
              value={affiliateCode}
              onChange={handleAffiliateChange}
              placeholder="Enter code (e.g. EC123456)"
              className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-emerald-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 text-center font-mono uppercase"
            />
            {affiliateCode && (
              <p className="text-xs text-emerald-400/80 mt-1 text-center">
                Your partner will earn 5% when you subscribe
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto relative">
            {tiers.map((tier) => (
              <Tier
                key={tier.title}
                {...tier}
                onSubscribe={tier.isPaid && tier.planId ? () => handleSubscribe(tier.planId!) : undefined}
                subscribing={subscribing}
              />
            ))}
          </div>

          <div className="mt-16 max-w-3xl mx-auto text-center">
            <p className="text-sm text-gray-400">
              Have questions about pricing? <Link href="/contact" className="text-emerald-500 hover:text-emerald-400">Talk to us</Link>
            </p>
          </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </main>
        <Footer />
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
