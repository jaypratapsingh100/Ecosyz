import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body.email === 'string' ? body.email.trim() : '';
    if (!raw) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    if (!emailRegex.test(raw)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    const email = raw.toLowerCase();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.status === 'subscribed') {
        return NextResponse.json(
          { success: true, message: 'Already subscribed' }
        );
      }
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { status: 'subscribed', updatedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    await prisma.newsletterSubscriber.create({
      data: {
        email,
        status: 'subscribed',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[newsletter/subscribe]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
