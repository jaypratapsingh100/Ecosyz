// Minimal scaffold utilities for the app builder chat.
// The original scaffolds module was removed; this stub keeps the
// chat route compiling and provides a simple default App.jsx.

import type { ProjectFile } from '@/app/types/app-builder';

/** Fallback App content when user's App.jsx has syntax errors (e.g. JSX inside style strings) */
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

/** Detect corruption: JSX tags inside style/string literals (causes "Unterminated string constant") */
export function hasStyleStringCorruption(code: string): boolean {
  return /'[^']*<[A-Za-z][a-zA-Z0-9]*\s*\/?\s*>?/.test(code) || /"[^"]*<[A-Za-z][a-zA-Z0-9]*\s*\/?\s*>?/.test(code);
}

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
`,
    },
  ];

  return files;
}
