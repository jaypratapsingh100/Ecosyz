/**
 * Scaffold utilities for the app builder.
 * Creates a Vite React project structure that:
 * - Renders in the in-browser preview sandbox
 * - Runs locally after download via npm install && npm run dev
 */

import type { ProjectFile } from '@/app/types/app-builder';

/** Fallback App content when user's App.jsx has syntax errors */
export const DEFAULT_APP_CONTENT = `
const features = [
  { icon: 'zap', title: 'Lightning Fast', desc: 'Optimized for performance from day one.' },
  { icon: 'shield', title: 'Secure by Default', desc: 'Enterprise-grade security built in.' },
  { icon: 'layers', title: 'Infinitely Scalable', desc: 'Grows effortlessly with your business.' },
];

function App() {
  React.useEffect(() => { if (window.lucide) lucide.createIcons(); }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">MyApp</span>
          <button className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
            Get Started
          </button>
        </div>
      </nav>
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 text-sm text-violet-300 mb-8">
          <i data-lucide="sparkles" className="w-4 h-4"></i>
          Built with AI — Edit me in Chat!
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          Build products
          <span className="block bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">10x faster</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The modern platform for teams who want to ship faster without sacrificing quality.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 rounded-full font-semibold hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:-translate-y-0.5">
            Start for free →
          </button>
          <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
            Watch demo
          </button>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need</h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">All the tools to build, ship, and scale.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20 flex items-center justify-center mb-4">
                  <i data-lucide={f.icon} className="w-5 h-5 text-violet-400"></i>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-500 text-sm">
        © 2025 MyApp · Built with Ecosyz Studio
      </footer>
    </div>
  );
}
export default App;`;

/** Minimal default App for scaffold */
const SCAFFOLD_APP_CONTENT = `
const features = [
  { icon: 'zap', title: 'Lightning Fast', desc: 'Optimized for performance from day one.' },
  { icon: 'shield', title: 'Secure by Default', desc: 'Enterprise-grade security built in.' },
  { icon: 'layers', title: 'Infinitely Scalable', desc: 'Grows effortlessly with your business.' },
];

function App() {
  React.useEffect(() => { if (window.lucide) lucide.createIcons(); }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">MyApp</span>
          <button className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all">
            Get Started
          </button>
        </div>
      </nav>
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 text-sm text-violet-300 mb-8">
          <i data-lucide="sparkles" className="w-4 h-4"></i>
          Built with AI — Edit me in Chat!
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
          Build products
          <span className="block bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">10x faster</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The modern platform for teams who want to ship faster without sacrificing quality.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 rounded-full font-semibold hover:shadow-2xl hover:shadow-violet-500/30 transition-all hover:-translate-y-0.5">
            Start for free →
          </button>
          <button className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
            Watch demo
          </button>
        </div>
      </section>
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need</h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">All the tools to build, ship, and scale.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20 flex items-center justify-center mb-4">
                  <i data-lucide={f.icon} className="w-5 h-5 text-violet-400"></i>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-500 text-sm">
        © 2025 MyApp · Built with Ecosyz Studio
      </footer>
    </div>
  );
}

export default App;
`;

/** Global styles - minimal reset, Tailwind CDN provides everything else in preview. */
export const SCAFFOLD_STYLES = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
`;

/** Minimal base CSS — Tailwind CDN replaces this in preview. */
export const PREVIEW_BASE_CSS = ``;

/** Detect corruption: JSX tags inside style/string literals */
export function hasStyleStringCorruption(code: string): boolean {
  return /'[^']*<[A-Za-z][a-zA-Z0-9]*\s*\/?\s*>?/.test(code) || /"[^"]*<[A-Za-z][a-zA-Z0-9]*\s*\/?\s*>?/.test(code);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Return complete Vite React scaffold - runnable locally with npm install && npm run dev.
 * Structure: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css
 */
export function getScaffoldFiles(
  framework: string,
  options?: { projectTitle?: string; useTypeScript?: boolean }
): ProjectFile[] {
  const title = options?.projectTitle ?? 'My App';
  const ext = options?.useTypeScript ? 'tsx' : 'jsx';
  const appPath = options?.useTypeScript ? 'src/App.tsx' : 'src/App.jsx';
  const appName = options?.useTypeScript ? 'App.tsx' : 'App.jsx';

  const packageJson = {
    name: (title || 'my-app').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.4',
      vite: '^6.0.3',
    },
  };

  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

  const mainContent = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.${ext}';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>
`;

  const readme = `# ${title}

A React app built with Vite.

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open http://localhost:5173 in your browser.

## Build for production

\`\`\`bash
npm run build
npm run preview
\`\`\`
`;

  const files: ProjectFile[] = [
    {
      path: 'README.md',
      name: 'README.md',
      language: 'markdown',
      isMain: false,
      content: readme,
    },
    {
      path: 'package.json',
      name: 'package.json',
      language: 'json',
      isMain: false,
      content: JSON.stringify(packageJson, null, 2),
    },
    {
      path: 'vite.config.js',
      name: 'vite.config.js',
      language: 'javascript',
      isMain: false,
      content: viteConfig,
    },
    {
      path: 'index.html',
      name: 'index.html',
      language: 'html',
      isMain: false,
      content: indexHtml,
    },
    {
      path: `src/main.${ext}`,
      name: `main.${ext}`,
      language: options?.useTypeScript ? 'tsx' : 'jsx',
      isMain: false,
      content: mainContent,
    },
    {
      path: appPath,
      name: appName,
      language: options?.useTypeScript ? 'tsx' : 'jsx',
      isMain: true,
      content: SCAFFOLD_APP_CONTENT,
    },
    {
      path: 'src/index.css',
      name: 'index.css',
      language: 'css',
      isMain: false,
      content: SCAFFOLD_STYLES,
    },
  ];

  return files;
}
