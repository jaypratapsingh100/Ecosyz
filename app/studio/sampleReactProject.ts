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
  <title>React App</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="root"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
    const { createRoot } = ReactDOM;
    function App() {
      return React.createElement('div', { className: 'app' },
        React.createElement('h1', null, 'Hello React'),
        React.createElement('p', { className: 'subtitle' }, 'Canonical structure: index.html, styles.css, src/App.jsx')
      );
    }
    const root = createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app {
  text-align: center;
  padding: 2rem;
}

.app h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #00d9ff;
}

.app .subtitle {
  color: #a0a0a0;
  font-size: 1rem;
}
`;

const APP_JSX = `function App() {
  return (
    <div className="app">
      <h1>Hello React</h1>
      <p className="subtitle">
        Canonical structure: index.html, styles.css, src/App.jsx
      </p>
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
