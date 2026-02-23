import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NEWSLETTER_SEND_SECRET = process.env.NEWSLETTER_SEND_SECRET;
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL ?? 'Open Idea <noreply@openidea.world>';

export async function POST(req: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured (RESEND_API_KEY)' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('authorization');
    const secret = authHeader?.replace(/^Bearer\s+/i, '') ?? req.nextUrl.searchParams.get('secret');
    const useSecret = NEWSLETTER_SEND_SECRET && secret === NEWSLETTER_SEND_SECRET;
    if (!useSecret) {
      const user = await getCurrentUser();
      if (!user?.email) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
      const userIsAdmin = await isAdmin();
      if (!userIsAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required to send newsletters.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const html = typeof body.html === 'string' ? body.html : '';
    const text = typeof body.text === 'string' ? body.text : '';

    if (!subject) {
      return NextResponse.json(
        { error: 'subject is required' },
        { status: 400 }
      );
    }
    if (!html && !text) {
      return NextResponse.json(
        { error: 'Either html or text body is required' },
        { status: 400 }
      );
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { status: 'subscribed' },
      select: { email: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { sent: 0, message: 'No subscribers to send to' }
      );
    }

    const toAddresses = subscribers.map((s) => s.email);
    const resendBody: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: toAddresses,
      subject,
      ...(html && { html }),
      ...(text && { text }),
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[newsletter/send] Resend error:', resendRes.status, errText);
      return NextResponse.json(
        { error: 'Failed to send newsletter', details: errText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sent: toAddresses.length,
      message: `Newsletter sent to ${toAddresses.length} subscriber(s).`,
    });
  } catch (err) {
    console.error('[newsletter/send]', err);
    return NextResponse.json(
      { error: 'Something went wrong while sending the newsletter.' },
      { status: 500 }
    );
  }
}
