import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

// Helper function to clean imports from code
function removeImports(code: string): string {
  // Remove CSS imports first
  code = code.replace(/import\s+['"].*?\.css['"];?\s*/g, '');
  // Remove React Router imports
  code = code.replace(/import\s+.*?from\s+['"]react-router-dom['"];?\s*/g, '');
  // Remove all other imports
  code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
  // Remove standalone React imports
  code = code.replace(/import\s+React[^;]*;?\s*/g, '');
  return code;
}

// Helper function to remove CommonJS exports (module.exports, exports.)
function removeCommonJSExports(code: string): string {
  // Remove module.exports = ... patterns
  code = code.replace(/module\.exports\s*=\s*[^;]+;?\s*/g, '');
  // Remove exports.xxx = ... patterns
  code = code.replace(/exports\.\w+\s*=\s*[^;]+;?\s*/g, '');
  // Remove module.exports = { ... } patterns (multiline)
  code = code.replace(/module\.exports\s*=\s*\{[\s\S]*?\};?\s*/g, '');
  // Remove exports = ... patterns
  code = code.replace(/exports\s*=\s*[^;]+;?\s*/g, '');
  // Remove any remaining module.exports references
  code = code.replace(/module\.exports\s*[^;]*;?\s*/g, '');
  // Remove any remaining exports references
  code = code.replace(/exports\s*[^;]*;?\s*/g, '');
  return code;
}

// Helper function to process Tailwind CSS
function processTailwindCSS(cssContent: string): { processed: string; usesTailwind: boolean } {
  // Check for Tailwind directives or Tailwind utility classes in CSS
  const hasTailwindDirectives = /@tailwind|@apply/.test(cssContent);
  const hasTailwindClasses = /\b(bg-|text-|p-|m-|flex|grid|rounded|shadow|hover:|focus:|transition|duration|ease|backdrop-blur|w-|h-|max-w|min-h|border|gap-|space-)/.test(cssContent);
  
  // If CSS contains Tailwind directives, we need Tailwind CDN
  const usesTailwind = hasTailwindDirectives || hasTailwindClasses;
  
  if (!usesTailwind) {
    return { processed: cssContent, usesTailwind: false };
  }
  
  // Process Tailwind directives
  let processed = cssContent;
  
  // Remove @tailwind directives (base, components, utilities) - Tailwind Play CDN handles these automatically
  // The CDN injects base, components, and utilities automatically, so we don't need these directives
  processed = processed.replace(/@tailwind\s+(base|components|utilities);?\s*/g, '');
  
  // Keep @apply directives - Tailwind Play CDN can process them in <style> tags
  // The CDN will compile @apply directives correctly
  
  return { processed, usesTailwind: true };
}

// Helper function to detect if JSX code uses Tailwind classes
function detectTailwindInJS(jsContent: string): boolean {
  // Check for common Tailwind class patterns in className attributes
  const tailwindPattern = /className=["'][^"']*\b(bg-|text-|p-|m-|flex|grid|rounded|shadow|hover:|focus:|transition|duration|ease|backdrop-blur|w-|h-|max-w|min-h|border|gap-|space-)/;
  return tailwindPattern.test(jsContent);
}

// Helper function to clean exports and ensure component is accessible
function cleanExports(code: string): { cleaned: string; componentName?: string } {
  let cleaned = code;
  let componentName: string | undefined;

  // Case 1: export default function ComponentName() { ... }
  const funcMatch = cleaned.match(/export\s+default\s+function\s+(\w+)\s*\(/);
  if (funcMatch) {
    componentName = funcMatch[1];
    cleaned = cleaned.replace(/export\s+default\s+function\s+/, 'function ');
    return { cleaned, componentName };
  }

  // Case 2: export default const ComponentName = ...
  const constMatch = cleaned.match(/export\s+default\s+const\s+(\w+)\s*=/);
  if (constMatch) {
    componentName = constMatch[1];
    cleaned = cleaned.replace(/export\s+default\s+const\s+/, 'const ');
    return { cleaned, componentName };
  }

  // Case 3: function ComponentName() { ... } export default ComponentName;
  const exportRefMatch = cleaned.match(/export\s+default\s+(\w+)\s*;/);
  if (exportRefMatch) {
    componentName = exportRefMatch[1];
    // Remove the export statement
    cleaned = cleaned.replace(/export\s+default\s+\w+\s*;?\s*/g, '');
    // Try to find the component definition
    const componentMatch = cleaned.match(/(?:function|const|class)\s+(\w+)/);
    if (componentMatch) {
      componentName = componentMatch[1];
    }
    return { cleaned, componentName };
  }

  // Case 4: export default (anonymous or inline)
  if (cleaned.includes('export default')) {
    // Try to find component name first
    const anonMatch = cleaned.match(/(?:function|const|class)\s+(\w+)/);
    if (anonMatch) {
      componentName = anonMatch[1];
    }
    // Remove export default
    cleaned = cleaned.replace(/export\s+default\s+/g, '');
    return { cleaned, componentName };
  }

  // Case 5: export function/const (named export)
  if (cleaned.includes('export ')) {
    const namedMatch = cleaned.match(/export\s+(?:function|const|class)\s+(\w+)/);
    if (namedMatch) {
      componentName = namedMatch[1];
    }
    cleaned = cleaned.replace(/export\s+/g, '');
    return { cleaned, componentName };
  }

  // No exports, try to find component name anyway
  const componentMatch = cleaned.match(/(?:function|const|class)\s+(\w+)/);
  if (componentMatch) {
    componentName = componentMatch[1];
  }

  return { cleaned, componentName };
}

// Helper function to check if HTML is a complete React app
function isCompleteReactHTML(htmlContent: string): boolean {
  const content = htmlContent.toLowerCase();
  return (
    content.includes('react') &&
    (content.includes('unpkg.com/react') ||
      content.includes('cdn.jsdelivr.net/react') ||
      content.includes('jsdelivr.net/react')) &&
    content.includes('babel') &&
    content.includes('<script') &&
    content.includes('root')
  );
}

// Helper function to find App file from JS files
function findAppFile(jsFiles: any[]): any {
  const appFileCandidates = jsFiles.filter(
    (f) => (f.path.includes('App') || f.name.includes('App')) && !f.path.includes('index')
  );

  if (appFileCandidates.length === 0) {
    return null;
  }

  // Priority: 1) isMain + App.jsx, 2) isMain + App.js, 3) App.jsx, 4) App.js, 5) isMain, 6) first match
  return (
    appFileCandidates.find((f) => f.isMain && (f.name === 'App.jsx' || f.path.includes('App.jsx'))) ||
    appFileCandidates.find((f) => f.isMain && (f.name === 'App.js' || f.path.includes('App.js'))) ||
    appFileCandidates.find((f) => f.name === 'App.jsx' || f.path.includes('App.jsx')) ||
    appFileCandidates.find((f) => f.name === 'App.js' || f.path.includes('App.js')) ||
    appFileCandidates.find((f) => f.isMain) ||
    appFileCandidates[0]
  );
}

// Helper function to extract components from JSX
function extractComponentsFromJSX(jsxContent: string, componentFiles: any[]): string[] {
  const components: string[] = [];
  const seen = new Set<string>();

  // HTML elements to skip
  const htmlElements = new Set([
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'ul', 'li',
    'ol', 'section', 'form', 'input', 'textarea', 'label', 'br', 'img', 'svg', 'path',
    'g', 'circle', 'rect', 'line', 'polygon', 'polyline', 'text', 'tspan', 'App',
    'header', 'footer', 'nav', 'main', 'article', 'aside', 'table', 'tr', 'td', 'th',
    'thead', 'tbody', 'tfoot', 'select', 'option', 'canvas', 'video', 'audio', 'source',
    'iframe', 'embed', 'object', 'param', 'track', 'area', 'map', 'meta', 'link', 'style',
    'script', 'noscript', 'template', 'slot'
  ]);

  // Match component usages: <ComponentName /> or <ComponentName>
  const componentPattern = /<([A-Z][a-zA-Z0-9]*)\s*(?:\/>|>)/g;
  let match;

  while ((match = componentPattern.exec(jsxContent)) !== null) {
    const compName = match[1];
    if (!htmlElements.has(compName.toLowerCase()) && !seen.has(compName)) {
      // Check if component file exists
      const compFile = componentFiles.find(
        (f) =>
          f.name === `${compName}.js` ||
          f.name === `${compName}.jsx` ||
          f.path.includes(`/${compName}.`) ||
          f.path.includes(`\\${compName}.`)
      );
      if (compFile) {
        components.push(compName);
        seen.add(compName);
      }
    }
  }

  return components;
}

// Helper function to process component files
function processComponentFiles(componentFiles: any[], appFile: any): { processed: string; usesRouter: boolean } {
  let combinedJs = '';
  let usesRouter = false;

  componentFiles.forEach((file) => {
    let fileContent = file.content;

    // Check if this component uses React Router (including Link/NavLink)
    const fileUsesRouter = detectReactRouter(fileContent);
    if (fileUsesRouter) {
      usesRouter = true;
      console.log(`🔍 Component ${file.path} uses React Router`);
    }

    // Remove CommonJS exports first (before other processing)
    fileContent = removeCommonJSExports(fileContent);

    // Remove imports (but keep router detection)
    fileContent = removeImports(fileContent);

    // Clean exports
    const { cleaned, componentName } = cleanExports(fileContent);
    fileContent = cleaned;
    
    // Ensure component is available globally
    combinedJs += `\n// ${file.path}\n${fileContent}\n`;
    
    // If component has a name, ensure it's available globally
    if (componentName) {
      // Make sure it's available both locally and globally
      combinedJs += `\nif (typeof ${componentName} !== 'undefined') { 
  window.${componentName} = ${componentName};
  console.log('✅ Component ${componentName} loaded and available');
} else {
  console.warn('⚠️ Component ${componentName} not found after processing ${file.path}');
}\n`;
    } else {
      // Try to extract component name from file content if not found
      const functionMatch = fileContent.match(/(?:function|const|var|let)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/);
      if (functionMatch && functionMatch[1]) {
        const extractedName = functionMatch[1];
        combinedJs += `\nif (typeof ${extractedName} !== 'undefined') { 
  window.${extractedName} = ${extractedName};
  console.log('✅ Component ${extractedName} loaded (extracted from code)');
}\n`;
      }
    }
  });

  return { processed: combinedJs, usesRouter };
}

// Helper function to detect React Router usage
function detectReactRouter(jsContent: string): boolean {
  // Check for React Router imports
  const hasRouterImport = /import.*from\s+['"]react-router-dom['"]/.test(jsContent);
  
  // Check for React Router components
  const hasRouterComponents = /BrowserRouter|Routes|Route|Router/.test(jsContent);
  
  // CRITICAL: Check for Link/NavLink usage (components might use them without importing)
  const hasLinkUsage = /<Link\s|<Link\s+to|<Link\s*\{|Link\s*\(|<\/Link>/.test(jsContent);
  const hasNavLinkUsage = /<NavLink\s|<NavLink\s+to|<NavLink\s*\{|NavLink\s*\(|<\/NavLink>/.test(jsContent);
  
  // Check for router hooks
  const hasRouterHooks = /useNavigate|useParams|useLocation|useHistory/.test(jsContent);
  
  return hasRouterImport || hasRouterComponents || hasLinkUsage || hasNavLinkUsage || hasRouterHooks;
}

// Helper function to process App file
function processAppFile(appFile: any, componentFiles: any[]): { processed: string; usesRouter: boolean } {
  let appContent = appFile.content;
  const originalContent = appContent;

  // Check for React Router
  const usesRouter = detectReactRouter(appContent);

  // If using React Router, we need to handle it specially
  // For preview, we'll render all route components without routing
  if (usesRouter) {
    // Extract all route components
    const routeElementMatches = appContent.match(/element=\{<(\w+)\s*\/>\}/g);
    const routeComponentsSet = new Set<string>();
    if (routeElementMatches) {
      routeElementMatches.forEach((m: string) => {
        const match = m.match(/<(\w+)\s*\/>/);
        if (match && match[1]) {
          routeComponentsSet.add(match[1]);
        }
      });
    }
    
    // Also find components used directly in JSX
    const directComponentMatches = appContent.match(/<([A-Z][a-zA-Z0-9]*)\s*(?:\/>|>)/g);
    if (directComponentMatches) {
      directComponentMatches.forEach((m: string) => {
        const match = m.match(/<([A-Z][a-zA-Z0-9]*)/);
        if (match && match[1] && !['Router', 'BrowserRouter', 'Routes', 'Route', 'NavLink', 'Link'].includes(match[1])) {
          routeComponentsSet.add(match[1]);
        }
      });
    }
    
    const routeComponents = Array.from(routeComponentsSet);
    
    // Find navigation component
    const navigationFile = componentFiles.find(
      (f) => f.name === 'Navigation.js' || f.name === 'Navigation.jsx' || f.name === 'Navbar.js' || f.name === 'Navbar.jsx' || f.path.includes('Navigation') || f.path.includes('Navbar')
    );
    const hasNavigationInJSX = appContent.includes('<Navigation') || appContent.includes('Navigation />') || appContent.includes('<Navbar') || appContent.includes('Navbar />');

    const allComponents: string[] = [];
    
    // Add navigation first if it exists
    if (navigationFile || hasNavigationInJSX) {
      const navName = navigationFile?.name?.includes('Navbar') ? 'Navbar' : 'Navigation';
      if (!allComponents.includes(navName)) {
        allComponents.push(navName);
      }
    }
    
    // Add route components
    routeComponents.forEach((comp) => {
      if (!allComponents.includes(comp)) {
        allComponents.push(comp);
      }
    });
    
    // If we found components, render them all (for preview, show all routes stacked)
    if (allComponents.length > 0) {
      console.log('🔧 Transforming React Router App - rendering components:', allComponents);
      // Verify components exist in componentFiles
      const missingComponents = allComponents.filter(comp => {
        const found = componentFiles.some(f => 
          f.name === `${comp}.js` || 
          f.name === `${comp}.jsx` || 
          f.path.includes(`/${comp}.`) ||
          f.path.includes(`\\${comp}.`)
        );
        if (!found) {
          console.warn(`⚠️ Component ${comp} not found in componentFiles`);
        }
        return !found;
      });
      
      if (missingComponents.length > 0) {
        console.warn('⚠️ Some components not found:', missingComponents);
      }
      
      // Create a simple App that renders all components using JSX
      // Ensure all components are available before rendering
      appContent = `function App() {
  console.log('App rendering, checking components:', [${allComponents.map(c => `'${c}'`).join(', ')}]);
  
  // Check each component exists - try window first, then global scope
  ${allComponents.map(c => `
  const ${c}Component = typeof ${c} !== 'undefined' ? ${c} : (typeof window !== 'undefined' && typeof window.${c} !== 'undefined' ? window.${c} : null);`).join('')}
  
  const availableComponents = [${allComponents.map(c => `{ name: '${c}', component: ${c}Component }`).join(', ')}];
  console.log('Components status:', availableComponents.map(c => ({ name: c.name, available: c.component !== null })));
  
  // Only render components that are actually available
  const validComponents = availableComponents.filter(c => c.component !== null);
  if (validComponents.length === 0) {
    return React.createElement('div', { style: { padding: '40px', textAlign: 'center' } },
      React.createElement('h1', null, 'No Components Loaded'),
      React.createElement('p', null, 'Expected: ' + [${allComponents.map(c => `'${c}'`).join(', ')}].join(', ')),
      React.createElement('p', { style: { fontSize: '12px', color: '#666', marginTop: '20px' } }, 'Check console for details')
    );
  }
  
  return (
    <div className="min-h-screen">
      ${allComponents.map((c) => {
        return `{${c}Component ? React.createElement(${c}Component) : React.createElement('div', { key: '${c}', style: { padding: '20px', border: '1px solid #ef4444', margin: '10px', backgroundColor: '#fee' } }, 'Component ${c} not loaded - check exports')}`;
      }).join(',\n      ')}
    </div>
  );
}`;
    } else {
      // Fallback: transform router code to render without routing
      console.log('🔧 Transforming React Router App - removing router wrappers');
      // Replace BrowserRouter/Router with div
      appContent = appContent.replace(/BrowserRouter|Router/g, 'div');
      // Replace Routes with div  
      appContent = appContent.replace(/Routes/g, 'div');
      // Replace Route elements with the component directly
      appContent = appContent.replace(/<Route\s+path=["'][^"']+["']\s+element=\{<(\w+)\s*\/>\}\s*\/?>/g, '<$1 />');
      // Remove any remaining Route closing tags
      appContent = appContent.replace(/<\/Route>/g, '');
      // Remove main wrapper if it only contains Routes
      appContent = appContent.replace(/<main[^>]*>\s*<div>\s*<\/div>\s*<\/main>/g, '');
    }
  } else {
    // Extract components from JSX
    const returnMatch = appContent.match(/return\s*\([\s\S]*?\)/);
    const jsxContent = returnMatch ? returnMatch[0] : appContent;
    const componentsInOrder = extractComponentsFromJSX(jsxContent, componentFiles);

    if (componentsInOrder.length > 0) {
      appContent = `function App() {
  return (
    <div className="App">
      ${componentsInOrder.map((c) => `<${c} />`).join('\n      ')}
    </div>
  );
}`;
    }
  }

  // Remove CommonJS exports first
  appContent = removeCommonJSExports(appContent);

  // Remove imports (but keep React Router detection)
  appContent = removeImports(appContent);

  // Clean exports and ensure App is defined
  const { cleaned, componentName } = cleanExports(appContent);
  appContent = cleaned;

  // Ensure App is defined
  let appDefinition = '';
  if (appContent.match(/(?:function|const)\s+App\s*[=(]/)) {
    // App is already defined
    appDefinition = appContent;
    // Make sure App is available globally
    appDefinition += '\nif (typeof App !== "undefined") { window.App = App; }';
  } else if (componentName) {
    // Component has a name, use it
    appDefinition = `${appContent}\nconst App = ${componentName};\nif (typeof App !== "undefined") { window.App = App; }`;
  } else {
    // Last resort: wrap as AppComponent
    appDefinition = `const AppComponent = ${appContent.trim()};\nconst App = AppComponent;\nif (typeof App !== "undefined") { window.App = App; }`;
  }

  return { processed: `\n// ${appFile.path} - App component\n${appDefinition}\n`, usesRouter };
}

// Sandbox validation function - validates preview before returning
function validatePreviewSandbox(htmlContent: string, project: any): { 
  valid: boolean; 
  error?: string; 
  warnings?: string[];
  checks: {
    hasHTMLStructure: boolean;
    hasReactScripts: boolean;
    hasRootElement: boolean;
    hasAppComponent: boolean;
    hasValidStructure: boolean;
  };
} {
  const warnings: string[] = [];
  const checks = {
    hasHTMLStructure: false,
    hasReactScripts: false,
    hasRootElement: false,
    hasAppComponent: false,
    hasValidStructure: false,
  };

  // Check 1: Has basic HTML structure
  const hasDoctype = htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<!doctype html>');
  const hasHtmlTag = htmlContent.includes('<html') || htmlContent.includes('<HTML');
  const hasHeadTag = htmlContent.includes('<head') || htmlContent.includes('<HEAD');
  const hasBodyTag = htmlContent.includes('<body') || htmlContent.includes('<BODY');
  checks.hasHTMLStructure = hasDoctype && hasHtmlTag && hasHeadTag && hasBodyTag;

  if (!checks.hasHTMLStructure) {
    return {
      valid: false,
      error: 'Preview HTML missing basic structure (DOCTYPE, html, head, or body tags)',
      checks,
    };
  }

  // Check 2: Has React scripts (required for React apps)
  const hasReactScript = htmlContent.includes('react') || htmlContent.includes('React');
  const hasReactDOMScript = htmlContent.includes('react-dom') || htmlContent.includes('ReactDOM');
  const hasBabelScript = htmlContent.includes('babel') || htmlContent.includes('Babel');
  checks.hasReactScripts = hasReactScript && hasReactDOMScript && hasBabelScript;

  if (!checks.hasReactScripts) {
    warnings.push('Preview may be missing React/ReactDOM/Babel scripts');
  }

  // Check 3: Has root element
  const hasRootDiv = htmlContent.includes('id="root"') || htmlContent.includes("id='root'");
  checks.hasRootElement = hasRootDiv;

  if (!checks.hasRootElement) {
    return {
      valid: false,
      error: 'Preview HTML missing root element (div with id="root")',
      checks,
      warnings,
    };
  }

  // Check 4: Has App component reference
  const hasAppReference = htmlContent.includes('App') || 
                          htmlContent.includes('React.createElement(App)') ||
                          htmlContent.includes('root.render') ||
                          htmlContent.includes('createRoot');
  checks.hasAppComponent = hasAppReference;

  if (!checks.hasAppComponent) {
    warnings.push('Preview may be missing App component rendering logic');
  }

  // Check 5: Has valid script structure
  const hasScriptTag = htmlContent.includes('<script') || htmlContent.includes('<SCRIPT');
  const scriptCount = (htmlContent.match(/<script/gi) || []).length;
  checks.hasValidStructure = hasScriptTag && scriptCount >= 2; // At least React and Babel scripts

  if (!checks.hasValidStructure) {
    warnings.push('Preview may have insufficient script tags');
  }

  // Overall validation - must have HTML structure and root element
  const isValid = checks.hasHTMLStructure && checks.hasRootElement;

  return {
    valid: isValid,
    error: isValid ? undefined : 'Preview validation failed - missing critical elements',
    warnings: warnings.length > 0 ? warnings : undefined,
    checks,
  };
}

// Main preview generation function
function generatePreview(project: any): string {
  const { files } = project;

  // No files
  if (files.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      padding: 40px;
      background: #0a0a0a;
      color: #fff;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }
    h1 { color: #10b981; margin-bottom: 20px; }
    p { color: #9ca3af; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>No Files Found</h1>
    <p>This project doesn't have any files yet. Use the AI chat to generate code and create files for your portfolio app.</p>
    <p style="margin-top: 20px; color: #6b7280;">💡 Try asking: "Create a portfolio app with App.js"</p>
  </div>
</body>
</html>`;
  }

  // Separate files by type
  const htmlFiles = files.filter((f: any) => f.path.endsWith('.html'));
  const jsFiles = files.filter((f: any) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
  const cssFiles = files.filter((f: any) => f.path.endsWith('.css'));
  const mainFileForFallback = files.find((f: any) => f.isMain) || files[0];

  // Check if HTML is complete React app
  const hasCompleteReactHTML = htmlFiles.length > 0 && htmlFiles.some((html: any) => isCompleteReactHTML(html.content));

  // Priority: JS files > complete HTML > basic HTML > CSS only > fallback
  if (jsFiles.length > 0) {
    // Build React app from JS files
    const rawCssContent = cssFiles.map((f: any) => f.content).join('\n\n');
    const { processed: cssContent, usesTailwind: cssUsesTailwind } = processTailwindCSS(rawCssContent);

    // Find App file
    const appFile = findAppFile(jsFiles);
    const indexFile = jsFiles.find(
      (f: any) => f.path.includes('index') || (f.isMain && !appFile)
    ) || jsFiles.find((f: any) => f.name.toLowerCase().includes('index'));

    // Get component files (exclude App and index)
    const componentFiles = jsFiles.filter((f: any) => {
      if (f.id === indexFile?.id || f.id === appFile?.id) return false;
      // Exclude duplicate App files
      if (appFile && (f.path.includes('App') || f.name.includes('App'))) {
        const appPath = appFile.path.toLowerCase();
        const filePath = f.path.toLowerCase();
        if (appPath.includes('app.js') && filePath.includes('app.jsx')) return false;
        if (appPath.includes('app.jsx') && filePath.includes('app.js')) return false;
      }
      return true;
    });

    // Process files
    let combinedJs = '';
    let usesReactRouter = false;
    
    // Add component files first
    const componentResult = processComponentFiles(componentFiles as any[], appFile);
    combinedJs += componentResult.processed;
    usesReactRouter = usesReactRouter || componentResult.usesRouter;

    // Add App file
    if (appFile) {
      const appResult = processAppFile(appFile as any, componentFiles as any[]);
      combinedJs += appResult.processed;
      usesReactRouter = usesReactRouter || appResult.usesRouter;
    } else if (jsFiles.length > 0) {
      // No App file, use first component as App
      const firstFile = jsFiles.find((f: any) => f.id !== indexFile?.id) || jsFiles[0];
      let firstContent = firstFile.content;
      firstContent = removeCommonJSExports(firstContent);
      firstContent = removeImports(firstContent);
      const { cleaned, componentName } = cleanExports(firstContent);
      const finalName = componentName || 'App';
      combinedJs += `\n// Using ${firstFile.path} as App\n${cleaned}\nconst App = ${finalName};\n`;
    }
    
    // Detect if JS code uses Tailwind classes
    const jsUsesTailwind = detectTailwindInJS(combinedJs);
    
    // Use Tailwind if either CSS or JS uses it
    const usesTailwind = cssUsesTailwind || jsUsesTailwind;

    // Generate HTML with React
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: http: blob:; connect-src 'self' https://cdn.tailwindcss.com https://picsum.photos https://images.unsplash.com https://via.placeholder.com https://i.pravatar.cc https://images.pexels.com;">
  <title>${project.title}</title>
  ${usesTailwind ? `
  <!-- Tailwind CSS Play CDN - Processes Tailwind directives in browser -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Configure Tailwind if needed
    tailwind.config = {
      theme: {
        extend: {},
      },
    };
  </script>
  ` : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      min-height: 100vh;
    }
    #root {
      min-height: 100vh;
    }
    ${cssContent}
  </style>
  ${usesReactRouter ? `
  <!-- React Router CDN -->
  <script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>
  ` : ''}
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } = React;
    
    // CRITICAL: Always create Link and NavLink stubs FIRST (before any components load)
    // This prevents "Link is not defined" errors in Navigation and other components
    if (typeof window.Link === 'undefined') {
      window.Link = function Link({ to, children, className, style, onClick, ...props }) {
        return React.createElement('a', { 
          href: to || '#', 
          className: className,
          style: style,
          onClick: (e) => {
            e.preventDefault();
            if (onClick) onClick(e);
          },
          ...props 
        }, children);
      };
      console.log('✅ Created stub Link component (always available)');
    }
    
    if (typeof window.NavLink === 'undefined') {
      window.NavLink = function NavLink({ to, children, className, style, onClick, ...props }) {
        return React.createElement('a', { 
          href: to || '#', 
          className: className,
          style: style,
          onClick: (e) => {
            e.preventDefault();
            if (onClick) onClick(e);
          },
          ...props 
        }, children);
      };
      console.log('✅ Created stub NavLink component (always available)');
    }
    
    ${usesReactRouter ? `
    // React Router components - try to use real ones, fallback to stubs
    const ReactRouterDOM = window.ReactRouterDOM || {};
    const { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } = ReactRouterDOM;
    
    // Use real Link/NavLink if React Router CDN loaded, otherwise keep stubs
    if (ReactRouterDOM.Link) {
      window.Link = ReactRouterDOM.Link;
      console.log('✅ Using real React Router Link component');
    }
    if (ReactRouterDOM.NavLink) {
      window.NavLink = ReactRouterDOM.NavLink;
      console.log('✅ Using real React Router NavLink component');
    }
    
    // Make other router components available globally
    if (ReactRouterDOM.BrowserRouter) window.BrowserRouter = ReactRouterDOM.BrowserRouter;
    if (ReactRouterDOM.Routes) window.Routes = ReactRouterDOM.Routes;
    if (ReactRouterDOM.Route) window.Route = ReactRouterDOM.Route;
    ` : ''}
    
    // Prevent CommonJS module errors in browser
    if (typeof module === 'undefined') {
      window.module = { exports: {} };
    }
    if (typeof exports === 'undefined') {
      window.exports = {};
    }
    
    console.log('Starting preview render...');
    ${usesReactRouter ? `console.log('React Router detected - components should render without routing');` : ''}
    console.log('Combined JS length:', ${combinedJs.length});
    
    try {
      // Load all components first
      ${combinedJs}
      
      // Log what was loaded
      console.log('📦 Components loaded. Checking availability...');
      
      // Log all available components after loading
      const allComponents = Object.keys(window).filter(k => 
        typeof window[k] === 'function' && 
        k[0] === k[0].toUpperCase() && 
        !k.startsWith('_') &&
        !['React', 'ReactDOM', 'Babel', 'BrowserRouter', 'Routes', 'Route', 'Link', 'NavLink'].includes(k)
      );
      console.log('📦 Available components after loading:', allComponents);
      
      // Check for common component names that might be defined but not on window
      const commonComponentNames = ['Navbar', 'Navigation', 'Home', 'About', 'Contact', 'Footer', 'Header', 'Pricing', 'Gallery'];
      commonComponentNames.forEach(name => {
        try {
          if (typeof eval(name) === 'function' && !window[name]) {
            window[name] = eval(name);
            console.log('✅ Found', name, 'in scope and added to window');
          }
        } catch (e) {
          // Component not in scope, that's okay
        }
      });
      
      // Ensure App is defined
      if (typeof App === 'undefined') {
        console.warn('⚠️ App component not found, searching for alternatives...');
        console.log('Available components:', allComponents);
        
        const appComponent = allComponents.find(c => c.toLowerCase() === 'app') || allComponents[0];
        if (appComponent) {
          console.log('✅ Using', appComponent, 'as App');
          window.App = window[appComponent];
        } else {
          console.error('❌ No App component found! Available:', allComponents);
          // Create a simple fallback App
          window.App = function App() {
            return React.createElement('div', { style: { padding: '40px', textAlign: 'center' } },
              React.createElement('h1', null, 'Preview'),
              React.createElement('p', null, 'App component not found. Available components: ' + allComponents.join(', ')),
              React.createElement('p', { style: { marginTop: '20px', fontSize: '12px', color: '#666' } }, 
                'Check browser console for details.'
              )
            );
          };
        }
      }
      
      console.log('✅ App component found:', typeof App);
      if (App && App.toString) {
        console.log('App function preview:', App.toString().substring(0, 300));
      }
      
      // Check if root element exists
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        throw new Error('Root element not found!');
      }
      console.log('✅ Root element found');
      
      // Render App with error boundary
      console.log('🎨 Rendering App...');
      try {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
        console.log('✅ Preview render completed successfully');
        
        // Double-check if something was rendered
        setTimeout(() => {
          const rootContent = document.getElementById('root')?.innerHTML;
          if (!rootContent || rootContent.trim().length === 0) {
            console.error('⚠️ Root is still empty after render!');
            console.log('Root element:', document.getElementById('root'));
            // Try rendering a simple fallback
            rootElement.innerHTML = '<div style="padding: 40px; text-align: center;"><h1>Preview</h1><p>Content is loading...</p><p style="font-size: 12px; color: #666;">Check console for errors</p></div>';
          } else {
            console.log('✅ Content rendered, length:', rootContent.length);
          }
        }, 1000);
      } catch (renderError) {
        console.error('❌ Error during render:', renderError);
        rootElement.innerHTML = '<div style="padding: 20px; color: #ef4444;"><h2>Render Error</h2><p>' + renderError.message + '</p><pre style="font-size: 12px; margin-top: 10px;">' + renderError.stack + '</pre></div>';
        throw renderError;
      }
    } catch (error) {
      console.error('Error rendering app:', error);
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = \`
          <div style="padding: 20px; color: #ef4444; font-family: monospace; background: #1a1a1a; border-radius: 8px; margin: 20px;">
            <h2 style="margin-bottom: 10px;">Preview Error</h2>
            <p><strong>Error:</strong> \${error.message}</p>
            <details style="margin-top: 10px;">
              <summary style="cursor: pointer; color: #60a5fa;">Stack Trace</summary>
              <pre style="background: #0a0a0a; padding: 10px; margin-top: 10px; border-radius: 4px; overflow-x: auto; color: #fff; font-size: 12px;">\${error.stack}</pre>
            </details>
          </div>
        \`;
      }
    }
  </script>
</body>
</html>`;
  } else if (htmlFiles.length > 0 && hasCompleteReactHTML) {
    // Complete React HTML file
    return htmlFiles[0].content;
  } else if (htmlFiles.length > 0) {
    // Basic HTML file
    return htmlFiles[0].content;
  } else if (cssFiles.length > 0) {
    // CSS only
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  <style>${cssFiles.map((f: any) => f.content).join('\n\n')}</style>
</head>
<body>
  <div style="padding: 20px;">
    <h1>${project.title}</h1>
    <p>CSS Preview - Add HTML/React content to see styles applied</p>
  </div>
</body>
</html>`;
  } else if (mainFileForFallback) {
    // Fallback: show file content
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
</head>
<body>
  <pre style="padding: 20px; white-space: pre-wrap; font-family: monospace;">${mainFileForFallback.content}</pre>
</body>
</html>`;
  } else {
    // No files
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
</head>
<body>
  <div style="padding: 20px;">
    <h1>${project.title}</h1>
    <p>No files found. Create some files to see the preview.</p>
  </div>
</body>
</html>`;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Generate preview based on project type
    let htmlContent = '';
    let hasError = false;
    let errorMessage = '';

    if (project.type === 'web' || project.type === 'fullstack') {
      try {
        console.log(`Generating preview for project ${project.id} (${project.type})`);
        console.log(`Project has ${project.files?.length || 0} files`);
        htmlContent = generatePreview(project);
        
        if (!htmlContent || htmlContent.trim().length === 0) {
          throw new Error('Generated preview HTML is empty');
        }

        // Sandbox validation: Validate preview (non-blocking - logs warnings but doesn't fail)
        console.log('🔍 Sandbox validation: Validating preview structure...');
        const sandboxValidation = validatePreviewSandbox(htmlContent, project);
        
        if (!sandboxValidation.valid) {
          console.warn('⚠️ Sandbox validation failed:', sandboxValidation.error);
          console.warn('Validation checks:', sandboxValidation.checks);
          // Don't throw error - still return preview, but log the issue
          // This allows preview to be shown even if validation fails (graceful degradation)
        } else {
          console.log('✅ Sandbox validation passed:', {
            checks: sandboxValidation.checks,
            htmlLength: htmlContent.length,
          });
        }

        if (sandboxValidation.warnings && sandboxValidation.warnings.length > 0) {
          console.warn('⚠️ Sandbox validation warnings:', sandboxValidation.warnings);
        }
        
        console.log(`Preview generated successfully, length: ${htmlContent.length}`);
      } catch (error: any) {
        hasError = true;
        errorMessage = error?.message || 'Failed to generate preview';
        console.error('Error generating preview:', error);
        console.error('Error stack:', error?.stack);
        
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      padding: 40px;
      background: #0a0a0a;
      color: #fff;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    h2 { color: #ef4444; margin-bottom: 20px; }
    p { color: #9ca3af; line-height: 1.6; }
    code {
      background: #1a1a1a;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #60a5fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Preview Generation Error</h2>
    <p><strong>Error:</strong> <code>${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></p>
    <p style="margin-top: 20px; color: #6b7280;">Please check the console for more details or try refreshing the preview.</p>
  </div>
</body>
</html>`;
      }
    } else {
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
</head>
<body>
  <div style="padding: 20px;">
    <h1>${project.title}</h1>
    <p>Preview not yet implemented for ${project.type} projects</p>
  </div>
</body>
</html>`;
    }

    // Save execution log
    try {
      await prisma.appExecution.create({
        data: {
          projectId: id,
          status: hasError ? 'error' : 'success',
          output: htmlContent,
          error: hasError ? errorMessage : null,
        },
      });
    } catch (execError) {
      console.error('Error saving execution:', execError);
    }

    return NextResponse.json({
      status: 'success',
      output: htmlContent,
      error: hasError ? errorMessage : null,
      type: 'html',
    });
  } catch (error: any) {
    // Extract meaningful error message with proper serialization
    let errorMessage = 'Failed to generate preview';
    let errorDetails: Record<string, string> = {
      errorType: typeof error === 'object' && error !== null ? error.constructor?.name || 'Object' : typeof error,
      timestamp: new Date().toISOString(),
    };
    
    if (error?.message) {
      errorMessage = error.message;
      errorDetails.errorMessage = String(error.message);
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorDetails.errorMessage = error;
    } else if (error?.toString) {
      errorMessage = error.toString();
      errorDetails.errorMessage = error.toString();
    }
    
    if (error?.stack) {
      errorDetails.errorStack = String(error.stack).substring(0, 500);
    }
    
    // Try to serialize error object
    try {
      const errorStr = JSON.stringify(error, (key, value) => {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'symbol') return '[Symbol]';
        return value;
      });
      if (errorStr !== '{}') {
        errorDetails.errorObject = errorStr.substring(0, 1000);
      }
    } catch (serializeError) {
      errorDetails.serializationError = String(serializeError);
    }
    
    console.error('Preview API error:', JSON.stringify(errorDetails, null, 2));
    console.error('Raw error:', error);

    // Save error execution log
    try {
      const { id } = await params;
      await prisma.appExecution.create({
        data: {
          projectId: id,
          status: 'error',
          output: null,
          error: errorMessage,
        },
      }).catch((execError) => {
        console.error('Error saving execution error:', execError);
      });
    } catch (execError) {
      console.error('Error saving execution error:', execError);
    }

    // Always return a proper JSON error response with detailed error info
    return NextResponse.json(
      {
        status: 'error',
        output: null,
        error: errorMessage,
        errorDetails: errorDetails,
        type: 'error',
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
