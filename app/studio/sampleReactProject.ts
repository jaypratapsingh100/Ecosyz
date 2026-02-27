/**
 * Sample React project: config and file contents for the "React Sample" in Studio.
 * Uses canonical structure from @/lib/app-builder/canonicalReact.
 */

import { REACT_MAIN_JSX } from '@/lib/app-builder/canonicalReact';

export const SAMPLE_REACT_PROJECT = {
  title: 'React App',
  description: 'A simple React app with canonical structure (Vercel-ready)',
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
  <title>React App — Ecosyz Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } } }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-slate-950 text-white font-sans antialiased">
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
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

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 50);
  </script>
</body>
</html>
`;

const STYLES_CSS = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
`;

const APP_JSX = `
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
