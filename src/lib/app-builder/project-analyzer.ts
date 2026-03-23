/**
 * Project Analyzer — builds a complete picture of the project state.
 * Injected into prompts so the AI knows exactly what exists, what's missing,
 * and what needs to be done. Context-aware generation.
 */

export interface ProjectStatus {
  /** Files that exist in the project */
  existingFiles: Array<{
    path: string;
    exports: string[];      // What this file exports (component names, hooks, data)
    imports: string[];       // What this file imports from other project files
    lineCount: number;
  }>;
  /** Imports that reference files that don't exist */
  unresolvedImports: Array<{
    importedBy: string;      // File that has the broken import
    importPath: string;      // The import path that doesn't resolve
    importedName: string;    // The name being imported
  }>;
  /** Pages defined in App.jsx routing but without component files */
  missingPages: string[];
  /** Components used in JSX but not defined anywhere */
  undefinedComponents: string[];
  /** Questionnaire features not yet implemented */
  unimplementedFeatures: string[];
  /** Overall health */
  health: 'complete' | 'partial' | 'broken';
  healthDetails: string;
}

/**
 * Analyze project files and return a complete status report.
 */
export function analyzeProject(
  files: Array<{ path: string; content: string }>,
  questionnaireFeatures?: string[],
): ProjectStatus {
  const fileMap = new Map(files.map(f => [f.path, f.content]));
  const existingPaths = new Set(files.map(f => f.path));

  // ── Extract exports and imports from each file ──
  const existingFiles: ProjectStatus['existingFiles'] = [];
  const allExports = new Map<string, string>(); // name → file path
  const allImports: Array<{ file: string; name: string; fromPath: string }> = [];

  for (const f of files) {
    if (!f.path.match(/\.(jsx?|tsx?)$/) || f.path === 'index.html') continue;

    const exports: string[] = [];
    const imports: string[] = [];

    // Extract exports
    const defaultExport = f.content.match(/export\s+default\s+(\w+)/);
    if (defaultExport) exports.push(defaultExport[1]);

    // PascalCase functions/components
    for (const m of f.content.matchAll(/(?:function|const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/g)) {
      exports.push(m[1]);
    }
    // Hooks
    for (const m of f.content.matchAll(/(?:function|const)\s+(use[A-Z][a-zA-Z0-9]*)\s*[=(]/g)) {
      exports.push(m[1]);
    }
    // Named data exports
    for (const m of f.content.matchAll(/^(?:export\s+)?(?:const|let|var)\s+([a-z][a-zA-Z0-9]{2,})\s*=/gm)) {
      if (!isCommonLocalVar(m[1])) exports.push(m[1]);
    }

    const uniqueExports = [...new Set(exports)];
    for (const exp of uniqueExports) allExports.set(exp, f.path);

    // Extract local imports (from ./ paths)
    for (const m of f.content.matchAll(/import\s+(?:(\w+)|{([^}]+)})\s+from\s+['"]\.\/([^'"]+)['"]/g)) {
      const defaultName = m[1];
      const namedImports = m[2];
      const fromPath = m[3];

      if (defaultName) {
        imports.push(defaultName);
        allImports.push({ file: f.path, name: defaultName, fromPath: `src/${fromPath}` });
      }
      if (namedImports) {
        for (const n of namedImports.split(',').map(s => s.trim().split(/\s+as\s+/).pop()!.trim())) {
          if (n) {
            imports.push(n);
            allImports.push({ file: f.path, name: n, fromPath: `src/${fromPath}` });
          }
        }
      }
    }

    existingFiles.push({
      path: f.path,
      exports: uniqueExports,
      imports: [...new Set(imports)],
      lineCount: f.content.split('\n').length,
    });
  }

  // ── Find unresolved imports ──
  const unresolvedImports: ProjectStatus['unresolvedImports'] = [];
  for (const imp of allImports) {
    // Try to resolve the import path
    const candidates = [
      imp.fromPath,
      imp.fromPath + '.jsx',
      imp.fromPath + '.tsx',
      imp.fromPath + '.js',
      imp.fromPath + '.ts',
    ];
    const resolved = candidates.some(c => existingPaths.has(c));
    if (!resolved) {
      unresolvedImports.push({
        importedBy: imp.file,
        importPath: imp.fromPath,
        importedName: imp.name,
      });
    }
  }

  // ── Find missing pages from App.jsx routing ──
  const missingPages: string[] = [];
  const appContent = fileMap.get('src/App.jsx') || fileMap.get('src/App.tsx') || '';
  if (appContent) {
    // Find page names from case statements or conditional rendering
    const pageRefs = [
      ...appContent.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g),
      ...appContent.matchAll(/currentPage\s*===\s*['"]([^'"]+)['"]/g),
    ].map(m => m[1]);

    for (const page of new Set(pageRefs)) {
      // Check if there's a component for this page
      const pageName = page.charAt(0).toUpperCase() + page.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase());
      const hasComponent = allExports.has(pageName) || allExports.has(page);
      if (!hasComponent && page !== 'home' && page !== 'default') {
        missingPages.push(page);
      }
    }
  }

  // ── Find undefined components ──
  const undefinedComponents: string[] = [];
  for (const f of files) {
    if (!f.path.match(/\.(jsx?|tsx?)$/)) continue;
    // Find JSX component usage: <ComponentName
    for (const m of f.content.matchAll(/<([A-Z][a-zA-Z0-9]+)[\s/>]/g)) {
      const compName = m[1];
      if (!allExports.has(compName) && !isBuiltInComponent(compName)) {
        undefinedComponents.push(compName);
      }
    }
  }

  // ── Check questionnaire features ──
  const unimplementedFeatures: string[] = [];
  if (questionnaireFeatures?.length) {
    const allCode = files.map(f => f.content).join('\n').toLowerCase();
    const featureKeywords: Record<string, string[]> = {
      'Navigation bar': ['<nav', 'navbar', 'header'],
      'Hero section': ['hero', 'banner'],
      'Footer': ['<footer', 'footer'],
      'Contact form': ['contact', 'handlesubmit', 'onsubmit'],
      'Dark mode': ['dark', 'theme', 'toggledark', 'darkmode'],
      'Auth UI (Login/Signup)': ['login', 'signup', 'auth', 'password'],
      'User dashboard': ['dashboard', 'stats', 'overview'],
      'Pricing table': ['pricing', 'plans', 'price'],
      'Feature comparison': ['comparison', 'compare', 'featurecomparison'],
      'Notifications': ['notification', 'notify', 'bell'],
      'Settings page': ['settings', 'preference', 'profile'],
      'Charts / Analytics': ['chart', 'analytics', 'graph'],
      'Data tables': ['datatable', 'table.*data', '<table'],
      'Responsive design': ['md:', 'lg:', 'sm:', 'grid-cols'],
      'Newsletter': ['newsletter', 'subscribe', 'email.*signup'],
      'FAQ': ['faq', 'accordion', 'question.*answer'],
      'Testimonials': ['testimonial', 'review', 'quote'],
    };

    for (const feature of questionnaireFeatures) {
      const keywords = featureKeywords[feature];
      if (keywords) {
        const implemented = keywords.some(kw => {
          if (kw.includes('.*')) {
            return new RegExp(kw).test(allCode);
          }
          return allCode.includes(kw);
        });
        if (!implemented) unimplementedFeatures.push(feature);
      }
    }
  }

  // ── Health assessment ──
  const hasErrors = unresolvedImports.length > 0 || undefinedComponents.length > 0;
  const hasMissing = missingPages.length > 0 || unimplementedFeatures.length > 0;
  const health: ProjectStatus['health'] = hasErrors ? 'broken' : hasMissing ? 'partial' : 'complete';

  const details: string[] = [];
  if (unresolvedImports.length > 0) details.push(`${unresolvedImports.length} unresolved imports`);
  if (undefinedComponents.length > 0) details.push(`${undefinedComponents.length} undefined components`);
  if (missingPages.length > 0) details.push(`${missingPages.length} missing pages`);
  if (unimplementedFeatures.length > 0) details.push(`${unimplementedFeatures.length} unimplemented features`);

  return {
    existingFiles,
    unresolvedImports,
    missingPages,
    undefinedComponents: [...new Set(undefinedComponents)],
    unimplementedFeatures,
    health,
    healthDetails: details.length > 0 ? details.join(', ') : 'All good — project is complete',
  };
}

