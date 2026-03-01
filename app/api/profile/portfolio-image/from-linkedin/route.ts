import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const LINKEDIN_DOMAINS = ['linkedin.com', 'www.linkedin.com'];

function extractOgImage(html: string): string | null {
  // Try property="og:image" content="..."
  const match1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (match1) return match1[1];

  // Try content="..." property="og:image"
  const match2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (match2) return match2[1];

  return null;
}

function isValidLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return LINKEDIN_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { ensureUserInDb } = await import('../../../../../src/lib/auth');
    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { linkedinUrl } = body;

    if (!linkedinUrl || typeof linkedinUrl !== 'string') {
      return NextResponse.json(
        { error: 'linkedinUrl is required' },
        { status: 400 }
      );
    }

    const trimmed = linkedinUrl.trim();
    if (!isValidLinkedInUrl(trimmed)) {
      return NextResponse.json(
        { error: 'Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username)' },
        { status: 400 }
      );
    }

    const res = await fetch(trimmed, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch LinkedIn page (${res.status})` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const imageUrl = extractOgImage(html);

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No profile image found on this LinkedIn page. The page may require login or the profile may be private.' },
        { status: 400 }
      );
    }

    // Resolve relative URLs
    const absoluteImageUrl = imageUrl.startsWith('http')
      ? imageUrl
      : new URL(imageUrl, res.url).href;

    await prisma.profile.upsert({
      where: { userId: prismaUser.id },
      update: {
        portfolioImageUrl: absoluteImageUrl,
        updatedAt: new Date(),
      },
      create: {
        userId: prismaUser.id,
        displayName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        portfolioImageUrl: absoluteImageUrl,
        preferences: {
          theme: 'system',
          language: 'en-IN',
          emailNotifications: true,
          marketingEmails: false,
        },
      },
    });

    return NextResponse.json({
      portfolioImageUrl: absoluteImageUrl,
    });
  } catch (error) {
    console.error('LinkedIn image fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image from LinkedIn. The profile may be private or LinkedIn may be blocking the request.' },
      { status: 500 }
    );
  }
}
