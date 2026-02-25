import { NextRequest, NextResponse } from 'next/server';
import { deployToVercel, getClaimableDeploymentUrl } from '@/lib/vercel';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Simple helper to make text safe to embed inside a <script type="text/babel">
function sanitizeSnippet(raw: string, maxLen = 600): string {
  if (!raw) return '';
  let s = raw.slice(0, maxLen);
  s = s.replace(/[`$]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  // Avoid breaking out of script tag in final HTML (full-html replace handles </script>)
  s = s.replace(/<\/script>/gi, ' ');
  return s;
}

async function extractTextFromFile(file: Blob, fileName?: string): Promise<string> {
  const type = (file as any).type || '';
  const name = fileName || (file as any).name || '';
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);

  if (isPdf) {
    try {
      const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string }>;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text } = await pdfParse(buffer);
      return text || '';
    } catch (e) {
      console.warn('PDF parse failed, falling back to empty text:', e);
      return '';
    }
  }

  try {
    if (typeof (file as any).text === 'function') {
      return await (file as any).text();
    }
  } catch {
    // ignore
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const projectTitle =
      (formData.get('projectTitle') as string | null)?.trim() || 'LinkedIn → Website';
    const deployToVercelFlag = formData.get('deploy') === 'true' || formData.get('deploy') === '1';

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Document file is required' },
        { status: 400 },
      );
    }

    const rawText = await extractTextFromFile(file as Blob, (file as any).name);
    const safeSnippet = sanitizeSnippet(rawText);
    const snippetForHtml = escapeHtml(safeSnippet);
    const titleEscaped = escapeHtml(projectTitle);

    const appJsx = `
const sections = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

function App() {
  return (
    <div className="page">
      <header className="navbar">
        <div className="logo">LinkedIn → Website</div>
        <nav className="nav-links">
          {sections.map((s) => (
            <a key={s.id} href={"#" + s.id}>{s.label}</a>
          ))}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">Personal Brand Website</p>
            <h1>${titleEscaped}</h1>
            <p className="sub">
              This single-page site was generated from your uploaded document.
              Replace the placeholder content and images to make it truly yours.
            </p>
            ${snippetForHtml
              ? `<p className="snippet">Snippet from your document: ${snippetForHtml}</p>`
              : ''}
          </div>
          <div className="hero-photo-grid">
            <div className="photo-card large" />
            <div className="photo-card" />
            <div className="photo-card" />
          </div>
        </section>

        <section id="about" className="section">
          <div className="section-header">
            <h2>About</h2>
            <p>High-level summary of who you are and what you do.</p>
          </div>
          <div className="section-grid">
            <div className="card">
              <h3>Headline</h3>
              <p>
                Use your LinkedIn headline and summary here. The builder can refine this later
                using AI, but this page already works as a clean starting point.
              </p>
            </div>
            <div className="card image-card" />
          </div>
        </section>

        <section id="experience" className="section">
          <div className="section-header">
            <h2>Experience</h2>
            <p>Showcase your key roles and achievements.</p>
          </div>
          <div className="timeline">
            <div className="timeline-item">
              <div className="badge">Recent</div>
              <h3>Job Title @ Company</h3>
              <p>
                Short description of your impact. Paste bullet points from your LinkedIn profile,
                focusing on measurable outcomes.
              </p>
            </div>
            <div className="timeline-item">
              <h3>Previous Role</h3>
              <p>
                Another role with achievements and responsibilities. Keep it clear and concise.
              </p>
            </div>
          </div>
        </section>

        <section id="projects" className="section">
          <div className="section-header">
            <h2>Featured Projects</h2>
            <p>Highlight portfolio pieces with strong visuals.</p>
          </div>
          <div className="card-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="project-card">
                <div className="project-image" />
                <div className="project-body">
                  <h3>Project title</h3>
                  <p>
                    Short description of the project, tech stack, and your role.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section">
          <div className="section-header">
            <h2>Contact</h2>
            <p>Make it easy to reach out.</p>
          </div>
          <div className="section-grid">
            <div className="card">
              <h3>Let’s connect</h3>
              <p>
                Add your email, calendar link, or a simple call‑to‑action here so people know how
                to get in touch.
              </p>
            </div>
            <div className="card">
              <ul className="contact-list">
                <li>📧 your.email@example.com</li>
                <li>🔗 linkedin.com/in/your-handle</li>
                <li>🌐 your-website.com</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Generated from a document upload · Placeholder content only</span>
      </footer>
    </div>
  );
}
`;

    const stylesCss = `
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  background: radial-gradient(circle at top, #0f172a 0, #020617 40%, #020617 100%);
  color: #e5e7eb;
}

.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(34,197,94,0.2) 0, transparent 55%),
    radial-gradient(circle at bottom right, rgba(45,212,191,0.16) 0, transparent 55%);
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(18px);
  background: linear-gradient(to bottom, rgba(15,23,42,0.95), transparent);
  border-bottom: 1px solid rgba(15,23,42,0.9);
  padding: 0.9rem 7vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
}

.nav-links a {
  color: #94a3b8;
  text-decoration: none;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: all 0.18s ease-out;
}

.nav-links a:hover {
  border-color: rgba(148,163,184,0.6);
  background: rgba(15,23,42,0.7);
  color: #e5e7eb;
}

main {
  padding: 2.5rem 7vw 3.5rem;
  max-width: 1120px;
  margin-inline: auto;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0,1.2fr) minmax(0,1fr);
  gap: 2.5rem;
  align-items: center;
  padding-block: 1.8rem 3rem;
}

