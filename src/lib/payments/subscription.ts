import { prisma } from '@/lib/db';
import { getAdminEmails } from '@/lib/admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ecosyz.com';

export type EffectivePlan = 'free' | 'plus' | 'enterprise';

interface UserSubscriptionData {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
}

/**
 * Resolves the user's effective plan considering trial period and subscription expiry.
 *
 * Priority:
 * 1. Active subscription that hasn't expired → subscriptionPlan
 * 2. Active trial period → 'plus'
 * 3. Otherwise → 'free'
 */
export function getEffectivePlan(user: UserSubscriptionData): EffectivePlan {
  const now = new Date();

  // Active subscription with valid billing period
  if (
    user.subscriptionStatus === 'active' &&
    user.subscriptionPlan &&
    (!user.subscriptionEndDate || user.subscriptionEndDate > now)
  ) {
    const plan = user.subscriptionPlan.trim().toLowerCase();
    if (plan === 'plus' || plan === 'pro') return 'plus';
    if (plan === 'enterprise') return 'enterprise';
  }

  // Cancelled subscription still within billing period
  if (
    user.subscriptionStatus === 'cancelled' &&
    user.subscriptionPlan &&
    user.subscriptionEndDate &&
    user.subscriptionEndDate > now
  ) {
    const plan = user.subscriptionPlan.trim().toLowerCase();
    if (plan === 'plus' || plan === 'pro') return 'plus';
    if (plan === 'enterprise') return 'enterprise';
  }

  // Active trial
  if (user.trialEndDate && user.trialEndDate > now) {
    return 'plus';
  }

  return 'free';
}

/**
 * Activate a subscription after verified payment.
 */
export async function activateSubscription(
  userId: string,
  plan: string,
  providerPaymentId: string,
  provider: 'razorpay' | 'stripe',
  amount: number,
  currency: string = 'INR',
  providerOrderId?: string,
  affiliateCode?: string | null
) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30); // 30-day billing period

  // Validate affiliate code
  let validAffiliateCode: string | null = null;
  if (affiliateCode) {
    const code = affiliateCode.trim().toUpperCase();
    if (code.length >= 4) {
      const partner = await prisma.partnershipApplication.findFirst({
        where: { affiliateCode: code, status: 'approved' },
      });
      if (partner) validAffiliateCode = code;
    }
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      amount,
      currency,
      provider,
      providerPaymentId,
      providerOrderId: providerOrderId || null,
      status: 'captured',
      plan: plan.toLowerCase(),
      affiliateCode: validAffiliateCode,
    },
  });

  // Update user subscription
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan.toLowerCase(),
      subscriptionStatus: 'active',
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      lastPaymentDate: now,
      lastPaymentAmount: amount,
      lastPaymentId: providerPaymentId,
      referredByAffiliateCode: validAffiliateCode,
    },
  });

  // Send confirmation email to user (non-blocking)
  sendSubscriptionEmail(updatedUser.email, updatedUser.name, plan, amount, currency, endDate).catch((err) =>
    console.error('Failed to send subscription email:', err)
  );

  // Notify admin (non-blocking)
  sendAdminNotification(updatedUser.email, updatedUser.name, plan, amount, currency, provider, providerPaymentId, validAffiliateCode).catch((err) =>
    console.error('Failed to send admin notification:', err)
  );
}

/**
 * Cancel a user's subscription. Access continues until subscriptionEndDate.
 */
export async function cancelSubscription(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'cancelled',
    },
  });
}

/**
 * Start a 14-day free trial for a new user.
 */
export async function startTrial(userId: string) {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  await prisma.user.update({
    where: { id: userId },
    data: {
      trialStartDate: now,
      trialEndDate: trialEnd,
    },
  });
}

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrency(amount: number, currency: string): string {
  if (currency.toUpperCase() === 'INR') return `₹${amount}`;
  return `${currency.toUpperCase()} ${amount}`;
}

