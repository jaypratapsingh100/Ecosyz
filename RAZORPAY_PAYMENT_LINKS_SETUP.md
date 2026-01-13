# 🔗 Razorpay Payment Links - Quick Setup Guide

**Simplest payment integration - No complex code needed!**

---

## ✅ Why Payment Links?

- ✅ **Simplest** - Minimal code required
- ✅ **Quick setup** - Can accept payments in minutes
- ✅ **No complex webhooks** - Simple integration
- ✅ **Perfect for MVP** - Get started fast

---

## 🚀 Step-by-Step Setup

### **Step 1: Create Razorpay Account** (5 minutes)

1. Go to https://razorpay.com
2. Sign up for free account
3. Complete KYC (if needed for live mode)
4. Get your API keys:
   - Dashboard → Settings → API Keys
   - Copy `Key ID` and `Key Secret`

---

### **Step 2: Add Environment Variables**

Add to `.env.local`:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key
```

---

### **Step 3: Install Razorpay SDK**

```bash
npm install razorpay
# or
pnpm add razorpay
```

---

### **Step 4: Create Payment Link API** (Simplest Version)

**File:** `app/api/payments/create-link/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCurrentUser } from '@/src/lib/auth';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { plan, amount, email } = await req.json();

    // Create payment link
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100, // Amount in paise (₹999 = 99900 paise)
      currency: 'INR',
      description: `${plan} Plan Subscription - Open Idea`,
      customer: {
        name: user.name || 'Customer',
        email: email || user.email,
      },
      notify: {
        sms: false,
        email: true,
      },
      reminder_enable: true,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?plan=${plan}`,
      callback_method: 'get',
    });

    return NextResponse.json({
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      url: paymentLink.short_url,
    });
  } catch (error: any) {
    console.error('Payment link creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### **Step 5: Create Payment Success Page**

**File:** `app/payment/success/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    setPlan(planParam);
    
    // Update user subscription in database
    if (planParam) {
      fetch('/api/payments/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planParam }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('Subscription activated:', data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error activating subscription:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
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
            Your <strong className="text-emerald-400">{plan || 'Plus'}</strong> plan subscription has been activated.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            You now have access to all premium features!
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/app-builder"
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
```

---

### **Step 6: Create Subscription Activation API**

**File:** `app/api/payments/activate-subscription/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { plan } = await req.json();

    // Update user subscription
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        lastPaymentDate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      plan: plan,
    });
  } catch (error: any) {
    console.error('Subscription activation error:', error);
    return NextResponse.json(
      { error: 'Failed to activate subscription' },
      { status: 500 }
    );
  }
}
```

---

### **Step 7: Update Pricing Page with Payment Link**

**Update:** `app/pricing/page.tsx`

Add this component:

```typescript
'use client';

import { useState } from 'react';

function PaymentLinkButton({ plan, amount }: { plan: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, amount }),
      });

      const data = await res.json();
      
      if (data.url) {
        // Open payment link in new tab
        window.open(data.url, '_blank');
        setPaymentUrl(data.url);
      } else {
        alert('Failed to create payment link. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to create payment link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full text-center px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
          loading
            ? 'opacity-50 cursor-not-allowed'
            : 'bg-transparent border-2 border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400'
        }`}
      >
        {loading ? 'Creating Payment Link...' : `Subscribe for ₹${amount}/month`}
      </button>
      {paymentUrl && (
        <p className="text-xs text-gray-500 mt-2">
          Payment link opened in new tab. Complete payment to activate subscription.
        </p>
      )}
    </>
  );
}
```

Then update the Tier component to use PaymentLinkButton instead of Link for paid plans:

```typescript
{price === 'Free' ? (
  <Link href={ctaHref || '/auth?plan=free'}>
    Get Started
  </Link>
) : price === 'Custom' ? (
  <Link href={ctaHref || '/contact'}>
    Contact Sales
  </Link>
) : (
  <PaymentLinkButton plan={title.toLowerCase()} amount={parseInt(price.replace('₹', ''))} />
)}
```

---

## 📋 Complete Implementation Checklist

- [ ] Create Razorpay account
- [ ] Get API keys
- [ ] Add environment variables
- [ ] Install razorpay package
- [ ] Create `/api/payments/create-link/route.ts`
- [ ] Create `/api/payments/activate-subscription/route.ts`
- [ ] Create `/app/payment/success/page.tsx`
- [ ] Update pricing page with PaymentLinkButton
- [ ] Test in test mode
- [ ] Switch to live mode

---

## 🧪 Testing

### Test Mode:
1. Use test API keys (starts with `rzp_test_`)
2. Use test card: `4111 1111 1111 1111`
3. Any future expiry date
4. Any CVV

### Test Flow:
1. Click "Subscribe" on pricing page
2. Payment link opens in new tab
3. Complete test payment
4. Redirects to success page
5. Subscription activated automatically

---

## ⚠️ Important Notes

### Limitations of Payment Links:
1. **Manual Renewal**: You'll need to send new payment link each month
2. **No Auto-Renewal**: Customers won't be charged automatically
3. **Manual Tracking**: You track subscriptions manually

### Workaround for Renewals:
- Send email reminder before expiry
- Include payment link in email
- Or upgrade to Subscriptions API later

---

## 🚀 Quick Start (5 Minutes)

1. **Sign up**: https://razorpay.com
2. **Get keys**: Dashboard → Settings → API Keys
3. **Add to .env**: Copy keys to `.env.local`
4. **I'll implement**: Tell me "implement payment links" and I'll add all the code!

---

## 📞 Next Steps

**Option 1: I implement it for you**
- Say "implement payment links"
- I'll add all the code
- You just add API keys
- Done in 10 minutes!

**Option 2: You implement**
- Follow the steps above
- Use the code provided
- Test in test mode
- Go live!

---

**Last Updated:** December 2024
**Status:** Ready to Implement
**Time to Implement:** 10-15 minutes (if I do it) or 30-60 minutes (if you do it)
