/**
 * Sample React project: config and file contents for the "React Sample" in Studio.
 * Uses canonical structure from @/lib/app-builder/canonicalReact.
 */

import { REACT_MAIN_JSX } from '@/lib/app-builder/canonicalReact';

export const SAMPLE_REACT_PROJECT = {
  title: 'Aurora Portfolio Studio',
  description:
    'A visually rich personal portfolio with image-heavy galleries and case studies',
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
  <title>Aurora • Creative Portfolio</title>
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

    const GALLERY_IMAGES = [
      {
        id: 'city-lights',
        src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80',
        alt: 'Night city skyline with glowing lights',
        category: 'Photography',
      },
      {
        id: 'designer-desk',
        src: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1000&q=80',
        alt: 'Minimal designer desk with laptop and sketches',
        category: 'Product',
      },
      {
        id: 'brand-collage',
        src: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1000&q=80',
        alt: 'Brand moodboard with typography and color swatches',
        category: 'Brand',
      },
      {
        id: 'mobile-app',
        src: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1000&q=80',
        alt: 'Mobile app screens on a table',
        category: 'Product',
      },
      {
        id: 'portrait',
        src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80',
        alt: 'Portrait of a woman with soft studio lighting',
        category: 'Photography',
      },
      {
        id: 'workspace',
        src: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&w=1000&q=80',
        alt: 'Creative studio workspace with big monitor',
        category: 'Product',
      },
      {
        id: 'branding-cards',
        src: 'https://images.unsplash.com/photo-1522202222206-764ec137a6a9?auto=format&fit=crop&w=1000&q=80',
        alt: 'Business cards and stationery branding set',
        category: 'Brand',
      },
      {
        id: 'architecture',
        src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1000&q=80',
        alt: 'Modern building with strong geometric shapes',
        category: 'Photography',
      },
      {
        id: 'editorial',
        src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1000&q=80',
        alt: 'Editorial fashion photography pose',
        category: 'Photography',
      },
    ];

    const FEATURED_PROJECTS = [
      {
        id: 'aurora-brand',
        title: 'Aurora Brand System',
        subtitle: 'A flexible visual identity for a digital studio',
        cover: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1000&q=80',
        year: '2025',
        role: 'Brand & Art Direction',
        tools: ['Figma', 'Illustrator', 'Cinema 4D'],
      },
      {
        id: 'atlas-app',
        title: 'Atlas Finance Mobile',
        subtitle: 'Human, friendly money app focused on clarity',
        cover: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1000&q=80',
        year: '2024',
        role: 'Product Design',
        tools: ['Figma', 'Framer'],
      },
      {
        id: 'lumen-gallery',
        title: 'Lumen Gallery Website',
        subtitle: 'Online gallery for emerging digital artists',
        cover: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1000&q=80',
        year: '2023',
        role: 'Web Design & Art Direction',
        tools: ['Next.js', 'Tailwind', 'Vercel'],
      },
    ];

    const FILTERS = ['All', 'Photography', 'Product', 'Brand'];

    function App() {
      const [activeFilter, setActiveFilter] = useState('All');

      const filteredImages =
        activeFilter === 'All'
          ? GALLERY_IMAGES
          : GALLERY_IMAGES.filter((img) => img.category === activeFilter);

      const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      return (
        <div className="app">
          <header className="nav">
            <div className="brand">
              <div className="brand-mark">a</div>
              <div className="brand-text">
                <div className="brand-name">aurora studio</div>
                <div className="brand-tagline">portfolio preview</div>
              </div>
            </div>
            <div className="nav-pill">React sample • Image-rich portfolio</div>
          </header>

          <main>
            <section className="hero">
              <div className="hero-grid">
                <div>
                  <div className="hero-left-eyebrow">
                    <span className="hero-dot" />
                    Product designer & art director
                  </div>
                  <h1 className="hero-title">
                    Crafting calm, cinematic interfaces.
                    <span className="highlight">
                      A portfolio designed to feel like a gallery.
                    </span>
                  </h1>
                  <p className="hero-subtitle">
                    This React sample is a full personal site: hero, image-forward
                    gallery and featured case studies. Use it as a starting point
                    for your own portfolio in Studio.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="btn-primary"
                      onClick={() => scrollToSection('aurora-gallery')}
                    >
                      View image gallery
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => scrollToSection('aurora-projects')}
                    >
                      Jump to case studies
                    </button>
                  </div>
                  <div className="hero-badges">
                    <div className="hero-badge">
                      Over a dozen curated photography and UI shots
                    </div>
                    <div className="hero-badge">
                      Designed to showcase product work beautifully
                    </div>
                    <div className="hero-badge">
                      Built as a realistic portfolio starter for Ecosyz Studio
                    </div>
                  </div>
                </div>

                <aside className="hero-right-card">
                  <div className="hero-right-title">Snapshot of the work</div>
                  <div className="hero-right-grid">
                    {GALLERY_IMAGES.slice(0, 3).map((image) => (
                      <div key={image.id} className="mini-card">
                        <div>
                          <div className="mini-card-name">{image.category}</div>
                          <div className="mini-card-label">
                            Curated gallery image
                          </div>
                        </div>
                        <div>
                          <div className="mini-card-price">HD imagery</div>
                          <div className="mini-card-badge">Featured</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </section>

            <section id="aurora-gallery" className="section">
              <div className="section-header">
                <div>
                  <div className="section-eyebrow">image gallery</div>
                  <h2 className="section-title">
                    A wall of moments, screens and stories
                  </h2>
                </div>
                <p className="section-subtitle">
                  A dense, scrolling grid of photography and UI captures so you can
                  see how a portfolio with lots of imagery feels.
                </p>
              </div>

              <div className="gallery-filters">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={
                      'gallery-filter-btn' +
                      (activeFilter === filter ? ' is-active' : '')
                    }
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="gallery-grid">
                {filteredImages.map((image) => (
                  <article key={image.id} className="gallery-card">
                    <div className="gallery-image-wrapper">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="gallery-image"
                      />
                    </div>
                    <div className="gallery-meta">
                      <span className="pill">{image.category}</span>
                      <span className="pill">High-res</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="aurora-projects" className="section">
              <div className="section-header">
                <div>
                  <div className="section-eyebrow">featured case studies</div>
                  <h2 className="section-title">
                    Image-led projects across product and brand
                  </h2>
                </div>
                <p className="section-subtitle">
                  Each card pairs a large hero visual with crisp project details —
                  a pattern you can plug your own work into.
                </p>
              </div>

              <div className="project-grid">
                {FEATURED_PROJECTS.map((project) => (
                  <article key={project.id} className="project-card">
                    <div className="project-cover-wrapper">
                      <img
                        src={project.cover}
                        alt={project.title}
                        className="project-cover"
                      />
                    </div>
                    <div className="project-body">
                      <div className="project-header">
                        <div>
                          <h3 className="project-title">{project.title}</h3>
                          <p className="project-subtitle">
                            {project.subtitle}
                          </p>
                        </div>
                        <span className="project-year-chip">{project.year}</span>
                      </div>
                      <div className="project-meta">
                        <span className="project-chip">{project.role}</span>
                        {project.tools.map((tool) => (
                          <span key={tool} className="project-chip subtle">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <div className="bottom-note">
            This Aurora portfolio sample is intentionally image-heavy so you can
            see how a rich gallery and case-study layout behaves. Clone it in App
            Studio and replace the visuals, copy and links with your own work.
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
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: radial-gradient(circle at top, #3b1d42 0%, #050308 55%);
  min-height: 100vh;
  color: #fdf5e6;
}

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
  border-bottom: 1px solid rgba(245, 226, 197, 0.3);
  background: linear-gradient(90deg, rgba(26, 11, 30, 0.95), rgba(19, 9, 26, 0.95), rgba(26, 11, 30, 0.95));
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  background: conic-gradient(from 220deg, #fbd28e, #f7a6c1, #e6c8ff, #fbd28e);
  color: #1a0b1e;
  box-shadow: 0 0 22px rgba(251, 210, 142, 0.6);
}

.brand-text {
  line-height: 1.2;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: lowercase;
  background: linear-gradient(90deg, #ffe7c2, #f7a6c1, #e6c8ff);
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
  border: 1px solid rgba(247, 227, 193, 0.45);
  color: rgba(247, 227, 193, 0.9);
}

.nav-pill {
  font-size: 0.7rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(245, 226, 197, 0.4);
  background: rgba(5, 3, 8, 0.7);
  color: rgba(245, 226, 197, 0.8);
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

.hero-left-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(247, 227, 193, 0.5);
  background: rgba(26, 11, 30, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.64rem;
  color: rgba(245, 226, 197, 0.8);
}

.hero-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #f7a6c1;
}

.hero-title {
  margin-top: 1.2rem;
  font-size: clamp(2.2rem, 4vw, 3.1rem);
  line-height: 1.04;
  font-weight: 680;
}

.hero-title span.highlight {
  color: #fbd28e;
  display: block;
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
  background: linear-gradient(90deg, #fbd28e, #f7a6c1, #e6c8ff);
  color: #1a0b1e;
  box-shadow: 0 0 26px rgba(247, 166, 193, 0.7);
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

.hero-right-card {
  border-radius: 1.6rem;
  padding: 1.2rem;
  border: 1px solid rgba(245, 226, 197, 0.3);
  background: radial-gradient(circle at top, rgba(247, 166, 193, 0.35), rgba(5, 3, 8, 0.95));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85);
}

.hero-right-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(245, 226, 197, 0.8);
  margin-bottom: 0.8rem;
}

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
  color: #ffe7c2;
}

.mini-card-label {
  font-size: 0.6rem;
  color: rgba(245, 226, 197, 0.78);
}

.mini-card-price {
  font-size: 0.7rem;
  font-weight: 600;
  color: #fbd28e;
}

.mini-card-badge {
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  background: rgba(247, 166, 193, 0.22);
  color: #f7a6c1;
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
  background: linear-gradient(90deg, #ffe7c2, #f7a6c1, #e6c8ff);
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
  border: 1px solid rgba(245, 226, 197, 0.3);
  background: radial-gradient(circle at top, rgba(251, 210, 142, 0.25), rgba(5, 3, 8, 0.96));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
}

.product-media {
  height: 130px;
  position: relative;
  border-bottom: 1px solid rgba(245, 226, 197, 0.3);
  background: conic-gradient(from 200deg, rgba(251, 210, 142, 0.6), rgba(247, 166, 193, 0.55), rgba(230, 200, 255, 0.5), rgba(5, 3, 8, 0.9));
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
  color: #ffe7c2;
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
  color: #fbd28e;
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
  background: linear-gradient(90deg, #fbd28e, #f7a6c1);
  color: #1a0b1e;
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
  border-top: 1px solid rgba(245, 226, 197, 0.3);
  background: linear-gradient(180deg, rgba(5, 3, 8, 0.96), rgba(5, 3, 8, 1));
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  background: linear-gradient(135deg, #fbd28e, #f7a6c1);
  color: #1a0b1e;
}

.cart-total {
  font-size: 0.8rem;
  color: #fbd28e;
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
  background: linear-gradient(90deg, #fbd28e, #f7a6c1);
  color: #1a0b1e;
  box-shadow: 0 0 22px rgba(251, 210, 142, 0.7);
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
  color: #ffe7c2;
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
  color: #fbd28e;
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
  .hero-right-card {
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
  background: linear-gradient(90deg, #fbd28e, #f7a6c1);
  color: #1a0b1e;
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

const GALLERY_IMAGES = [
  {
    id: 'city-lights',
    src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=80',
    alt: 'Night city skyline with glowing lights',
    category: 'Photography',
  },
  {
    id: 'designer-desk',
    src: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1000&q=80',
    alt: 'Minimal designer desk with laptop and sketches',
    category: 'Product',
  },
  {
    id: 'brand-collage',
    src: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1000&q=80',
    alt: 'Brand moodboard with typography and color swatches',
    category: 'Brand',
  },
  {
    id: 'mobile-app',
    src: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1000&q=80',
    alt: 'Mobile app screens on a table',
    category: 'Product',
  },
  {
    id: 'portrait',
    src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80',
    alt: 'Portrait of a woman with soft studio lighting',
    category: 'Photography',
  },
  {
    id: 'workspace',
    src: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&w=1000&q=80',
    alt: 'Creative studio workspace with big monitor',
    category: 'Product',
  },
  {
    id: 'branding-cards',
    src: 'https://images.unsplash.com/photo-1522202222206-764ec137a6a9?auto=format&fit=crop&w=1000&q=80',
    alt: 'Business cards and stationery branding set',
    category: 'Brand',
  },
  {
    id: 'architecture',
    src: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1000&q=80',
    alt: 'Modern building with strong geometric shapes',
    category: 'Photography',
  },
  {
    id: 'editorial',
    src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1000&q=80',
    alt: 'Editorial fashion photography pose',
    category: 'Photography',
  },
];

function App() {
  const [highlighted, setHighlighted] = useState(GALLERY_IMAGES[0]);

  const primaryRow = GALLERY_IMAGES.slice(0, 4);
  const secondaryRow = GALLERY_IMAGES.slice(4);

  return (
    <div className="app app--solar">
      <header className="nav nav--glass">
        <div className="brand">
          <div className="brand-mark">s</div>
          <div className="brand-text">
            <div className="brand-name">solaris studio</div>
            <div className="brand-tagline">creative grid portfolio</div>
          </div>
        </div>
        <div className="nav-pill">Modern image grid • React sample</div>
      </header>

      <main>
        <section className="section split-layout">
          <aside className="profile-panel">
            <div className="profile-avatar" />
            <div className="profile-name">Riya Sen</div>
            <div className="profile-role">Product designer & visual director</div>
            <p className="profile-meta">
              Designing calm, cinematic product experiences for fintech, creator tools
              and modern SaaS brands. Based in Bengaluru, working with teams globally.
            </p>
            <div className="profile-tags">
              <span className="profile-tag accent">Available for Q2–Q3 2026</span>
              <span className="profile-tag">Product design</span>
              <span className="profile-tag">Art direction</span>
              <span className="profile-tag">Design systems</span>
            </div>
          </aside>

          <div className="feed">
            <section className="mosaic-hero">
              <div className="mosaic-main">
                <img
                  src={highlighted.src}
                  alt={highlighted.alt}
                  className="mosaic-main-image"
                />
                <div className="mosaic-overlay">
                  Featured frame • {highlighted.category} — drawn from a live client
                  project.
                </div>
              </div>
              <div className="mosaic-thumbs">
                {primaryRow.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className={
                      'mosaic-thumb' +
                      (highlighted.id === image.id ? ' is-active' : '')
                    }
                    onClick={() => setHighlighted(image)}
                  >
                    <img src={image.src} alt={image.alt} />
                    <span className="mosaic-thumb-label">{image.category}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="strip-gallery">
              <header className="strip-header">
                <div>
                  <div className="strip-eyebrow">selected visuals</div>
                  <div className="strip-title">A fast scroll through recent work</div>
                </div>
                <p className="strip-description">
                  A mix of interface stills, brand explorations and art direction shots
                  that define my current visual language.
                </p>
              </header>

              <div className="strip-row">
                {primaryRow.map((image) => (
                  <article key={image.id} className="strip-card">
                    <img src={image.src} alt={image.alt} />
                    <div className="strip-card-body">
                      <div className="strip-card-title">{image.category}</div>
                      <div className="strip-card-subtitle">Hero frames & gallery cuts</div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="strip-row strip-row--muted">
                {secondaryRow.map((image) => (
                  <article key={image.id} className="strip-card">
                    <img src={image.src} alt={image.alt} />
                    <div className="strip-card-body">
                      <div className="strip-card-title">Supporting visuals</div>
                      <div className="strip-card-subtitle">
                        Detail crops, editorial shots and UI zoom-ins
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="contact-banner">
              <div className="contact-text">
                Currently partnering with teams on product launches, brand refreshes and
                immersive marketing sites.
              </div>
              <button type="button" className="contact-cta">
                Request full portfolio deck
              </button>
            </section>
          </div>
        </section>
      </main>

      <div className="bottom-note">
        This Solaris portfolio layout is intentionally different from the main sample —
        it focuses on a side profile, a highlighted frame and dense image strips. Clone
        it in App Studio and swap in your own visuals and copy.
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
