/**
 * Scaffold Guard — prevents AI from overwriting infrastructure files.
 *
 * The AI should only generate UI/component code within src/.
 * Protected files (package.json, vite.config, index.html, etc.) are
 * managed by the scaffold system and must not be overwritten.
 */

/** Infrastructure files the AI must never overwrite. */
export const PROTECTED_SCAFFOLD_PATHS = new Set([
  'package.json',
  'vite.config.js',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json',
  'index.html',
  'postcss.config.js',
  'postcss.config.cjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.cjs',
  'README.md',
  '.gitignore',
  '.env',
  '.env.local',
  'public/favicon.ico',
  'public/index.html',
]);

/**
 * Check whether a file path is safe for AI to write.
 * Returns true only for paths under src/ that aren't protected infrastructure.
 */
export function isAIWritablePath(filePath: string): boolean {
  const normalized = filePath
    .replace(/\.\.\//g, '')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/');

  // Block anything in the protected set
  if (PROTECTED_SCAFFOLD_PATHS.has(normalized)) return false;

  // Allow src/ files (components, App, styles, utils, hooks, etc.)
  if (normalized.startsWith('src/')) return true;

  // Allow root CSS files (styles.css) — used by some scaffolds
  if (normalized === 'styles.css') return true;

  // Block everything else (config files, dotfiles, etc.)
  return false;
}

/**
 * Filter AI-generated files, removing any that target protected paths.
 * Returns the filtered files and a list of rejected paths for logging.
 */
export function filterAIFiles<T extends { path: string }>(
  files: T[]
): { allowed: T[]; rejected: string[] } {
  const allowed: T[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    if (isAIWritablePath(file.path)) {
      allowed.push(file);
    } else {
      rejected.push(file.path);
    }
  }

  return { allowed, rejected };
}
