// Minimal scaffold utilities for the app builder chat.
// The original scaffolds module was removed; this stub keeps the
// chat route compiling and provides a simple default App.jsx.

import type { ProjectFile } from '@/app/types/app-builder';

/**
 * Return a small, generic React scaffold for a new project.
 * For now we keep this very simple: a single App.jsx file that
 * tells the user to go to the Chat tab and generate the real app.
 *
 * The /api/app-projects/[id]/generate route is responsible for
 * creating the full canonical structure (index.html, styles.css,
 * src/App.jsx). This scaffold is only a visual placeholder.
 */
export function getScaffoldFiles(_framework: string): ProjectFile[] {
  const files: ProjectFile[] = [
    {
      path: 'src/App.jsx',
      name: 'App.jsx',
      language: 'jsx',
      isMain: true,
      content: `function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      background: 'linear-gradient(135deg, #0f172a, #0f766e)',
      color: '#e5e7eb'
    }}>
      <div style={{
        padding: '2.5rem 3rem',
        borderRadius: '1.25rem',
        background: 'rgba(15,23,42,0.9)',
        boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Welcome to your new app
        </h1>
        <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '2rem' }}>
          Open the Chat tab and tell me what kind of product or page you want to build.
        </p>
      </div>
    </div>
  );
}

export default App;
`,
    },
  ];

  return files;
}
