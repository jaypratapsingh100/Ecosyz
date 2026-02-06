/**
 * Canonical React (Vercel-ready) project structure.
 * Single source of truth: AI, preview, deploy, and Code tab use these paths.
 * AI must return exactly these paths; no other paths for this app type.
 */

export const REACT_PROJECT_PATHS = [
  'index.html',
  'styles.css',
  'src/App.jsx',
] as const;

export type ReactProjectPath = (typeof REACT_PROJECT_PATHS)[number];

/** Path that is the main React component (isMain: true). */
export const REACT_MAIN_JSX = 'src/App.jsx';

/** Framework identifier for React projects. */
export const REACT_FRAMEWORK = 'react';

// ---------------------------------------------------------------------------
// File contracts (for AI prompt and validation)
// ---------------------------------------------------------------------------

export const REACT_FILE_CONTRACTS = {
  'index.html': {
    description: 'HTML shell with root div and script tags for React 18, ReactDOM, Babel.',
    required: [
      '<div id="root"></div>',
      'Scripts: React, ReactDOM, Babel (CDN or injected by preview).',
    ],
    language: 'html' as const,
    isMain: false,
  },
  'styles.css': {
    description: 'Global CSS only. No @import.',
    required: ['Plain CSS only.', 'No @import.'],
    language: 'css' as const,
    isMain: false,
  },
  'src/App.jsx': {
    description: 'Main React component. Default export, browser-only.',
    required: ['export default function App() { ... } or equivalent.', 'No Node/fs APIs.'],
    language: 'jsx' as const,
    isMain: true,
  },
} as const;

/** Type for a single file in the canonical structure (e.g. for AI response). */
export interface CanonicalReactFile {
  path: ReactProjectPath;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

/** Check if a path is in the canonical React set. */
export function isCanonicalReactPath(path: string): path is ReactProjectPath {
  return (REACT_PROJECT_PATHS as readonly string[]).includes(path);
}