/**
 * Format project status for prompt injection — compact but complete.
 */
export function formatProjectStatusForPrompt(status: ProjectStatus): string {
  if (status.existingFiles.length === 0) return '';

  const lines: string[] = [];
  lines.push(`\nPROJECT STATE (${status.health.toUpperCase()}: ${status.healthDetails}):`);

  // Existing files summary
  lines.push(`\nExisting files (${status.existingFiles.length}):`);
  for (const f of status.existingFiles) {
    const exports = f.exports.length > 0 ? ` → exports: ${f.exports.join(', ')}` : '';
    lines.push(`  ${f.path} (${f.lineCount} lines)${exports}`);
  }

  // Critical issues
  if (status.unresolvedImports.length > 0) {
    lines.push(`\n⚠️ UNRESOLVED IMPORTS (create these files):`);
    for (const imp of status.unresolvedImports) {
      lines.push(`  ${imp.importedBy} imports "${imp.importedName}" from ${imp.importPath} — FILE MISSING`);
    }
  }

  if (status.undefinedComponents.length > 0) {
    lines.push(`\n⚠️ UNDEFINED COMPONENTS (used in JSX but not defined):`);
    lines.push(`  ${status.undefinedComponents.join(', ')}`);
  }

  if (status.missingPages.length > 0) {
    lines.push(`\n⚠️ MISSING PAGES (defined in routing but no component):`);
    lines.push(`  ${status.missingPages.join(', ')}`);
  }

  if (status.unimplementedFeatures.length > 0) {
    lines.push(`\nOptional — requested features not yet implemented:`);
    lines.push(`  ${status.unimplementedFeatures.join(', ')}`);
  }

  if (status.health === 'broken') {
    lines.push(`\nACTION REQUIRED: Fix the unresolved imports and undefined components above. Create the missing files.`);
  } else if (status.health === 'partial') {
    lines.push(`\nSUGGESTED: Create the missing pages and implement remaining features.`);
  }

  return lines.join('\n');
}

// ── Helpers ──

function isCommonLocalVar(name: string): boolean {
  const COMMON = new Set([
    'idx','key','val','ref','obj','arr','str','num','len','pos','item','elem','node',
    'list','name','type','path','data','result','error','index','event','value','label',
    'title','input','field','param','props','state','style','child','count','total',
    'start','entry','query','timer','scope','store','cache','limit','model','token',
    'match','block','level','width','height','length','color','status','option','config',
    'format','handle','update','change','toggle','submit','render','create','remove',
    'delete','filter','reduce','select','method','action','detail','target','source',
    'response','callback','promise','resolve','reject','timeout','interval',
  ]);
  return name.length <= 2 || COMMON.has(name);
}

function isBuiltInComponent(name: string): boolean {
  const BUILT_IN = new Set([
    'Fragment', 'Suspense', 'StrictMode', 'Profiler',
    'Link', 'Route', 'Routes', 'BrowserRouter', 'Router',
    'Outlet', 'Navigate',
  ]);
  return BUILT_IN.has(name);
}
