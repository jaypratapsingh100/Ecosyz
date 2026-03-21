/**
 * Assembles a complete Vite React project from project files for Vercel deployment.
 * Ensures all required build files exist (package.json, vite.config.js, etc.)
 * and injects environment variables for Supabase/Stripe integration.
 */

interface ViteProjectOptions {
  files: Array<{ path: string; content: string }>;
  projectTitle?: string;
  framework?: string | null;
  envVars?: Record<string, string>; // VITE_SUPABASE_URL, etc.
}

interface ViteProjectResult {
  files: Array<{ path: string; content: string }>;
  framework: 'vite';
  isViteBuild: true;
}

/** Bare import regex: import ... from 'package' */
const BARE_IMPORT_RE = /^import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^./][^'"]*)['"]\s*;?\s*$/gm;

/** Well-known package versions for common AI-generated dependencies */
const KNOWN_PACKAGE_VERSIONS: Record<string, string> = {
  'zustand': '^4.5.0',
  'framer-motion': '^11.0.0',
  'axios': '^1.7.0',
  'date-fns': '^3.6.0',
  'lodash': '^4.17.21',
  'recharts': '^2.12.0',
  '@tanstack/react-query': '^5.50.0',
  'react-icons': '^5.2.0',
  'react-hook-form': '^7.52.0',
  'zod': '^3.23.0',
  '@hookform/resolvers': '^3.9.0',
  'embla-carousel-react': '^8.1.0',
  'react-hot-toast': '^2.4.1',
  'react-toastify': '^10.0.0',
  'swiper': '^11.1.0',
  'uuid': '^10.0.0',
  'nanoid': '^5.0.0',
  'dayjs': '^1.11.0',
  'motion': '^11.0.0',
  '@radix-ui/react-dialog': '^1.1.0',
  '@radix-ui/react-dropdown-menu': '^2.1.0',
  '@radix-ui/react-tooltip': '^1.1.0',
  '@radix-ui/react-popover': '^1.1.0',
  '@radix-ui/react-select': '^2.1.0',
  '@radix-ui/react-tabs': '^1.1.0',
  '@radix-ui/react-slot': '^1.1.0',
  'class-variance-authority': '^0.7.0',
  'sonner': '^1.7.0',
};

function getBarePackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0];
}

/**
 * Scan all JS/TS files in the file map for bare (third-party) imports.
 * If any are in KNOWN_PACKAGE_VERSIONS but missing from package.json deps, add them.
 */
