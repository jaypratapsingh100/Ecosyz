import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';

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

  // Priority: 1) isMain + .js, 2) .js, 3) isMain, 4) first match
  return (
    appFileCandidates.find((f) => f.isMain && (f.name === 'App.js' || f.path.includes('App.js'))) ||
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
function processComponentFiles(componentFiles: any[], appFile: any): string {
  let combinedJs = '';

  componentFiles.forEach((file) => {
    let fileContent = file.content;

    // Remove imports
    fileContent = removeImports(fileContent);

    // Clean exports
    const { cleaned } = cleanExports(fileContent);
    fileContent = cleaned;

    combinedJs += `\n// ${file.path}\n${fileContent}\n`;
  });

  return combinedJs;
}

// Helper function to process App file
function processAppFile(appFile: any, componentFiles: any[]): string {
  let appContent = appFile.content;
  const originalContent = appContent;

  // Check for React Router
  const usesRouter =
    appContent.includes('react-router-dom') ||
    appContent.includes('BrowserRouter') ||
    appContent.includes('Routes') ||
    appContent.includes('Route');

  // If using React Router, extract route components
  if (usesRouter) {
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
    const routeComponents = Array.from(routeComponentsSet);

    const navigationFile = componentFiles.find(
      (f) => f.name === 'Navigation.js' || f.name === 'Navigation.jsx' || f.path.includes('Navigation')
    );
    const hasNavigationInJSX = appContent.includes('<Navigation') || appContent.includes('Navigation />');

    const allComponents: string[] = [];
    if (navigationFile && !routeComponents.includes('Navigation')) {
      allComponents.push('Navigation');
    } else if (hasNavigationInJSX && !routeComponents.includes('Navigation')) {
      allComponents.push('Navigation');
    }
    routeComponents.forEach((comp) => {
      if (!allComponents.includes(comp)) {
        allComponents.push(comp);
      }
    });

    if (allComponents.length > 0) {
      appContent = `function App() {
  return (
    <div style="min-height: 100vh;">
      ${allComponents.map((c) => `<${c} />`).join('\n      ')}
    </div>
  );
}`;
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

  // Remove imports
  appContent = removeImports(appContent);

  // Clean exports and ensure App is defined
  const { cleaned, componentName } = cleanExports(appContent);
  appContent = cleaned;

  // Ensure App is defined
  let appDefinition = '';
  if (appContent.match(/(?:function|const)\s+App\s*[=(]/)) {
    // App is already defined
    appDefinition = appContent;
  } else if (componentName) {
    // Component has a name, use it
    appDefinition = `${appContent}\nconst App = ${componentName};`;
  } else {
    // Last resort: wrap as AppComponent
    appDefinition = `const AppComponent = ${appContent.trim()};\nconst App = AppComponent;`;
  }

  return `\n// ${appFile.path} - App component\n${appDefinition}\n`;
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
    const cssContent = cssFiles.map((f: any) => f.content).join('\n\n');

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
    
    // Add component files first
    combinedJs += processComponentFiles(componentFiles as any[], appFile);

    // Add App file
    if (appFile) {
      combinedJs += processAppFile(appFile as any, componentFiles as any[]);
    } else if (jsFiles.length > 0) {
      // No App file, use first component as App
      const firstFile = jsFiles.find((f: any) => f.id !== indexFile?.id) || jsFiles[0];
      let firstContent = firstFile.content;
      firstContent = removeImports(firstContent);
      const { cleaned, componentName } = cleanExports(firstContent);
      const finalName = componentName || 'App';
      combinedJs += `\n// Using ${firstFile.path} as App\n${cleaned}\nconst App = ${finalName};\n`;
    }

    // Generate HTML with React
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline';">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } = React;
    
    console.log('Starting preview render...');
    
    try {
      ${combinedJs}
      
      // Ensure App is defined
      if (typeof App === 'undefined') {
        console.warn('App component not found, searching for alternatives...');
        const available = Object.keys(window).filter(k => 
          typeof window[k] === 'function' && 
          k[0] === k[0].toUpperCase() && 
          !k.startsWith('_') &&
          !['React', 'ReactDOM', 'Babel'].includes(k)
        );
        console.log('Available components:', available);
        
        const appComponent = available.find(c => c.toLowerCase() === 'app') || available[0];
        if (appComponent) {
          console.log('Using', appComponent, 'as App');
          window.App = window[appComponent];
        } else {
          throw new Error('No App component found and no alternative components available.');
        }
      }
      
      // Render App
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
      console.log('Preview render completed successfully');
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
        htmlContent = generatePreview(project);
      } catch (error: any) {
        hasError = true;
        errorMessage = error?.message || 'Failed to generate preview';
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
</head>
<body>
  <div style="padding: 20px; color: #ef4444;">
    <h2>Preview Generation Error</h2>
    <p>${errorMessage}</p>
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
    console.error('Preview API error:', error);

    // Save error execution log
    try {
      const { id } = await params;
      await prisma.appExecution.create({
        data: {
          projectId: id,
          status: 'error',
          output: null,
          error: error?.message || 'Unknown error',
        },
      });
    } catch (execError) {
      console.error('Error saving execution error:', execError);
    }

    return NextResponse.json(
      {
        status: 'error',
        output: null,
        error: error?.message || 'Failed to generate preview',
      },
      { status: 500 }
    );
  }
}