.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #22c55e;
  margin-bottom: 0.7rem;
}

.hero h1 {
  font-size: clamp(2.2rem, 4vw, 3rem);
  line-height: 1.1;
  margin: 0 0 1rem;
}

.hero .sub {
  font-size: 0.95rem;
  color: #94a3b8;
  max-width: 32rem;
}

.hero .snippet {
  margin-top: 0.9rem;
  font-size: 0.85rem;
  color: #9ca3af;
}

.hero-photo-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr;
  gap: 0.7rem;
}

.photo-card {
  border-radius: 1.4rem;
  border: 1px solid rgba(148,163,184,0.5);
  background:
    linear-gradient(135deg, rgba(15,23,42,1), rgba(15,23,42,0.85)),
    url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80")
      center/cover no-repeat;
  min-height: 7.5rem;
  box-shadow: 0 22px 45px rgba(15,23,42,0.85);
}

.photo-card.large {
  grid-row: span 2;
  background:
    linear-gradient(135deg, rgba(15,23,42,1), rgba(15,23,42,0.8)),
    url("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80")
      center/cover no-repeat;
}

.section {
  margin-top: 3rem;
}

.section-header h2 {
  font-size: 1.3rem;
  margin: 0 0 0.4rem;
}

.section-header p {
  margin: 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.section-grid {
  margin-top: 1.3rem;
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .section-grid {
    grid-template-columns: minmax(0,1.3fr) minmax(0,1fr);
  }
}

.card {
  border-radius: 1.1rem;
  border: 1px solid rgba(148,163,184,0.55);
  background:
    radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 60%),
    rgba(15,23,42,0.9);
  padding: 1.1rem 1.2rem;
  font-size: 0.9rem;
}

.card h3 {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
}

.card p {
  margin: 0;
  color: #94a3b8;
}

.image-card {
  min-height: 9rem;
  background:
    radial-gradient(circle at top, rgba(45,212,191,0.2), transparent 65%),
    url("https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80")
      center/cover no-repeat;
}

.timeline {
  margin-top: 1.4rem;
  border-left: 1px solid rgba(148,163,184,0.55);
  padding-left: 1.4rem;
  display: grid;
  gap: 1.2rem;
}

.timeline-item {
  position: relative;
  padding-left: 0.2rem;
}

.timeline-item::before {
  content: "";
  position: absolute;
  left: -1.45rem;
  top: 0.1rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34,197,94,0.16);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  padding: 0.24rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(34,197,94,0.35);
  color: #22c55e;
  margin-bottom: 0.4rem;
}

.card-grid {
  margin-top: 1.4rem;
  display: grid;
  gap: 1rem;
}

@media (min-width: 900px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(0,1fr));
  }
}

.project-card {
  border-radius: 1.1rem;
  overflow: hidden;
  border: 1px solid rgba(148,163,184,0.5);
  background: rgba(15,23,42,0.96);
  display: flex;
  flex-direction: column;
}

.project-image {
  height: 9rem;
  background:
    linear-gradient(135deg, rgba(34,197,94,0.4), rgba(8,47,73,0.9)),
    url("https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=900&q=80")
      center/cover no-repeat;
}

.project-body {
  padding: 0.85rem 0.95rem 1rem;
}

.project-body h3 {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
}

.project-body p {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
}

.contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.9rem;
  display: grid;
  gap: 0.4rem;
  color: #94a3b8;
}

.footer {
  border-top: 1px solid rgba(15,23,42,0.9);
  padding: 0.9rem 7vw 1.1rem;
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
}

@media (max-width: 768px) {
  .navbar,
  main,
  .footer {
    padding-inline: 1.1rem;
  }

  .hero {
    grid-template-columns: minmax(0,1fr);
  }

  .hero-photo-grid {
    display: none;
  }
}
`;

    // Build a full HTML document with React + ReactDOM + Babel + inline CSS and JSX
    let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectTitle}</title>
    <style>${stylesCss}</style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
${appJsx}
      const rootEl = document.getElementById('root');
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
    </script>
  </body>
</html>`;

    // Escape any accidental </script> inside generated content
    html = html.replace(/<\/script>/gi, '<\\/script>');

    const payload: { html: string; url?: string; deploymentId?: string; claimUrl?: string; readyState?: string } = { html };

    if (deployToVercelFlag) {
      try {
        const slug = projectTitle
          .replace(/[^a-z0-9-]/gi, '-')
          .replace(/-+/g, '-')
          .toLowerCase()
          .slice(0, 30) || 'site';
        const projectName = `linkedin-site-${slug}-${Date.now().toString(36)}`;
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
        console.error('Vercel deploy error (linkedin-website):', deployErr);
        const msg = deployErr instanceof Error ? deployErr.message : 'Deployment failed';
        return NextResponse.json(
          {
            html,
            error: 'Website generated but deployment failed',
            deployError: msg,
            hint: process.env.VERCEL_API_TOKEN ? undefined : 'Set VERCEL_API_TOKEN to enable deploy.',
          },
          { status: 200 },
        );
      }
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error generating LinkedIn website HTML:', error);
    return NextResponse.json(
      { error: 'Failed to generate website from document' },
      { status: 500 },
    );
  }
}

