/**
 * Import Sanitizer — strips disallowed 3rd-party imports from AI-generated code.
 *
 * The scaffold only includes a fixed set of dependencies (react, react-dom, etc.).
 * AI-generated imports for packages like axios, moment, lodash will fail at build time,
 * so we strip them and log warnings.
 */

/** Packages available in the scaffold (from package.json). */
export const ALLOWED_PACKAGES = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'react-router-dom',
  'lucide-react',
]);

/** Bare import pattern: import ... from 'package-name' or import 'package-name' */
const IMPORT_REGEX = /^import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^./][^'"]*)['"]\s*;?\s*$/gm;

/** Dynamic import: import('package-name') */
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*['"]([^./][^'"]*)['"]\s*\)/g;

/** Require: require('package-name') */
const REQUIRE_REGEX = /(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"]([^./][^'"]*)['"]\s*\)\s*;?/g;

/**
 * Extract the package name from a module specifier.
 * Handles scoped packages: '@scope/package/subpath' → '@scope/package'
 * Handles normal packages: 'lodash/merge' → 'lodash'
 */
function getPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0];
}

/**
 * Check if a module specifier is allowed.
 */
function isAllowedImport(specifier: string): boolean {
  const pkg = getPackageName(specifier);
  return ALLOWED_PACKAGES.has(pkg) || ALLOWED_PACKAGES.has(specifier);
}

/**
 * Remove disallowed imports from a source file.
 * Returns the cleaned content and a list of removed imports.
 */
export function sanitizeImports(content: string): {
  content: string;
  removed: string[];
} {
  const removed: string[] = [];

  // Remove static imports of disallowed packages
  let cleaned = content.replace(IMPORT_REGEX, (match, specifier) => {
    if (isAllowedImport(specifier)) return match;
    removed.push(specifier);
    return `// [removed] import from '${specifier}' — not in allowed dependencies`;
  });

  // Remove dynamic imports of disallowed packages
  cleaned = cleaned.replace(DYNAMIC_IMPORT_REGEX, (match, specifier) => {
    if (isAllowedImport(specifier)) return match;
    removed.push(specifier);
    return `Promise.resolve({}) /* [removed] dynamic import('${specifier}') */`;
  });

  // Remove require() of disallowed packages
  cleaned = cleaned.replace(REQUIRE_REGEX, (match, specifier) => {
    if (isAllowedImport(specifier)) return match;
    removed.push(specifier);
    return `// [removed] require('${specifier}') — not in allowed dependencies`;
  });

  return { content: cleaned, removed: [...new Set(removed)] };
}

/**
 * Sanitize imports across a set of files.
 * Returns the cleaned files and a summary of all removed imports.
 */
export function sanitizeFileImports<T extends { path: string; content: string }>(
  files: T[]
): { files: T[]; removedImports: Map<string, string[]> } {
  const removedImports = new Map<string, string[]>();

  const cleaned = files.map((file) => {
    // Only process JS/TS/JSX/TSX files
    if (!/\.(jsx?|tsx?)$/.test(file.path)) return file;

    const result = sanitizeImports(file.content);
    if (result.removed.length > 0) {
      removedImports.set(file.path, result.removed);
    }
    return { ...file, content: result.content };
  });

  return { files: cleaned, removedImports };
}
