import { NextRequest, NextResponse } from 'next/server';
import { deployToVercel, getClaimableDeploymentUrl } from '@/lib/vercel';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalize Instagram URL to canonical form */
function normalizeInstagramUrl(url: string): string {
  let u = url.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('instagram.com')) {
      const path = parsed.pathname.replace(/\/+$/, '') || '/';
      return `https://www.instagram.com${path}`;
    }
  } catch {
    // invalid URL
  }
  return url;
}

/** Extract Instagram username from URL (e.g. hempify_earth from instagram.com/hempify_earth/) */
function extractInstagramUsername(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/([a-zA-Z0-9._]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Infer theme from store name and username for matching Instagram aesthetic */
function inferTheme(storeName: string, username: string | null): 'earth' | 'default' {
  const earthKeywords = ['hemp', 'earth', 'natural', 'organic', 'wellness', 'green', 'plant', 'herb', 'eco', 'sustainable'];
  const check = (s: string) => earthKeywords.some((k) => s.toLowerCase().includes(k));
  if (check(storeName)) return 'earth';
  if (username && check(username)) return 'earth';
  return 'default';
}

/** Theme configs: colors, products, and styles aligned with Instagram brand aesthetic */
const THEMES = {
  default: {
    headerBg: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
    heroBg: 'linear-gradient(180deg, rgba(131,58,180,0.08) 0%, transparent 100%)',
    accent: '#833ab4',
    ctaBg: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
    products: [
      { id: '1', name: 'Product 1', price: 999, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80' },
      { id: '2', name: 'Product 2', price: 1499, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80' },
      { id: '3', name: 'Product 3', price: 799, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80' },
      { id: '4', name: 'Product 4', price: 1299, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80' },
      { id: '5', name: 'Product 5', price: 599, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80' },
      { id: '6', name: 'Product 6', price: 1899, image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=400&q=80' },
    ],
  },
  earth: {
    headerBg: 'linear-gradient(135deg, #2d5a27 0%, #3d7c47 40%, #5d4037 100%)',
    heroBg: 'linear-gradient(180deg, rgba(45,90,39,0.12) 0%, rgba(245,245,220,0.3) 50%, transparent 100%)',
    accent: '#2d5a27',
    ctaBg: 'linear-gradient(135deg, #2d5a27, #3d7c47)',
    products: [
      { id: '1', name: 'Hemp Extract Oil', price: 1299, image: 'https://images.unsplash.com/photo-1608755721656-cbfa9a9afb33?auto=format&fit=crop&w=400&q=80' },
      { id: '2', name: 'Natural CBD Capsules', price: 1499, image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=400&q=80' },
      { id: '3', name: 'Organic Hemp Seeds', price: 599, image: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=400&q=80' },
      { id: '4', name: 'Earth Wellness Drops', price: 999, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80' },
      { id: '5', name: 'Plant-Based Softgels', price: 899, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80' },
      { id: '6', name: 'Natural Relief Balm', price: 749, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8418?auto=format&fit=crop&w=400&q=80' },
    ],
  },
} as const;

type ProductInput = { name: string; description?: string; price: number };

/** Build Instagram e-store HTML template */
function buildInstagramStoreHtml(
  instagramUrl: string,
  storeName: string,
  displayUrl: string,
  themeKey: 'earth' | 'default',
  username: string | null,
  customProducts?: ProductInput[]
): string {
  const storeEscaped = escapeHtml(storeName);
  const urlEscaped = escapeHtml(displayUrl);
  const theme = THEMES[themeKey];
  const themeProducts = theme.products;
  const PRODUCTS =
    customProducts && customProducts.length > 0
      ? customProducts.map((p, i) => ({
          id: String(i + 1),
          name: p.name || `Product ${i + 1}`,
          description: (p.description || '').trim(),
          price: Math.max(0, p.price),
          image: themeProducts[i % themeProducts.length]?.image ?? themeProducts[0].image,
        }))
      : themeProducts.map((p) => ({ ...p, description: '' }));
  const ctaLabel = username ? `Message @${username}` : 'Order via Instagram DM';
  const shopLabel = username ? `Shop on Instagram @${username}` : 'Shop on Instagram';

  const appJsx = `
const PRODUCTS = ${JSON.stringify(PRODUCTS)};

function App() {
  const [cart, setCart] = React.useState([]);

  const addToCart = (item) => {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      setCart(cart.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">${storeEscaped}</div>
          <a href="${urlEscaped}" target="_blank" rel="noopener noreferrer" className="insta-btn">
            <span className="insta-icon">📷</span> ${escapeHtml(shopLabel)}
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to ${storeEscaped}</h1>
          <p>Browse our products below. Order via Instagram DM — tap the button above!</p>
          <a href="${urlEscaped}" target="_blank" rel="noopener noreferrer" className="cta-primary">
            Visit our Instagram
          </a>
        </div>
      </section>

      <main className="main">
        <h2 className="section-title">Products</h2>
        <div className="products-grid">
          {PRODUCTS.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-img-wrap">
                <img src={p.image} alt={p.name} className="product-img" />
              </div>
              <div className="product-info">
                <h3 className="product-name">{p.name}</h3>
                {p.description ? <p className="product-desc">{p.description}</p> : null}
                <p className="product-price">₹{p.price.toLocaleString('en-IN')}</p>
                <button className="add-cart-btn" onClick={() => addToCart(p)}>
                  Add to Cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <div className="cart-bar">
        <div className="cart-summary">
          <span className="cart-count">{cartCount} items in cart</span>
          <a href="${urlEscaped}" target="_blank" rel="noopener noreferrer" className="checkout-btn">
            ${escapeHtml(ctaLabel)}
          </a>
        </div>
      </div>

      <footer className="footer">
        <a href="${urlEscaped}" target="_blank" rel="noopener noreferrer" className="footer-link">
          Follow us on Instagram${username ? ` @${escapeHtml(username)}` : ''}
        </a>
        <span>— Generated from Instagram • Customize your products in Studio</span>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`;

  const stylesCss = `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: ${themeKey === 'earth' ? '#f5f5dc' : '#fafafa'};
  color: #262626;
  min-height: 100vh;
}

.app { min-height: 100vh; display: flex; flex-direction: column; }

.header {
  background: ${theme.headerBg};
  padding: 0.75rem 1.25rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.insta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.95);
  color: ${theme.accent};
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.insta-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.insta-icon { font-size: 1.1rem; }

.hero {
  background: ${theme.heroBg};
  padding: 2.5rem 1.25rem;
  text-align: center;
}

.hero-content h1 {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  margin-bottom: 0.5rem;
  color: #262626;
}

.hero-content p {
  color: #8e8e8e;
  margin-bottom: 1rem;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.cta-primary {
  display: inline-block;
  padding: 0.65rem 1.5rem;
  background: ${theme.ctaBg};
  color: #fff;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.cta-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}

.main {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
  width: 100%;
}

.section-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #262626;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.product-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s, transform 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.product-img-wrap {
  aspect-ratio: 1;
  background: #f0f0f0;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info { padding: 0.85rem; }

.product-name {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #262626;
}

.product-desc {
  font-size: 0.75rem;
  color: #8e8e8e;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.product-price {
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.accent};
  margin-bottom: 0.5rem;
}

.add-cart-btn {
  width: 100%;
  padding: 0.45rem;
  background: ${theme.ctaBg};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.add-cart-btn:hover { opacity: 0.9; }

.cart-bar {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #efefef;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
}

.cart-summary {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.cart-count { font-size: 0.9rem; color: #8e8e8e; }

.checkout-btn {
  padding: 0.5rem 1.25rem;
  background: ${theme.ctaBg};
  color: #fff;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.checkout-btn:hover { opacity: 0.9; }

.footer {
  padding: 1rem 1.25rem;
  text-align: center;
  font-size: 0.8rem;
  color: #8e8e8e;
  background: #fafafa;
  border-top: 1px solid #efefef;
}

.footer-link {
  color: ${theme.accent};
  font-weight: 600;
  text-decoration: none;
}

.footer-link:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .products-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .header-inner { flex-wrap: wrap; }
}
`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${storeEscaped} • Instagram Store</title>
    <style>${stylesCss}</style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
${appJsx.replace(/<\/script>/gi, '<\\/script>')}
    </script>
  </body>
</html>`;

  return html;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const instagramUrlRaw = (formData.get('instagramUrl') as string | null)?.trim() || '';
    const storeName = (formData.get('storeName') as string | null)?.trim() || 'My Store';
    const deployFlag = formData.get('deploy') === 'true' || formData.get('deploy') === '1';

    if (!instagramUrlRaw) {
      return NextResponse.json(
        { error: 'Instagram URL is required' },
        { status: 400 },
      );
    }

    const instagramUrl = normalizeInstagramUrl(instagramUrlRaw);
    const displayUrl = instagramUrl || instagramUrlRaw;
    const username = extractInstagramUsername(displayUrl);
    const effectiveStoreName =
      (storeName === 'My Store' && username)
        ? username.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : storeName;
    const theme = inferTheme(effectiveStoreName, username);

    let customProducts: ProductInput[] | undefined;
    const productsRaw = formData.get('products');
    if (typeof productsRaw === 'string') {
      try {
        const parsed = JSON.parse(productsRaw) as ProductInput[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          customProducts = parsed.map((p) => ({
            name: String(p?.name ?? '').trim(),
            description: String(p?.description ?? '').trim(),
            price: Math.max(0, Number(p?.price) || 0),
          }));
        }
      } catch {
        // ignore invalid JSON
      }
    }

    const html = buildInstagramStoreHtml(
      instagramUrl,
      effectiveStoreName,
      displayUrl,
      theme,
      username,
      customProducts
    );

    const payload: {
      html: string;
      url?: string;
      deploymentId?: string;
      claimUrl?: string;
      readyState?: string;
    } = { html };

    if (deployFlag) {
      try {
        const slug = effectiveStoreName
          .replace(/[^a-z0-9-]/gi, '-')
          .replace(/-+/g, '-')
          .toLowerCase()
          .slice(0, 25) || 'store';
        const projectName = `instagram-store-${slug}-${Date.now().toString(36)}`;
        const vercelJson = JSON.stringify(
          { version: 2, builds: [{ src: '**/*', use: '@vercel/static' }] },
          null,
          2,
        );
        const result = await deployToVercel({
          files: [
            { path: 'index.html', content: html },
            { path: 'vercel.json', content: vercelJson },
          ],
          projectName,
          framework: 'html',
        });
        const liveUrl = result.url.startsWith('http') ? result.url : `https://${result.url}`;
        const claimUrl = getClaimableDeploymentUrl(result.deploymentId);
        payload.url = liveUrl;
        payload.deploymentId = result.deploymentId;
        payload.claimUrl = claimUrl;
        payload.readyState = result.readyState;
      } catch (deployErr) {
        console.error('Vercel deploy error (instagram-store):', deployErr);
        const msg = deployErr instanceof Error ? deployErr.message : 'Deployment failed';
        return NextResponse.json(
          {
            html,
            error: 'Store generated but deployment failed',
            deployError: msg,
            hint: process.env.VERCEL_API_TOKEN ? undefined : 'Set VERCEL_API_TOKEN to enable deploy.',
          },
          { status: 200 },
        );
      }
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error generating Instagram store:', error);
    return NextResponse.json(
      { error: 'Failed to generate Instagram store' },
      { status: 500 },
    );
  }
}
