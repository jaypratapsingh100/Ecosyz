import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { validateProjectFiles } from '../../../../../src/lib/utils/validateJSX';

// Simplified preview generation - focuses on reliability over complex transformations
// Original complex version backed up to route-backup-full.ts

function cleanJSXCode(code: string): string {
  // Remove CSS imports (not needed in browser)
  code = code.replace(/import\s+['"].*?\.css['"];?\s*/g, '');
  
  // Remove React/ReactDOM imports (CDN handles these)
  code = code.replace(/import\s+React\s*,?\s*\{[^}]*\}\s*from\s+['"]react['"];?\s*/g, '');
  code = code.replace(/import\s+React\s+from\s+['"]react['"];?\s*/g, '');
  code = code.replace(/import\s+\{[^}]*\}\s*from\s+['"]react['"];?\s*/g, '');
  code = code.replace(/import\s+.*?from\s+['"]react-dom.*?['"];?\s*/g, '');
  
  // Remove local component imports (components are loaded globally)
  code = code.replace(/import\s+.*?from\s+['"]\.\/.+?['"];?\s*/g, '');
  code = code.replace(/import\s+.*?from\s+['"]\.\.?\/.+?['"];?\s*/g, '');
  
  // CRITICAL: Remove ReactDOM.createRoot calls and root.render calls from user code
  // These are handled by the preview generation code to avoid duplicate declarations
  // Match multiline patterns too (with optional whitespace/newlines)
  code = code.replace(/const\s+root\s*=\s*ReactDOM\.createRoot\s*\([^)]*\)\s*;?\s*/g, '');
  code = code.replace(/let\s+root\s*=\s*ReactDOM\.createRoot\s*\([^)]*\)\s*;?\s*/g, '');
  code = code.replace(/var\s+root\s*=\s*ReactDOM\.createRoot\s*\([^)]*\)\s*;?\s*/g, '');
  
  // Remove root.render() calls (multiline support)
  code = code.replace(/root\s*\.\s*render\s*\([^)]*\)\s*;?\s*/g, '');
  
  // Remove any standalone root variable declarations (more aggressive)
  // Match: const root = ... or let root = ... or var root = ...
  // This catches cases like: const root = ...; or const root = ...\n
  code = code.replace(/(?:^|\n|\r)\s*(const|let|var)\s+root\s*=\s*[^;\n\r]+;?\s*(?:\n|\r|$)/gm, '');
  
  // Also remove root declarations that might be on the same line as other code
  // But be careful - only remove if it's clearly a ReactDOM.createRoot pattern
  code = code.replace(/\broot\s*=\s*ReactDOM\.createRoot\s*\([^)]*\)\s*;?\s*/g, '');
  
  // Remove tailwind.config references from user code (handled by preview generation)
  // This prevents "tailwind is not defined" errors when Tailwind CDN isn't loaded
  code = code.replace(/tailwind\s*\.\s*config\s*=\s*\{[^}]*\}\s*;?\s*/g, '');
  code = code.replace(/if\s*\(\s*typeof\s+tailwind\s*!==\s*['"]undefined['"]\s*\)\s*\{[^}]*tailwind\s*\.\s*config[^}]*\}\s*;?\s*/g, '');
  
  // Handle exports more carefully
  // For "export default function Component() {...}", keep the function
  code = code.replace(/export\s+default\s+function\s+/g, 'function ');
  code = code.replace(/export\s+default\s+const\s+/g, 'const ');
  
  // For "export default Component;" at the end, just remove it
  code = code.replace(/\nexport\s+default\s+\w+\s*;?\s*$/g, '');
  
  // Remove named exports
  code = code.replace(/export\s+\{[^}]+\}\s*;?\s*/g, '');

  // Remove Next.js metadata exports (not valid in inline Babel)
  code = code.replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\}\s*;?\s*/g, '');
  
  // Remove CommonJS exports
  code = code.replace(/module\.exports\s*=\s*[^;]+;?\s*/g, '');
  code = code.replace(/exports\.\w+\s*=\s*[^;]+;?\s*/g, '');
  
  return code.trim();
}

// Helper function to detect if JSX code uses Tailwind classes
function detectTailwindInJS(jsContent: string): boolean {
  // Check for common Tailwind class patterns in className attributes
  const tailwindPattern = /className=["'][^"']*\b(bg-|text-|p-|m-|flex|grid|rounded|shadow|hover:|focus:|transition|duration|ease|backdrop-blur|w-|h-|max-w|min-h|border|gap-|space-|items-|justify-|container|mx-auto|px-|py-|mt-|mb-|ml-|mr-)/;
  return tailwindPattern.test(jsContent);
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
  processed = processed.replace(/@tailwind\s+(base|components|utilities);?\s*/g, '');
  
  // Keep @apply directives - Tailwind Play CDN can process them in <style> tags
  
  return { processed, usesTailwind: true };
}

function generateSimplePreview(project: any): string {
  const { files } = project;

  if (!files || files.length === 0) {
    return generateEmptyPreview(project.title);
  }

  // Separate files by type
  const jsxFiles = files.filter((f: any) => 
    f.path.endsWith('.jsx') || f.path.endsWith('.js') || 
    f.path.endsWith('.tsx') || f.path.endsWith('.ts')
  );
  const cssFiles = files.filter((f: any) => f.path.endsWith('.css'));
  const htmlFile = files.find((f: any) => f.path.endsWith('index.html') || f.name === 'index.html');

  // If we have a static HTML entry, render that (HTML/Vue/Vanilla)
  if (htmlFile) {
    const rawCssContent = cssFiles.map((f: any) => f.content).join('\n\n');
    const jsFiles = files.filter((f: any) => f.path.endsWith('.js') && !f.path.endsWith('.jsx'));
    const rawJsContent = jsFiles.map((f: any) => f.content).join('\n\n');

    let html = htmlFile.content || '';
    // Strip local asset links that won't resolve in preview iframe
    html = html.replace(/<link[^>]+href=["'][^"']+\.css["'][^>]*>\s*/gi, '');
    html = html.replace(/<script[^>]+src=["'][^"']+\.js["'][^>]*><\/script>\s*/gi, '');

    // Ensure Vue CDN is present when framework is vue
    if ((project.framework === 'vue' || /Vue\.createApp|createApp\(/.test(rawJsContent)) && !/vue\.global\.js/.test(html)) {
      html = html.replace(
        /<\/head>/i,
        `<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>\n</head>`
      );
    }

    if (rawCssContent.trim().length > 0) {
      html = html.replace(/<\/head>/i, `<style>\n${rawCssContent}\n</style>\n</head>`);
    }
    if (rawJsContent.trim().length > 0) {
      html = html.replace(/<\/body>/i, `<script>\n${rawJsContent}\n</script>\n</body>`);
    }

    return html.trim();
  }

  if (jsxFiles.length === 0) {
    return generateEmptyPreview(project.title);
  }

  // Exclude index.js/index.jsx files - they typically contain root setup code
  // and should not be included as components
  const componentJsxFiles = jsxFiles.filter((f: any) => 
    !f.path.match(/index\.(js|jsx|ts|tsx)$/i) && 
    !f.name.match(/^index\.(js|jsx|ts|tsx)$/i)
  );

  // Find App component (prefer files with isMain=true or named App)
  // Use componentJsxFiles first, but fallback to all jsxFiles if needed
  const appFile = componentJsxFiles.find((f: any) => f.isMain) ||
                  componentJsxFiles.find((f: any) => f.name.includes('App')) ||
                  componentJsxFiles[0] ||
                  jsxFiles.find((f: any) => f.isMain) ||
                  jsxFiles.find((f: any) => f.name.includes('App')) ||
                  jsxFiles[0];

  // Get all other component files (excluding index files and the app file)
  const componentFiles = componentJsxFiles.filter((f: any) => f.id !== appFile.id);

  // Combine CSS and check for Tailwind
  const rawCssContent = cssFiles.map((f: any) => f.content).join('\n\n');
  const { processed: combinedCSS, usesTailwind: cssUsesTailwind } = processTailwindCSS(rawCssContent);
  
  // Combine all JS code to detect Tailwind usage
  const allJsCode = [...componentFiles, appFile].map((f: any) => f.content).join('\n\n');
  const jsUsesTailwind = detectTailwindInJS(allJsCode);
  
  // Use Tailwind if either CSS or JS uses it
  const usesTailwind = cssUsesTailwind || jsUsesTailwind;

  // Process components: clean and make available globally
  let componentsJS = '';
  let appDefinedInComponents = false;
  componentFiles.forEach((file: any) => {
    let cleanCode = cleanJSXCode(file.content);
    
    // Double-check: Remove any remaining root declarations that might have been missed
    // This is a safety net to catch edge cases
    cleanCode = cleanCode.replace(/\b(const|let|var)\s+root\s*=\s*ReactDOM\.createRoot\s*\([^)]*\)\s*;?\s*/g, '');
    cleanCode = cleanCode.replace(/\broot\s*\.\s*render\s*\([^)]*\)\s*;?\s*/g, '');
    
    // Try to extract component name from code first, fallback to filename
    let componentName = file.name.replace(/\.(jsx?|tsx?)$/, '');
    const functionMatch = cleanCode.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/);
    if (functionMatch && functionMatch[1]) {
      componentName = functionMatch[1];
    }
    
    if (componentName === 'App') {
      appDefinedInComponents = true;
    }

    componentsJS += `
// Component: ${file.path}
${cleanCode}

// Make ${componentName} available globally
if (typeof ${componentName} !== 'undefined') {
  window.${componentName} = ${componentName};
  console.log('✅ Loaded component: ${componentName}');
} else {
  console.warn('⚠️ Component ${componentName} not found in ${file.path}');
}
`;
  });

  // Process App component
  let appCode = cleanJSXCode(appFile.content);
  
  // Double-check: Remove any remaining root declarations from App code
  appCode = appCode.replace(/\b(const|let|var)\s+root\s*=\s*ReactDOM\.createRoot\s*\([^)]*\)\s*;?\s*/g, '');
  appCode = appCode.replace(/\broot\s*\.\s*render\s*\([^)]*\)\s*;?\s*/g, '');
  
  // Ensure App component is properly defined
  // If the code doesn't define App but has a component, wrap it
  const hasAppDeclaration = /\bfunction\s+App\b|\bconst\s+App\b|\bclass\s+App\b/.test(appCode);
  if (!hasAppDeclaration && !appDefinedInComponents) {
    // Try to find any component definition
    const componentMatch = appCode.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/);
    if (componentMatch && componentMatch[1]) {
      const componentName = componentMatch[1];
      appCode += `\n\n// Alias to App for preview\nconst App = ${componentName};`;
      console.log(`Using ${componentName} as App component`);
    }
  }
  
  // Generate HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  ${usesTailwind ? `
  <!-- Tailwind CSS Play CDN - Processes Tailwind directives in browser -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Configure Tailwind if needed - only set if tailwind is available
    if (typeof tailwind !== 'undefined') {
      tailwind.config = {
        theme: {
          extend: {},
        },
      };
    }
  </script>
  ` : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    #root {
      min-height: 100vh;
      width: 100%;
    }
    
    ${combinedCSS}
  </style>
  
  <!-- React 18 from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    // Wrap in IIFE to scope variables and prevent conflicts
    (function() {
      'use strict';
      
      // React hooks
      const { useState, useEffect, useRef, useCallback, useMemo } = React;
      
      console.log('🚀 Starting preview render...');
      
      try {
        // Load all components first
        ${componentsJS}
        
        // Load App component
        ${appCode}
        
        // Ensure App is defined
        if (typeof App === 'undefined') {
          console.error('❌ App component not found');
          console.log('Available components:', Object.keys(window).filter(k => typeof window[k] === 'function' && k[0] === k[0].toUpperCase()));
          throw new Error('App component not found. Make sure your main component is named "App" or is marked as isMain.');
        }
        
        console.log('✅ App component loaded:', typeof App);
        
        // Render App - use a scoped variable name to avoid conflicts
        const rootElement = document.getElementById('root');
        if (!rootElement) {
          throw new Error('Root element not found');
        }
        
        // Clear any existing content
        rootElement.innerHTML = '';
        
        // Create root with unique variable name in this scope
        const previewRoot = ReactDOM.createRoot(rootElement);
        previewRoot.render(React.createElement(App));
        
        console.log('✅ Preview rendered successfully');
        
        // Verify render after a short delay
        setTimeout(() => {
          const rootContent = document.getElementById('root').innerHTML;
          if (!rootContent || rootContent.trim().length === 0) {
            console.warn('⚠️ Root element is empty after render - App may not have returned content');
          } else {
            console.log('✅ Content verified, length:', rootContent.length);
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Preview error:', error);
        
        // Show error in UI
        const rootEl = document.getElementById('root');
        if (rootEl) {
          rootEl.innerHTML = \`
            <div style="padding: 40px; font-family: monospace; background: #1a1a1a; color: #fff; min-height: 100vh;">
              <div style="max-width: 800px; margin: 0 auto;">
                <h1 style="color: #ef4444; margin-bottom: 20px;">⚠️ Preview Error</h1>
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin-bottom: 10px;"><strong>Error:</strong></p>
                  <pre style="color: #fbbf24; white-space: pre-wrap; word-break: break-word;">\${error.message}</pre>
                </div>
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px;">
                  <p style="margin-bottom: 10px;"><strong>Stack Trace:</strong></p>
                  <pre style="font-size: 12px; color: #9ca3af; white-space: pre-wrap; word-break: break-word;">\${error.stack || 'No stack trace available'}</pre>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #3730a3; border-radius: 8px;">
                  <p style="color: #a5b4fc; font-size: 14px;">
                    💡 <strong>Tips:</strong><br>
                    • Check the browser console (F12) for more details<br>
                    • Ensure your App component is properly defined<br>
                    • Verify all component names match their usage<br>
                    • Check for syntax errors in your JSX
                  </p>
                </div>
              </div>
            </div>
          \`;
        }
      }
    })();
  </script>
</body>
</html>`;
}

function generateEmptyPreview(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 600px;
      text-align: center;
      background: rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
    h1 { 
      font-size: 2.5rem;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    p { 
      font-size: 1.2rem;
      line-height: 1.6;
      opacity: 0.95;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>No Files Yet</h1>
    <p>This project doesn't have any files yet. Use the AI chat to generate code and create files for your app.</p>
    <p style="margin-top: 20px; font-size: 1rem; opacity: 0.8;">💡 Try asking: "Create a portfolio app"</p>
  </div>
</body>
</html>`;
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

    // Validate files before generating preview
    console.log(`📦 Validating ${project.files?.length || 0} files...`);
    const validation = validateProjectFiles(project.files || []);
    
    if (!validation.valid) {
      console.warn(`⚠️ Validation found ${validation.errors.length} errors`);
      validation.errors.forEach(err => console.warn(`  - ${err.message}`));
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ Validation found ${validation.warnings.length} warnings`);
      validation.warnings.forEach(warn => console.warn(`  - ${warn.message}`));
    }
    
    // Generate preview
    console.log(`📦 Generating preview for project ${project.id}`);
    
    let htmlContent = '';
    let hasError = false;
    let errorMessage = '';

    try {
      // If validation failed, show validation errors in preview
      if (!validation.valid) {
        const errorList = validation.errors.map(e => 
          `<li><strong>${e.type}:</strong> ${e.message}${e.suggestion ? `<br><em style="color: #60a5fa;">💡 ${e.suggestion}</em>` : ''}</li>`
        ).join('');
        
        throw new Error(`Validation failed with ${validation.errors.length} error(s):\n${errorList}`);
      }
      
      htmlContent = generateSimplePreview(project);
      console.log(`✅ Preview generated successfully (${htmlContent.length} bytes)`);
    } catch (error: any) {
      hasError = true;
      errorMessage = error?.message || 'Failed to generate preview';
      console.error('❌ Preview generation error:', error);
      
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
      max-width: 800px;
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

    const errorMessage = error?.message || 'Failed to generate preview';

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

    return NextResponse.json(
      {
        status: 'error',
        output: null,
        error: errorMessage,
        type: 'error',
      },
      { status: 500 }
    );
  }
}
