/**
 * Fetches a LinkedIn profile page and extracts the og:image URL.
 * Used by PDF→Website and LinkedIn→Website builders to get the user's profile photo.
 */

const LINKEDIN_DOMAINS = ['linkedin.com', 'www.linkedin.com'];

function extractOgImage(html: string): string | null {
  const match1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (match1) return match1[1];

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

/**
 * Fetches a LinkedIn profile page and returns the profile image URL (og:image).
 * Returns null if the URL is invalid, the fetch fails, or no image is found.
 */
export async function fetchLinkedInProfileImage(linkedinUrl: string): Promise<string | null> {
  const trimmed = linkedinUrl.trim();
  if (!trimmed || !isValidLinkedInUrl(trimmed)) {
    return null;
  }

  try {
    const res = await fetch(trimmed, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const html = await res.text();
    const imageUrl = extractOgImage(html);
    if (!imageUrl) return null;

    return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, res.url).href;
  } catch {
    return null;
  }
}
