/**
 * Sample React project: config and file contents for the "React Sample" in Studio.
 * Uses canonical structure from @/lib/app-builder/canonicalReact.
 */

import { REACT_MAIN_JSX } from '@/lib/app-builder/canonicalReact';

export const SAMPLE_REACT_PROJECT = {
  title: 'ORAA — Ethnic Wear',
  description:
    'Vibrant ethnic wear for women — suit sets, kurtas, dresses, sarees. Bold colors and rich imagery like premium fashion stores.',
  type: 'web' as const,
  framework: 'react',
  appType: 'react',
  previewVersion: 'v2' as const,
};

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ORAA • Ethnic Wear for Women</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
    const { createRoot } = ReactDOM;
    const { useState } = React;

    const img = (url) => '/api/image-proxy?url=' + encodeURIComponent(url);

    const PRODUCTS = [
      { id: 'p1', name: 'Anarkali Suit Set', price: 3499, originalPrice: 4299, category: 'Suit Sets', image: img('https://placehold.co/800x600/8B2252/FFE4B5?text=Anarkali'), badge: 'Bestseller' },
      { id: 'p2', name: 'Floral Print Kurti', price: 1299, originalPrice: 1599, category: 'Kurtas', image: img('https://placehold.co/800x600/2E8B57/F5F5DC?text=Kurti'), badge: 'New' },
      { id: 'p3', name: 'Casual Cotton Dress', price: 1999, originalPrice: null, category: 'Dresses', image: img('https://placehold.co/800x600/CD853F/FFF8DC?text=Dress'), badge: null },
      { id: 'p4', name: 'Silk Banarasi Saree', price: 8999, originalPrice: 10999, category: 'Sarees', image: img('https://placehold.co/800x600/8B0000/FFD700?text=Saree'), badge: 'Festive' },
      { id: 'p5', name: 'Straight Cut Suit Set', price: 2799, originalPrice: null, category: 'Suit Sets', image: img('https://placehold.co/800x600/4B0082/FFE4E1?text=Suit+Set'), badge: null },
      { id: 'p6', name: 'Embroidered Kurta', price: 2499, originalPrice: 2999, category: 'Kurtas', image: img('https://placehold.co/800x600/C41E3A/FFFACD?text=Kurta'), badge: 'Sale' },
      { id: 'p7', name: 'Festive Lehenga Set', price: 5999, originalPrice: null, category: 'Suit Sets', image: img('https://placehold.co/800x600/800080/FFE4B5?text=Lehenga'), badge: null },
      { id: 'p8', name: 'Chiffon Printed Saree', price: 3299, originalPrice: 3999, category: 'Sarees', image: img('https://placehold.co/800x600/2F4F4F/F0E68C?text=Chiffon'), badge: 'Limited' },
      { id: 'p9', name: 'Workwear Dress', price: 1699, originalPrice: null, category: 'Dresses', image: img('https://placehold.co/800x600/4682B4/FFFFFF?text=Workwear'), badge: null },
    ];

    const CATEGORIES = ['All', 'Suit Sets', 'Kurtas', 'Dresses', 'Sarees'];

    function App() {
      const [activeFilter, setActiveFilter] = useState('All');
      const [cart, setCart] = useState([]);

      const filteredProducts = activeFilter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeFilter);

      const addToCart = (product) => {
        const existing = cart.find((c) => c.id === product.id);
        if (existing) {
          setCart(cart.map((c) => c.id === product.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
          setCart([...cart, { ...product, qty: 1 }]);
        }
      };

      const updateQty = (id, delta) => {
        setCart(cart.map((c) => {
          if (c.id !== id) return c;
          const n = Math.max(0, c.qty + delta);
          return n === 0 ? null : { ...c, qty: n };
        }).filter(Boolean));
      };

      const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
      const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

      const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      return (
        <div className="app">
          <header className="nav">
            <div className="brand">
              <div className="brand-mark">ORAA</div>
              <div className="brand-text">
                <div className="brand-name">Ethnic Wear</div>
                <div className="brand-tagline">For Women & Girls</div>
              </div>
            </div>
            <nav className="nav-links">
              <a href="#products">Suit Sets</a>
              <a href="#products">Kurtas</a>
              <a href="#products">Dresses</a>
              <a href="#products">Sarees</a>
            </nav>
          </header>

          <main>
            <section className="hero">
              <div className="hero-banner">
                <img src={img('https://placehold.co/1200x400/8B2252/FFE4B5?text=ORAA+Ethnic+Wear')} alt="ORAA Ethnic Wear" className="hero-banner-img" referrerPolicy="no-referrer" loading="eager" />
              </div>
              <div className="hero-content">
                <h1 className="hero-title">
                  Welcome to ORAA – Where Every Day is a Celebration of Style
                </h1>
                <p className="hero-subtitle">
                  Step into the world of ORAA, where fashion meets tradition. Discover vibrant suit sets, kurtas, dresses, and sarees that redefine contemporary Indian fashion for every occasion.
                </p>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => scrollTo('products')}>Shop Collection</button>
                  <button className="btn-secondary" onClick={() => scrollTo('cart-bar')}>View Cart</button>
                </div>
                <div className="hero-badges">
                  <div className="hero-badge">Free Shipping</div>
                  <div className="hero-badge">Secure Payments</div>
                  <div className="hero-badge">Easy Return</div>
                </div>
              </div>
              <aside className="hero-featured">
                <div className="hero-featured-title">Top Categories</div>
                <div className="hero-featured-grid">
                  <div className="category-chip">Anarkali Suit Sets</div>
                  <div className="category-chip">Kurtas</div>
                  <div className="category-chip">Straight Suit Sets</div>
                  <div className="category-chip">Dresses</div>
                  <div className="category-chip">Sarees</div>
                  <div className="category-chip">Palazzos</div>
                </div>
              </aside>
            </section>

            <section id="products" className="section">
              <div className="section-header">
                <div>
                  <div className="section-eyebrow">Collection</div>
                  <h2 className="section-title">Shop by Category</h2>
                </div>
                <p className="section-subtitle">Indian wear that blends tradition with contemporary style.</p>
              </div>
              <div className="gallery-filters">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" className={'gallery-filter-btn' + (activeFilter === cat ? ' is-active' : '')} onClick={() => setActiveFilter(cat)}>{cat}</button>
                ))}
              </div>
              <div className="products-grid">
                {filteredProducts.map((p) => (
                  <article key={p.id} className="product-card">
                    <div className="product-media"><img src={p.image} alt={p.name} className="product-image" referrerPolicy="no-referrer" loading="eager" /></div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className="product-subtitle">{p.category}</div>
                      <div className="product-meta">
                        {p.badge && <span className="pill">{p.badge}</span>}
                        <span className="pill">Free shipping</span>
                      </div>
                      <div className="product-footer">
                        <div>
                          <span className="product-price-main">₹{p.price.toLocaleString('en-IN')}</span>
                          {p.originalPrice && <span className="product-price-strike">₹{p.originalPrice.toLocaleString('en-IN')}</span>}
                        </div>
                        <button className="btn-cart" onClick={() => addToCart(p)}>Add to cart</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <div id="cart-bar" className="cart-bar">
            <div className="cart-summary">
              <span className="cart-count-pill"><span className="cart-count-badge">{cartCount}</span> items in cart</span>
              <span className="cart-total">Total: ₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            {cart.length > 0 && (
              <div className="cart-panel">
                {cart.map((c) => (
                  <div key={c.id} className="cart-item-row">
                    <div className="cart-item-meta"><div className="cart-item-name">{c.name}</div><div className="cart-item-detail">₹{c.price.toLocaleString('en-IN')} × {c.qty}</div></div>
                    <div className="cart-item-controls">
                      <button className="cart-qty-btn" onClick={() => updateQty(c.id, -1)}>−</button>
                      <span className="qty-pill">{c.qty}</span>
                      <button className="cart-qty-btn" onClick={() => updateQty(c.id, 1)}>+</button>
                    </div>
                    <span className="cart-item-price">₹{(c.price * c.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="cart-button" disabled={cartCount === 0}>Checkout</button>
          </div>

          <div className="bottom-note">
            ORAA sample — vibrant ethnic wear e-commerce for women. Clone in App Studio and add your own products.
          </div>
        </div>
      );
    }

    const root = createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
`;

const STYLES_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: #faf9f7;
  min-height: 100vh;
  color: #1a1a1a;
}

/* ORAA: vibrant ethnic wear, coral accent #c41e3a */

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e8e6e3;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-mark {
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.05em;
  background: #c41e3a;
  color: #fff;
}

.brand-text {
  line-height: 1.2;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.brand-tagline {
  font-size: 0.7rem;
  color: #666;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  font-size: 0.9rem;
  font-weight: 500;
  color: #444;
  text-decoration: none;
}

.nav-links a:hover {
  color: #c41e3a;
}

.hero {
  padding: 0 1.5rem 2rem;
  max-width: 1040px;
  margin: 0 auto;
  position: relative;
}

.hero-banner {
  height: 280px;
  margin: 0 -1.5rem 1.5rem;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.hero-banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.3) contrast(1.05);
}

.hero-content {
  max-width: 42rem;
}

.hero-title {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  line-height: 1.2;
  font-weight: 600;
  color: #1a1a1a;
}

.hero-subtitle {
  margin-top: 1rem;
  font-size: 1rem;
  line-height: 1.6;
  color: #555;
}

.hero-actions {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.btn-primary {
  padding: 0.65rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  background: #c41e3a;
  color: #fff;
}

.btn-primary:hover {
  background: #a31930;
}

.btn-secondary {
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #fff;
  color: #444;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.hero-badges {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #555;
}

.hero-badge {
  padding: 0.4rem 0.8rem;
  background: #fff;
  border: 1px solid #e8e6e3;
  border-radius: 4px;
}

.hero-featured {
  margin-top: 2rem;
  padding: 1.25rem;
  background: #fff;
  border: 1px solid #e8e6e3;
  border-radius: 8px;
}

.hero-featured-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  margin-bottom: 0.75rem;
}

.hero-featured-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-chip {
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
  background: #f5f4f2;
  border-radius: 4px;
  color: #444;
}

.category-chip:hover {
  background: #ebe9e6;
}

.section {
  padding: 1rem 1.5rem 2.4rem;
  max-width: 1040px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.4rem;
}

.section-eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #888;
}

.section-title {
  margin-top: 0.1rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
}

.section-subtitle {
  font-size: 0.85rem;
  max-width: 24rem;
  color: #666;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

.product-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e6e3;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.product-media {
  height: 220px;
  position: relative;
  overflow: hidden;
  background: #f5f4f2;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.4) contrast(1.08);
  transition: filter 0.2s ease, transform 0.3s ease;
}

.product-card:hover .product-image {
  filter: saturate(1.55) contrast(1.12);
  transform: scale(1.03);
}

.product-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.product-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
}

.product-subtitle {
  font-size: 0.78rem;
  color: #666;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.pill {
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  border: 1px solid #e8e6e3;
  color: #666;
  background: #faf9f7;
}

.product-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.product-price-main {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.product-price-strike {
  font-size: 0.8rem;
  color: #999;
  text-decoration: line-through;
}

.btn-cart {
  padding: 0.45rem 0.9rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  background: #c41e3a;
  color: #fff;
}

.btn-cart:hover {
  background: #a31930;
}

.cart-bar {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e8e6e3;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.cart-summary {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cart-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  background: #f5f4f2;
  border: 1px solid #e8e6e3;
  font-size: 0.8rem;
  color: #444;
}

.cart-count-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 0.35rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  background: #c41e3a;
  color: #fff;
}

.cart-total {
  font-size: 0.9rem;
  color: #1a1a1a;
  font-weight: 600;
}

.cart-button {
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  background: #c41e3a;
  color: #fff;
}

.cart-button:hover:not(:disabled) {
  background: #a31930;
}

.cart-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-panel {
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  border: 1px solid #e8e6e3;
  background: #faf9f7;
  font-size: 0.8rem;
  display: grid;
  gap: 0.5rem;
}

.cart-item-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.cart-item-meta {
  max-width: 14rem;
}

.cart-item-name {
  font-weight: 500;
  color: #1a1a1a;
}

.cart-item-detail {
  font-size: 0.75rem;
  color: #666;
}

.cart-item-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.qty-pill {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #e8e6e3;
  font-size: 0.75rem;
  background: #fff;
}

.cart-qty-btn {
  border-radius: 4px;
  border: 1px solid #e8e6e3;
  padding: 0.15rem 0.4rem;
  font-size: 0.75rem;
  background: #fff;
  color: #444;
  cursor: pointer;
}

.cart-qty-btn:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.cart-item-price {
  font-size: 0.8rem;
  color: #1a1a1a;
  font-weight: 600;
}

.bottom-note {
  padding: 0 1.5rem 1.5rem;
  max-width: 1040px;
  margin: 0 auto;
  font-size: 0.75rem;
  color: #888;
}

@media (max-width: 768px) {
  .hero {
    padding-inline: 1rem;
  }
  .section {
    padding-inline: 1rem;
  }
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .nav-links {
    display: none;
  }
}

@media (max-width: 520px) {
  .products-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .hero-badges {
    flex-direction: column;
    align-items: flex-start;
  }
}

.gallery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.gallery-filter-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  border: 1px solid #e8e6e3;
  background: #fff;
  color: #444;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.gallery-filter-btn:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.gallery-filter-btn.is-active {
  background: #c41e3a;
  color: #fff;
  border-color: #c41e3a;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.gallery-card {
  border-radius: 1.3rem;
  overflow: hidden;
  border: 1px solid rgba(245, 226, 197, 0.3);
  background: radial-gradient(circle at top, rgba(251, 210, 142, 0.2), rgba(5, 3, 8, 0.96));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.gallery-image-wrapper {
  position: relative;
  padding: 0.45rem;
  padding-bottom: 0;
}

.gallery-image {
  width: 100%;
  height: 160px;
  border-radius: 1rem;
  object-fit: cover;
  display: block;
}

.gallery-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.7rem 0.7rem;
  font-size: 0.68rem;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.project-card {
  border-radius: 1.5rem;
  overflow: hidden;
  border: 1px solid rgba(245, 226, 197, 0.35);
  background: radial-gradient(circle at top, rgba(247, 166, 193, 0.2), rgba(5, 3, 8, 0.98));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
}

.project-cover-wrapper {
  position: relative;
  height: 150px;
  overflow: hidden;
}

.project-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.project-body {
  padding: 0.85rem 0.9rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.project-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #ffe7c2;
}

.project-subtitle {
  margin-top: 0.1rem;
  font-size: 0.72rem;
  color: rgba(245, 226, 197, 0.82);
}

.project-year-chip {
  font-size: 0.62rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.45);
  color: rgba(245, 226, 197, 0.9);
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.project-chip {
  font-size: 0.64rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.5);
  background: rgba(26, 11, 30, 0.9);
  color: rgba(245, 226, 197, 0.9);
}

.project-chip.subtle {
  border-color: rgba(245, 226, 197, 0.35);
  color: rgba(245, 226, 197, 0.8);
}

@media (max-width: 900px) {
  .gallery-grid,
  .project-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .gallery-grid,
  .project-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.app--solar {
  background: radial-gradient(circle at top left, #ffb347 0%, #ff5f6d 30%, #1e1b4b 70%, #050308 100%);
}

.nav--glass {
  background: linear-gradient(90deg, rgba(5, 3, 20, 0.96), rgba(12, 6, 35, 0.96), rgba(5, 3, 20, 0.96));
}

.split-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.6fr);
  gap: 1.75rem;
  align-items: flex-start;
}

.profile-panel {
  border-radius: 1.6rem;
  padding: 1.1rem 1.1rem 1.2rem;
  border: 1px solid rgba(245, 226, 197, 0.4);
  background: radial-gradient(circle at top, rgba(247, 166, 193, 0.3), rgba(5, 3, 8, 0.96));
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.profile-avatar {
  width: 60px;
  height: 60px;
  border-radius: 999px;
  background: conic-gradient(from 210deg, #ffb347, #ff5f6d, #f7a6c1, #ffe7c2, #ffb347);
  box-shadow: 0 0 26px rgba(255, 179, 71, 0.8);
}

.profile-name {
  margin-top: 0.4rem;
  font-size: 1.1rem;
  font-weight: 650;
  color: #ffe7c2;
}

.profile-role {
  font-size: 0.8rem;
  color: rgba(245, 226, 197, 0.86);
}

.profile-meta {
  margin-top: 0.4rem;
  font-size: 0.72rem;
  color: rgba(245, 226, 197, 0.8);
}

.profile-tags {
  margin-top: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.profile-tag {
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.5);
  font-size: 0.64rem;
  color: rgba(245, 226, 197, 0.9);
  background: rgba(5, 3, 12, 0.9);
}

.profile-tag.accent {
  border-color: transparent;
  background: linear-gradient(90deg, #ffb347, #ff5f6d);
  color: #1a0b1e;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.mosaic-hero {
  border-radius: 1.6rem;
  border: 1px solid rgba(245, 226, 197, 0.4);
  background: radial-gradient(circle at top right, rgba(255, 179, 71, 0.35), rgba(5, 3, 8, 0.98));
  padding: 0.9rem;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 0.8rem;
}

.mosaic-main {
  position: relative;
  border-radius: 1.3rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.mosaic-main-image {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}

.mosaic-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.6rem 0.8rem;
  background: linear-gradient(to top, rgba(5, 3, 8, 0.9), transparent);
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.92);
}

.mosaic-thumbs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.mosaic-thumb {
  position: relative;
  border-radius: 1.1rem;
  padding: 0;
  border: 1px solid rgba(245, 226, 197, 0.4);
  background: rgba(5, 3, 12, 0.9);
  cursor: pointer;
  overflow: hidden;
}

.mosaic-thumb img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  display: block;
  opacity: 0.9;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.mosaic-thumb.is-active img {
  opacity: 1;
  transform: scale(1.02);
}

.mosaic-thumb-label {
  position: absolute;
  left: 0.4rem;
  bottom: 0.35rem;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: rgba(5, 3, 12, 0.85);
  font-size: 0.6rem;
  color: rgba(245, 226, 197, 0.9);
}

.strip-gallery {
  border-radius: 1.6rem;
  padding: 1rem 1rem 1.1rem;
  border: 1px solid rgba(245, 226, 197, 0.4);
  background: radial-gradient(circle at top left, rgba(247, 166, 193, 0.25), rgba(5, 3, 8, 0.98));
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.strip-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-end;
}

.strip-eyebrow {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(245, 226, 197, 0.8);
}

.strip-title {
  margin-top: 0.15rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffe7c2;
}

.strip-description {
  font-size: 0.74rem;
  max-width: 18rem;
  color: rgba(245, 226, 197, 0.8);
}

.strip-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.strip-row--muted .strip-card {
  opacity: 0.9;
}

.strip-card {
  border-radius: 1.1rem;
  overflow: hidden;
  border: 1px solid rgba(245, 226, 197, 0.35);
  background: rgba(5, 3, 12, 0.96);
  display: flex;
  flex-direction: column;
}

.strip-card img {
  width: 100%;
  height: 82px;
  object-fit: cover;
  display: block;
}

.strip-card-body {
  padding: 0.4rem 0.55rem 0.5rem;
  font-size: 0.68rem;
}

.strip-card-title {
  color: #ffe7c2;
  font-weight: 500;
}

.strip-card-subtitle {
  margin-top: 0.05rem;
  color: rgba(245, 226, 197, 0.8);
  font-size: 0.64rem;
}

.contact-banner {
  border-radius: 1.4rem;
  margin-top: 0.2rem;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(245, 226, 197, 0.45);
  background: linear-gradient(90deg, rgba(5, 3, 12, 0.95), rgba(64, 20, 95, 0.95));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.78rem;
}

.contact-text {
  color: rgba(245, 226, 197, 0.88);
}

.contact-cta {
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ffb347, #ff5f6d);
  color: #1a0b1e;
  box-shadow: 0 0 22px rgba(255, 179, 71, 0.7);
}

@media (max-width: 980px) {
  .split-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-panel {
    order: -1;
  }
}

@media (max-width: 720px) {
  .mosaic-hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .strip-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .strip-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .contact-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;

const APP_JSX = `import { useState } from 'react';

const img = (url) => '/api/image-proxy?url=' + encodeURIComponent(url);

const PRODUCTS = [
  { id: 'p1', name: 'Anarkali Suit Set', price: 3499, originalPrice: 4299, category: 'Suit Sets', image: img('https://placehold.co/800x600/8B2252/FFE4B5?text=Anarkali'), badge: 'Bestseller' },
  { id: 'p2', name: 'Floral Print Kurti', price: 1299, originalPrice: 1599, category: 'Kurtas', image: img('https://placehold.co/800x600/2E8B57/F5F5DC?text=Kurti'), badge: 'New' },
  { id: 'p3', name: 'Casual Cotton Dress', price: 1999, originalPrice: null, category: 'Dresses', image: img('https://placehold.co/800x600/CD853F/FFF8DC?text=Dress'), badge: null },
  { id: 'p4', name: 'Silk Banarasi Saree', price: 8999, originalPrice: 10999, category: 'Sarees', image: img('https://placehold.co/800x600/8B0000/FFD700?text=Saree'), badge: 'Festive' },
  { id: 'p5', name: 'Straight Cut Suit Set', price: 2799, originalPrice: null, category: 'Suit Sets', image: img('https://placehold.co/800x600/4B0082/FFE4E1?text=Suit+Set'), badge: null },
  { id: 'p6', name: 'Embroidered Kurta', price: 2499, originalPrice: 2999, category: 'Kurtas', image: img('https://placehold.co/800x600/C41E3A/FFFACD?text=Kurta'), badge: 'Sale' },
  { id: 'p7', name: 'Festive Lehenga Set', price: 5999, originalPrice: null, category: 'Suit Sets', image: img('https://placehold.co/800x600/800080/FFE4B5?text=Lehenga'), badge: null },
  { id: 'p8', name: 'Chiffon Printed Saree', price: 3299, originalPrice: 3999, category: 'Sarees', image: img('https://placehold.co/800x600/2F4F4F/F0E68C?text=Chiffon'), badge: 'Limited' },
  { id: 'p9', name: 'Workwear Dress', price: 1699, originalPrice: null, category: 'Dresses', image: img('https://placehold.co/800x600/4682B4/FFFFFF?text=Workwear'), badge: null },
];

const CATEGORIES = ['All', 'Suit Sets', 'Kurtas', 'Dresses', 'Sarees'];

function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [cart, setCart] = useState([]);

  const filteredProducts = activeFilter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeFilter);

  const addToCart = (product) => {
    const existing = cart.find((c) => c.id === product.id);
    if (existing) {
      setCart(cart.map((c) => c.id === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map((c) => {
      if (c.id !== id) return c;
      const n = Math.max(0, c.qty + delta);
      return n === 0 ? null : { ...c, qty: n };
    }).filter(Boolean));
  };

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="app">
      <header className="nav">
        <div className="brand">
          <div className="brand-mark">ORAA</div>
          <div className="brand-text">
            <div className="brand-name">Ethnic Wear</div>
            <div className="brand-tagline">For Women & Girls</div>
          </div>
        </div>
        <nav className="nav-links">
          <a href="#products">Suit Sets</a>
          <a href="#products">Kurtas</a>
          <a href="#products">Dresses</a>
          <a href="#products">Sarees</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-banner">
            <img src={img('https://placehold.co/1200x400/8B2252/FFE4B5?text=ORAA+Ethnic+Wear')} alt="ORAA Ethnic Wear" className="hero-banner-img" referrerPolicy="no-referrer" loading="eager" />
          </div>
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome to ORAA – Where Every Day is a Celebration of Style
            </h1>
            <p className="hero-subtitle">
              Step into the world of ORAA, where fashion meets tradition. Discover vibrant suit sets, kurtas, dresses, and sarees that redefine contemporary Indian fashion for every occasion.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => scrollTo('products')}>Shop Collection</button>
              <button className="btn-secondary" onClick={() => scrollTo('cart-bar')}>View Cart</button>
            </div>
            <div className="hero-badges">
              <div className="hero-badge">Free Shipping</div>
              <div className="hero-badge">Secure Payments</div>
              <div className="hero-badge">Easy Return</div>
            </div>
          </div>
          <aside className="hero-featured">
            <div className="hero-featured-title">Top Categories</div>
            <div className="hero-featured-grid">
              <div className="category-chip">Anarkali Suit Sets</div>
              <div className="category-chip">Kurtas</div>
              <div className="category-chip">Straight Suit Sets</div>
              <div className="category-chip">Dresses</div>
              <div className="category-chip">Sarees</div>
              <div className="category-chip">Palazzos</div>
            </div>
          </aside>
        </section>

        <section id="products" className="section">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Collection</div>
              <h2 className="section-title">Shop by Category</h2>
            </div>
            <p className="section-subtitle">Indian wear that blends tradition with contemporary style.</p>
          </div>
          <div className="gallery-filters">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" className={'gallery-filter-btn' + (activeFilter === cat ? ' is-active' : '')} onClick={() => setActiveFilter(cat)}>{cat}</button>
            ))}
          </div>
          <div className="products-grid">
            {filteredProducts.map((p) => (
              <article key={p.id} className="product-card">
                <div className="product-media"><img src={p.image} alt={p.name} className="product-image" referrerPolicy="no-referrer" loading="eager" /></div>
                <div className="product-body">
                  <div className="product-name">{p.name}</div>
                  <div className="product-subtitle">{p.category}</div>
                  <div className="product-meta">
                    {p.badge && <span className="pill">{p.badge}</span>}
                    <span className="pill">Free shipping</span>
                  </div>
                  <div className="product-footer">
                    <div>
                      <span className="product-price-main">₹{p.price.toLocaleString('en-IN')}</span>
                      {p.originalPrice && <span className="product-price-strike">₹{p.originalPrice.toLocaleString('en-IN')}</span>}
                    </div>
                    <button className="btn-cart" onClick={() => addToCart(p)}>Add to cart</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <div id="cart-bar" className="cart-bar">
        <div className="cart-summary">
          <span className="cart-count-pill"><span className="cart-count-badge">{cartCount}</span> items in cart</span>
          <span className="cart-total">Total: ₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
        {cart.length > 0 && (
          <div className="cart-panel">
            {cart.map((c) => (
              <div key={c.id} className="cart-item-row">
                <div className="cart-item-meta"><div className="cart-item-name">{c.name}</div><div className="cart-item-detail">₹{c.price.toLocaleString('en-IN')} × {c.qty}</div></div>
                <div className="cart-item-controls">
                  <button className="cart-qty-btn" onClick={() => updateQty(c.id, -1)}>−</button>
                  <span className="qty-pill">{c.qty}</span>
                  <button className="cart-qty-btn" onClick={() => updateQty(c.id, 1)}>+</button>
                </div>
                <span className="cart-item-price">₹{(c.price * c.qty).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
        <button className="cart-button" disabled={cartCount === 0}>Checkout</button>
      </div>

      <div className="bottom-note">
        ORAA sample — vibrant ethnic wear e-commerce for women. Clone in App Studio and add your own products.
      </div>
    </div>
  );
}

export default App;
`;

export interface SampleReactFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

/** Files in canonical order: index.html, styles.css, src/App.jsx */
export const SAMPLE_REACT_FILES: SampleReactFile[] = [
  {
    path: 'index.html',
    name: 'index.html',
    content: INDEX_HTML,
    language: 'html',
    isMain: false,
  },
  {
    path: 'styles.css',
    name: 'styles.css',
    content: STYLES_CSS,
    language: 'css',
    isMain: false,
  },
  {
    path: REACT_MAIN_JSX,
    name: 'App.jsx',
    content: APP_JSX,
    language: 'jsx',
    isMain: true,
  },
];
