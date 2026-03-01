/**
 * Proxies external images so they load in sandboxed iframes (same-origin).
 * Only allows picsum.photos and images.unsplash.com.
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = ['https://picsum.photos', 'https://images.unsplash.com', 'https://placehold.co'];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }
  try {
    const parsed = new URL(url);
    const allowed = ALLOWED_ORIGINS.some((o) => parsed.origin === o || parsed.href.startsWith(o + '/'));
    if (!allowed) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('Image proxy error:', e);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}
