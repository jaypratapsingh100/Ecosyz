import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const CAREERS_RECIPIENT = 'info@openidea.world';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * POST: Submit partnership/affiliate application.
 * Saves to DB and sends email via Resend.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = (formData.get('name') as string)?.trim() || '';
    const email = (formData.get('email') as string)?.trim() || '';
    const linkedin = (formData.get('linkedin') as string)?.trim() || null;
    const coverNote = (formData.get('coverNote') as string)?.trim() || null;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Save to database
    const application = await prisma.partnershipApplication.create({
      data: {
        name: name || '—',
        email,
        linkedin,
        coverNote,
        status: 'pending',
      },
    });

    // Send email via Resend (keep existing flow)
    if (RESEND_API_KEY) {
      const html = `
        <h2>New Partnership Application: Affiliate Program</h2>
        <p><strong>Name:</strong> ${name || '—'}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${linkedin ? `<p><strong>LinkedIn:</strong> <a href="${linkedin}">${linkedin}</a></p>` : ''}
        ${coverNote ? `<p><strong>Cover Note:</strong></p><p>${coverNote.replace(/\n/g, '<br>')}</p>` : ''}
        <p><em>Application ID: ${application.id}</em></p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ecosyz.com'}/admin/partnership">Review in Admin Panel</a></p>
      `;

      const text = `
New Partnership Application: Affiliate Program

Name: ${name || '—'}
Email: ${email}
${linkedin ? `LinkedIn: ${linkedin}` : ''}
${coverNote ? `\nCover Note:\n${coverNote}` : ''}

Application ID: ${application.id}
Review at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://ecosyz.com'}/admin/partnership
      `.trim();

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Open Idea Careers <noreply@openidea.world>',
          to: [CAREERS_RECIPIENT],
          subject: `Partnership Application: ${name || email}`,
          html,
          text,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error('[partnership/apply] Resend error:', resendRes.status, errText);
        // Don't fail - application is saved to DB
      }
    }

    return NextResponse.json({ success: true, id: application.id });
  } catch (err) {
    console.error('[partnership/apply]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Something went wrong. Please try again.',
        ...(isDev && { details: message }),
      },
      { status: 500 }
    );
  }
}
