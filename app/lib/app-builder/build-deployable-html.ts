/**
 * Build deployable HTML from app project files.
 * Produces a self-contained HTML that works when deployed to Vercel/static hosting.
 * Same logic as preview but for deployment (no preview-specific banner).
 */

import { SCAFFOLD_STYLES, PREVIEW_BASE_CSS } from './scaffolds';
import { stripForBrowser, sortComponentsByDependency } from './strip-for-browser';
import { detectRequiredPackages, generateCDNScripts } from '@/lib/app-builder/cdn-packages';

/**
 * Extract PascalCase component names from source code so we can register them on window.
 */
function extractComponentNames(code: string): string[] {
  const names: string[] = [];
  const patterns = [
    // PascalCase: React components, Context objects (Header, CartContext, etc.)
    /(?:function)\s+([A-Z][a-zA-Z0-9]*)\s*\(/g,
    /(?:const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*=/g,
    /(?:class)\s+([A-Z][a-zA-Z0-9]*)\s+/g,
    // camelCase hooks: useCart, useAuth, useDarkMode, etc.
    /(?:const|let|var|function)\s+(use[A-Z][a-zA-Z0-9]*)\s*[=(]/g,
    // camelCase variables: formatPrice, cartStore, initialProducts, etc.
    /(?:const|let|var)\s+([a-z][a-zA-Z0-9]*)\s*=/g,
    /function\s+([a-z][a-zA-Z0-9]*)\s*\(/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(code)) !== null) {
      const name = m[1];
      // Skip React built-in hooks (already available via destructuring)
      if (/^use(State|Effect|Ref|Context|Reducer|Callback|Memo|Id|LayoutEffect|DeferredValue|Transition)$/.test(name)) continue;
      // Skip short names (1-2 chars) — almost always local variables
      if (name.length <= 2) continue;
      // Skip common JS local variables, loop vars, destructured vars
      const SKIP_NAMES = new Set([
        'idx','key','val','ref','obj','arr','str','num','len','pos','col','row','map','set',
        'acc','cur','sum','min','max','tmp','buf','msg','txt','src','dst','cls','tag','doc',
        'win','nav','btn','img','svg','url','api','ctx','cfg','opt','arg','err','res','req',
        'item','elem','node','list','name','type','path','file','line','char','word','text',
        'body','head','root','base','self','args','opts','conf','spec','desc','meta','info',
        'data','result','error','index','event','value','label','title','input','field',
        'param','props','state','style','child','count','total','start','entry','query',
        'timer','scope','store','cache','limit','model','token','match','block','level',
        'width','height','length','color','status','option','config','format','handle',
        'update','change','toggle','submit','render','create','remove','delete','filter',
        'reduce','select','method','action','detail','target','source','origin','parent',
        'prefix','suffix','cursor','offset','signal','promise','callback','response',
        'resolve','reject','timeout','interval','boolean','number','string','symbol',
        'object','module','window','global','import','export','return',
      ]);
      if (SKIP_NAMES.has(name)) continue;
      names.push(name);
    }
  }
  return [...new Set(names)];
}

export interface ProjectFileLike {
  path: string;
  name?: string;
  content: string;
  language?: string | null;
  isMain?: boolean | null;
  updatedAt?: Date;
}

export interface ProjectLike {
  files: ProjectFileLike[];
  framework?: string | null;
  title?: string | null;
}

export interface BuildOptions {
  /** Show "Preview: React Router stubs active" banner (for preview only, not deploy) */
  showPreviewBanner?: boolean;
}

/**
 * Build a complete deployable HTML from project files.
 * Inlines React, Babel, App.jsx, strips imports, adds Router/Link stubs.
 */
export function buildDeployableHtml(
  project: ProjectLike,
  options: BuildOptions = {}
): string {
  const { showPreviewBanner = false } = options;

  const hasAppJsx = project.files?.some(
    (f) =>
      f.path === 'src/App.jsx' ||
      f.path === 'src/App.tsx' ||
      f.path.includes('App.jsx')
  );
  const isReactProject = project.framework === 'react' || hasAppJsx;

  let htmlFile = project.files.find(
    (f) =>
      f.path === 'index.html' ||
      f.name === 'index.html' ||
      (f.path.endsWith('.html') && f.isMain)
  );

  if (!htmlFile && isReactProject) {
    htmlFile = {
      path: 'index.html',
      name: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.title || 'React App'}</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
    };
  }

  if (!htmlFile) {
    throw new Error('No HTML file found in project');
  }

  let html = htmlFile.content;

  // Strip Vite/npm module script tags - they won't work in static deployment
  html = html.replace(
    /<script[^>]*type=["']module["'][^>]*src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  );
  html = html.replace(
    /<script[^>]*src=["']\/src\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  );

  // Inline CSS (remove link tags, inject as style)
  const cssFiles = project.files.filter(
    (f) => f.language === 'css' || f.path.endsWith('.css')
  );
  for (const cssFile of cssFiles) {
    const name = cssFile.path.split('/').pop() || cssFile.path;
    html = html.replace(
      new RegExp(
        `<link[^>]*href=["']([^"']*${name.replace('.', '\\.')})["'][^>]*>`,
        'gi'
      ),
      ''
    );
  }

  // Tailwind CDN for utility classes
  const tailwindCdn = `<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={darkMode:'class',theme:{extend:{fontFamily:{sans:['Inter','system-ui','sans-serif']},colors:{gray:{950:'#030712'}}}}}</script>
<script>document.addEventListener('DOMContentLoaded',function(){var b=document.body,h=document.documentElement;var d=b.className&&/bg-(gray|slate)-(800|900|950)|bg-black/.test(b.className);if(!d){var f=b.firstElementChild;if(f)d=/bg-(gray|slate)-(800|900|950)|bg-black/.test(f.className||'');}if(d||h.classList.contains('dark'))h.classList.add('dark');})</script>`;
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${tailwindCdn}\n</head>`);
  } else {
    html = tailwindCdn + html;
  }

  // Detect CDN packages needed — injection happens after React scripts to ensure deps load first
  const requiredPkgs = detectRequiredPackages(
    project.files.map((f) => ({ content: f.content || '' }))
  );

  // Base CSS
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
      html = html + cssTag;
    }
  }

  if (isReactProject) {
    const hasReactLibs =
      html.includes('react@18') ||
      html.includes('react.development.js') ||
      html.includes('react/umd');
    const hasComponentCode =
      html.includes('React.createElement') ||
      html.includes('createRoot') ||
      html.includes('ReactDOM.render') ||
      (html.includes('type="text/babel"') && html.includes('function App'));

    const appCandidates = project.files.filter(
      (f) =>
        (f.language === 'jsx' ||
          f.language === 'tsx' ||
          f.path.endsWith('.jsx') ||
          f.path.endsWith('.tsx')) &&
        f.path !== 'index.html' &&
        (f.path === 'src/App.jsx' ||
          f.path === 'src/App.tsx' ||
          f.path.includes('App.jsx') ||
          f.path.includes('App.tsx'))
    );
    const mainJsFile =
      appCandidates.length === 0
        ? undefined
        : [...appCandidates].sort((a, b) => {
            if (a.isMain === true && b.isMain !== true) return -1;
            if (a.isMain !== true && b.isMain === true) return 1;
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
          })[0];

    const ensureReactAndRoot = () => {
      const reactScripts = `
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
      if (!html.includes('react@18') && !html.includes('react.development.js')) {
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${reactScripts}\n</head>`);
        } else if (html.includes('<body>')) {
          html = html.replace(
            '<body>',
            `<head>${reactScripts}</head>\n<body>`
          );
        } else {
          html = reactScripts + '\n' + html;
        }
      }
      if (
        !html.includes('<div id="root">') &&
        !html.includes("<div id='root'>")
      ) {
        if (html.includes('</body>')) {
          html = html.replace('</body>', '  <div id="root"></div>\n</body>');
        } else {
          html = html + '\n<div id="root"></div>';
        }
      }
    };

    if (
      mainJsFile &&
      !html.includes(mainJsFile.content) &&
      (!hasComponentCode || !hasReactLibs)
    ) {
      const componentFiles = project.files.filter(
        (f) =>
          (f.language === 'jsx' ||
            f.language === 'tsx' ||
            f.language === 'javascript' ||
            f.language === 'typescript' ||
            f.path.endsWith('.jsx') ||
            f.path.endsWith('.tsx') ||
            f.path.endsWith('.js') ||
            f.path.endsWith('.ts')) &&
          f.path !== mainJsFile.path &&
          !f.path.match(/^src\/main\.(jsx?|tsx?)$/) &&
          !f.path.match(/^(package\.json|vite\.config\.|tsconfig\.|postcss\.config\.|tailwind\.config\.)/)
      );
      const sortedComponents = sortComponentsByDependency(componentFiles);
      const componentScripts = sortedComponents
        .map((f) => {
          const stripped = stripForBrowser(f.content);
          // Extract component names and register on window so App.jsx can reference them
          // (Babel adds "use strict" which prevents function declarations from leaking to global)
          const names = extractComponentNames(f.content);
          const registerLines = names
            .map(n => `if (typeof ${n} !== "undefined") window["${n}"] = ${n};`)
            .join('\n');
          return `<script type="text/babel">\n${stripped}\n${registerLines}\n</script>`;
        })
        .join('\n');

      const linkStubScript = `
  <script>
    (function() {
      var R = window.React;
      if (!R || !R.createElement) return;

      // Simple hash-based router state
      window.__ROUTER_PATH__ = window.location.hash.replace('#', '') || '/';
      window.__ROUTER_LISTENERS__ = [];
      function navigateTo(path) {
        window.__ROUTER_PATH__ = path;
        window.location.hash = path;
        window.__ROUTER_LISTENERS__.forEach(function(fn) { fn(path); });
      }
      window.addEventListener('hashchange', function() {
        window.__ROUTER_PATH__ = window.location.hash.replace('#', '') || '/';
        window.__ROUTER_LISTENERS__.forEach(function(fn) { fn(window.__ROUTER_PATH__); });
      });

      // useNavigate hook stub
      if (typeof window.useNavigate === 'undefined') {
        window.useNavigate = function useNavigate() {
          return function(path) { navigateTo(path); };
        };
      }

      // useLocation hook stub
      if (typeof window.useLocation === 'undefined') {
        window.useLocation = function useLocation() {
          return { pathname: window.__ROUTER_PATH__, search: '', hash: '' };
        };
      }

      // useParams hook stub
      if (typeof window.useParams === 'undefined') {
        window.useParams = function useParams() { return {}; };
      }

      // Link: supports both 'to' (React Router) and 'href' props
      if (typeof window.Link === 'undefined') {
        window.Link = function Link(props) {
          var to = props.to || props.href || '#';
          var children = props.children;
          var rest = {};
          for (var k in props) {
            if (k !== 'to' && k !== 'href' && k !== 'children' && Object.prototype.hasOwnProperty.call(props, k)) rest[k] = props[k];
          }
          return R.createElement('a', Object.assign({
            href: '#' + to,
            onClick: function(e) {
              if (to.startsWith('http') || to.startsWith('mailto:')) return;
              e.preventDefault();
              navigateTo(to);
            }
          }, rest), children);
        };
      }

      // NavLink: same as Link but with active class support
      if (typeof window.NavLink === 'undefined') {
        window.NavLink = window.Link;
      }

      // BrowserRouter / HashRouter / Router wrapper
      if (typeof window.BrowserRouter === 'undefined') {
        window.BrowserRouter = function BrowserRouter(props) {
          var _React = React;
          var _s = _React.useState(window.__ROUTER_PATH__), path = _s[0], setPath = _s[1];
          _React.useEffect(function() {
            window.__ROUTER_LISTENERS__.push(setPath);
            return function() {
              window.__ROUTER_LISTENERS__ = window.__ROUTER_LISTENERS__.filter(function(fn) { return fn !== setPath; });
            };
          }, []);
          return R.createElement(R.Fragment, null, props && props.children);
        };
      }
      if (typeof window.HashRouter === 'undefined') window.HashRouter = window.BrowserRouter;
      if (typeof window.Router === 'undefined') window.Router = window.BrowserRouter;

      // Routes: renders only the matching Route child
      if (typeof window.Routes === 'undefined') {
        window.Routes = function Routes(props) {
          var _React = React;
          var _s = _React.useState(window.__ROUTER_PATH__), currentPath = _s[0], setPath = _s[1];
          _React.useEffect(function() {
            window.__ROUTER_LISTENERS__.push(setPath);
            return function() {
              window.__ROUTER_LISTENERS__ = window.__ROUTER_LISTENERS__.filter(function(fn) { return fn !== setPath; });
            };
          }, []);
          var children = R.Children.toArray(props.children);
          var match = null;
          for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (!child || !child.props) continue;
            var routePath = child.props.path;
            if (routePath === '*') { if (!match) match = child; continue; }
            if (routePath === currentPath || routePath === currentPath + '/') { match = child; break; }
            if (routePath === '/' && currentPath === '') { match = child; break; }
          }
          if (match && match.props && match.props.element) return match.props.element;
          return null;
        };
      }

      // Route: just a data carrier, rendered by Routes
      if (typeof window.Route === 'undefined') {
        window.Route = function Route(props) {
          return props && props.element ? props.element : null;
        };
      }

      // Outlet stub for nested routes
      if (typeof window.Outlet === 'undefined') {
        window.Outlet = function Outlet() { return null; };
      }
    })();
  </script>`;

      ensureReactAndRoot();

      // Inject CDN packages AFTER React so deps (React.forwardRef etc.) are available
      if (requiredPkgs.length > 0) {
        const cdnScripts = generateCDNScripts(requiredPkgs);
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${cdnScripts}\n</head>`);
        } else {
          html = cdnScripts + '\n' + html;
        }
      }

      // BEFORE stripping: extract import aliases for window registration
      const importAliases: Array<{alias: string; source: string}> = [];
      const aliasRegex = /import\s+(\w+)\s+from\s+['"]\.\/(?:components|pages|hooks|context|store|lib|utils)\/(\w+)(?:\.jsx?|\.tsx?)?['"]/g;
      let aliasMatch;
      while ((aliasMatch = aliasRegex.exec(mainJsFile.content)) !== null) {
        if (aliasMatch[1] !== aliasMatch[2]) {
          importAliases.push({ alias: aliasMatch[1], source: aliasMatch[2] });
        }
      }

      // CDN package exports are registered on window by CDN scripts (lucide-react, recharts, etc.)
      // No need to extract import names — window globals are accessible in browser JS.

      let appContent = mainJsFile.content
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+(?:const|let|var|function|class)\s+/g, (m) => m.replace(/^export\s+/, ''))
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, '')
        .replace(/import\s+['"][^'"]*['"]\s*;?\s*/g, '')
        .replace(/(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '')
        .replace(/require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '');

      // Register import aliases on window
      if (importAliases.length > 0) {
        const aliasLines = importAliases
          .map(a => `if (typeof window["${a.source}"] !== "undefined" && typeof ${a.alias} === "undefined") { var ${a.alias} = window["${a.source}"]; window["${a.alias}"] = ${a.alias}; }`)
          .join('\n');
        appContent = aliasLines + '\n' + appContent;
      }

      appContent = appContent.trim();
      if (
        (appContent.includes('useState(') || appContent.includes('useEffect(')) &&
        !appContent.includes('React.useState') &&
        !appContent.includes('const { useState')
      ) {
        appContent =
          'const { useState, useEffect, useCallback, useMemo } = React;\n' +
          appContent;
      }
      const usesReactRouter = /<(?:Browser)?Router[\s>]|<Routes[\s>]|<Route\s|useNavigate|useLocation|useParams/.test(
        appContent
      );
      if (usesReactRouter) {
        // Reference the global hash-based router stubs from the linkStubScript
        // instead of defining broken local stubs that shadow the working globals
        appContent =
          `const BrowserRouter = window.BrowserRouter;
const HashRouter = window.HashRouter;
const Router = window.Router;
const Routes = window.Routes;
const Route = window.Route;
const Link = window.Link;
const NavLink = window.NavLink;
const Outlet = window.Outlet;
const useNavigate = window.useNavigate;
const useLocation = window.useLocation;
const useParams = window.useParams;
` + appContent;
      }

      // CDN exports accessible via window globals — no explicit declarations needed.

      appContent = appContent.replace(/<\/script>/gi, '<\\/script>');
      appContent = appContent.replace(/\$\{/g, '\\${');

      const renderAppWithOptionalBanner = showPreviewBanner && usesReactRouter
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

      const scriptsToInject = componentScripts
        ? `${linkStubScript}\n${componentScripts}\n${errorBoundaryScript}`
        : `${linkStubScript}\n${errorBoundaryScript}`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptsToInject}\n</body>`);
      } else {
        html = html + scriptsToInject;
      }
    } else {
      // Non-React or index.html already has complete app
      const jsFiles = project.files.filter(
        (f) =>
          (f.language === 'jsx' ||
            f.language === 'javascript' ||
            f.path.endsWith('.js') ||
            f.path.endsWith('.jsx')) &&
          !f.isMain
      );
      for (const jsFile of jsFiles) {
        const safeContent = (jsFile.content || '').replace(
          /<\/script>/gi,
          '<\\/script>'
        );
        const scriptTag = `<script type="text/babel">${safeContent}</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      }
      const mainJs = project.files.find(
        (f) =>
          (f.language === 'jsx' || f.path.endsWith('.jsx')) &&
          f.isMain &&
          f.path !== 'index.html'
      );
      if (mainJs && !html.includes(mainJs.content)) {
        const safeContent = (mainJs.content || '').replace(
          /<\/script>/gi,
          '<\\/script>'
        );
        const scriptTag = `<script type="text/babel">${safeContent}</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      }
    }
  }

  return html;
}