function ensureBareImportsInPackageJson(fileMap: Map<string, string>): void {
  const pkgJsonStr = fileMap.get('package.json');
  if (!pkgJsonStr) return;

  let pkgJson: Record<string, unknown>;
  try {
    pkgJson = JSON.parse(pkgJsonStr);
  } catch {
    return;
  }

  const deps = (pkgJson.dependencies || {}) as Record<string, string>;
  const needed = new Set<string>();

  for (const [path, content] of fileMap) {
    if (!/\.(jsx?|tsx?)$/.test(path)) continue;
    let match;
    const re = new RegExp(BARE_IMPORT_RE.source, 'gm');
    while ((match = re.exec(content)) !== null) {
      const pkg = getBarePackageName(match[1]);
      if (!deps[pkg] && KNOWN_PACKAGE_VERSIONS[pkg]) {
        needed.add(pkg);
      }
    }
  }

  if (needed.size === 0) return;

  for (const pkg of needed) {
    deps[pkg] = KNOWN_PACKAGE_VERSIONS[pkg];
  }
  pkgJson.dependencies = deps;
  fileMap.set('package.json', JSON.stringify(pkgJson, null, 2));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a complete Vite React project from existing project files.
 * Fills in any missing infrastructure files (package.json, vite.config.js, etc.)
 * so that Vercel can run `npm install && vite build` on the deployment.
 */
export function buildViteProject(options: ViteProjectOptions): ViteProjectResult {
  const { files, projectTitle, envVars } = options;
  const title = projectTitle ?? 'My App';
  const safeTitle = escapeHtml(title);

  // Start with a mutable copy of all existing project files
  const fileMap = new Map<string, string>();
  for (const f of files) {
    fileMap.set(f.path, f.content);
  }

  // Helper: check if a file exists (exact path)
  const has = (path: string) => fileMap.has(path);

  // ── 1. package.json ──
  if (!has('package.json')) {
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
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        'react-router-dom': '^6.28.0',
        'lucide-react': '^0.468.0',
        'clsx': '^2.1.1',
        'tailwind-merge': '^2.6.0',
        '@supabase/supabase-js': '^2.49.0',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.4',
        'vite': '^6.0.3',
        'autoprefixer': '^10.4.20',
        'postcss': '^8.4.49',
        'tailwindcss': '^3.4.17',
      },
    };
    fileMap.set('package.json', JSON.stringify(packageJson, null, 2));
  }

  // ── 1b. Detect third-party imports and add missing deps to package.json ──
  ensureBareImportsInPackageJson(fileMap);

  // ── 2. vite.config.js ──
  if (!has('vite.config.js')) {
    fileMap.set(
      'vite.config.js',
      `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`
    );
  }

  // ── 3. tailwind.config.js ──
  if (!has('tailwind.config.js')) {
    fileMap.set(
      'tailwind.config.js',
      `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
`
    );
  }

  // ── 4. postcss.config.js ──
  if (!has('postcss.config.js')) {
    fileMap.set(
      'postcss.config.js',
      `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`
    );
  }

  // ── 5. src/main.jsx ──
  if (!has('src/main.jsx') && !has('src/main.tsx')) {
    // Determine extension based on whether the project uses TypeScript
    const hasTsx = files.some((f) => f.path.endsWith('.tsx'));
    const ext = hasTsx ? 'tsx' : 'jsx';
    const mainPath = `src/main.${ext}`;

    fileMap.set(
      mainPath,
      `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.${ext}';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
`
    );
  }

  // ── 6. index.html — replace CDN-based or generate Vite-compatible ──
  const existingHtml = fileMap.get('index.html');
  const hasTsx = files.some((f) => f.path.endsWith('.tsx'));
  const mainExt = has('src/main.tsx') || hasTsx ? 'tsx' : 'jsx';

  if (existingHtml && existingHtml.includes('unpkg.com/react')) {
    // Replace CDN-based index.html with Vite-compatible one
    const viteIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${safeTitle} — Built with Open Idea Studio" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeTitle} — A modern web application" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://picsum.photos/seed/${safeTitle.replace(/\s+/g, '-').toLowerCase()}/1200/630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeTitle} — A modern web application" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <title>${safeTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${mainExt}"></script>
  </body>
</html>
`;
    fileMap.set('index.html', viteIndexHtml);
  } else if (!existingHtml) {
    // No index.html at all — generate one
    const viteIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${safeTitle} — Built with Open Idea Studio" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeTitle} — A modern web application" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://picsum.photos/seed/${safeTitle.replace(/\s+/g, '-').toLowerCase()}/1200/630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeTitle} — A modern web application" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <title>${safeTitle}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${mainExt}"></script>
  </body>
</html>
`;
    fileMap.set('index.html', viteIndexHtml);
  }

  // ── 7. .env file from envVars ──
  if (envVars && Object.keys(envVars).length > 0) {
    const envContent = Object.entries(envVars)
      .filter(([, v]) => v) // skip empty values
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    fileMap.set('.env', envContent + '\n');
  }

  // Convert map back to array
  const resultFiles: Array<{ path: string; content: string }> = [];
  for (const [path, content] of fileMap) {
    resultFiles.push({ path, content });
  }

  return {
    files: resultFiles,
    framework: 'vite',
    isViteBuild: true,
  };
}
