import { NextRequest, NextResponse } from 'next/server';

function extractUsername(url: string): string | null {
  try {
    const u = url.trim();
    const full = /^https?:\/\//i.test(u) ? u : 'https://' + u;
    const parsed = new URL(full);
    const match = parsed.pathname.match(/^\/([a-zA-Z0-9._]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function inferTheme(storeName: string, username: string | null): 'earth' | 'default' {
  const kw = ['hemp', 'earth', 'natural', 'organic', 'wellness', 'green', 'plant', 'herb', 'eco', 'sustainable'];
  const check = (s: string) => kw.some((k) => s.toLowerCase().includes(k));
  if (check(storeName)) return 'earth';
  if (username && check(username)) return 'earth';
  return 'default';
}

const THEME_PRODUCTS = {
  default: [
    { name: 'Product 1', description: '', price: 999 },
    { name: 'Product 2', description: '', price: 1499 },
    { name: 'Product 3', description: '', price: 799 },
    { name: 'Product 4', description: '', price: 1299 },
    { name: 'Product 5', description: '', price: 599 },
    { name: 'Product 6', description: '', price: 1899 },
  ],
  earth: [
    { name: 'Hemp Extract Oil', description: 'Pure, organic hemp extract', price: 1299 },
    { name: 'Natural CBD Capsules', description: 'Plant-based wellness', price: 1499 },
    { name: 'Organic Hemp Seeds', description: 'Nutrient-rich superfood', price: 599 },
    { name: 'Earth Wellness Drops', description: 'Natural relief formula', price: 999 },
    { name: 'Plant-Based Softgels', description: 'Easy daily dose', price: 899 },
    { name: 'Natural Relief Balm', description: 'Soothing topical blend', price: 749 },
  ],
} as const;

export async function GET(req: NextRequest) {
  const storeName = req.nextUrl.searchParams.get('storeName')?.trim() || 'My Store';
  const instagramUrl = req.nextUrl.searchParams.get('instagramUrl')?.trim() || '';
  const username = extractUsername(instagramUrl);
  const theme = inferTheme(storeName, username);
  const products = THEME_PRODUCTS[theme];
  return NextResponse.json({ products });
}
