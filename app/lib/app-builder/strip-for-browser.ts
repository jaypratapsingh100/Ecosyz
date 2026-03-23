/**
 * Shared utility to strip Node.js/ESM imports and exports from code
 * so it can run in a browser context (iframe preview or deploy).
 *
 * Used by both:
 * - app/api/app-projects/[id]/preview/route.ts (live preview)
 * - app/lib/app-builder/build-deployable-html.ts (deploy/download)
 */

/**
 * Remove import/export/require statements, strip TypeScript syntax,
 * and inject React hooks so generated component code runs directly
 * in a browser with React UMD + Babel Standalone.
 */
export function stripForBrowser(code: string): string {
  // No pre-extraction needed. After stripping imports, component names resolve via:
  // 1. window["ComponentName"] — registered by extractComponentNames + window registration
  // 2. CDN globals — registered by CDN registration scripts (lucide-react, recharts, etc.)
  // 3. React hooks — destructured from React above
  // In browser JS (even strict mode), window properties ARE accessible as bare identifiers.

  let c = (code || '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+(?:const|let|var|function|class)\s+/g, (m) => m.replace(/^export\s+/, ''))
    .replace(/export\s+\{[^}]*\}\s*;?/g, '') // Remove named re-exports: export { Foo, Bar };
    .replace(/export\s+\*\s+from\s+['"][^'"]*['"]\s*;?/g, '') // Remove re-exports: export * from '...'
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove ES6 imports
    .replace(/import\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove bare side-effect imports
    .replace(/(?:const|let|var)\s+\{[^}]*\}\s*=\s*require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove destructured require
    .replace(/(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove require() assignments
    .replace(/require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove standalone require() calls
    .replace(/module\.exports\s*=\s*[^;]+;?/g, '') // Remove module.exports
    .replace(/exports\.\w+\s*=\s*[^;]+;?/g, '') // Remove exports.X assignments
    .replace(/<\/script>/gi, '<\\/script>')
    // Fix stray backslashes from malformed JSON unescaping
    .replace(/,\\\s{2,}/g, ',\n')
    .replace(/'\\\s{2,}/g, "'\n")
    .replace(/;\\\s{2,}/g, ';\n')
    // Fix unescaped smart quotes that break Babel (curly quotes → straight quotes)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

  // Light TypeScript safety-net — only remove simple, safe patterns.
  // Babel with the TypeScript preset handles all TS syntax; these just help edge cases.
  // NOTE: Do NOT strip interface/type blocks with regex — they can span multiple lines
  // with nested braces and the simple regex breaks existing projects. Let Babel handle them.
  // Remove `: FC`, `: ReactNode` etc. type annotations (safe, single-token)
  // Matches `: React.FC = `, `: React.FC<Props> = `, `: ReactNode;`, `: JSX.Element {`
  c = c.replace(/:\s*(?:React\.)?(?:FC|FunctionComponent|JSX\.Element|ReactNode|ReactElement)(?:<[^>]*>)?(?=\s*[;{=])/g, '');
  // Remove `as TypeName` assertions: `value as string` → `value`
  c = c.replace(/\s+as\s+(?:const|(?:[A-Z]\w*(?:\[\])?))\b/g, '');

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

  // No var declarations needed — window properties are accessible as bare identifiers
  // in browser JS. The extractComponentNames + window registration in preview/deploy
  // handles component scope, and CDN registration handles package exports.

  return c.trim();
}

/**
 * Sort component files so dependencies come before the components that use them.
 * E.g., TodoItem.jsx is placed before TodoList.jsx if TodoList imports TodoItem.
 */
export function sortComponentsByDependency(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  // Topological sort: files that define things others depend on come first
  // 1. Build a map of what each file DEFINES (exports, top-level const/function)
  // 2. Build a map of what each file USES (references to other files' exports)
  // 3. Sort so definitions come before usages

  const fileList = [...files];
  const getName = (path: string) => (path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';

  // Extract all names defined in each file (PascalCase components + camelCase data)
  const defines = new Map<string, Set<string>>();
  for (const f of fileList) {
    const names = new Set<string>();
    const content = f.content || '';
    // PascalCase components/context
    for (const m of content.matchAll(/(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/g)) names.add(m[1]);
    // camelCase data variables (top-level only)
    for (const m of content.matchAll(/^(?:const|let|var)\s+([a-z][a-zA-Z0-9]*)\s*=/gm)) names.add(m[1]);
    // Hooks
    for (const m of content.matchAll(/(?:const|let|var|function)\s+(use[A-Z][a-zA-Z0-9]*)\s*[=(]/g)) names.add(m[1]);
    defines.set(f.path, names);
  }

  // Build dependency graph: file A depends on file B if A uses a name B defines
  const deps = new Map<string, Set<string>>();
  for (const f of fileList) {
    const myDeps = new Set<string>();
    const content = f.content || '';
    for (const other of fileList) {
      if (other.path === f.path) continue;
      const otherNames = defines.get(other.path);
      if (!otherNames) continue;
      for (const name of otherNames) {
        // Check if this file references the name (as a component tag, function call, or variable)
        if (name.length > 2 && (
          content.includes(`<${name}`) ||  // JSX component usage
          content.includes(`${name}(`) ||  // function call
          content.includes(`${name}.`) ||  // property access
          content.includes(`from './${getName(other.path)}'`) || // explicit import
          content.includes(`from "./${getName(other.path)}"`)
        )) {
          myDeps.add(other.path);
          break; // one dependency per file pair is enough
        }
      }
    }
    deps.set(f.path, myDeps);
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  for (const f of fileList) inDegree.set(f.path, 0);
  for (const [, fileDeps] of deps) {
    for (const dep of fileDeps) {
      inDegree.set(dep, (inDegree.get(dep) || 0)); // ensure dep exists
    }
  }
  // Count in-degrees
  for (const [path, fileDeps] of deps) {
    for (const dep of fileDeps) {
      // path depends on dep → dep must come first → path has +1 in-degree
      inDegree.set(path, (inDegree.get(path) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [path, degree] of inDegree) {
    if (degree === 0) queue.push(path);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    // Find files that depend on current — reduce their in-degree
    for (const [path, fileDeps] of deps) {
      if (fileDeps.has(current)) {
        const newDegree = (inDegree.get(path) || 1) - 1;
        inDegree.set(path, newDegree);
        if (newDegree === 0) queue.push(path);
      }
    }
  }

  // Add any remaining files (circular deps) at the end
  for (const f of fileList) {
    if (!sorted.includes(f.path)) sorted.push(f.path);
  }

  // Map sorted paths back to file objects
  const pathToFile = new Map(fileList.map(f => [f.path, f]));
  return sorted.map(p => pathToFile.get(p)!).filter(Boolean);
}
