import { getAdminEmails } from '@/lib/admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ecosyz.com';

async function sendEmail(to: string[], subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) return;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Open Idea <noreply@openidea.world>',
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[affiliate-email] Resend error:', res.status, errText);
  }
}

function wrapHtml(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#065f46,#047857);padding:32px 32px 24px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#ffffff;margin-bottom:8px;">${title}</div>
        </td></tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#d1d5db;">Open Idea &mdash; Build, Research, Innovate</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function notifyAffiliateCommissionEarned(
  email: string,
  name: string,
  amount: number,
  affiliateCode: string,
  commissionRate: number = 0.05,
  upgradedTier: string | null = null
) {
  const ratePercent = Math.round(commissionRate * 100);
  const upgradeHtml = upgradedTier
    ? `<p style="margin:16px 0;padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:15px;color:#065f46;font-weight:600;">Congratulations! You've been upgraded to <strong>${upgradedTier}</strong> tier!</p>`
    : '';
  const html = wrapHtml(
    'Commission Earned!',
    `You earned a new commission of ₹${amount.toFixed(2)}`,
    `<p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
     <p style="margin:0 0 12px;font-size:15px;color:#4b5563;">A new subscriber used your affiliate code <strong style="color:#059669;">${affiliateCode}</strong>.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:8px;margin:16px 0;">
       <tr><td style="padding:20px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Commission (${ratePercent}%)</td><td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">₹${amount.toFixed(2)}</td></tr>
           <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Status</td><td style="padding:8px 0;font-size:14px;color:#f59e0b;text-align:right;font-weight:600;">On hold (30 days)</td></tr>
         </table>
       </td></tr>
     </table>
     ${upgradeHtml}
     <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">This commission will be eligible for payout after 30 days.</p>
     <p style="margin:16px 0 0;"><a href="${APP_URL}/partnership/dashboard" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Dashboard</a></p>`
  );
  const upgradeText = upgradedTier ? ` You've been upgraded to ${upgradedTier} tier!` : '';
  const text = `Hi ${name}, a new subscriber used your code ${affiliateCode}. You earned ₹${amount.toFixed(2)} commission at ${ratePercent}% (eligible for payout after 30 days).${upgradeText} View: ${APP_URL}/partnership/dashboard`;
  await sendEmail([email], `Commission Earned: ₹${amount.toFixed(2)}`, html, text).catch(console.error);
}

export async function notifyAffiliatePayoutSent(
  email: string,
  name: string,
  amount: number,
  method: string,
  transactionRef?: string | null
) {
  const refLine = transactionRef
    ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Reference</td><td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">${transactionRef}</td></tr>`
    : '';
  const html = wrapHtml(
    'Payout Sent!',
    `Your commission payout of ₹${amount.toFixed(2)} has been sent`,
    `<p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
     <p style="margin:0 0 16px;font-size:15px;color:#4b5563;">Your affiliate commission payout has been processed and sent to your registered ${method === 'upi' ? 'UPI ID' : 'bank account'}.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:8px;margin-bottom:16px;">
       <tr><td style="padding:20px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Amount</td><td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">₹${amount.toFixed(2)}</td></tr>
           <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Method</td><td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">${method === 'upi' ? 'UPI' : 'Bank Transfer'}</td></tr>
           ${refLine}
         </table>
       </td></tr>
     </table>
     <p style="margin:16px 0 0;"><a href="${APP_URL}/partnership/dashboard" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Dashboard</a></p>`
  );
  const text = `Hi ${name}, your commission payout of ₹${amount.toFixed(2)} has been sent via ${method === 'upi' ? 'UPI' : 'bank transfer'}.${transactionRef ? ` Ref: ${transactionRef}` : ''} View: ${APP_URL}/partnership/dashboard`;
  await sendEmail([email], `Payout Sent: ₹${amount.toFixed(2)}`, html, text).catch(console.error);
}

export async function notifyAdminCommissionCreated(
  partnerName: string,
  affiliateCode: string,
  commissionAmount: number,
  subscriberEmail: string,
  commissionRate: number = 0.05
) {
  const adminEmails = getAdminEmails();
  if (!adminEmails.length) return;
  const ratePercent = Math.round(commissionRate * 100);
  const html = wrapHtml(
    'New Affiliate Commission',
    `₹${commissionAmount.toFixed(2)} commission for ${partnerName}`,
    `<p style="margin:0 0 16px;font-size:15px;color:#4b5563;">A new commission of <strong>₹${commissionAmount.toFixed(2)}</strong> (${ratePercent}%) has been recorded for partner <strong>${partnerName}</strong> (code: ${affiliateCode}).</p>
     <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Subscriber: ${subscriberEmail}</p>
     <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Eligible for payout after 30 days.</p>
     <p style="margin:16px 0 0;"><a href="${APP_URL}/admin/affiliate-commissions" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Commissions</a></p>`
  );
  const text = `New affiliate commission: ₹${commissionAmount.toFixed(2)} (${ratePercent}%) for ${partnerName} (${affiliateCode}). Subscriber: ${subscriberEmail}. Eligible after 30 days.`;
  await sendEmail(adminEmails, `Affiliate Commission: ₹${commissionAmount.toFixed(2)} for ${partnerName}`, html, text).catch(console.error);
}
