/**
 * CDN Package Registry — maps npm package names to CDN URLs and window globals.
 * Used by preview and deploy to conditionally inject packages the generated code imports.
 * No build system needed — packages loaded via UMD bundles from unpkg.
 */

export interface CDNPackage {
  /** npm package name as used in import statements */
  name: string;
  /** CDN URL for UMD/global build */
  cdnUrl: string;
  /** The global variable name the UMD build registers on window */
  windowGlobal: string;
  /** Map of named exports to register: import { X } from 'pkg' → window.X = window.Global.X */
  namedExports?: Record<string, string>;
  /** Dependencies that must be loaded first */
  deps?: string[];
}

export const CDN_PACKAGES: CDNPackage[] = [
  {
    name: '@supabase/supabase-js',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    windowGlobal: 'supabase',
    namedExports: {
      createClient: 'supabase.createClient',
    },
  },
];

/**
 * Detect which CDN packages are needed by scanning file contents for import statements.
 * Returns only packages that are actually imported.
 */
export function detectRequiredPackages(
  files: Array<{ content: string }>
): CDNPackage[] {
  const allContent = files.map(f => f.content || '').join('\n');
  const required: CDNPackage[] = [];

  for (const pkg of CDN_PACKAGES) {
    // Check for import statements referencing this package
    const importPattern = new RegExp(
      `import\\s+(?:\\{[^}]*\\}|\\w+)\\s+from\\s+['"]${pkg.name.replace(/[/\\@]/g, '\\$&')}['"]`,
    );
    if (importPattern.test(allContent)) {
      required.push(pkg);
    }
  }

  return required;
}

/**
 * Generate <script> tags for required CDN packages.
 * Also generates window registration scripts so stripped imports still work.
 */
export function generateCDNScripts(packages: CDNPackage[]): string {
  if (packages.length === 0) return '';

  const scripts: string[] = [];

  for (const pkg of packages) {
    scripts.push(`<script src="${pkg.cdnUrl}"></script>`);

    // Dynamically register ALL exports on window — handles any import name the AI uses
    scripts.push(`<script>
  try {
    var __g = window["${pkg.windowGlobal}"];
    if (__g) {
      // Register every export on window: PieChart, BarChart, etc.
      Object.keys(__g).forEach(function(key) {
        if (typeof __g[key] !== 'undefined') {
          // Direct name: window.PieChart = Recharts.PieChart
          if (typeof window[key] === 'undefined') window[key] = __g[key];
          // Prefixed name: window.RechartsPieChart = Recharts.PieChart
          var prefixed = "${pkg.windowGlobal}" + key;
          if (typeof window[prefixed] === 'undefined') window[prefixed] = __g[key];
        }
      });
    }
  } catch(e) {}
</script>`);


    // Supabase special: ensure createClient is directly on window
    if (pkg.name === '@supabase/supabase-js') {
      scripts.push(`<script>
  try {
    // Make createClient available as bare identifier (for stripped imports)
    if (window.supabase && window.supabase.createClient) {
      window.createClient = window.supabase.createClient;
    }
    // Also handle: const { createClient } = require('@supabase/supabase-js')
    if (typeof window.supabaseCreateClient === 'undefined' && window.supabase) {
      window.supabaseCreateClient = window.supabase.createClient;
    }
  } catch(e) {}
</script>`);
    }
  }

  return scripts.join('\n');
}

/** All package names available via CDN (for prompt whitelist) */
export const AVAILABLE_CDN_PACKAGES = CDN_PACKAGES.map(p => p.name);
