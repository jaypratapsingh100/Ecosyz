/**
 * Tests for the upgraded app-builder modules.
 * Covers: canonicalReact, validate-files, strip-for-browser, scaffolds,
 * contextBuilder, and promptBuilder.
 */
import { describe, it, expect } from 'vitest';

// ─── canonicalReact ──────────────────────────────────────────────────────────
import {
  isCanonicalReactPath,
  getProjectTier,
  REACT_CORE_PATHS,
  REACT_EXTENDED_PATHS,
  REACT_PROJECT_PATHS,
  ALLOWED_PACKAGES,
} from '@/lib/app-builder/canonicalReact';

describe('canonicalReact', () => {
  describe('isCanonicalReactPath', () => {
    it('accepts core paths', () => {
      expect(isCanonicalReactPath('index.html')).toBe(true);
      expect(isCanonicalReactPath('src/App.jsx')).toBe(true);
      expect(isCanonicalReactPath('src/index.css')).toBe(true);
    });

    it('accepts extended paths (pages, components, hooks)', () => {
      expect(isCanonicalReactPath('src/pages/Home.jsx')).toBe(true);
      expect(isCanonicalReactPath('src/components/Header.jsx')).toBe(true);
      expect(isCanonicalReactPath('src/hooks/useAuth.js')).toBe(true);
      expect(isCanonicalReactPath('src/context/AppContext.jsx')).toBe(true);
    });

    it('accepts any file under src/ with valid extension', () => {
      expect(isCanonicalReactPath('src/components/custom/MyWidget.tsx')).toBe(true);
      expect(isCanonicalReactPath('src/pages/dashboard/Analytics.jsx')).toBe(true);
      expect(isCanonicalReactPath('src/styles/custom.css')).toBe(true);
    });

    it('rejects paths outside src/ (except index.html)', () => {
      expect(isCanonicalReactPath('lib/something.js')).toBe(false);
      expect(isCanonicalReactPath('public/image.png')).toBe(false);
      expect(isCanonicalReactPath('random.txt')).toBe(false);
    });

    it('rejects invalid extensions under src/', () => {
      expect(isCanonicalReactPath('src/data.yaml')).toBe(false);
      expect(isCanonicalReactPath('src/readme.md')).toBe(false);
    });

    it('accepts SQL schema files', () => {
      expect(isCanonicalReactPath('src/lib/schema.sql')).toBe(true);
    });

    it('accepts .env.example', () => {
      expect(isCanonicalReactPath('.env.example')).toBe(true);
    });
  });

  describe('getProjectTier', () => {
    it('returns "simple" for few features', () => {
      expect(getProjectTier(['Hero section', 'Footer'], 'landing')).toBe('simple');
    });

    it('returns "standard" for > 4 features', () => {
      expect(getProjectTier(['Nav', 'Hero', 'Footer', 'Dark mode', 'Contact form'], 'landing')).toBe('standard');
    });

    it('returns "advanced" for dashboard app type', () => {
      expect(getProjectTier(['Charts'], 'dashboard')).toBe('advanced');
    });

    it('returns "advanced" for ecommerce', () => {
      expect(getProjectTier([], 'ecommerce')).toBe('advanced');
    });

    it('returns "advanced" for auth features', () => {
      expect(getProjectTier(['Auth UI (Login/Signup)'], 'landing')).toBe('advanced');
    });

    it('returns "fullstack" for auth + database', () => {
      expect(getProjectTier(['Auth UI (Login/Signup)', 'Data tables', 'CRUD API'], 'saas')).toBe('fullstack');
    });
  });

  describe('ALLOWED_PACKAGES', () => {
    it('includes React core packages', () => {
      expect(ALLOWED_PACKAGES.has('react')).toBe(true);
      expect(ALLOWED_PACKAGES.has('react-dom')).toBe(true);
      expect(ALLOWED_PACKAGES.has('react-dom/client')).toBe(true);
    });

    it('includes routing and animation packages', () => {
      expect(ALLOWED_PACKAGES.has('react-router-dom')).toBe(true);
      expect(ALLOWED_PACKAGES.has('framer-motion')).toBe(true);
    });

    it('includes state management packages', () => {
      expect(ALLOWED_PACKAGES.has('zustand')).toBe(true);
      expect(ALLOWED_PACKAGES.has('jotai')).toBe(true);
    });

    it('includes utility packages', () => {
      expect(ALLOWED_PACKAGES.has('clsx')).toBe(true);
      expect(ALLOWED_PACKAGES.has('tailwind-merge')).toBe(true);
      expect(ALLOWED_PACKAGES.has('date-fns')).toBe(true);
      expect(ALLOWED_PACKAGES.has('zod')).toBe(true);
    });

    it('does not include arbitrary packages', () => {
      expect(ALLOWED_PACKAGES.has('express')).toBe(false);
      expect(ALLOWED_PACKAGES.has('lodash')).toBe(false);
    });
  });

  it('REACT_PROJECT_PATHS includes core + extended', () => {
    expect(REACT_PROJECT_PATHS.length).toBe(REACT_CORE_PATHS.length + REACT_EXTENDED_PATHS.length);
    for (const p of REACT_CORE_PATHS) {
      expect(REACT_PROJECT_PATHS).toContain(p);
    }
  });
});

