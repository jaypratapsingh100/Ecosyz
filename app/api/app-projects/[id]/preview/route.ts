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
      return NextResponse.json(
        { error: 'No HTML file found in project' },
        { status: 400 }
      );
    }

    // Build HTML starting from main HTML file
    let html = htmlFile.content;

    // Strip Vite/npm module script tags - they won't work in iframe (no server to serve /src/main.jsx)
    // Preview injects React + App directly for sandbox rendering
    html = html.replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*src=["']\/src\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');

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
    // Tailwind CSS via CDN so utility classNames (flex, items-center, gap-4, etc.) render in preview
    const tailwindCdn = `<script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } } }</script>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${googleFonts}\n${tailwindCdn}\n</head>`);
    } else {
      html = googleFonts + tailwindCdn + html;
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
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
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
        const stripForBrowser = (code: string) => {
          let c = (code || '')
            .replace(/export\s+default\s+/g, '')
            .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove imports
            .replace(/<\/script>/gi, '<\\/script>');
          // Inject all common React hooks and utilities so generated components work in preview
          const usesReactApi = /use(State|Effect|Ref|Context|Reducer|Callback|Memo|Id|LayoutEffect|DeferredValue|Transition)\s*\(/.test(c)
            || /\b(memo|forwardRef|createContext|Fragment|Children|cloneElement|lazy|Suspense|createPortal)\b/.test(c);
          if (usesReactApi && !c.includes('React.useState') && !c.includes('const { useState')) {
            c = [
              'const { useState, useEffect, useRef, useContext, useReducer, useCallback, useMemo,',
              '  useId, useLayoutEffect, useDeferredValue, useTransition,',
              '  memo, forwardRef, createContext, Fragment, Children, cloneElement, lazy, Suspense } = React;',
              'const { createPortal } = ReactDOM;',
            ].join('\n') + '\n' + c;
          }
          return c.trim();
        };
        // Sort: dependencies first (TodoItem before TodoList, etc.)
        const sortedComponents = [...componentFiles].sort((a, b) => {
          const aContent = (a.content || '');
          const bName = (b.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          if (aContent.includes(bName) || aContent.includes(`/${bName}'`) || aContent.includes(`/${bName}"`)) return 1;
          const bContent = (b.content || '');
          const aName = (a.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          if (bContent.includes(aName) || bContent.includes(`/${aName}'`) || bContent.includes(`/${aName}"`)) return -1;
          return (a.path || '').localeCompare(b.path || '');
        });
        const componentScripts = sortedComponents.map((f: { path: string; content: string }) => {
          const c = stripForBrowser(f.content);
          return `<script type="text/babel">\n${c}\n</script>`;
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
          .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, ''); // Remove imports (components injected above)
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
        // NOTE: Do NOT escape template literals (${}). The code runs inside <script type="text/babel">
        // where Babel handles template literals natively. Escaping them breaks dynamic content.
        
        // Wrap app in an error boundary so runtime errors (e.g. .map on undefined) show a message instead of blank preview
        // When router stubs are active, render a small banner so the fix is visible; also highlight "Router is not defined" in errors
        const renderAppWithOptionalBanner = usesReactRouter
          ? 'React.createElement(React.Fragment, null, React.createElement("div", { style: { padding: "6px 12px", fontSize: 11, background: "#fef3c7", color: "#92400e", borderBottom: "1px solid #fcd34d", fontFamily: "system-ui,sans-serif" } }, "Preview: React Router stubs active — routing is simplified. Your app should render below."), React.createElement(App))'
          : 'React.createElement(App)';
        const errorBoundaryScript = [
          '  <script type="text/babel">',
          '    class PreviewErrorBoundary extends React.Component {',
          '      constructor(props) { super(props); this.state = { hasError: false, error: null }; }',
          '      static getDerivedStateFromError(error) { return { hasError: true, error }; }',
          '      render() {',
          '        if (this.state.hasError) {',
          '          const msg = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error);',
          '          const isMapError = /undefined.*\\.map|\\.map.*undefined/i.test(msg);',
          '          const isRouterError = /Router is not defined|Routes is not defined|Route is not defined/i.test(msg);',
          '          const tip = isMapError ? "\\n\\nTip: Use (items || []).map(...) or useState([]) so the list is never undefined." : "";',
          '          return React.createElement("div", {',
          '            style: { padding: 20, fontFamily: "system-ui,sans-serif", color: "#1a1a1a", fontSize: 14, maxWidth: "100%", overflow: "auto" }',
          '          },',
          '            React.createElement("h2", { style: { margin: "0 0 12px 0", fontSize: 16 } }, "Preview error"),',
          '            React.createElement("pre", { style: { margin: 0, padding: 12, background: "#f5f5f5", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, msg + tip),',
          '            isRouterError ? React.createElement("div", { style: { marginTop: 12, padding: 12, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 13 } }, React.createElement("strong", null, "Router/Routes/Route not defined"), React.createElement("p", { style: { margin: "8px 0 0 0" } }, "The preview now injects stubs for these. Refresh the preview to apply the fix and render your app.")) : null,',
          '            React.createElement("p", { style: { margin: "12px 0 0 0", fontSize: 12, color: "#6b7280" } }, "Copy this error and ask the AI in Chat to fix it.")',
          '          );',
          '        }',
          '        return this.props.children;',
          '      }',
          '    }',
          '    const { createRoot } = ReactDOM;',
          appContent,
          '    const root = createRoot(document.getElementById("root"));',
          `    root.render(React.createElement(PreviewErrorBoundary, null, ${renderAppWithOptionalBanner}));`,
          '  </script>',
        ].join('\n');
        const appComponentScript = errorBoundaryScript;
        
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
      // For non-React projects, inject JS/JSX files
      const jsFiles = project.files.filter(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' ||
            f.language === 'javascript' ||
            f.path.endsWith('.js') ||
            f.path.endsWith('.jsx')) &&
          !f.isMain
      );
      for (const jsFile of jsFiles) {
        const safeContent = (jsFile.content || '').replace(/<\/script>/gi, '<\\/script>');
        const scriptTag = `<script type="text/babel">${safeContent}</script>`;
        // Insert before closing body tag
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      }

      // Inject main JSX file if it exists and hasn't been injected yet
      const mainJsFile = project.files.find(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' || f.path.endsWith('.jsx')) &&
          f.isMain &&
          f.path !== 'index.html'
      );
      if (mainJsFile && !html.includes(mainJsFile.content)) {
        const safeContent = (mainJsFile.content || '').replace(/<\/script>/gi, '<\\/script>');
        const scriptTag = `<script type="text/babel">${safeContent}</script>`;
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