async function sendSubscriptionEmail(
  email: string,
  name: string | null,
  plan: string,
  amount: number,
  currency: string,
  endDate: Date
) {
  if (!RESEND_API_KEY) return;

  const displayName = name || email.split('@')[0];
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const amountFormatted = formatCurrency(amount, currency);
  const nextBilling = formatDate(endDate);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your ${planName} plan is now active!
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#065f46,#047857);padding:32px 32px 24px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#ffffff;margin-bottom:8px;">Payment Confirmed</div>
          <div style="font-size:15px;color:#a7f3d0;">Your ${planName} plan is now active</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;font-size:16px;color:#1f2937;">Hi ${displayName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
            Thank you for subscribing to the <strong style="color:#065f46;">${planName}</strong> plan! Your payment has been successfully processed.
          </p>
          <!-- Receipt box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;">Plan</td>
                  <td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;">Amount</td>
                  <td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">${amountFormatted}/month</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;">Next billing</td>
                  <td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">${nextBilling}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <!-- What you get -->
          <p style="margin:0 0 12px;font-size:15px;color:#1f2937;font-weight:600;">What's included:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
            <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">&#10003; &nbsp;200 AI generations per month</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">&#10003; &nbsp;Unlimited workspaces</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">&#10003; &nbsp;Advanced AI research tools</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">&#10003; &nbsp;Full knowledge graph access</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">&#10003; &nbsp;Priority support</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">&#10003; &nbsp;API access (100K requests/month)</td></tr>
          </table>
          <!-- CTA -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center">
              <a href="${APP_URL}/studio" style="display:inline-block;padding:12px 32px;background-color:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">
                Start Building
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
            You can manage your subscription anytime from your <a href="${APP_URL}/profile" style="color:#059669;text-decoration:none;">profile</a>.
          </p>
          <p style="margin:0;font-size:12px;color:#d1d5db;">Open Idea &mdash; Build, Research, Innovate</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${displayName},

Thank you for subscribing to the ${planName} plan!

Payment Confirmed
- Plan: ${planName}
- Amount: ${amountFormatted}/month
- Next billing: ${nextBilling}

What's included:
- 200 AI generations per month
- Unlimited workspaces
- Advanced AI research tools
- Full knowledge graph access
- Priority support
- API access (100K requests/month)

Start building: ${APP_URL}/studio
Manage subscription: ${APP_URL}/profile

— Open Idea Team`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Open Idea <noreply@openidea.world>',
      to: [email],
      subject: `Your ${planName} plan is now active!`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[subscription-email] Resend error:', res.status, errText);
  }
}

async function sendAdminNotification(
  userEmail: string,
  userName: string | null,
  plan: string,
  amount: number,
  currency: string,
  provider: 'razorpay' | 'stripe',
  paymentId: string,
  affiliateCode: string | null
) {
  if (!RESEND_API_KEY) return;

  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return;

  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const amountFormatted = formatCurrency(amount, currency);
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 24px 16px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:18px;font-weight:700;color:#059669;">New Subscription</div>
          <div style="font-size:13px;color:#9ca3af;margin-top:4px;">${time} IST</div>
        </td></tr>
        <tr><td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;width:120px;">Customer</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${userName || '—'} (${userEmail})</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Plan</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${planName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Amount</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${amountFormatted}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Provider</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;">${provider.charAt(0).toUpperCase() + provider.slice(1)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Payment ID</td>
              <td style="padding:6px 0;font-size:13px;color:#6b7280;font-family:monospace;">${paymentId}</td>
            </tr>
            ${affiliateCode ? `<tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Affiliate</td>
              <td style="padding:6px 0;font-size:14px;color:#059669;font-weight:500;">${affiliateCode} (5% commission)</td>
            </tr>` : ''}
          </table>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <a href="${APP_URL}/admin" style="font-size:13px;color:#059669;text-decoration:none;">View Admin Dashboard</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `New Subscription — ${time} IST
Customer: ${userName || '—'} (${userEmail})
Plan: ${planName}
Amount: ${amountFormatted}
Provider: ${provider}
Payment ID: ${paymentId}${affiliateCode ? `\nAffiliate: ${affiliateCode} (5% commission)` : ''}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Open Idea <noreply@openidea.world>',
      to: adminEmails,
      subject: `New ${planName} subscription: ${userEmail} (${amountFormatted})`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[admin-notification] Resend error:', res.status, errText);
  }
}
