import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth';
import { getAdminEmails } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { INTERN_TRACKS } from '@/lib/intern-tracks';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

/**
 * POST: Enroll in fellowship — creates fellow record if needed, sends email to admin for approval
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured. Please try again later.' },
        { status: 500 }
      );
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { profile: true },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const trackSlug = (body.track as string)?.trim() || 'platform-development';

    let track = await prisma.internTrack.findUnique({ where: { slug: trackSlug } });
    if (!track) {
      const trackDef = INTERN_TRACKS.find((t) => t.slug === trackSlug);
      track = await prisma.internTrack.create({
        data: {
          slug: trackSlug,
          name: trackDef?.name || trackSlug,
          description: trackDef?.description || null,
          stipendRange: trackDef?.stipendRange || null,
        },
      });
    }

    let fellow = await prisma.internFellow.findUnique({
      where: { userId: prismaUser.id },
      include: { track: true },
    });

    if (!fellow) {
      fellow = await prisma.internFellow.create({
        data: {
          userId: prismaUser.id,
          trackId: track.id,
          status: 'pending_approval',
        },
        include: { track: true },
      });
    } else if (fellow.status === 'active') {
      return NextResponse.json({
        success: true,
        message: 'You are already enrolled in the fellowship.',
        fellow: { id: fellow.id, track: fellow.track, status: fellow.status },
      });
    } else if (fellow.status === 'pending_approval') {
      return NextResponse.json({
        success: true,
        message: 'Your enrollment request is already pending. Admin will review and get back to you.',
        fellow: { id: fellow.id, track: fellow.track, status: fellow.status },
      });
    }

    // Send email to all admin emails
    const adminEmails = getAdminEmails();
    const internName = prismaUser.name || prismaUser.email?.split('@')[0] || 'Unknown';
    const dashboardUrl = `${APP_URL}/intern-fellowship/dashboard`;
    const adminUrl = `${APP_URL}/admin/interns`;

    const html = `
      <h2>Fellowship Enrollment Request</h2>
      <p>An intern has requested to enroll in the fellowship program and is awaiting your approval.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 12px 8px 0; font-weight: 600;">Name</td><td>${internName}</td></tr>
        <tr><td style="padding: 8px 12px 8px 0; font-weight: 600;">Email</td><td>${prismaUser.email}</td></tr>
        <tr><td style="padding: 8px 12px 8px 0; font-weight: 600;">Track</td><td>${fellow.track.name}</td></tr>
        <tr><td style="padding: 8px 12px 8px 0; font-weight: 600;">Status</td><td>${fellow.status}</td></tr>
        ${fellow.resumeUrl ? `<tr><td style="padding: 8px 12px 8px 0; font-weight: 600;">Resume</td><td><a href="${fellow.resumeUrl}">View resume</a></td></tr>` : ''}
      </table>
      <p>
        <a href="${adminUrl}" style="display: inline-block; padding: 10px 20px; background: #38bdf8; color: #0a1016; text-decoration: none; border-radius: 8px; font-weight: 600;">Review in Admin Panel</a>
      </p>
      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
        Intern dashboard: <a href="${dashboardUrl}">${dashboardUrl}</a>
      </p>
    `;

    const text = `
Fellowship Enrollment Request

An intern has requested to enroll in the fellowship program.

Name: ${internName}
Email: ${prismaUser.email}
Track: ${fellow.track.name}
Status: ${fellow.status}
${fellow.resumeUrl ? `Resume: ${fellow.resumeUrl}` : ''}

Review and approve: ${adminUrl}
Intern dashboard: ${dashboardUrl}
    `.trim();

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Open Idea Fellowship <noreply@openidea.world>',
        to: adminEmails,
        subject: `Fellowship Enrollment: ${internName} - ${fellow.track.name}`,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[intern-fellowship/enroll] Resend error:', resendRes.status, errText);
      return NextResponse.json(
        { error: 'Failed to send enrollment notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Enrollment request sent! We\'ve notified the admin team. You\'ll hear back soon.',
      fellow: {
        id: fellow.id,
        track: fellow.track,
        status: fellow.status,
      },
    });
  } catch (err) {
    console.error('[intern-fellowship/enroll]', err);
    return NextResponse.json(
      { error: 'Failed to enroll. Please try again.' },
      { status: 500 }
    );
  }
}
