/**
 * Scaffold utilities for the app builder.
 * Creates a Vite React project structure that:
 * - Renders in the in-browser preview sandbox
 * - Runs locally after download via npm install && npm run dev
 */

import type { ProjectFile } from '@/app/types/app-builder';

/** Fallback App content when user's App.jsx has syntax errors */
export const DEFAULT_APP_CONTENT = `function App() {
  return (
    <div className="App" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0c2321 0%, #121f22 50%, #0a1016 100%)',
      color: '#fff',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: "'Space Grotesk', system-ui, sans-serif"
    }}>
      <div style={{
        background: 'rgba(27, 29, 33, 0.9)',
        padding: '3rem',
        borderRadius: '20px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 0 24px rgba(56, 189, 248, 0.15)',
        maxWidth: '600px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #38bdf8, #0ff0fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Welcome to Your App
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#e5e7eb' }}>
          Start building by asking the AI to create components!
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '1rem 2rem',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '10px',
            fontSize: '0.9rem',
            color: '#38bdf8'
          }}>
            Ready to Build
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;`;

/** Minimal default App for scaffold */
const SCAFFOLD_APP_CONTENT = `function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      background: 'linear-gradient(135deg, #0c2321 0%, #121f22 50%, #0a1016 100%)',
      color: '#fff'
    }}>
      <div style={{
        padding: '2.5rem 3rem',
        borderRadius: '1.25rem',
        background: 'rgba(27, 29, 33, 0.9)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 0 24px rgba(56, 189, 248, 0.15)',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.75rem', background: 'linear-gradient(90deg, #38bdf8, #0ff0fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Welcome to your new app
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#e5e7eb', marginBottom: '2rem' }}>
          Open the Chat tab and tell me what kind of product or page you want to build.
        </p>
      </div>
    </div>
  );
}

export default App;
`;

/** Global styles - used by both preview and local run */
const SCAFFOLD_STYLES = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
}

.page, .section, .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.hero, .card, .btn {
  border-radius: 0.5rem;
}
`;

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
