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
    console.error('[stipend-email] Resend error:', res.status, errText);
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

export async function notifyTaskApproved(
  email: string,
  name: string,
  taskTitle: string,
  stipend?: number | null
) {
  const stipendLine = stipend && stipend > 0
    ? `<p style="margin:12px 0;font-size:15px;color:#065f46;font-weight:600;">A stipend of ₹${stipend} has been queued for payout.</p>`
    : '';
  const html = wrapHtml(
    'Task Approved!',
    `Your task "${taskTitle}" has been approved`,
    `<p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
     <p style="margin:0 0 12px;font-size:15px;color:#4b5563;">Your task <strong>"${taskTitle}"</strong> has been reviewed and approved.</p>
     ${stipendLine}
     <p style="margin:16px 0 0;"><a href="${APP_URL}/intern-fellowship/dashboard" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Dashboard</a></p>`
  );
  const text = `Hi ${name}, your task "${taskTitle}" has been approved!${stipend ? ` A stipend of ₹${stipend} has been queued.` : ''} View: ${APP_URL}/intern-fellowship/dashboard`;
  await sendEmail([email], `Task Approved: ${taskTitle}`, html, text).catch(console.error);
}

export async function notifyTaskRejected(
  email: string,
  name: string,
  taskTitle: string,
  feedback: string
) {
  const html = wrapHtml(
    'Task Needs Changes',
    `Your task "${taskTitle}" needs revisions`,
    `<p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
     <p style="margin:0 0 12px;font-size:15px;color:#4b5563;">Your task <strong>"${taskTitle}"</strong> has been reviewed and needs some changes.</p>
     <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin:16px 0;">
       <p style="margin:0;font-size:14px;color:#92400e;"><strong>Feedback:</strong> ${feedback}</p>
     </div>
     <p style="margin:16px 0 0;"><a href="${APP_URL}/intern-fellowship/dashboard" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Update Task</a></p>`
  );
  const text = `Hi ${name}, your task "${taskTitle}" needs changes. Feedback: ${feedback}. Update: ${APP_URL}/intern-fellowship/dashboard`;
  await sendEmail([email], `Task Needs Changes: ${taskTitle}`, html, text).catch(console.error);
}

export async function notifyMilestoneCompleted(
  email: string,
  name: string,
  milestoneTitle: string,
  stipend?: number | null
) {
  const stipendLine = stipend && stipend > 0
    ? `<p style="margin:12px 0;font-size:15px;color:#065f46;font-weight:600;">A milestone stipend of ₹${stipend} has been queued for payout.</p>`
    : '';
  const html = wrapHtml(
    'Milestone Completed!',
    `Congratulations! Milestone "${milestoneTitle}" completed`,
    `<p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
     <p style="margin:0 0 12px;font-size:15px;color:#4b5563;">Congratulations! You've completed all tasks in milestone <strong>"${milestoneTitle}"</strong>.</p>
     ${stipendLine}
     <p style="margin:16px 0 0;"><a href="${APP_URL}/intern-fellowship/dashboard" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Dashboard</a></p>`
  );
  const text = `Hi ${name}, congratulations! Milestone "${milestoneTitle}" completed!${stipend ? ` Stipend of ₹${stipend} queued.` : ''} View: ${APP_URL}/intern-fellowship/dashboard`;
  await sendEmail([email], `Milestone Completed: ${milestoneTitle}`, html, text).catch(console.error);
}

export async function notifyPayoutProcessed(
  email: string,
  name: string,
  amount: number,
  transactionRef?: string | null
) {
  const refLine = transactionRef
    ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Reference</td><td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">${transactionRef}</td></tr>`
    : '';
  const html = wrapHtml(
    'Stipend Paid!',
    `Your stipend of ₹${amount} has been sent`,
    `<p style="margin:0 0 16px;font-size:16px;color:#1f2937;">Hi ${name},</p>
     <p style="margin:0 0 16px;font-size:15px;color:#4b5563;">Your stipend has been processed and sent to your registered payment details.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:8px;margin-bottom:16px;">
       <tr><td style="padding:20px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Amount</td><td style="padding:8px 0;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">₹${amount}</td></tr>
           ${refLine}
         </table>
       </td></tr>
     </table>`
  );
  const text = `Hi ${name}, your stipend of ₹${amount} has been sent!${transactionRef ? ` Ref: ${transactionRef}` : ''}`;
  await sendEmail([email], `Stipend Paid: ₹${amount}`, html, text).catch(console.error);
}

export async function notifyAdminPendingPayout(internName: string, amount: number, type: 'task' | 'milestone') {
  const adminEmails = getAdminEmails();
  if (!adminEmails.length) return;
  const html = wrapHtml(
    'New Payout Pending',
    `Stipend payout of ₹${amount} pending for ${internName}`,
    `<p style="margin:0 0 16px;font-size:15px;color:#4b5563;">A new ${type} stipend of <strong>₹${amount}</strong> is pending for intern <strong>${internName}</strong>.</p>
     <p style="margin:16px 0 0;"><a href="${APP_URL}/admin/interns/payouts" style="display:inline-block;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Process Payouts</a></p>`
  );
  const text = `New ${type} stipend of ₹${amount} pending for ${internName}. Process: ${APP_URL}/admin/interns/payouts`;
  await sendEmail(adminEmails, `Payout Pending: ₹${amount} for ${internName}`, html, text).catch(console.error);
}