// ─── validate-files ──────────────────────────────────────────────────────────
import {
  validateJSXSyntax,
  validateImportResolution,
  validateAccessibility,
  validateSEO,
  validateSecurity,
  validateFileSet,
} from '@/lib/app-builder/validate-files';

describe('validate-files', () => {
  describe('validateJSXSyntax', () => {
    it('passes valid JSX', () => {
      const code = `function App() { return <div>Hello</div>; }\nexport default App;`;
      const result = validateJSXSyntax('App.jsx', code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('skips CSS files', () => {
      const result = validateJSXSyntax('index.css', 'body { color: red; }');
      expect(result.valid).toBe(true);
    });

    it('skips HTML files', () => {
      const result = validateJSXSyntax('index.html', '<html><body></body></html>');
      expect(result.valid).toBe(true);
    });

    it('skips JSON files', () => {
      const result = validateJSXSyntax('package.json', '{"name":"test"}');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateImportResolution', () => {
    it('passes when all local imports resolve', () => {
      const files = [
        { path: 'src/App.jsx', content: `import Header from './components/Header';\nfunction App() {}` },
        { path: 'src/components/Header.jsx', content: `function Header() { return <h1>Hi</h1>; }` },
      ];
      const result = validateImportResolution(files);
      expect(result.valid).toBe(true);
    });

    it('fails on unresolved local import', () => {
      const files = [
        { path: 'src/App.jsx', content: `import Foo from './components/Foo';\nfunction App() {}` },
      ];
      const result = validateImportResolution(files);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Foo');
    });

    it('ignores CSS imports', () => {
      const files = [
        { path: 'src/App.jsx', content: `import './index.css';\nfunction App() {}` },
      ];
      const result = validateImportResolution(files);
      expect(result.valid).toBe(true);
    });

    it('resolves .tsx extensions', () => {
      const files = [
        { path: 'src/App.tsx', content: `import Header from './components/Header';\nfunction App() {}` },
        { path: 'src/components/Header.tsx', content: `function Header() {}` },
      ];
      const result = validateImportResolution(files);
      expect(result.valid).toBe(true);
    });

    it('resolves index files', () => {
      const files = [
        { path: 'src/App.jsx', content: `import utils from './lib';\nfunction App() {}` },
        { path: 'src/lib/index.js', content: `export const x = 1;` },
      ];
      const result = validateImportResolution(files);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAccessibility', () => {
    it('flags img without alt', () => {
      const result = validateAccessibility('App.jsx', '<img src="photo.jpg" />');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('alt');
    });

    it('passes img with alt', () => {
      const result = validateAccessibility('App.jsx', '<img src="photo.jpg" alt="A photo" />');
      expect(result.errors).toHaveLength(0);
    });

    it('warns on div with onClick without role', () => {
      const result = validateAccessibility('App.jsx', '<div onClick={handleClick}>Click</div>');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('role');
    });

    it('warns on multiple h1 tags', () => {
      const result = validateAccessibility('App.jsx', '<h1>Title</h1><h1>Another</h1>');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('h1');
    });

    it('skips non-JSX files', () => {
      const result = validateAccessibility('styles.css', 'body { color: red; }');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('flags missing lang on html tag in index.html', () => {
      const result = validateAccessibility('index.html', '<html><body></body></html>');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('lang');
    });

    it('passes html with lang attribute', () => {
      const result = validateAccessibility('index.html', '<html lang="en"><body></body></html>');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSEO', () => {
    it('warns on missing title', () => {
      const result = validateSEO('index.html', '<html><head></head><body></body></html>');
      expect(result.warnings.some(w => w.includes('title'))).toBe(true);
    });

    it('warns on missing meta description', () => {
      const result = validateSEO('index.html', '<html><head><title>Test</title></head></html>');
      expect(result.warnings.some(w => w.includes('description'))).toBe(true);
    });

    it('warns on missing viewport', () => {
      const result = validateSEO('index.html', '<html><head></head></html>');
      expect(result.warnings.some(w => w.includes('viewport'))).toBe(true);
    });

    it('warns on missing og:title', () => {
      const result = validateSEO('index.html', '<html><head></head></html>');
      expect(result.warnings.some(w => w.includes('og:title'))).toBe(true);
    });

    it('warns on missing charset', () => {
      const result = validateSEO('index.html', '<html><head></head></html>');
      expect(result.warnings.some(w => w.includes('charset'))).toBe(true);
    });

    it('passes a well-formed HTML file', () => {
      const html = `<html><head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <meta name="description" content="Test app" />
        <meta property="og:title" content="Test" />
        <title>Test App</title>
      </head></html>`;
      const result = validateSEO('index.html', html);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('skips non-HTML files', () => {
      const result = validateSEO('App.jsx', 'function App() {}');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateSecurity', () => {
    it('warns on dangerouslySetInnerHTML', () => {
      const result = validateSecurity('App.jsx', '<div dangerouslySetInnerHTML={{__html: data}} />');
      expect(result.warnings.some(w => w.includes('dangerouslySetInnerHTML'))).toBe(true);
    });

    it('warns on eval()', () => {
      const result = validateSecurity('App.jsx', 'eval("alert(1)")');
      expect(result.warnings.some(w => w.includes('eval'))).toBe(true);
    });

    it('warns on innerHTML assignment', () => {
      const result = validateSecurity('App.jsx', 'el.innerHTML = userInput;');
      expect(result.warnings.some(w => w.includes('innerHTML'))).toBe(true);
    });

    it('flags hardcoded API keys', () => {
      const result = validateSecurity('App.jsx', 'const apiKey = "sk-abcdefghijklmnopqrstuvwxyz123456";');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('does not flag placeholder keys', () => {
      const result = validateSecurity('App.jsx', 'const apiKey = "YOUR_API_KEY_HERE_REPLACE_ME_12345678";');
      expect(result.errors).toHaveLength(0);
    });

    it('skips non-code files', () => {
      const result = validateSecurity('styles.css', 'body { color: red; }');
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFileSet', () => {
    it('returns valid for a clean file set', async () => {
      const files = [
        { path: 'src/App.jsx', content: 'function App() { return <div>Hello</div>; }\nexport default App;' },
        { path: 'src/index.css', content: 'body { margin: 0; }' },
      ];
      const result = await validateFileSet(files);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns warnings array', async () => {
      const files = [
        { path: 'index.html', content: '<html><head></head><body></body></html>' },
      ];
      const result = await validateFileSet(files);
      expect(Array.isArray(result.warnings)).toBe(true);
      // Should have SEO warnings and a11y error for missing lang
      expect(result.warnings.length + result.errors.length).toBeGreaterThan(0);
    });

    it('returns fileErrors map', async () => {
      const files = [
        { path: 'src/App.jsx', content: `import Missing from './Missing';\nfunction App() {}` },
      ];
      const result = await validateFileSet(files);
      expect(result.fileErrors).toBeInstanceOf(Map);
    });
  });
});

// ─── strip-for-browser ───────────────────────────────────────────────────────
import {
  stripForBrowser,
  sortComponentsByDependency,
} from '@/app/lib/app-builder/strip-for-browser';

describe('strip-for-browser', () => {
  describe('stripForBrowser', () => {
    it('removes ES6 imports', () => {
      const code = `import React from 'react';\nimport { useState } from 'react';\nfunction App() {}`;
      const result = stripForBrowser(code);
      expect(result).not.toContain('import');
      expect(result).toContain('function App()');
    });

    it('removes export default', () => {
      const code = `export default function App() { return null; }`;
      const result = stripForBrowser(code);
      expect(result).not.toMatch(/^export default/);
      expect(result).toContain('function App()');
    });

    it('removes export const/let/var/function/class keywords', () => {
      const code = `export const Foo = 1;\nexport function Bar() {}\nexport class Baz {}`;
      const result = stripForBrowser(code);
      expect(result).not.toMatch(/^export /m);
      expect(result).toContain('const Foo');
      expect(result).toContain('function Bar()');
    });

    it('removes require() statements', () => {
      const code = `const fs = require('fs');\nconst { join } = require('path');\nrequire('dotenv');`;
      const result = stripForBrowser(code);
      expect(result).not.toContain('require');
    });

    it('injects React hooks when used', () => {
      const code = `function App() { const [x, setX] = useState(0); return <div>{x}</div>; }`;
      const result = stripForBrowser(code);
      expect(result).toContain('const { useState');
      expect(result).toContain('} = React;');
    });

    it('injects Router stubs when router hooks are used', () => {
      const code = `function App() { const navigate = useNavigate(); return <NavLink to="/">Home</NavLink>; }`;
      const result = stripForBrowser(code);
      expect(result).toContain('const useNavigate');
      expect(result).toContain('const NavLink');
      expect(result).toContain('const Outlet');
    });

    it('injects cn/clsx stubs when used', () => {
      const code = `function App() { return <div className={cn('a', 'b')}>Hi</div>; }`;
      const result = stripForBrowser(code);
      expect(result).toContain('const cn =');
    });

    it('injects framer-motion stub when motion.* is used', () => {
      const code = `function App() { return <motion.div animate={{opacity:1}}>Hi</motion.div>; }`;
      const result = stripForBrowser(code);
      expect(result).toContain('const motion');
      expect(result).toContain('Proxy');
    });

    it('injects zustand stub when create(set) is used', () => {
      const code = `const useStore = create((set) => ({ count: 0 }));`;
      const result = stripForBrowser(code);
      expect(result).toContain('const create =');
    });

    it('injects date-fns stubs when format is used', () => {
      const code = `const d = format(new Date(), 'yyyy-MM-dd');`;
      const result = stripForBrowser(code);
      expect(result).toContain('const format =');
    });

    it('strips TypeScript annotations', () => {
      const code = `const App: React.FC<Props> = () => null;`;
      const result = stripForBrowser(code);
      expect(result).not.toContain(': React.FC');
    });

    it('escapes </script> tags', () => {
      const code = `const x = '</script>';`;
      const result = stripForBrowser(code);
      expect(result).not.toContain('</script>');
      expect(result).toContain('<\\/script>');
    });

    it('handles empty input', () => {
      expect(stripForBrowser('')).toBe('');
      expect(stripForBrowser(null as unknown as string)).toBe('');
    });

    it('injects Supabase stub when supabase is used', () => {
      const code = `const { data } = await supabase.from('items').select('*');`;
      const result = stripForBrowser(code);
      expect(result).toContain('const supabase =');
      expect(result).toContain('from:');
      expect(result).toContain('auth:');
      expect(result).toContain('storage:');
    });
  });

  describe('sortComponentsByDependency', () => {
    it('sorts dependencies before dependents', () => {
      const files = [
        { path: 'src/App.jsx', content: 'import Header from "./Header";\nfunction App() {}' },
        { path: 'src/Header.jsx', content: 'function Header() {}' },
      ];
      const sorted = sortComponentsByDependency(files);
      const headerIdx = sorted.findIndex(f => f.path.includes('Header'));
      const appIdx = sorted.findIndex(f => f.path.includes('App'));
      expect(headerIdx).toBeLessThan(appIdx);
    });

    it('handles files with no dependencies', () => {
      const files = [
        { path: 'src/A.jsx', content: 'function A() {}' },
        { path: 'src/B.jsx', content: 'function B() {}' },
      ];
      const sorted = sortComponentsByDependency(files);
      expect(sorted).toHaveLength(2);
    });

    it('handles empty array', () => {
      expect(sortComponentsByDependency([])).toHaveLength(0);
    });
  });
});

// ─── scaffolds ───────────────────────────────────────────────────────────────
import {
  getScaffoldFiles,
  hasStyleStringCorruption,
  SCAFFOLD_STYLES,
  PREVIEW_BASE_CSS,
} from '@/app/lib/app-builder/scaffolds';

describe('scaffolds', () => {
  describe('getScaffoldFiles', () => {
    it('returns expected set of files', () => {
      const files = getScaffoldFiles('react');
      const paths = files.map(f => f.path);
      expect(paths).toContain('index.html');
      expect(paths).toContain('src/App.jsx');
      expect(paths).toContain('src/index.css');
      expect(paths).toContain('package.json');
      expect(paths).toContain('vite.config.js');
      expect(paths).toContain('tailwind.config.js');
      expect(paths).toContain('postcss.config.js');
    });

    it('marks App.jsx as isMain', () => {
      const files = getScaffoldFiles('react');
      const app = files.find(f => f.path.includes('App.'));
      expect(app?.isMain).toBe(true);
    });

    it('uses tsx extension when useTypeScript is true', () => {
      const files = getScaffoldFiles('react', { useTypeScript: true });
      const paths = files.map(f => f.path);
      expect(paths).toContain('src/App.tsx');
      expect(paths).toContain('src/main.tsx');
    });

    it('includes project title in HTML', () => {
      const files = getScaffoldFiles('react', { projectTitle: 'My Cool App' });
      const html = files.find(f => f.path === 'index.html')?.content || '';
      expect(html).toContain('My Cool App');
    });

    it('includes SEO meta tags in index.html', () => {
      const files = getScaffoldFiles('react', { projectTitle: 'Test' });
      const html = files.find(f => f.path === 'index.html')?.content || '';
      expect(html).toContain('og:title');
      expect(html).toContain('og:description');
      expect(html).toContain('twitter:card');
      expect(html).toContain('meta name="description"');
    });

    it('includes Tailwind directives in index.css', () => {
      const files = getScaffoldFiles('react');
      const css = files.find(f => f.path === 'src/index.css')?.content || '';
      expect(css).toContain('@tailwind base');
      expect(css).toContain('@tailwind components');
      expect(css).toContain('@tailwind utilities');
    });

    it('includes BrowserRouter in main entry', () => {
      const files = getScaffoldFiles('react');
      const main = files.find(f => f.path.startsWith('src/main.'))?.content || '';
      expect(main).toContain('BrowserRouter');
    });

    it('package.json includes react-router-dom and supabase', () => {
      const files = getScaffoldFiles('react');
      const pkg = files.find(f => f.path === 'package.json')?.content || '';
      expect(pkg).toContain('react-router-dom');
      expect(pkg).toContain('lucide-react');
      expect(pkg).toContain('tailwindcss');
      expect(pkg).toContain('@supabase/supabase-js');
    });

    it('includes Supabase client file', () => {
      const files = getScaffoldFiles('react');
      const supabase = files.find(f => f.path === 'src/lib/supabase.js');
      expect(supabase).toBeDefined();
      expect(supabase?.content).toContain('createClient');
      expect(supabase?.content).toContain('VITE_SUPABASE_URL');
    });

    it('includes .env.example', () => {
      const files = getScaffoldFiles('react');
      const env = files.find(f => f.path === '.env.example');
      expect(env).toBeDefined();
      expect(env?.content).toContain('VITE_SUPABASE_URL');
      expect(env?.content).toContain('VITE_SUPABASE_ANON_KEY');
    });

    it('escapes HTML in project title', () => {
      const files = getScaffoldFiles('react', { projectTitle: '<script>alert(1)</script>' });
      const html = files.find(f => f.path === 'index.html')?.content || '';
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('hasStyleStringCorruption', () => {
    it('detects JSX inside string literals', () => {
      expect(hasStyleStringCorruption(`const x = '<div />';`)).toBe(true);
    });

    it('returns false for clean code', () => {
      expect(hasStyleStringCorruption('function App() { return <div>Hello</div>; }')).toBe(false);
    });
  });

  describe('SCAFFOLD_STYLES', () => {
    it('includes accessibility styles', () => {
      expect(SCAFFOLD_STYLES).toContain('.sr-only');
      expect(SCAFFOLD_STYLES).toContain(':focus-visible');
      expect(SCAFFOLD_STYLES).toContain('prefers-reduced-motion');
    });
  });

  describe('PREVIEW_BASE_CSS', () => {
    it('includes form input styles', () => {
      expect(PREVIEW_BASE_CSS).toContain('contact-input');
      expect(PREVIEW_BASE_CSS).toContain('contact-textarea');
    });
  });
});

// ─── contextBuilder ──────────────────────────────────────────────────────────
import {
  buildAppBuilderPrompts,
  buildScaffoldContext,
  buildFastPathPrompts,
} from '@/lib/app-builder/contextBuilder';

describe('contextBuilder', () => {
  const baseInput = {
    message: 'Build a landing page',
    questionnaireData: null,
    frameworkForScaffold: 'react',
    useTypeScript: false,
    existingFilePaths: [],
    hasScaffoldFiles: false,
    fileExtension: 'jsx',
    projectFiles: [],
  };

  describe('buildAppBuilderPrompts', () => {
    it('returns system prompt and user message', () => {
      const result = buildAppBuilderPrompts(baseInput);
      expect(result.systemPrompt).toBeTruthy();
      expect(result.userMessage).toBeTruthy();
      expect(result.approxTokens.total).toBeGreaterThan(0);
    });

    it('includes scaffold context when files exist', () => {
      const result = buildAppBuilderPrompts({
        ...baseInput,
        existingFilePaths: ['src/App.jsx', 'src/index.css'],
        hasScaffoldFiles: true,
      });
      expect(result.systemPrompt).toContain('PROJECT SCAFFOLD');
      expect(result.systemPrompt).toContain('src/App.jsx');
    });

    it('appends plan when provided', () => {
      const result = buildAppBuilderPrompts({
        ...baseInput,
        plan: { steps: ['Create header', 'Add hero'] },
      });
      expect(result.userMessage).toContain('STRUCTURED PLAN');
      expect(result.userMessage).toContain('Create header');
    });

    it('appends implementation steps when provided', () => {
      const result = buildAppBuilderPrompts({
        ...baseInput,
        taskPlan: { implementationSteps: [{ step: 'Build nav' }] },
      });
      expect(result.userMessage).toContain('IMPLEMENTATION STEPS');
    });

    it('includes file content for editing when file is mentioned', () => {
      const result = buildAppBuilderPrompts({
        ...baseInput,
        message: 'edit Header.jsx to add a logo',
        projectFiles: [
          { path: 'src/components/Header.jsx', name: 'Header.jsx', content: 'function Header() { return <h1>Title</h1>; }' },
        ],
      });
      expect(result.userMessage).toContain('EXISTING FILE TO EXTEND');
      expect(result.userMessage).toContain('Header.jsx');
    });

    it('detects project tier from questionnaire', () => {
      const result = buildAppBuilderPrompts({
        ...baseInput,
        questionnaireData: {
          appType: 'dashboard',
          requiredFeatures: ['Charts / Analytics', 'Data tables'],
        },
      });
      // The system prompt should contain tier-appropriate content
      expect(result.systemPrompt.length).toBeGreaterThan(100);
    });
  });

  describe('buildScaffoldContext', () => {
    it('includes framework name', () => {
      const ctx = buildScaffoldContext('react');
      expect(ctx).toContain('react');
      expect(ctx).toContain('PROJECT SCAFFOLD');
    });

    it('includes page and component paths', () => {
      const ctx = buildScaffoldContext('react');
      expect(ctx).toContain('Pages');
      expect(ctx).toContain('Components');
      expect(ctx).toContain('Layout');
    });

    it('includes backend/auth scaffold entries', () => {
      const ctx = buildScaffoldContext('react');
      expect(ctx).toContain('Auth');
      expect(ctx).toContain('AuthContext');
      expect(ctx).toContain('supabase.js');
      expect(ctx).toContain('schema.sql');
      expect(ctx).toContain('.env.example');
    });
  });

  describe('buildFastPathPrompts', () => {
    it('returns compact prompts', () => {
      const result = buildFastPathPrompts(baseInput);
      expect(result.systemPrompt).toBeTruthy();
      expect(result.userMessage).toBeTruthy();
      expect(result.approxTokens.total).toBeGreaterThan(0);
    });

    it('includes questionnaire data in user message', () => {
      const result = buildFastPathPrompts({
        ...baseInput,
        questionnaireData: {
          appType: 'landing',
          projectGoal: 'A marketing page',
          designStyle: 'modern-minimal',
          brandName: 'Acme',
          requiredFeatures: ['Hero', 'Footer'],
        },
      });
      expect(result.userMessage).toContain('Type: landing');
      expect(result.userMessage).toContain('Brand: Acme');
    });

    it('appends extend instruction when scaffold files exist', () => {
      const result = buildFastPathPrompts({
        ...baseInput,
        hasScaffoldFiles: true,
        existingFilePaths: ['src/App.jsx'],
      });
      expect(result.userMessage).toContain('Extend existing files');
    });
  });
});
