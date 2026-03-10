/**
 * App Builder Preview API: builds HTML for iframe sandbox so user always sees the project.
 * Standardization: (1) Base CSS always injected for React so styles show even without project CSS.
 * (2) Link stub provided so generated Header/nav using <Link> works. (3) Error boundary shows
 * "Copy and ask AI in Chat to fix". (4) Future: self-extract — iframe postMessage(error) so
 * parent can offer "Send to Chat" and LLM auto-fixes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { DEFAULT_APP_CONTENT, SCAFFOLD_STYLES, PREVIEW_BASE_CSS } from '@/app/lib/app-builder/scaffolds';
import { stripForBrowser, sortComponentsByDependency } from '@/app/lib/app-builder/strip-for-browser';

/**
 * Extract PascalCase component names (function Navbar, const Navbar =, class Navbar)
 * from source code so we can register them on window for preview.
 */
function extractComponentNames(code: string): string[] {
  const names: string[] = [];
  const patterns = [
    /(?:function)\s+([A-Z][a-zA-Z0-9]*)\s*\(/g,
    /(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*=/g,
    /(?:class)\s+([A-Z][a-zA-Z0-9]*)\s+/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(code)) !== null) {
      names.push(m[1]);
    }
  }
  return [...new Set(names)];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;

    // Verify project ownership and load files
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Treat as React if framework is 'react' OR we have App.jsx (e.g. from extract)
    const hasAppJsx = project.files?.some((f: { path: string }) =>
      f.path === 'src/App.jsx' || f.path === 'src/App.tsx' || f.path.includes('App.jsx')
    );
    const isReactProject = project.framework === 'react' || hasAppJsx;

    // Find main HTML file or index.html
    type FileLike = { path: string; name: string; content: string; isMain?: boolean };
    let htmlFile: FileLike | undefined = project.files.find(
      (f: FileLike) =>
        f.path === 'index.html' || f.name === 'index.html' || (f.path.endsWith('.html') && f.isMain)
    ) as FileLike | undefined;

    // If no HTML file exists, generate one for React projects
    if (!htmlFile && isReactProject) {
      const projectTitle = project.title || 'React App';
      htmlFile = {
        path: 'index.html',
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectTitle}</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
        isMain: false,
      };
    }

    if (!htmlFile) {
      // Return a styled welcome page instead of a 400 error — prevents blank preview
      const welcomeHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<title>${project.title || 'New Project'}</title></head><body>
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0c2321 0%,#121f22 50%,#0a1016 100%);color:#fff;padding:2rem;text-align:center;font-family:Inter,system-ui,sans-serif">
<div style="background:rgba(27,29,33,0.9);padding:2.5rem 3rem;border-radius:1.25rem;border:1px solid rgba(56,189,248,0.3);box-shadow:0 0 24px rgba(56,189,248,0.15);max-width:480px;width:100%">
<h1 style="font-size:1.9rem;font-weight:700;margin-bottom:0.75rem;background:linear-gradient(90deg,#38bdf8,#0ff0fc);-webkit-background-clip:text;color:transparent">Welcome to your new app</h1>
<p style="font-size:0.95rem;color:#e5e7eb;margin-bottom:2rem">Open the Chat tab and tell the AI what you want to build.</p>
<div style="padding:0.75rem 1.5rem;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.4);border-radius:0.625rem;font-size:0.85rem;color:#38bdf8;display:inline-block">Ready to Build</div>
</div></div></body></html>`;
      return NextResponse.json({
        ok: true,
        status: 'success',
        output: welcomeHtml,
        preview: welcomeHtml,
      });
    }

    // Build HTML starting from main HTML file
    let html = htmlFile.content;

    // Strip Vite/npm module script tags - they won't work in iframe (no server to serve /src/main.jsx)
    // Preview injects React + App directly for sandbox rendering
    html = html.replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*src=["']\/src\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    // Also strip self-closing variants and src tags without leading slash
    html = html.replace(/<script[^>]*src=["']src\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*src=["']\.\/src\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');

    // Inject CSS files for all project types
    const cssFiles = project.files.filter(
      (f: { language: string | null; path: string }) =>
        f.language === 'css' || f.path.endsWith('.css')
    );
    // Remove link tags to CSS files we're inlining so the iframe doesn't request them (404)
    for (const cssFile of cssFiles) {
      const name = cssFile.path.split('/').pop() || cssFile.path;
      html = html.replace(
        new RegExp(`<link[^>]*href=["']([^"']*${name.replace('.', '\\.')})["'][^>]*>`, 'gi'),
        ''
      );
    }

    // Google Fonts (Inter) for modern typography in generated apps
    const googleFonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`;
    // Tailwind CSS via CDN with extended config for production-grade output
    const tailwindCdn = `<script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          colors: { gray: { 950: '#030712' } },
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
    }</script>`;
    // Global styles for polished preview rendering
    const previewStyles = `<style id="preview-globals">
      html { scroll-behavior: smooth; }
      body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
    </style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${googleFonts}\n${tailwindCdn}\n${previewStyles}\n</head>`);
    } else {
      html = googleFonts + tailwindCdn + previewStyles + html;
    }

    // Standardize preview: inject base CSS for all projects so user always sees a styled app
    // (project CSS is injected after so it overrides; base covers missing CSS or LLM classNames like contact-*, footer-*)
    const baseCss = `<style id="preview-base">${SCAFFOLD_STYLES}${PREVIEW_BASE_CSS}</style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${baseCss}\n</head>`);
    } else {
      html = baseCss + html;
    }

    for (const cssFile of cssFiles) {
      const cssTag = `<style>${cssFile.content}</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${cssTag}\n</head>`);
      } else {
        html = cssTag + html;
      }
    }

    // Handle JS/JSX file injection
    if (isReactProject) {
      // For React projects: inject src/App.jsx if it exists separately
      // Check if index.html already contains a complete React app (has both React libs AND component code)
      const hasReactLibs = html.includes('react@18') || html.includes('react.development.js') || html.includes('react/umd');
      const hasComponentCode = html.includes('React.createElement') || 
                               html.includes('createRoot') || 
                               html.includes('ReactDOM.render') ||
                               (html.includes('type="text/babel"') && html.includes('function App'));
      
      // If index.html has React libs but missing component code, or has src/App.jsx file, inject it
      // Prefer: isMain, then most recently updated App file so "generated" and "render" match
      type FileWithMain = { path: string; content: string; language: string | null; isMain?: boolean | null; updatedAt?: Date };
      const appCandidates = (project.files as FileWithMain[]).filter(
        (f) =>
          (f.language === 'jsx' || f.language === 'tsx' || f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) &&
          f.path !== 'index.html' &&
          (f.path === 'src/App.jsx' || f.path === 'src/App.tsx' || f.path.includes('App.jsx') || f.path.includes('App.tsx'))
      );
      const mainJsFile = appCandidates.length === 0
        ? undefined
        : [...appCandidates].sort((a, b) => {
            if (a.isMain === true && b.isMain !== true) return -1;
            if (a.isMain !== true && b.isMain === true) return 1;
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
          })[0];

      // Helper: ensure React + root + Babel so we can inject App
      const ensureReactAndRoot = () => {
        const reactScripts = `
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    // Global error catcher: never show blank screen or cryptic "Script error."
    window.__previewErrors = [];
    window.__previewRendered = false;
    window.addEventListener('error', function(e) {
      var msg = e.message || String(e);
      // "Script error." = cross-origin error with no details — give a helpful message instead
      if (msg === 'Script error.' || msg === 'Script error') {
        msg = 'A component has a syntax or runtime error. Use the Chat tab to ask the AI to fix it.';
      }
      // Deduplicate
      if (window.__previewErrors.indexOf(msg) === -1) {
        window.__previewErrors.push(msg);
      }
      // Notify parent so it can auto-send fix request to chat
      try { parent.postMessage({ type: 'preview-error', errors: window.__previewErrors.slice() }, '*'); } catch(_) {}
      // Show error banner at top if root is empty
      var root = document.getElementById('root');
      if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
        root.innerHTML = '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0c2321 0%,#121f22 50%,#0a1016 100%);color:#fff;padding:2rem;text-align:center;font-family:Inter,system-ui,sans-serif">'
          + '<div style="background:rgba(27,29,33,0.9);padding:2.5rem;border-radius:1.25rem;border:1px solid rgba(248,113,113,0.3);box-shadow:0 0 24px rgba(248,113,113,0.1);max-width:520px;width:100%">'
          + '<h2 style="font-size:1.4rem;margin:0 0 1rem;color:#f87171">Preview Error</h2>'
          + '<pre style="margin:0 0 1rem;padding:1rem;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;white-space:pre-wrap;word-break:break-word;font-size:0.8rem;max-height:200px;overflow:auto;text-align:left;color:#e5e7eb">'
          + window.__previewErrors.map(function(m) { return m.replace(/</g, '&lt;'); }).join('\\n')
          + '</pre>'
          + '<p style="margin:0;font-size:0.85rem;color:#9ca3af">Auto-sending this error to Chat for a fix...</p>'
          + '</div></div>';
      }
    });
    window.addEventListener('unhandledrejection', function(e) {
      var msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
      if (window.__previewErrors.indexOf(msg) === -1) {
        window.__previewErrors.push(msg);
      }
      try { parent.postMessage({ type: 'preview-error', errors: window.__previewErrors.slice() }, '*'); } catch(_) {}
    });
    // Fallback: if nothing renders within 4 seconds, show a helpful message
    setTimeout(function() {
      if (window.__previewRendered) return;
      var root = document.getElementById('root');
      if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
        var errMsg = window.__previewErrors.length > 0
          ? window.__previewErrors.map(function(m) { return m.replace(/</g, '&lt;'); }).join('\\n')
          : 'The app did not render. This may be a syntax error in the generated code.';
        root.innerHTML = '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0c2321 0%,#121f22 50%,#0a1016 100%);color:#fff;padding:2rem;text-align:center;font-family:Inter,system-ui,sans-serif">'
          + '<div style="background:rgba(27,29,33,0.9);padding:2.5rem;border-radius:1.25rem;border:1px solid rgba(56,189,248,0.3);box-shadow:0 0 24px rgba(56,189,248,0.15);max-width:520px;width:100%">'
          + '<h2 style="font-size:1.5rem;margin:0 0 0.75rem;background:linear-gradient(90deg,#38bdf8,#0ff0fc);-webkit-background-clip:text;color:transparent">Preview Issue</h2>'
          + '<pre style="margin:0 0 1rem;padding:1rem;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;white-space:pre-wrap;word-break:break-word;font-size:0.8rem;max-height:200px;overflow:auto;text-align:left;color:#e5e7eb">' + errMsg + '</pre>'
          + '<p style="margin:0;font-size:0.85rem;color:#9ca3af">Use the Chat tab to describe the issue and the AI will fix it.</p>'
          + '</div></div>';
      }
      // Notify parent of errors (timeout fallback)
      if (window.__previewErrors.length > 0) {
        try { parent.postMessage({ type: 'preview-error', errors: window.__previewErrors.slice() }, '*'); } catch(_) {}
      }
    }, 4000);

    // Intercept all navigation so preview never leaves srcdoc
    document.addEventListener('click', function(e) {
      var el = e.target;
      // Walk up to find the nearest <a> or <button type=submit>
      while (el && el !== document.body) {
        if (el.tagName === 'A') {
          var href = el.getAttribute('href') || '';
          // Allow anchor links (#section) and javascript: void
          if (href && href !== '#' && !href.startsWith('#') && !href.startsWith('javascript:')) {
            e.preventDefault();
            e.stopPropagation();
            // Smooth-scroll to section if href looks like #id
            // Otherwise just swallow the click
          }
          return;
        }
        el = el.parentElement;
      }
    }, true);
    // Intercept form submissions
    document.addEventListener('submit', function(e) {
      e.preventDefault();
    }, true);
  </script>`;
        if (!html.includes('react@18') && !html.includes('react.development.js')) {
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${reactScripts}\n</head>`);
          } else if (html.includes('<body>')) {
            html = html.replace('<body>', `<head>${reactScripts}</head>\n<body>`);
          } else {
            html = reactScripts + '\n' + html;
          }
        }
        if (!html.includes('<div id="root">') && !html.includes('<div id=\'root\'>')) {
          if (html.includes('</body>')) {
            html = html.replace('</body>', '  <div id="root"></div>\n</body>');
          } else {
            html = html + '\n<div id="root"></div>';
          }
        }
      };

      // Inject src/App.jsx and its component dependencies when we have a main App file
      if (mainJsFile && !html.includes(mainJsFile.content) && (!hasComponentCode || !hasReactLibs)) {
        // Component files (ToDoList, ToDoForm, etc.) - inject before App so they're in scope
        const componentFiles = project.files.filter(
        (f: { path: string; language: string | null }) =>
            (f.language === 'jsx' || f.language === 'tsx' || f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) &&
            f.path !== mainJsFile.path &&
            !f.path.match(/^src\/main\.(jsx|tsx)$/) // Exclude entry - we inject App directly
        );
        // Sort: dependencies first (TodoItem before TodoList, etc.)
        const sortedComponents = sortComponentsByDependency(componentFiles);
        // Use <script type="text/plain"> + manual Babel.transform() with try-catch
        // so compilation errors are caught in our scope (not cross-origin "Script error.")
        const componentScripts = sortedComponents.map((f: { path: string; content: string }, i: number) => {
          const c = stripForBrowser(f.content).replace(/<\/script>/gi, '<\\/script>');
          const safePath = (f.path || '').replace(/'/g, "\\'");
          // Extract component name from filename (e.g., src/components/Navbar.jsx → Navbar)
          const compName = (f.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          // Also extract all PascalCase function/const component names from the source
          // to handle files that export multiple components or have a different name than filename
          const compNames = extractComponentNames(f.content);
          // Build window registration lines (inside eval'd code so they share scope)
          const registerLines = [...new Set([compName, ...compNames].filter(Boolean))]
            .map(n => `if (typeof ${n} !== "undefined") window["${n}"] = ${n};`)
            .join('\\n');
          return `<script type="text/plain" id="__comp_${i}">\n${c}\n</script>
<script>
(function() {
  try {
    var __src = document.getElementById('__comp_${i}').textContent;
    var __out = Babel.transform(__src, { presets: ['react', 'typescript'], filename: '${safePath}' }).code;
    // Append window registration so components are globally available for App.jsx
    // (Babel adds "use strict" which prevents function declarations from leaking to global)
    __out += '\\n${registerLines}';
    (0, eval)(__out);
  } catch(__e) {
    console.error('[Preview] Component ${safePath} error:', __e);
    window.__previewErrors.push('${safePath}: ' + (__e.message || String(__e)));
    try { parent.postMessage({ type: 'preview-error', errors: window.__previewErrors.slice() }, '*'); } catch(_) {}
  }
})();
</script>`;
        }).join('\n');

        // Stub Link for preview: created code (e.g. Header) often uses Link; imports are stripped and Next/router aren't in iframe
        const linkStubScript = `
  <script>
    (function() {
      var R = window.React;
      if (R && R.createElement) {
        // Basic Link stub so Next.js style <Link> components don't break the preview
        if (typeof window.Link === 'undefined') {
          window.Link = function Link(props) {
            var href = props.href, children = props.children, rest = {};
            for (var k in props) { if (k !== 'href' && k !== 'children' && Object.prototype.hasOwnProperty.call(props, k)) rest[k] = props[k]; }
            return R.createElement('a', Object.assign({ href: href || '#' }, rest), children);
          };
        }

        // Global React Router stubs so code using <Router>, <Routes>, <Route> or Router
        // identifiers doesn't crash the preview when imports are stripped.
        if (typeof window.Router === 'undefined') {
          window.Router = function Router(props) {
            return R.createElement(R.Fragment, null, props && props.children);
          };
        }
        if (typeof window.Routes === 'undefined') {
          window.Routes = function Routes(props) {
            return R.createElement(R.Fragment, null, props && props.children);
          };
        }
        if (typeof window.Route === 'undefined') {
          window.Route = function Route(props) {
            return props && props.element ? props.element : null;
          };
        }

        // Minimal "Home" stub: avoid runtime ReferenceError without rendering a fallback page
        if (typeof window.Home === 'undefined') {
          window.Home = function Home(props) {
            return R.createElement(R.Fragment, null, props && props.children ? props.children : null);
          };
        }
      }
    })();
  </script>`;

        ensureReactAndRoot();

        // Inject the App.jsx component with proper React rendering
        let appContent = mainJsFile.content
          .replace(/export\s+default\s+/g, '')
          .replace(/export\s+(?:const|let|var|function|class)\s+/g, (m) => m.replace(/^export\s+/, ''))
          .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove ES6 imports (components injected above)
          .replace(/import\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove bare side-effect imports (e.g. import './index.css')
          .replace(/(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove require() assignments
          .replace(/require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, ''); // Remove standalone require() calls
        appContent = appContent.trim();
        // Ensure all common React hooks/utilities are in scope in iframe (same as component files)
        const appUsesReactApi = /use(State|Effect|Ref|Context|Reducer|Callback|Memo|Id|LayoutEffect|DeferredValue|Transition)\s*\(/.test(appContent)
          || /\b(memo|forwardRef|createContext|Fragment|Children|cloneElement|lazy|Suspense|createPortal)\b/.test(appContent);
        if (appUsesReactApi && !appContent.includes('React.useState') && !appContent.includes('const { useState')) {
          appContent = [
            'const { useState, useEffect, useRef, useContext, useReducer, useCallback, useMemo,',
            '  useId, useLayoutEffect, useDeferredValue, useTransition,',
            '  memo, forwardRef, createContext, Fragment, Children, cloneElement, lazy, Suspense } = React;',
            'const { createPortal } = ReactDOM;',
          ].join('\n') + '\n' + appContent;
        }
        // If app uses React Router but imports were stripped, provide Router/Routes/Route stubs so "Router is not defined" doesn't occur
        const usesReactRouter = /<Router[\s>]|<Routes[\s>]|<Route\s/.test(appContent);
        if (usesReactRouter) {
          const routerStub = `const Router = function Router(props) { return React.createElement(React.Fragment, null, props.children); };
const Routes = function Routes(props) { return React.createElement(React.Fragment, null, props.children); };
const Route = function Route(props) { return props.element ?? null; };
`;
          appContent = routerStub + appContent;
        }

        // CRITICAL: Escape </script> so HTML parser doesn't close script tag early
        appContent = appContent.replace(/<\/script>/gi, '<\\/script>');

        // Wrap app in an error boundary so runtime errors show a message instead of blank preview
        const renderAppWithOptionalBanner = usesReactRouter
          ? 'React.createElement(React.Fragment, null, React.createElement("div", { style: { padding: "6px 12px", fontSize: 11, background: "#fef3c7", color: "#92400e", borderBottom: "1px solid #fcd34d", fontFamily: "system-ui,sans-serif" } }, "Preview: React Router stubs active \\u2014 routing is simplified."), React.createElement(App))'
          : 'React.createElement(App)';
        // Build the full app source (ErrorBoundary + App + render) as a text/plain block
        // then compile with manual Babel.transform() and try-catch for full error visibility
        const fullAppSource = [
          'class PreviewErrorBoundary extends React.Component {',
          '  constructor(props) { super(props); this.state = { hasError: false, error: null }; }',
          '  static getDerivedStateFromError(error) { return { hasError: true, error }; }',
          '  render() {',
          '    if (this.state.hasError) {',
          '      const msg = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error);',
          '      const isMapError = /undefined.*\\.map|\\.map.*undefined/i.test(msg);',
          '      const tip = isMapError ? "\\nTip: Use (items || []).map(...) or useState([]) so the list is never undefined." : "";',
          '      return React.createElement("div", {',
          '        style: { padding: 24, fontFamily: "Inter,system-ui,sans-serif", color: "#1a1a1a", fontSize: 14, maxWidth: "100%", overflow: "auto" }',
          '      },',
          '        React.createElement("h2", { style: { margin: "0 0 12px 0", fontSize: 16, color: "#dc2626" } }, "Preview Error"),',
          '        React.createElement("pre", { style: { margin: 0, padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 } }, msg + tip),',
          '        React.createElement("p", { style: { margin: "12px 0 0 0", fontSize: 12, color: "#6b7280" } }, "Auto-sending this error to Chat for a fix...")',
          '      );',
          '    }',
          '    return this.props.children;',
          '  }',
          '}',
          appContent,
          'const __root = ReactDOM.createRoot(document.getElementById("root"));',
          `__root.render(React.createElement(PreviewErrorBoundary, null, ${renderAppWithOptionalBanner}));`,
          'window.__previewRendered = true;',
        ].join('\n');
        const appComponentScript = `<script type="text/plain" id="__app_code">\n${fullAppSource}\n</script>
<script>
(function() {
  try {
    var __src = document.getElementById('__app_code').textContent;
    var __out = Babel.transform(__src, { presets: ['react', 'typescript'], filename: 'App.jsx' }).code;
    (0, eval)(__out);
  } catch(__e) {
    console.error('[Preview] App compilation/render error:', __e);
    window.__previewErrors.push(__e.message || String(__e));
    try { parent.postMessage({ type: 'preview-error', errors: window.__previewErrors.slice() }, '*'); } catch(_) {}
    var root = document.getElementById('root');
    if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
      root.innerHTML = '<div style="padding:24px;font-family:Inter,system-ui,sans-serif;color:#1a1a1a">'
        + '<h2 style="margin:0 0 12px;font-size:16px;color:#dc2626">Preview Error</h2>'
        + '<pre style="margin:0;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:13px;max-height:300px;overflow:auto">'
        + (__e.message || String(__e)).replace(/</g, '&lt;')
        + '</pre>'
        + '<p style="margin:12px 0 0;font-size:12px;color:#6b7280">Auto-sending this error to Chat for a fix...</p>'
        + '</div>';
    }
  }
})();
</script>`;
        
        const scriptsToInject = componentScripts
          ? `${linkStubScript}\n${componentScripts}\n${appComponentScript}`
          : `${linkStubScript}\n${appComponentScript}`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptsToInject}\n</body>`);
        } else {
          html = html + scriptsToInject;
        }
      }
    } else {
      // For non-React projects, inject JS/JSX/TSX files
      const jsFiles = project.files.filter(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' ||
            f.language === 'tsx' ||
            f.language === 'typescript' ||
            f.language === 'javascript' ||
            f.path.endsWith('.js') ||
            f.path.endsWith('.jsx') ||
            f.path.endsWith('.tsx') ||
            f.path.endsWith('.ts')) &&
          !f.isMain
      );
      // Use manual Babel.transform() with try-catch for non-React files too
      jsFiles.forEach((jsFile: { path: string; content: string }, idx: number) => {
        const safeContent = (jsFile.content || '').replace(/<\/script>/gi, '<\\/script>');
        const safePath = (jsFile.path || '').replace(/'/g, "\\'");
        const scriptTag = `<script type="text/plain" id="__nr_${idx}">\n${safeContent}\n</script>
<script>
(function() {
  try {
    var __src = document.getElementById('__nr_${idx}').textContent;
    var __out = Babel.transform(__src, { presets: ['react', 'typescript'], filename: '${safePath}' }).code;
    (0, eval)(__out);
  } catch(__e) {
    console.error('[Preview] ${safePath} error:', __e);
    window.__previewErrors.push('${safePath}: ' + (__e.message || String(__e)));
  }
})();
</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      });

      // Inject main JSX/TSX file if it exists and hasn't been injected yet
      const mainJsFile = project.files.find(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' || f.language === 'tsx' || f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) &&
          f.isMain &&
          f.path !== 'index.html'
      );
      if (mainJsFile && !html.includes(mainJsFile.content)) {
        const safeContent = (mainJsFile.content || '').replace(/<\/script>/gi, '<\\/script>');
        const safePath = (mainJsFile.path || '').replace(/'/g, "\\'");
        const scriptTag = `<script type="text/plain" id="__nr_main">\n${safeContent}\n</script>
<script>
(function() {
  try {
    var __src = document.getElementById('__nr_main').textContent;
    var __out = Babel.transform(__src, { presets: ['react', 'typescript'], filename: '${safePath}' }).code;
    (0, eval)(__out);
  } catch(__e) {
    console.error('[Preview] ${safePath} error:', __e);
    window.__previewErrors.push('${safePath}: ' + (__e.message || String(__e)));
  }
})();
</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: 'success',
      output: html,
      preview: html, // alias for clients that expect preview key
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to generate preview',
        ...(isDev && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    );
  }
}
