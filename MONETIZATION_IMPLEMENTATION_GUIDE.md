# 🚀 Quick Implementation Guide - Monetization Features

**Step-by-step implementation guide for critical monetization features**

---

## 1. Payment Gateway Setup (Razorpay - Recommended for India)

### Step 1: Install Dependencies
```bash
npm install razorpay
# or
pnpm add razorpay
```

### Step 2: Environment Variables
Add to `.env.local`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Step 3: Create Payment API Route
**File:** `app/api/payments/checkout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/db';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { plan, amount } = await req.json();
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        userId: user.id,
        plan: plan,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Payment checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
```

### Step 4: Create Webhook Handler
**File:** `app/api/payments/webhook/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/src/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    // Handle payment success
    if (eventType === 'payment.captured') {
      const { order_id, payment_id, amount, notes } = payload.payment.entity;
      const userId = notes.userId;
      const plan = notes.plan;

      // Update user subscription
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: plan,
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          lastPaymentAmount: amount / 100,
          lastPaymentId: payment_id,
          lastPaymentDate: new Date(),
        },
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          userId: userId,
          amount: amount / 100,
          currency: 'INR',
          status: 'completed',
          paymentMethod: 'razorpay',
          paymentId: payment_id,
          subscriptionId: order_id,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

---

## 2. Usage Limit Enforcement

### Step 1: Create Usage Tracking Middleware
**File:** `app/api/middleware/usage-check.ts`
```typescript
import { prisma } from '@/src/lib/db';

export const PLAN_LIMITS = {
  free: {
    workspaces: 3,
    aiChatRequests: 50,
    appProjects: 3,
    apiRequests: 0,
    storageGB: 1,
    deployments: 0,
    searches: 100,
  },
  plus: {
    workspaces: -1, // unlimited
    aiChatRequests: 500,
    appProjects: 20,
    apiRequests: 100000,
    storageGB: 5,
    deployments: 10,
    searches: -1, // unlimited
  },
  enterprise: {
    // Custom limits
  },
};

export async function checkUsageLimit(
  userId: string,
  feature: 'aiChat' | 'appProject' | 'apiRequest' | 'deployment' | 'workspace' | 'search',
  plan: string
): Promise<{ allowed: boolean; remaining?: number; limit?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });

  const userPlan = user?.subscriptionPlan || 'free';
  const limits = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  const limit = limits[feature];

  // Unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // Not allowed
  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  // Get current usage
  const usage = await getCurrentUsage(userId, feature);
  const remaining = Math.max(0, limit - usage);

  return {
    allowed: usage < limit,
    remaining,
    limit,
  };
}

async function getCurrentUsage(
  userId: string,
  feature: 'aiChat' | 'appProject' | 'apiRequest' | 'deployment' | 'workspace' | 'search'
): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  switch (feature) {
    case 'aiChat':
      // Count AI chat requests this month
      return await prisma.appChat.count({
        where: {
          project: { ownerId: userId },
          createdAt: { gte: startOfMonth },
        },
      });

    case 'appProject':
      return await prisma.appProject.count({
        where: {
          ownerId: userId,
          createdAt: { gte: startOfMonth },
        },
      });

    case 'workspace':
      return await prisma.workspace.count({
        where: { ownerId: userId },
      });

    case 'search':
      return await prisma.searchLog.count({
        where: {
          userId: userId,
          createdAt: { gte: startOfMonth },
        },
      });

    default:
      return 0;
  }
}
```

### Step 2: Add Usage Check to API Routes
**Example:** `app/api/app-projects/[id]/chat/route.ts`
```typescript
import { checkUsageLimit } from '../../../middleware/usage-check';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check usage limit
    const usageCheck = await checkUsageLimit(user.id, 'aiChat', user.subscriptionPlan || 'free');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Usage limit exceeded',
          message: `You've reached your monthly limit of ${usageCheck.limit} AI chat requests. Upgrade to Plus for more.`,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
        },
        { status: 403 }
      );
    }

    // Continue with chat logic...
  } catch (error) {
    // ...
  }
}
```

---

## 3. Subscription Management API

### Step 1: Create Subscription Routes
**File:** `app/api/subscriptions/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/db';

