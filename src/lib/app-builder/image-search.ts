/**
 * Image Search — fetches relevant images from Pexels API for generated apps.
 *
 * Used during code generation to replace generic placeholders with real,
 * contextually relevant photos. Falls back to seeded picsum if Pexels
 * is unavailable or rate-limited.
 */

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
  photographer: string;
  width: number;
  height: number;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
}

export interface ImageResult {
  url: string;
  alt: string;
  photographer?: string;
  width: number;
  height: number;
}

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

// In-memory cache to avoid duplicate API calls within the same generation
const cache = new Map<string, ImageResult[]>();

/**
 * Search for relevant images using Pexels API.
 * Returns an array of image results, or empty array if unavailable.
 */
export async function searchImages(
  query: string,
  options?: {
    count?: number;
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'large' | 'medium' | 'small';
  }
): Promise<ImageResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const count = options?.count ?? 5;
  const orientation = options?.orientation ?? 'landscape';
  const size = options?.size ?? 'medium';

  const cacheKey = `${query}:${count}:${orientation}:${size}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation,
      size,
    });

    const res = await fetch(`${PEXELS_API_URL}?${params}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      console.warn(`Pexels API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as PexelsResponse;
    const results: ImageResult[] = data.photos.map(photo => ({
      url: photo.src[size === 'large' ? 'large' : size === 'small' ? 'small' : 'medium'],
      alt: photo.alt || query,
      photographer: photo.photographer,
      width: photo.width,
      height: photo.height,
    }));

    cache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('Pexels search failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Build an image map for an app based on its type and content.
 * Returns a map of logical image roles → real image URLs.
 *
 * Example output:
 * {
 *   "hero": { url: "https://images.pexels.com/...", alt: "Mountain bike on trail" },
 *   "product-1": { url: "https://images.pexels.com/...", alt: "Road bicycle" },
 *   "product-2": { url: "https://images.pexels.com/...", alt: "Cycling helmet" },
 *   "team-1": { url: "https://images.pexels.com/...", alt: "Professional woman" },
 * }
 */
export async function buildImageMap(
  appType: string,
  brandName: string,
  features: string[],
): Promise<Record<string, ImageResult>> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return {};

  const imageMap: Record<string, ImageResult> = {};

  // Derive search queries from app context
  const queries: { role: string; query: string; orientation?: 'landscape' | 'portrait' | 'square'; size?: 'large' | 'medium' | 'small' }[] = [];

  // Hero image — large size for banner
  const heroQuery = getHeroQuery(appType, brandName);
  queries.push({ role: 'hero', query: heroQuery, orientation: 'landscape', size: 'large' });

  // Product/content images — medium size for cards
  const productQueries = getProductQueries(appType, brandName);
  productQueries.forEach((q, i) => {
    queries.push({ role: `product-${i + 1}`, query: q, size: 'medium' });
  });

  // Feature/section images
  if (features.length > 0) {
    const featureQuery = features.slice(0, 3).join(' ');
    queries.push({ role: 'feature', query: `${appType} ${featureQuery}`, orientation: 'landscape', size: 'large' });
  }

  // Fetch all in parallel (max 5 queries to stay within rate limits)
  const fetches = queries.slice(0, 5).map(async ({ role, query, orientation, size }) => {
    const results = await searchImages(query, { count: 1, orientation: orientation ?? 'landscape', size: size ?? 'medium' });
    if (results.length > 0) {
      imageMap[role] = results[0];
    }
  });

  await Promise.all(fetches);
  return imageMap;
}

function getHeroQuery(appType: string, brandName: string): string {
  const type = (appType + ' ' + brandName).toLowerCase();

  // Specific niches first (before generic e-commerce/shop catch-all)
  if (type.includes('bike') || type.includes('cycling') || type.includes('bicycle')) return 'mountain bike cycling trail nature';
  if (type.includes('temple') || type.includes('church') || type.includes('spiritual') || type.includes('mandir')) return 'hindu temple architecture beautiful';
  if (type.includes('restaurant') || type.includes('food') || type.includes('cafe') || type.includes('bakery')) return 'restaurant fine dining interior';
  if (type.includes('fitness') || type.includes('gym') || type.includes('yoga')) return 'fitness gym workout modern';
  if (type.includes('travel') || type.includes('tourism') || type.includes('hotel')) return 'travel destination beautiful landscape';
  if (type.includes('real estate') || type.includes('property')) return 'modern luxury house exterior';
  if (type.includes('education') || type.includes('school') || type.includes('course')) return 'education students learning modern';
  if (type.includes('medical') || type.includes('health') || type.includes('doctor')) return 'medical healthcare modern hospital';
  if (type.includes('fashion') || type.includes('clothing') || type.includes('apparel')) return 'fashion clothing store modern';
  if (type.includes('jewelry') || type.includes('jewel')) return 'luxury jewelry gold elegant';
  if (type.includes('beauty') || type.includes('salon') || type.includes('spa')) return 'beauty salon spa luxury';
  if (type.includes('car') || type.includes('auto') || type.includes('vehicle')) return 'luxury car automotive showroom';
  if (type.includes('pet') || type.includes('animal') || type.includes('vet')) return 'cute pets dog cat animal';
  if (type.includes('music') || type.includes('band') || type.includes('concert')) return 'music concert live performance';
  if (type.includes('photography') || type.includes('photo studio')) return 'professional photography camera studio';
  if (type.includes('coffee') || type.includes('tea')) return 'coffee shop barista latte art';
  if (type.includes('flower') || type.includes('flor')) return 'beautiful flower bouquet arrangement';
  if (type.includes('pottery') || type.includes('ceramic') || type.includes('clay')) return 'pottery ceramic handmade craft';
  if (type.includes('saree') || type.includes('textile') || type.includes('fabric')) return 'indian saree textile colorful fabric';

  // Generic categories
  if (type.includes('e-commerce') || type.includes('shop') || type.includes('store')) return `${brandName} products shopping`;
  if (type.includes('portfolio') || type.includes('agency')) return 'creative design workspace modern';
  if (type.includes('blog') || type.includes('cms')) return 'writing content creation workspace';
  if (type.includes('saas') || type.includes('dashboard') || type.includes('app')) return 'modern technology software laptop';
  return `${brandName} ${appType}`;
}

function getProductQueries(appType: string, brandName: string): string[] {
  const type = (appType + ' ' + brandName).toLowerCase();

  // Specific niches first
  if (type.includes('bike') || type.includes('cycling') || type.includes('bicycle')) {
    return ['mountain bike close up', 'road bicycle race sport', 'cycling helmet gear', 'bike repair workshop tools'];
  }
  if (type.includes('temple') || type.includes('spiritual') || type.includes('mandir')) {
    return ['temple interior prayer candles', 'meditation spiritual peaceful', 'hindu temple ceremony'];
  }
  if (type.includes('restaurant') || type.includes('food') || type.includes('cafe')) {
    return ['gourmet food plated dish', 'restaurant interior elegant', 'fresh ingredients cooking', 'dessert plating artistic'];
  }
  if (type.includes('fitness') || type.includes('gym') || type.includes('yoga')) {
    return ['gym equipment modern', 'person running fitness', 'yoga pose meditation outdoor'];
  }
  if (type.includes('fashion') || type.includes('clothing') || type.includes('apparel')) {
    return ['fashion model clothing', 'clothing rack store', 'fashion accessories stylish', 'outfit flatlay'];
  }
  if (type.includes('jewelry') || type.includes('jewel')) {
    return ['gold necklace jewelry', 'diamond ring elegant', 'jewelry display luxury'];
  }
  if (type.includes('beauty') || type.includes('salon') || type.includes('spa')) {
    return ['beauty products skincare', 'salon interior modern', 'spa treatment relaxation'];
  }
  if (type.includes('travel') || type.includes('tourism')) {
    return ['travel landmark famous', 'beach vacation tropical', 'mountain hiking adventure'];
  }
  if (type.includes('portfolio') || type.includes('agency')) {
    return ['web design mockup laptop', 'creative team brainstorming', 'design workspace minimal'];
  }
  if (type.includes('real estate') || type.includes('property')) {
    return ['modern house interior', 'apartment living room luxury', 'house exterior garden'];
  }
  if (type.includes('pottery') || type.includes('ceramic') || type.includes('clay')) {
    return ['pottery wheel handmade', 'ceramic vase colorful', 'clay sculpting artist'];
  }
  if (type.includes('saree') || type.includes('textile')) {
    return ['silk saree colorful', 'indian textile pattern', 'fabric draping elegant'];
  }
  if (type.includes('coffee') || type.includes('tea')) {
    return ['coffee latte art cup', 'coffee beans roasted', 'cafe interior cozy'];
  }

  // Generic e-commerce
  if (type.includes('e-commerce') || type.includes('shop') || type.includes('store')) {
    return [`${brandName} product photography`, 'online shopping delivery', 'product packaging unboxing', 'happy customer shopping'];
  }
  return [`${brandName} business professional`, 'team collaboration modern office'];
}

/**
 * Format an image map into prompt-injectable text so the AI uses real URLs.
 */
export function formatImageMapForPrompt(imageMap: Record<string, ImageResult>): string {
  if (Object.keys(imageMap).length === 0) return '';

  const roleMapping: Record<string, string> = {
    'hero': 'Hero section background or main image',
    'feature': 'Feature section illustration',
    'product-1': 'First product/service card image',
    'product-2': 'Second product/service card image',
    'product-3': 'Third product/service card image',
    'product-4': 'Fourth product/service card image',
  };

  let text = '\n\n=== MANDATORY IMAGE URLS (DO NOT USE picsum.photos OR unsplash) ===\n';
  text += 'You MUST use the following real image URLs in your components. Do NOT substitute, replace, or ignore them.\n\n';
  for (const [role, img] of Object.entries(imageMap)) {
    const usage = roleMapping[role] || role.replace(/-/g, ' ');
    text += `${role.toUpperCase()}: ${img.url}\n  alt="${img.alt}" | Use for: ${usage}\n`;
  }
  text += '\nFor any ADDITIONAL images beyond these, use https://picsum.photos/seed/{descriptive-keyword}/{w}/{h} with app-specific keywords.\n';
  text += '=== END MANDATORY IMAGES ===\n';
  return text;
}

/** Clear the in-memory image cache (e.g., between generations) */
export function clearImageCache(): void {
  cache.clear();
}
