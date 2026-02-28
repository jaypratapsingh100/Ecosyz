/**
 * Sample E-commerce project: Amazon/Flipkart/Meesho-style marketplace.
 * Multi-category products, deals, search, ratings, and cart.
 */

import { REACT_MAIN_JSX } from '@/lib/app-builder/canonicalReact';
import type { SampleReactFile } from './sampleReactProject';

export const SAMPLE_ECOMMERCE_PROJECT = {
  title: 'ShopMart — E-Commerce Marketplace',
  description:
    'An Amazon/Flipkart-style e-commerce website with multi-category products, deals, ratings, and shopping cart',
  type: 'web' as const,
  framework: 'react',
  appType: 'react',
  previewVersion: 'v2' as const,
};

const PRODUCTS = [
  { id: 'p1', name: 'Wireless Bluetooth Headphones', price: 2499, originalPrice: 3999, category: 'Electronics', rating: 4.5, reviews: 1234, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', badge: 'Best Seller' },
  { id: 'p2', name: 'Smart Watch Pro', price: 3499, originalPrice: 4999, category: 'Electronics', rating: 4.3, reviews: 892, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', badge: '30% off' },
  { id: 'p3', name: 'Men Casual T-Shirt', price: 599, originalPrice: 999, category: 'Fashion', rating: 4.2, reviews: 2341, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80', badge: 'Trending' },
  { id: 'p4', name: 'Running Shoes', price: 1899, originalPrice: 2999, category: 'Fashion', rating: 4.6, reviews: 567, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', badge: 'New' },
  { id: 'p5', name: 'Kitchen Mixer Grinder', price: 2999, originalPrice: 3999, category: 'Home', rating: 4.4, reviews: 445, image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80', badge: 'Deal' },
  { id: 'p6', name: 'LED Desk Lamp', price: 899, originalPrice: 1299, category: 'Home', rating: 4.1, reviews: 678, image: 'https://images.unsplash.com/photo-1507473885765-e6ed8f8e2299?auto=format&fit=crop&w=800&q=80', badge: null },
  { id: 'p7', name: 'Portable Power Bank', price: 799, originalPrice: 999, category: 'Electronics', rating: 4.0, reviews: 2103, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80', badge: 'Top Pick' },
  { id: 'p8', name: 'Women Handbag', price: 1299, originalPrice: 1999, category: 'Fashion', rating: 4.3, reviews: 1123, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', badge: '50% off' },
  { id: 'p9', name: 'Coffee Maker', price: 2499, originalPrice: 3499, category: 'Home', rating: 4.5, reviews: 334, image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80', badge: null },
];

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home'];

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ShopMart • E-Commerce Marketplace</title>
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

    const PRODUCTS = ${JSON.stringify(PRODUCTS)};
    const CATEGORIES = ${JSON.stringify(CATEGORIES)};

    function StarRating({ rating }) {
      const full = Math.floor(rating);
      const half = rating % 1 >= 0.5;
      return (
        <span className="star-rating">
          {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
        </span>
      );
    }

    function App() {
      const [activeFilter, setActiveFilter] = useState('All');
      const [cart, setCart] = useState([]);
      const [searchQuery, setSearchQuery] = useState('');

      const filtered = activeFilter === 'All'
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === activeFilter);
      const products = searchQuery
        ? filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : filtered;

      const addToCart = (item) => {
        const existing = cart.find((c) => c.id === item.id);
        if (existing) {
          setCart(cart.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
          setCart([...cart, { ...item, qty: 1 }]);
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

      return (
        <div className="app">
          <header className="header">
            <div className="header-inner">
              <div className="logo">
                <span className="logo-icon">S</span>
                <span className="logo-text">ShopMart</span>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button className="search-btn">Search</button>
              </div>
              <div className="header-actions">
                <div className="cart-badge">
                  <span className="cart-icon">🛒</span>
                  <span className="cart-count">{cartCount}</span>
                </div>
              </div>
            </div>
          </header>

          <nav className="categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={'cat-btn' + (activeFilter === cat ? ' active' : '')}
                onClick={() => setActiveFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </nav>

          <div className="deal-banner">
            <span className="deal-tag">🔥 DEAL OF THE DAY</span>
            <span>Up to 50% off on Electronics & Fashion — Limited time offer!</span>
          </div>

          <main className="main">
            <h2 className="section-title">Products for you</h2>
            <div className="products-grid">
              {products.map((p) => (
                <article key={p.id} className="product-card">
                  <div className="product-img-wrap">
                    <img src={p.image} alt={p.name} className="product-img" />
                    {p.badge && <span className="product-badge">{p.badge}</span>}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{p.name}</h3>
                    <div className="product-rating">
                      <StarRating rating={p.rating} />
                      <span className="review-count">({p.reviews})</span>
                    </div>
                    <div className="product-price">
                      <span className="price-current">₹{p.price.toLocaleString('en-IN')}</span>
                      {p.originalPrice && (
                        <span className="price-original">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
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
              <span className="cart-items">{cartCount} items</span>
              <span className="cart-total">Total: ₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            {cart.length > 0 && (
              <div className="cart-list">
                {cart.map((c) => (
                  <div key={c.id} className="cart-row">
                    <span className="cart-name">{c.name}</span>
                    <div className="cart-qty">
                      <button onClick={() => updateQty(c.id, -1)}>−</button>
                      <span>{c.qty}</span>
                      <button onClick={() => updateQty(c.id, 1)}>+</button>
                    </div>
                    <span className="cart-price">₹{(c.price * c.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="checkout-btn" disabled={cartCount === 0}>Proceed to Checkout</button>
          </div>

          <footer className="footer">
            ShopMart — E-commerce marketplace sample. Clone and customize for your store.
          </footer>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f1f3f6;
  min-height: 100vh;
  color: #212121;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header - Amazon/Flipkart style */
.header {
  background: linear-gradient(135deg, #ff9f00 0%, #ff6b00 100%);
  padding: 0.75rem 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #fff;
  color: #ff6b00;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.2rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.search-bar {
  flex: 1;
  max-width: 500px;
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.search-input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  font-size: 0.95rem;
}

.search-btn {
  padding: 0.6rem 1.2rem;
  background: #232f3e;
  color: #fff;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.cart-badge {
  position: relative;
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  border-radius: 8px;
  cursor: pointer;
}

.cart-icon {
  font-size: 1.4rem;
}

.cart-count {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Categories */
.categories {
  background: #fff;
  padding: 0.6rem 1.25rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.cat-btn {
  padding: 0.4rem 1rem;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #565656;
}

.cat-btn:hover, .cat-btn.active {
  background: #ff9f00;
  color: #fff;
  border-color: #ff9f00;
}

/* Deal banner */
.deal-banner {
  background: linear-gradient(90deg, #232f3e 0%, #37475a 100%);
  color: #fff;
  padding: 0.6rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.deal-tag {
  background: #ff6b00;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.75rem;
}

/* Main content */
.main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
  width: 100%;
}

.section-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #212121;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  position: relative;
  height: 180px;
  background: #f8f9fa;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #ff6b00;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.product-info {
  padding: 0.9rem;
}

.product-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #212121;
  margin-bottom: 0.35rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}

.star-rating {
  color: #ffa41c;
  font-size: 0.85rem;
}

.review-count {
  font-size: 0.75rem;
  color: #878787;
}

.product-price {
  margin-bottom: 0.5rem;
}

.price-current {
  font-size: 1.1rem;
  font-weight: 700;
  color: #212121;
}

.price-original {
  font-size: 0.8rem;
  color: #878787;
  text-decoration: line-through;
  margin-left: 0.4rem;
}

.add-cart-btn {
  width: 100%;
  padding: 0.5rem;
  background: #ff9f00;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.add-cart-btn:hover {
  background: #ff6b00;
}

/* Cart bar */
.cart-bar {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.cart-items {
  font-size: 0.9rem;
  color: #565656;
}

.cart-total {
  font-size: 1rem;
  font-weight: 700;
  color: #212121;
}

.cart-list {
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.cart-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.cart-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-qty {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.cart-qty button {
  width: 24px;
  height: 24px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.cart-price {
  font-weight: 600;
  color: #ff6b00;
}

.checkout-btn {
  width: 100%;
  padding: 0.65rem;
  background: #ff9f00;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
}

.checkout-btn:hover:not(:disabled) {
  background: #ff6b00;
}

.checkout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footer {
  padding: 1rem 1.25rem;
  text-align: center;
  font-size: 0.8rem;
  color: #878787;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

@media (max-width: 768px) {
  .header-inner {
    flex-wrap: wrap;
  }
  .search-bar {
    order: 3;
    max-width: 100%;
    width: 100%;
  }
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}
`;

const APP_JSX = `import { useState } from 'react';

const PRODUCTS = ${JSON.stringify(PRODUCTS)};
const CATEGORIES = ${JSON.stringify(CATEGORIES)};

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="star-rating">
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = activeFilter === 'All'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeFilter);
  const products = searchQuery
    ? filtered.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filtered;

  const addToCart = (item) => {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      setCart(cart.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
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

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">S</span>
            <span className="logo-text">ShopMart</span>
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">Search</button>
          </div>
          <div className="header-actions">
            <div className="cart-badge">
              <span className="cart-icon">🛒</span>
              <span className="cart-count">{cartCount}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={'cat-btn' + (activeFilter === cat ? ' active' : '')}
            onClick={() => setActiveFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="deal-banner">
        <span className="deal-tag">🔥 DEAL OF THE DAY</span>
        <span>Up to 50% off on Electronics & Fashion — Limited time offer!</span>
      </div>

      <main className="main">
        <h2 className="section-title">Products for you</h2>
        <div className="products-grid">
          {products.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-img-wrap">
                <img src={p.image} alt={p.name} className="product-img" />
                {p.badge && <span className="product-badge">{p.badge}</span>}
              </div>
              <div className="product-info">
                <h3 className="product-name">{p.name}</h3>
                <div className="product-rating">
                  <StarRating rating={p.rating} />
                  <span className="review-count">({p.reviews})</span>
                </div>
                <div className="product-price">
                  <span className="price-current">₹{p.price.toLocaleString('en-IN')}</span>
                  {p.originalPrice && (
                    <span className="price-original">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                  )}
                </div>
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
          <span className="cart-items">{cartCount} items</span>
          <span className="cart-total">Total: ₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
        {cart.length > 0 && (
          <div className="cart-list">
            {cart.map((c) => (
              <div key={c.id} className="cart-row">
                <span className="cart-name">{c.name}</span>
                <div className="cart-qty">
                  <button onClick={() => updateQty(c.id, -1)}>−</button>
                  <span>{c.qty}</span>
                  <button onClick={() => updateQty(c.id, 1)}>+</button>
                </div>
                <span className="cart-price">₹{(c.price * c.qty).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
        <button className="checkout-btn" disabled={cartCount === 0}>Proceed to Checkout</button>
      </div>

      <footer className="footer">
        ShopMart — E-commerce marketplace sample. Clone and customize for your store.
      </footer>
    </div>
  );
}

export default App;
`;

export const SAMPLE_ECOMMERCE_FILES: SampleReactFile[] = [
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
