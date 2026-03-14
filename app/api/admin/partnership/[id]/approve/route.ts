import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ecosyz.com';

/**
 * PATCH: Approve or reject a partnership application (admin only)
 * Body: { status: 'approved' | 'rejected' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = (body.status as string)?.toLowerCase();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const application = await prisma.partnershipApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate unique affiliate code when approving
    let affiliateCode: string | null = null;
    if (status === 'approved') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0,O,1,I
      let code: string;
      let exists = true;
      let attempts = 0;
      while (exists && attempts < 10) {
        code = 'EC' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const existing = await prisma.partnershipApplication.findUnique({ where: { affiliateCode: code } });
        exists = !!existing;
        affiliateCode = exists ? null : code;
        attempts++;
      }
      if (!affiliateCode) {
        affiliateCode = 'EC' + Date.now().toString(36).toUpperCase().slice(-6);
      }
    }

    await prisma.partnershipApplication.update({
      where: { id },
      data: {
        status,
        affiliateCode: status === 'approved' ? affiliateCode : null,
        reviewedAt: new Date(),
        reviewedBy: user.email,
      },
    });

    // Send affiliate code and link to partner email when approved
    if (status === 'approved' && affiliateCode && RESEND_API_KEY) {
      const affiliateLink = `${APP_URL.replace(/\/$/, '')}/pricing?ref=${affiliateCode}`;
      const html = `
        <h2>Your ECOSYZ Affiliate Partnership is Approved!</h2>
        <p>Hi ${application.name || 'Partner'},</p>
        <p>Congratulations! Your affiliate partnership application has been approved.</p>
        <p><strong>Your affiliate code:</strong> <code style="background:#0f172a;padding:4px 8px;border-radius:4px;font-size:18px;">${affiliateCode}</code></p>
        <p><strong>Your referral link:</strong></p>
        <p><a href="${affiliateLink}" style="color:#10b981;word-break:break-all;">${affiliateLink}</a></p>
        <p>Share your link or code with your network. When someone subscribes and enters your code on the pricing page, you earn commissions starting at 5% (Bronze tier). Refer 10+ subscribers to unlock 7% (Silver) and 25+ for 10% (Gold).</p>
        <p>Best regards,<br/>ECOSYZ Team</p>
      `;
      const text = `
Your ECOSYZ Affiliate Partnership is Approved!

Hi ${application.name || 'Partner'},

Congratulations! Your affiliate partnership application has been approved.

Your affiliate code: ${affiliateCode}

Your referral link: ${affiliateLink}

Share your link or code with your network. When someone subscribes and enters your code on the pricing page, you earn commissions starting at 5% (Bronze). Refer 10+ for 7% (Silver) and 25+ for 10% (Gold).

Best regards,
ECOSYZ Team
      `.trim();

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Open Idea <noreply@openidea.world>',
            to: [application.email],
            subject: `Your ECOSYZ Affiliate Code: ${affiliateCode}`,
            html,
            text,
          }),
        });
        if (!resendRes.ok) {
          const errText = await resendRes.text();
          console.error('[admin/partnership/approve] Resend error:', resendRes.status, errText);
        }
      } catch (emailErr) {
        console.error('[admin/partnership/approve] Email send failed:', emailErr);
      }
    }

    return NextResponse.json({ success: true, status, affiliateCode: status === 'approved' ? affiliateCode : undefined });
  } catch (err) {
    console.error('[admin/partnership/approve]', err);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
