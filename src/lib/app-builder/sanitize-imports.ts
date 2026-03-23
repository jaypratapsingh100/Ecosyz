/**
 * Import Sanitizer — strips only DANGEROUS imports from AI-generated code.
 *
 * Uses a BLOCKLIST approach: allow all npm packages (they'll be stripped by
 * stripForBrowser and loaded via CDN if available), but block Node.js built-in
 * modules and filesystem access that could be security risks.
 */

/** Dangerous packages that should NEVER be in frontend code */
const BLOCKED_PACKAGES = new Set([
  // Node.js built-ins (security risk)
  'fs', 'path', 'child_process', 'os', 'net', 'http', 'https', 'crypto',
  'stream', 'zlib', 'cluster', 'dgram', 'dns', 'tls', 'vm', 'worker_threads',
  'fs/promises', 'node:fs', 'node:path', 'node:child_process', 'node:os',
  'node:crypto', 'node:http', 'node:https', 'node:net',
  // Server-only packages
  'express', 'koa', 'fastify', 'next', 'next/server',
  // Blocked CDN packages (cause runtime errors, use Tailwind CSS alternatives instead)
  'recharts', 'chart.js', 'd3', 'lucide-react', 'react-icons', '@heroicons/react',
  'framer-motion', '@headlessui/react',
  'pg', 'mysql', 'mysql2', 'mongodb', 'mongoose', 'prisma', '@prisma/client',
  'dotenv', 'bcrypt', 'bcryptjs', 'jsonwebtoken',
]);

/** Bare import pattern: import ... from 'package-name' or import 'package-name' */
const IMPORT_REGEX = /^import\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^./][^'"]*)['"]\s*;?\s*$/gm;

/** Dynamic import: import('package-name') */
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*['"]([^./][^'"]*)['"]\s*\)/g;

/** Require: require('package-name') */
const REQUIRE_REGEX = /(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"]([^./][^'"]*)['"]\s*\)\s*;?/g;

/**
 * Extract the package name from a module specifier.
 */
function getPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0];
}

/**
 * Check if a module specifier is blocked (dangerous).
 */
function isBlockedImport(specifier: string): boolean {
  const pkg = getPackageName(specifier);
  return BLOCKED_PACKAGES.has(pkg) || BLOCKED_PACKAGES.has(specifier);
}

/**
 * Remove only dangerous imports from a source file.
 * All other npm imports are KEPT — they'll be handled by stripForBrowser + CDN.
 */
export function sanitizeImports(content: string): {
  content: string;
  removed: string[];
} {
  const removed: string[] = [];

  // Remove static imports of blocked packages
  let cleaned = content.replace(IMPORT_REGEX, (match, specifier) => {
    if (isBlockedImport(specifier)) {
      removed.push(specifier);
      return `// [blocked] import from '${specifier}' — server-only package`;
    }
    return match; // Keep all other imports
  });

  // Remove dynamic imports of blocked packages
  cleaned = cleaned.replace(DYNAMIC_IMPORT_REGEX, (match, specifier) => {
    if (isBlockedImport(specifier)) {
      removed.push(specifier);
      return `Promise.resolve({}) /* [blocked] import('${specifier}') */`;
    }
    return match;
  });

  // Remove require() of blocked packages
  cleaned = cleaned.replace(REQUIRE_REGEX, (match, specifier) => {
    if (isBlockedImport(specifier)) {
      removed.push(specifier);
      return `// [blocked] require('${specifier}') — server-only package`;
    }
    return match;
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
