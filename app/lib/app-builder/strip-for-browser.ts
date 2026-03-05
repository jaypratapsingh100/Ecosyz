/**
 * Shared utility to strip Node.js/ESM imports and exports from code
 * so it can run in a browser context (iframe preview or deploy).
 *
 * Used by both:
 * - app/api/app-projects/[id]/preview/route.ts (live preview)
 * - app/lib/app-builder/build-deployable-html.ts (deploy/download)
 */

/**
 * Remove import/export/require statements and inject React hooks
 * so generated component code runs directly in a browser with React UMD.
 */
export function stripForBrowser(code: string): string {
  let c = (code || '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+(?:const|let|var|function|class)\s+/g, (m) => m.replace(/^export\s+/, ''))
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove ES6 imports
    .replace(/(?:const|let|var)\s+\{[^}]*\}\s*=\s*require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove destructured require
    .replace(/(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove require() assignments
    .replace(/require\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*/g, '') // Remove standalone require() calls
    .replace(/module\.exports\s*=\s*[^;]+;?/g, '') // Remove module.exports
    .replace(/exports\.\w+\s*=\s*[^;]+;?/g, '') // Remove exports.X assignments
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
}

/**
 * Sort component files so dependencies come before the components that use them.
 * E.g., TodoItem.jsx is placed before TodoList.jsx if TodoList imports TodoItem.
 */
export function sortComponentsByDependency(
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  return [...files].sort((a, b) => {
    const aContent = a.content || '';
    const bName = (b.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (aContent.includes(bName) || aContent.includes(`/${bName}'`) || aContent.includes(`/${bName}"`)) return 1;
    const bContent = b.content || '';
    const aName = (a.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (bContent.includes(aName) || bContent.includes(`/${aName}'`) || bContent.includes(`/${aName}"`)) return -1;
    return (a.path || '').localeCompare(b.path || '');
  });
}