// Get current subscription
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartDate: true,
        lastPaymentDate: true,
        lastPaymentAmount: true,
      },
    });

    return NextResponse.json({
      plan: userData?.subscriptionPlan || 'free',
      status: userData?.subscriptionStatus || 'inactive',
      startDate: userData?.subscriptionStartDate,
      lastPayment: {
        date: userData?.lastPaymentDate,
        amount: userData?.lastPaymentAmount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

// Cancel subscription
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'cancelled',
      },
    });

    return NextResponse.json({ message: 'Subscription cancelled' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
```

---

## 4. Usage Dashboard Component

### Step 1: Create Usage Dashboard
**File:** `app/components/billing/UsageDashboard.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';

interface UsageStats {
  aiChat: { used: number; limit: number };
  appProjects: { used: number; limit: number };
  workspaces: { used: number; limit: number };
  searches: { used: number; limit: number };
}

export default function UsageDashboard() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage/current')
      .then((res) => res.json())
      .then((data) => {
        setUsage(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!usage) return <div>No usage data</div>;

  const UsageBar = ({ label, used, limit }: { label: string; used: number; limit: number }) => {
    const percentage = limit === -1 ? 0 : (used / limit) * 100;
    const isUnlimited = limit === -1;

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">{label}</span>
          <span className="text-gray-400">
            {isUnlimited ? 'Unlimited' : `${used} / ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Usage This Month</h2>
      
      <UsageBar label="AI Chat Requests" {...usage.aiChat} />
      <UsageBar label="App Projects" {...usage.appProjects} />
      <UsageBar label="Workspaces" {...usage.workspaces} />
      <UsageBar label="Searches" {...usage.searches} />
    </div>
  );
}
```

---

## 5. Database Migration

### Step 1: Update Prisma Schema
Add to `prisma/schema.prisma`:
```prisma
model Payment {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount          Float
  currency        String   @default("INR")
  status          String   // pending, completed, failed, refunded
  paymentMethod   String?  // razorpay, stripe, paypal
  paymentId       String?  // Gateway payment ID
  subscriptionId  String?  // Gateway subscription ID
  invoiceUrl      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model Credit {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount      Float    // Credit balance
  currency    String   @default("INR")
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  transactions CreditTransaction[]
  
  @@index([userId])
  @@unique([userId])
}

model CreditTransaction {
  id          String   @id @default(cuid())
  creditId    String
  credit      Credit   @relation(fields: [creditId], references: [id], onDelete: Cascade)
  amount      Float    // Positive = credit, Negative = debit
  type        String   // purchase, usage, refund, bonus
  description String?
  metadata    Json?    // Additional transaction data
  createdAt   DateTime @default(now())
  
  @@index([creditId])
  @@index([createdAt])
}

// Update User model
model User {
  // ... existing fields ...
  payments    Payment[]
  credit       Credit?
}
```

### Step 2: Run Migration
```bash
npx prisma migrate dev --name add_monetization_features
npx prisma generate
```

---

## 6. Frontend Payment Integration

### Step 1: Install Razorpay Checkout
```bash
npm install razorpay
```

### Step 2: Create Checkout Component
**File:** `app/components/billing/CheckoutButton.tsx`
```typescript
'use client';

import { useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutButton({ plan, amount }: { plan: string; amount: number }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create order
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, amount }),
      });

      const { orderId } = await res.json();

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: 'INR',
        name: 'Open Idea',
        description: `${plan} Plan Subscription`,
        order_id: orderId,
        handler: function (response: any) {
          // Payment successful
          window.location.href = '/billing?success=true';
        },
        prefill: {
          // Pre-fill user details
        },
        theme: {
          color: '#10b981', // emerald-500
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Subscribe for ₹${amount}/month`}
      </button>
    </>
  );
}
```

---

## 7. Quick Start Checklist

### Week 1: Payment Infrastructure
- [ ] Set up Razorpay account
- [ ] Add environment variables
- [ ] Create payment checkout API
- [ ] Create webhook handler
- [ ] Test payment flow

### Week 2: Subscription Management
- [ ] Create subscription API routes
- [ ] Update database schema
- [ ] Create subscription dashboard
- [ ] Add usage limit checks
- [ ] Test subscription flow

### Week 3: Usage Tracking
- [ ] Create usage tracking middleware
- [ ] Add usage checks to all APIs
- [ ] Create usage dashboard
- [ ] Add usage analytics
- [ ] Test usage limits

### Week 4: Billing Dashboard
- [ ] Create billing page
- [ ] Add invoice generation
- [ ] Add payment history
- [ ] Add upgrade/downgrade flow
- [ ] Polish UI/UX

---

## 📚 Additional Resources

- **Razorpay Docs**: https://razorpay.com/docs/
- **Stripe Docs**: https://stripe.com/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

**Next Steps:**
1. Choose payment gateway (Razorpay recommended)
2. Set up test account
3. Implement checkout flow
4. Test end-to-end payment
5. Deploy to production
