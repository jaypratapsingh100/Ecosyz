/**
 * Sample React project: config and file contents for the "React Sample" in Studio.
 * Uses canonical structure from @/lib/app-builder/canonicalReact.
 */

import { REACT_MAIN_JSX } from '@/lib/app-builder/canonicalReact';

export const SAMPLE_REACT_PROJECT = {
  title: 'ORAA — Saree E-Commerce',
  description:
    'A vibrant e-commerce website for sarees with jewel-tone aesthetics and shopping cart',
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
  <title>ORAA • Sarees</title>
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

    const SAREES = [
      { id: 's1', name: 'Royal Silk Banarasi', price: 12999, originalPrice: 15999, category: 'Banarasi', image: 'https://images.unsplash.com/photo-1617127365659-c47fa927d264?auto=format&fit=crop&w=800&q=80', badge: 'Bestseller' },
      { id: 's2', name: 'Saffron Cotton Print', price: 2499, originalPrice: 2999, category: 'Cotton', image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80', badge: 'New' },
      { id: 's3', name: 'Emerald Chiffon Drape', price: 4499, originalPrice: null, category: 'Chiffon', image: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=800&q=80', badge: null },
      { id: 's4', name: 'Gold Zari Silk', price: 18999, originalPrice: 22999, category: 'Silk', image: 'https://images.unsplash.com/photo-1558171813-4b74a2f7f4e1?auto=format&fit=crop&w=800&q=80', badge: 'Luxe' },
      { id: 's5', name: 'Coral Georgette', price: 3299, originalPrice: null, category: 'Georgette', image: 'https://images.unsplash.com/photo-1515886652393-9c5f01e1e5f6?auto=format&fit=crop&w=800&q=80', badge: null },
      { id: 's6', name: 'Fuchsia Silk Blend', price: 6999, originalPrice: 8499, category: 'Silk', image: 'https://images.unsplash.com/photo-1490481461827-8c496aba61b7?auto=format&fit=crop&w=800&q=80', badge: 'Sale' },
      { id: 's7', name: 'Indigo Cotton Handloom', price: 3999, originalPrice: null, category: 'Cotton', image: 'https://images.unsplash.com/photo-1558618662-d8c38c9631e?auto=format&fit=crop&w=800&q=80', badge: null },
      { id: 's8', name: 'Pearl Banarasi', price: 15999, originalPrice: 18999, category: 'Banarasi', image: 'https://images.unsplash.com/photo-1519699047748-7e42932eef30?auto=format&fit=crop&w=800&q=80', badge: 'Limited' },
      { id: 's9', name: 'Mint Chiffon', price: 3799, originalPrice: null, category: 'Chiffon', image: 'https://images.unsplash.com/photo-1515886652393-9c5f01e1e5f6?auto=format&fit=crop&w=800&q=80', badge: null },
    ];

    const CATEGORIES = ['All', 'Silk', 'Cotton', 'Banarasi', 'Chiffon', 'Georgette'];

    function App() {
      const [activeFilter, setActiveFilter] = useState('All');
      const [cart, setCart] = useState([]);

      const filteredSarees = activeFilter === 'All' ? SAREES : SAREES.filter((s) => s.category === activeFilter);

      const addToCart = (saree) => {
        const existing = cart.find((c) => c.id === saree.id);
        if (existing) {
          setCart(cart.map((c) => c.id === saree.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
          setCart([...cart, { ...saree, qty: 1 }]);
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
              <div className="brand-mark">O</div>
              <div className="brand-text">
                <div className="brand-name">ORAA</div>
                <div className="brand-tagline">For Sarees</div>
              </div>
            </div>
            <div className="nav-pill">E-commerce • Saree store</div>
          </header>

          <main>
            <section className="hero">
              <div className="hero-grid">
                <div>
                  <div className="hero-eyebrow">
                    <span className="hero-dot" />
                    Premium handpicked sarees
                  </div>
                  <h1 className="hero-title">
                    Wrap yourself in
                    <span className="highlight"> timeless elegance.</span>
                  </h1>
                  <p className="hero-subtitle">
                    Silk, cotton, Banarasi and more — curated for every occasion. Free shipping on orders above ₹2,999.
                  </p>
                  <div className="hero-actions">
                    <button className="btn-primary" onClick={() => scrollTo('products')}>Shop collection</button>
                    <button className="btn-secondary" onClick={() => scrollTo('cart-bar')}>View cart</button>
                  </div>
                  <div className="hero-badges">
                    <div className="hero-badge">100% authentic</div>
                    <div className="hero-badge">Easy returns</div>
                    <div className="hero-badge">Handcrafted</div>
                  </div>
                </div>
                <aside className="hero-card">
                  <div className="hero-card-title">Featured pick</div>
                  <div className="hero-card-grid">
                    {SAREES.slice(0, 3).map((s) => (
                      <div key={s.id} className="mini-card">
                        <div><div className="mini-card-name">{s.name}</div><div className="mini-card-label">{s.category}</div></div>
                        <div><div className="mini-card-price">₹{s.price.toLocaleString('en-IN')}</div><div className="mini-card-badge">{s.badge || '—'}</div></div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </section>

            <section id="products" className="section">
              <div className="section-header">
                <div>
                  <div className="section-eyebrow">collection</div>
                  <h2 className="section-title">Shop by fabric</h2>
                </div>
                <p className="section-subtitle">Filter by category and add to cart.</p>
              </div>
              <div className="gallery-filters">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" className={'gallery-filter-btn' + (activeFilter === cat ? ' is-active' : '')} onClick={() => setActiveFilter(cat)}>{cat}</button>
                ))}
              </div>
              <div className="products-grid">
                {filteredSarees.map((s) => (
                  <article key={s.id} className="product-card">
                    <div className="product-media"><img src={s.image} alt={s.name} className="product-image" /></div>
                    <div className="product-body">
                      <div className="product-name">{s.name}</div>
                      <div className="product-subtitle">{s.category} • Premium quality</div>
                      <div className="product-meta">
                        {s.badge && <span className="pill">{s.badge}</span>}
                        <span className="pill">Free shipping</span>
                      </div>
                      <div className="product-footer">
                        <div>
                          <span className="product-price-main">₹{s.price.toLocaleString('en-IN')}</span>
                          {s.originalPrice && <span className="product-price-strike">₹{s.originalPrice.toLocaleString('en-IN')}</span>}
                        </div>
                        <button className="btn-cart" onClick={() => addToCart(s)}>Add to cart</button>
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
            ORAA sample — vibrant saree e-commerce for Sarees. Clone in App Studio and add your own products.
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
  background: radial-gradient(ellipse at top, #4a1942 0%, #1a0a2e 40%, #0d0518 70%, #050308 100%);
  min-height: 100vh;
  color: #fef7ed;
}

/* ORAA vibrant palette: saffron #ff6b35, gold #f4c430, coral #ff7f50, fuchsia #e91e63, jewel purple #6b21a8 */

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
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(255, 107, 53, 0.35);
  background: linear-gradient(90deg, rgba(26, 11, 46, 0.97), rgba(74, 25, 66, 0.95), rgba(26, 11, 46, 0.97));
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
  background: conic-gradient(from 220deg, #ff6b35, #f4c430, #e91e63, #ff6b35);
  color: #fff;
  box-shadow: 0 0 24px rgba(233, 30, 99, 0.6);
}

.brand-text {
  line-height: 1.2;
}

.brand-name {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: linear-gradient(90deg, #ff6b35, #f4c430, #e91e63);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-tagline {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 53, 0.5);
  color: rgba(255, 247, 237, 0.9);
}

.nav-pill {
  font-size: 0.7rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 53, 0.45);
  background: rgba(5, 3, 8, 0.7);
  color: rgba(255, 247, 237, 0.85);
}

.hero {
  padding: 2.5rem 1.5rem 2rem;
  max-width: 1040px;
  margin: 0 auto;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.1fr);
  gap: 2rem;
}

.hero-eyebrow,
.hero-left-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 53, 0.6);
  background: rgba(26, 11, 30, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.64rem;
  color: rgba(255, 247, 237, 0.9);
}

.hero-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #e91e63);
}

.hero-title {
  margin-top: 1.2rem;
  font-size: clamp(2.2rem, 4vw, 3.1rem);
  line-height: 1.04;
  font-weight: 680;
}

.hero-title span.highlight {
  color: #f4c430;
  display: block;
  text-shadow: 0 0 30px rgba(244, 196, 48, 0.5);
}

.hero-subtitle {
  margin-top: 0.9rem;
  font-size: 0.95rem;
  max-width: 32rem;
  color: rgba(245, 226, 197, 0.86);
}

.hero-actions {
  margin-top: 1.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.btn-primary {
  padding: 0.65rem 1.4rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff6b35, #e91e63, #ff7f50);
  color: #fff;
  box-shadow: 0 0 26px rgba(233, 30, 99, 0.6);
}

.btn-secondary {
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.45);
  background: rgba(5, 3, 8, 0.7);
  color: rgba(245, 226, 197, 0.86);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.hero-badges {
  margin-top: 1.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.86);
}

.hero-badge {
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.35);
  background: rgba(26, 11, 30, 0.9);
  padding: 0.45rem 0.75rem;
}

.hero-card,
.hero-right-card {
  border-radius: 1.6rem;
  padding: 1.2rem;
  border: 1px solid rgba(255, 107, 53, 0.4);
  background: radial-gradient(circle at top, rgba(233, 30, 99, 0.25), rgba(107, 33, 168, 0.2), rgba(5, 3, 8, 0.95));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(233, 30, 99, 0.15);
}

.hero-card-title,
.hero-right-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255, 247, 237, 0.9);
  margin-bottom: 0.8rem;
}

.hero-card-grid,
.hero-right-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.mini-card {
  border-radius: 1.1rem;
  padding: 0.6rem 0.55rem;
  background: rgba(26, 11, 30, 0.92);
  border: 1px solid rgba(245, 226, 197, 0.35);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mini-card-name {
  font-size: 0.68rem;
  font-weight: 600;
  color: #fef7ed;
}

.mini-card-label {
  font-size: 0.6rem;
  color: rgba(245, 226, 197, 0.78);
}

.mini-card-price {
  font-size: 0.7rem;
  font-weight: 600;
  color: #f4c430;
}

.mini-card-badge {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  background: rgba(233, 30, 99, 0.3);
  color: #ff7f50;
  align-self: flex-start;
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
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(245, 226, 197, 0.8);
}

.section-title {
  margin-top: 0.1rem;
  font-size: 1.1rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff6b35, #f4c430, #e91e63);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.section-subtitle {
  font-size: 0.8rem;
  max-width: 20rem;
  color: rgba(245, 226, 197, 0.82);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.product-card {
  border-radius: 1.4rem;
  overflow: hidden;
  border: 1px solid rgba(255, 107, 53, 0.35);
  background: radial-gradient(circle at top, rgba(233, 30, 99, 0.15), rgba(5, 3, 8, 0.98));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.9), 0 0 30px rgba(233, 30, 99, 0.08);
  display: flex;
  flex-direction: column;
}

.product-media {
  height: 160px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 107, 53, 0.3);
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.2), rgba(107, 33, 168, 0.15));
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-media-inner {
  position: absolute;
  inset: 10px;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.32);
}

.product-body {
  padding: 0.8rem 0.9rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.product-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #fef7ed;
}

.product-subtitle {
  font-size: 0.72rem;
  color: rgba(245, 226, 197, 0.86);
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.pill {
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.62rem;
  border: 1px solid rgba(245, 226, 197, 0.4);
  color: rgba(245, 226, 197, 0.86);
  background: rgba(26, 11, 30, 0.9);
}

.product-footer {
  margin-top: 0.4rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.product-price-main {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f4c430;
}

.product-price-strike {
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.65);
  text-decoration: line-through;
}

.product-ship {
  margin-top: 0.1rem;
  font-size: 0.65rem;
  color: rgba(245, 226, 197, 0.8);
}

.product-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.btn-cart {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff6b35, #e91e63);
  color: #fff;
}

.btn-link {
  font-size: 0.66rem;
  color: rgba(245, 226, 197, 0.8);
}

.cart-bar {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  padding: 0.7rem 1.25rem 0.9rem;
  border-top: 1px solid rgba(255, 107, 53, 0.35);
  background: linear-gradient(180deg, rgba(26, 11, 46, 0.98), rgba(5, 3, 8, 1));
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.cart-summary {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.cart-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(26, 11, 30, 0.9);
  border: 1px solid rgba(245, 226, 197, 0.4);
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.9);
}

.cart-count-badge {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  background: linear-gradient(135deg, #ff6b35, #e91e63);
  color: #fff;
}

.cart-total {
  font-size: 0.8rem;
  color: #f4c430;
  font-weight: 600;
}

.cart-secondary {
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.8);
}

.cart-button {
  padding: 0.45rem 1.2rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff6b35, #e91e63);
  color: #fff;
  box-shadow: 0 0 22px rgba(233, 30, 99, 0.6);
}

.cart-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cart-panel {
  margin-top: 0.9rem;
  padding: 0.7rem 0.85rem;
  border-radius: 1rem;
  border: 1px solid rgba(245, 226, 197, 0.3);
  background: rgba(26, 11, 30, 0.96);
  font-size: 0.72rem;
  display: grid;
  gap: 0.4rem;
}

.cart-item-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.cart-item-meta {
  max-width: 12rem;
}

.cart-item-name {
  font-weight: 500;
  color: #fef7ed;
}

.cart-item-detail {
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.8);
}

.cart-item-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.qty-pill {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.4);
  font-size: 0.7rem;
}

.cart-qty-btn {
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.4);
  padding: 0.1rem 0.35rem;
  font-size: 0.7rem;
  background: rgba(5, 3, 8, 0.9);
  color: rgba(245, 226, 197, 0.9);
  cursor: pointer;
}

.cart-item-price {
  font-size: 0.72rem;
  color: #f4c430;
}

.bottom-note {
  padding: 0 1.5rem 1.5rem;
  max-width: 1040px;
  margin: 0 auto;
  font-size: 0.7rem;
  color: rgba(245, 226, 197, 0.7);
}

@media (max-width: 768px) {
  .hero {
    padding-inline: 1rem;
  }
  .hero-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .hero-right-card,
  .hero-card {
    margin-top: 1.4rem;
  }
  .section {
    padding-inline: 1rem;
  }
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .nav-pill {
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
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.gallery-filter-btn {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.4);
  background: rgba(5, 3, 8, 0.8);
  color: rgba(245, 226, 197, 0.86);
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.gallery-filter-btn.is-active {
  background: linear-gradient(90deg, #ff6b35, #e91e63);
  color: #fff;
  border-color: transparent;
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

const SAREES = [
  { id: 's1', name: 'Royal Silk Banarasi', price: 12999, originalPrice: 15999, category: 'Banarasi', image: 'https://images.unsplash.com/photo-1617127365659-c47fa927d264?auto=format&fit=crop&w=800&q=80', badge: 'Bestseller' },
  { id: 's2', name: 'Saffron Cotton Print', price: 2499, originalPrice: 2999, category: 'Cotton', image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80', badge: 'New' },
  { id: 's3', name: 'Emerald Chiffon Drape', price: 4499, originalPrice: null, category: 'Chiffon', image: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=800&q=80', badge: null },
  { id: 's4', name: 'Gold Zari Silk', price: 18999, originalPrice: 22999, category: 'Silk', image: 'https://images.unsplash.com/photo-1558171813-4b74a2f7f4e1?auto=format&fit=crop&w=800&q=80', badge: 'Luxe' },
  { id: 's5', name: 'Coral Georgette', price: 3299, originalPrice: null, category: 'Georgette', image: 'https://images.unsplash.com/photo-1515886652393-9c5f01e1e5f6?auto=format&fit=crop&w=800&q=80', badge: null },
  { id: 's6', name: 'Fuchsia Silk Blend', price: 6999, originalPrice: 8499, category: 'Silk', image: 'https://images.unsplash.com/photo-1490481461827-8c496aba61b7?auto=format&fit=crop&w=800&q=80', badge: 'Sale' },
  { id: 's7', name: 'Indigo Cotton Handloom', price: 3999, originalPrice: null, category: 'Cotton', image: 'https://images.unsplash.com/photo-1558618662-d8c38c9631e?auto=format&fit=crop&w=800&q=80', badge: null },
  { id: 's8', name: 'Pearl Banarasi', price: 15999, originalPrice: 18999, category: 'Banarasi', image: 'https://images.unsplash.com/photo-1519699047748-7e42932eef30?auto=format&fit=crop&w=800&q=80', badge: 'Limited' },
  { id: 's9', name: 'Mint Chiffon', price: 3799, originalPrice: null, category: 'Chiffon', image: 'https://images.unsplash.com/photo-1515886652393-9c5f01e1e5f6?auto=format&fit=crop&w=800&q=80', badge: null },
];

const CATEGORIES = ['All', 'Silk', 'Cotton', 'Banarasi', 'Chiffon', 'Georgette'];

function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [cart, setCart] = useState([]);

  const filteredSarees = activeFilter === 'All' ? SAREES : SAREES.filter((s) => s.category === activeFilter);

  const addToCart = (saree) => {
    const existing = cart.find((c) => c.id === saree.id);
    if (existing) {
      setCart(cart.map((c) => c.id === saree.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...saree, qty: 1 }]);
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
          <div className="brand-mark">O</div>
          <div className="brand-text">
            <div className="brand-name">ORAA</div>
            <div className="brand-tagline">For Sarees</div>
          </div>
        </div>
        <div className="nav-pill">E-commerce • Saree store</div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">
                <span className="hero-dot" />
                Premium handpicked sarees
              </div>
              <h1 className="hero-title">
                Wrap yourself in
                <span className="highlight"> timeless elegance.</span>
              </h1>
              <p className="hero-subtitle">
                Silk, cotton, Banarasi and more — curated for every occasion. Free shipping on orders above ₹2,999.
              </p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => scrollTo('products')}>Shop collection</button>
                <button className="btn-secondary" onClick={() => scrollTo('cart-bar')}>View cart</button>
              </div>
              <div className="hero-badges">
                <div className="hero-badge">100% authentic</div>
                <div className="hero-badge">Easy returns</div>
                <div className="hero-badge">Handcrafted</div>
              </div>
            </div>
            <aside className="hero-card">
              <div className="hero-card-title">Featured pick</div>
              <div className="hero-card-grid">
                {SAREES.slice(0, 3).map((s) => (
                  <div key={s.id} className="mini-card">
                    <div><div className="mini-card-name">{s.name}</div><div className="mini-card-label">{s.category}</div></div>
                    <div><div className="mini-card-price">₹{s.price.toLocaleString('en-IN')}</div><div className="mini-card-badge">{s.badge || '—'}</div></div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section id="products" className="section">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">collection</div>
              <h2 className="section-title">Shop by fabric</h2>
            </div>
            <p className="section-subtitle">Filter by category and add to cart.</p>
          </div>
          <div className="gallery-filters">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" className={'gallery-filter-btn' + (activeFilter === cat ? ' is-active' : '')} onClick={() => setActiveFilter(cat)}>{cat}</button>
            ))}
          </div>
          <div className="products-grid">
            {filteredSarees.map((s) => (
              <article key={s.id} className="product-card">
                <div className="product-media"><img src={s.image} alt={s.name} className="product-image" /></div>
                <div className="product-body">
                  <div className="product-name">{s.name}</div>
                  <div className="product-subtitle">{s.category} • Premium quality</div>
                  <div className="product-meta">
                    {s.badge && <span className="pill">{s.badge}</span>}
                    <span className="pill">Free shipping</span>
                  </div>
                  <div className="product-footer">
                    <div>
                      <span className="product-price-main">₹{s.price.toLocaleString('en-IN')}</span>
                      {s.originalPrice && <span className="product-price-strike">₹{s.originalPrice.toLocaleString('en-IN')}</span>}
                    </div>
                    <button className="btn-cart" onClick={() => addToCart(s)}>Add to cart</button>
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
        ORAA sample — vibrant saree e-commerce for Sarees. Clone in App Studio and add your own products.
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
