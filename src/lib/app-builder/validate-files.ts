/**
 * File Validation — regex-based syntax checking and import resolution for AI-generated code.
 *
 * Uses pattern-matching heuristics (from validateJSX utility) to catch common
 * AI-generated code issues: malformed imports, orphaned exports, unclosed tags, etc.
 * Also checks that all local imports resolve to files in the generated set.
 *
 * No esbuild dependency — pure regex, runs synchronously per file.
 */

import { validateJSXCode } from '@/lib/utils/validateJSX';

/**
 * Validate JSX/TSX syntax for a single file using regex-based checks.
 * Catches: malformed imports, orphaned exports, return outside function,
 * unclosed JSX tags, missing component definitions, style corruption, etc.
 */
export function validateJSXSyntax(
  filename: string,
  content: string
): { valid: boolean; errors: string[] } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Skip non-JS/TS files (CSS, HTML, JSON)
  if (!['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    return { valid: true, errors: [] };
  }

  const result = validateJSXCode(content, filename);

  // Convert ValidationError[] to string[]
  const errors = result.errors.map((e) =>
    e.line ? `Line ${e.line}: ${e.message}` : e.message
  );

  return { valid: result.valid, errors };
}

/** Regex to match ES import statements and extract the specifier. */
const IMPORT_SPECIFIER_REGEX = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g;

/** Regex to match dynamic imports: import('./path') */
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;

/**
 * Check that all local imports (./Foo, ../utils/bar) resolve to files in the set.
 * Considers extension-less imports: `import Foo from './Foo'` resolves to `src/components/Foo.jsx`.
 */
export function validateImportResolution(
  files: Array<{ path: string; content: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Build a set of all file paths (with and without extensions for resolution)
  const pathSet = new Set<string>();
  const pathNoExtSet = new Set<string>();
  for (const f of files) {
    const norm = f.path.replace(/^\.?\//, '');
    pathSet.add(norm);
    // Also add without extension for bare imports
    const noExt = norm.replace(/\.(jsx?|tsx?)$/, '');
    pathNoExtSet.add(noExt);
  }

  for (const file of files) {
    // Only validate JS/TS files
    if (!/\.(jsx?|tsx?)$/.test(file.path)) continue;

    const fileDir = file.path.replace(/\/[^/]+$/, '') || '.';
    const allImports: string[] = [];

    // Collect static imports
    let match;
    const staticRegex = new RegExp(IMPORT_SPECIFIER_REGEX.source, 'g');
    while ((match = staticRegex.exec(file.content)) !== null) {
      allImports.push(match[1]);
    }

    // Collect dynamic imports
    const dynamicRegex = new RegExp(DYNAMIC_IMPORT_REGEX.source, 'g');
    while ((match = dynamicRegex.exec(file.content)) !== null) {
      allImports.push(match[1]);
    }

    for (const importPath of allImports) {
      // Skip CSS/asset imports — they're valid side-effect imports stripped at build time
      if (/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot)$/.test(importPath)) continue;

      // Resolve relative path
      const resolved = resolveRelativePath(fileDir, importPath);

      // Check exact match, then try common extensions
      const found =
        pathSet.has(resolved) ||
        pathNoExtSet.has(resolved) ||
        pathSet.has(`${resolved}.jsx`) ||
        pathSet.has(`${resolved}.tsx`) ||
        pathSet.has(`${resolved}.js`) ||
        pathSet.has(`${resolved}.ts`) ||
        pathSet.has(`${resolved}/index.jsx`) ||
        pathSet.has(`${resolved}/index.tsx`) ||
        pathSet.has(`${resolved}/index.js`) ||
        pathSet.has(`${resolved}/index.ts`);

      if (!found) {
        errors.push(`${file.path}: unresolved import '${importPath}' → '${resolved}'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolve a relative import path from a directory.
 * E.g., resolveRelativePath('src/components', './Foo') → 'src/components/Foo'
 */
function resolveRelativePath(fromDir: string, importPath: string): string {
  const parts = fromDir === '.' ? [] : fromDir.split('/');
  const segments = importPath.split('/');

  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') {
      parts.pop();
    } else {
      parts.push(seg);
    }
  }

  return parts.join('/');
}

/**
 * Combined validation: syntax + import resolution.
 * Runs regex-based syntax checks per file, then import resolution across the set.
 */
export async function validateFileSet(
  files: Array<{ path: string; content: string }>
): Promise<{
  valid: boolean;
  errors: string[];
  fileErrors: Map<string, string[]>;
}> {
  const fileErrors = new Map<string, string[]>();
  const allErrors: string[] = [];

  // Run syntax validation (synchronous regex checks)
  for (const f of files) {
    if (!/\.(jsx?|tsx?)$/.test(f.path)) continue;

    const result = validateJSXSyntax(f.path, f.content);
    if (!result.valid) {
      fileErrors.set(f.path, result.errors);
      for (const err of result.errors) {
        allErrors.push(`[syntax] ${f.path}: ${err}`);
      }
    }
  }

  // Run import resolution
  const importResult = validateImportResolution(files);
  if (!importResult.valid) {
    for (const err of importResult.errors) {
      allErrors.push(`[import] ${err}`);
      // Group by file
      const filePath = err.split(':')[0];
      const existing = fileErrors.get(filePath) || [];
      existing.push(err);
      fileErrors.set(filePath, existing);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    fileErrors,
  };
}
