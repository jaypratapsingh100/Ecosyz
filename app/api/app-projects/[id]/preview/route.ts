import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { DEFAULT_APP_CONTENT } from '@/app/lib/app-builder/scaffolds';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await ensureUserInDb(user);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;

    // Verify project ownership and load files
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: {
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Treat as React if framework is 'react' OR we have App.jsx (e.g. from extract)
    const hasAppJsx = project.files?.some((f: { path: string }) =>
      f.path === 'src/App.jsx' || f.path === 'src/App.tsx' || f.path.includes('App.jsx')
    );
    const isReactProject = project.framework === 'react' || hasAppJsx;

    // Find main HTML file or index.html
    type FileLike = { path: string; name: string; content: string; isMain?: boolean };
    let htmlFile: FileLike | undefined = project.files.find(
      (f: FileLike) =>
        f.path === 'index.html' || f.name === 'index.html' || (f.path.endsWith('.html') && f.isMain)
    ) as FileLike | undefined;

    // If no HTML file exists, generate one for React projects
    if (!htmlFile && isReactProject) {
      const projectTitle = project.title || 'React App';
      htmlFile = {
        path: 'index.html',
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectTitle}</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
        isMain: false,
      };
    }

    if (!htmlFile) {
      return NextResponse.json(
        { error: 'No HTML file found in project' },
        { status: 400 }
      );
    }

    // Build HTML starting from main HTML file
    let html = htmlFile.content;

    // Strip Vite/npm module script tags - they won't work in iframe (no server to serve /src/main.jsx)
    // Preview injects React + App directly for sandbox rendering
    html = html.replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*src=["']\/src\/[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');

    // Inject CSS files for all project types
    const cssFiles = project.files.filter(
      (f: { language: string | null; path: string }) =>
        f.language === 'css' || f.path.endsWith('.css')
    );
    // Remove link tags to CSS files we're inlining so the iframe doesn't request them (404)
    for (const cssFile of cssFiles) {
      const name = cssFile.path.split('/').pop() || cssFile.path;
      html = html.replace(
        new RegExp(`<link[^>]*href=["']([^"']*${name.replace('.', '\\.')})["'][^>]*>`, 'gi'),
        ''
      );
    }
    for (const cssFile of cssFiles) {
      const cssTag = `<style>${cssFile.content}</style>`;
      // Insert before closing head tag or at the beginning
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${cssTag}\n</head>`);
      } else {
        html = cssTag + html;
      }
    }

    // Handle JS/JSX file injection
    if (isReactProject) {
      // For React projects: inject src/App.jsx if it exists separately
      // Check if index.html already contains a complete React app (has both React libs AND component code)
      const hasReactLibs = html.includes('react@18') || html.includes('react.development.js') || html.includes('react/umd');
      const hasComponentCode = html.includes('React.createElement') || 
                               html.includes('createRoot') || 
                               html.includes('ReactDOM.render') ||
                               (html.includes('type="text/babel"') && html.includes('function App'));
      
      // If index.html has React libs but missing component code, or has src/App.jsx file, inject it
      const mainJsFile = project.files.find(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' || f.language === 'tsx' || f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) &&
          f.isMain &&
          f.path !== 'index.html' &&
          (f.path === 'src/App.jsx' || f.path === 'src/App.tsx' || f.path.includes('App.jsx') || f.path.includes('App.tsx'))
      );
      // Inject src/App.jsx and its component dependencies
      if (mainJsFile && !html.includes(mainJsFile.content) && (!hasComponentCode || !hasReactLibs)) {
        // Component files (ToDoList, ToDoForm, etc.) - inject before App so they're in scope
        const componentFiles = project.files.filter(
          (f: { path: string; language: string | null }) =>
            (f.language === 'jsx' || f.language === 'tsx' || f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) &&
            f.path !== mainJsFile.path &&
            !f.path.match(/^src\/main\.(jsx|tsx)$/) && // Exclude entry - we inject App directly
            (f.path.includes('components/') || f.path.startsWith('src/'))
        );
        const stripForBrowser = (code: string) => {
          let c = (code || '')
            .replace(/export\s+default\s+/g, '')
            .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, '') // Remove imports
            .replace(/<\/script>/gi, '<\\/script>')
            .replace(/\$\{/g, '\\${'); // Escape template literals
          if ((c.includes('useState(') || c.includes('useEffect(')) && !c.includes('React.useState') && !c.includes('const { useState')) {
            c = 'const { useState, useEffect, useCallback, useMemo } = React;\n' + c;
          }
          return c.trim();
        };
        // Sort: dependencies first (TodoItem before TodoList, etc.)
        const sortedComponents = [...componentFiles].sort((a, b) => {
          const aContent = (a.content || '');
          const bName = (b.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          if (aContent.includes(bName) || aContent.includes(`/${bName}'`) || aContent.includes(`/${bName}"`)) return 1;
          const bContent = (b.content || '');
          const aName = (a.path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          if (bContent.includes(aName) || bContent.includes(`/${aName}'`) || bContent.includes(`/${aName}"`)) return -1;
          return (a.path || '').localeCompare(b.path || '');
        });
        const componentScripts = sortedComponents.map((f: { path: string; content: string }) => {
          const c = stripForBrowser(f.content);
          return `<script type="text/babel">\n${c}\n</script>`;
        }).join('\n');

        // Ensure React, ReactDOM, and Babel are loaded
        const reactScripts = `
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
        
        // Add React scripts if not present
        if (!hasReactLibs) {
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${reactScripts}\n</head>`);
          } else if (html.includes('<body>')) {
            html = html.replace('<body>', `<head>${reactScripts}</head>\n<body>`);
          } else {
            html = reactScripts + '\n' + html;
          }
        }
        
        // Ensure root div exists
        if (!html.includes('<div id="root">') && !html.includes('<div id=\'root\'>')) {
          if (html.includes('</body>')) {
            html = html.replace('</body>', '  <div id="root"></div>\n</body>');
          } else {
            html = html + '\n<div id="root"></div>';
          }
        }
        
        // Inject the App.jsx component with proper React rendering
        let appContent = mainJsFile.content
          .replace(/export\s+default\s+/g, '')
          .replace(/import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?\s*/g, ''); // Remove imports (components injected above)
        appContent = appContent.trim();

        // Only replace for severe corruption: gradient/style string broken by JSX (e.g. "100% <App />")
        // Narrow check to avoid swapping valid user code with scaffold
        const hasSevereCorruption = /background:\s*['"][^'"]*\d+%[\s]*<\s*[A-Z][a-zA-Z0-9]*/.test(appContent);
        if (hasSevereCorruption) {
          appContent = DEFAULT_APP_CONTENT.replace(/export\s+default\s+\w+\s*;?/g, '').trim();
        }

        // CRITICAL: Escape </script> so HTML parser doesn't close script tag early
        appContent = appContent.replace(/<\/script>/gi, '<\\/script>');
        // Escape template literals so ${} in source isn't interpreted when we build the HTML
        appContent = appContent.replace(/\$\{/g, '\\${');
        
        // Use array join to avoid ${} in appContent being interpreted as template literal
        const appComponentScript = [
          '  <script type="text/babel">',
          '    const { createRoot } = ReactDOM;',
          appContent,
          '    const root = createRoot(document.getElementById("root"));',
          '    root.render(React.createElement(App));',
          '  </script>',
        ].join('\n');
        
        const scriptsToInject = componentScripts
          ? `${componentScripts}\n${appComponentScript}`
          : appComponentScript;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptsToInject}\n</body>`);
        } else {
          html = html + scriptsToInject;
        }
      }
    } else {
      // For non-React projects, inject JS/JSX files
      const jsFiles = project.files.filter(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' ||
            f.language === 'javascript' ||
            f.path.endsWith('.js') ||
            f.path.endsWith('.jsx')) &&
          !f.isMain
      );
      for (const jsFile of jsFiles) {
        const safeContent = (jsFile.content || '').replace(/<\/script>/gi, '<\\/script>');
        const scriptTag = `<script type="text/babel">${safeContent}</script>`;
        // Insert before closing body tag
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      }

      // Inject main JSX file if it exists and hasn't been injected yet
      const mainJsFile = project.files.find(
        (f: {
          language: string | null;
          path: string;
          isMain: boolean;
        }) =>
          (f.language === 'jsx' || f.path.endsWith('.jsx')) &&
          f.isMain &&
          f.path !== 'index.html'
      );
      if (mainJsFile && !html.includes(mainJsFile.content)) {
        const safeContent = (mainJsFile.content || '').replace(/<\/script>/gi, '<\\/script>');
        const scriptTag = `<script type="text/babel">${safeContent}</script>`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          html = html + scriptTag;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: 'success',
      output: html,
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
