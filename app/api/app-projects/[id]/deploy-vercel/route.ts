import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { deployToVercel, getClaimableDeploymentUrl } from '@/lib/vercel';

// Helper function to remove CommonJS exports
function removeCommonJSExports(code: string): string {
  code = code.replace(/module\.exports\s*=\s*[^;]+;?\s*/g, '');
  code = code.replace(/exports\.\w+\s*=\s*[^;]+;?\s*/g, '');
  code = code.replace(/module\.exports\s*=\s*\{[\s\S]*?\};?\s*/g, '');
  code = code.replace(/exports\s*=\s*[^;]+;?\s*/g, '');
  code = code.replace(/module\.exports\s*[^;]*;?\s*/g, '');
  code = code.replace(/exports\s*[^;]*;?\s*/g, '');
  return code;
}

// Helper function to remove imports
function removeImports(code: string): string {
  code = code.replace(/import\s+['"].*?\.css['"];?\s*/g, '');
  code = code.replace(/import\s+.*?from\s+['"]react-router-dom['"];?\s*/g, '');
  code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
  code = code.replace(/import\s+React[^;]*;?\s*/g, '');
  return code;
}

// Helper function to process Tailwind CSS
function processTailwindCSS(cssContent: string): { processed: string; usesTailwind: boolean } {
  const hasTailwindDirectives = /@tailwind|@apply/.test(cssContent);
  const hasTailwindClasses = /\b(bg-|text-|p-|m-|flex|grid|rounded|shadow|hover:|focus:|transition|duration|ease|backdrop-blur|w-|h-|max-w|min-h|border|gap-|space-)/.test(cssContent);
  const usesTailwind = hasTailwindDirectives || hasTailwindClasses;
  
  if (!usesTailwind) {
    return { processed: cssContent, usesTailwind: false };
  }
  
  let processed = cssContent;
  processed = processed.replace(/@tailwind\s+(base|components|utilities);?\s*/g, '');
  return { processed, usesTailwind: true };
}

// Helper function to detect if JSX code uses Tailwind classes
function detectTailwindInJS(jsContent: string): boolean {
  const tailwindPattern = /className=["'][^"']*\b(bg-|text-|p-|m-|flex|grid|rounded|shadow|hover:|focus:|transition|duration|ease|backdrop-blur|w-|h-|max-w|min-h|border|gap-|space-)/;
  return tailwindPattern.test(jsContent);
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

// Helper function to build static files from project
function buildStaticFiles(files: any[]): Array<{ path: string; content: string }> {
  const staticFiles: Array<{ path: string; content: string }> = [];

  // Separate files by type
  const htmlFiles = files.filter((f) => f.path.endsWith('.html'));
  const jsFiles = files.filter((f) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
  const cssFiles = files.filter((f) => f.path.endsWith('.css'));

  // Build HTML file (index.html)
  let htmlContent = '';

  if (jsFiles.length > 0) {
    // Process CSS files
    const rawCssContent = cssFiles.map((f) => f.content).join('\n\n');
    const { processed: cssContent, usesTailwind: cssUsesTailwind } = processTailwindCSS(rawCssContent);
    
    // Combine JS files with proper processing
    let jsContent = '';
    let usesReactRouter = false;
    
    jsFiles.forEach((f) => {
      let content = f.content;
      
      // Check for React Router usage
      if (detectReactRouter(content)) {
        usesReactRouter = true;
        console.log(`🔍 File ${f.path} uses React Router`);
      }
      
      content = removeCommonJSExports(content);
      content = removeImports(content);
      // Clean exports
      content = content.replace(/export\s+default\s+/g, '');
      content = content.replace(/export\s+/g, '');
      jsContent += `// ${f.path}\n${content}\n\n`;
    });
    
    // Detect if JS uses Tailwind
    const jsUsesTailwind = detectTailwindInJS(jsContent);
    const usesTailwind = cssUsesTailwind || jsUsesTailwind;

    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  ${usesTailwind ? `
  <!-- Tailwind CSS Play CDN - Processes Tailwind directives in browser -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: http: blob:; connect-src 'self' https://cdn.tailwindcss.com https://picsum.photos https://images.unsplash.com https://via.placeholder.com https://i.pravatar.cc https://images.pexels.com;">
  ${usesReactRouter ? `
  <!-- React Router CDN -->
  <script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>
  ` : ''}
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
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
        const handleClick = (e) => {
          // Allow custom onClick handler first
          if (onClick) {
            onClick(e);
            // If preventDefault was called in custom handler, respect it
            if (e.defaultPrevented) return;
          }
          
          const href = to || '#';
          
          // Handle hash navigation (scroll to element)
          if (href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId) || document.querySelector(\`[name="\${targetId}"]\`);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
          }
          
          // Allow external links (http/https) to work normally
          if (href.startsWith('http://') || href.startsWith('https://')) {
            // Don't prevent default - let browser handle external links
            return;
          }
          
          // For same-page routes, prevent default but show visual feedback
          // In a static preview, we can't do real routing, but we can scroll to top
          if (href.startsWith('/')) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('ℹ️ Navigation to', href, 'would happen in a real app');
          }
        };
        
        return React.createElement('a', { 
          href: to || '#', 
          className: className,
          style: style,
          onClick: handleClick,
          ...props 
        }, children);
      };
      console.log('✅ Created stub Link component (always available)');
    }
    
    if (typeof window.NavLink === 'undefined') {
      window.NavLink = function NavLink({ to, children, className, style, onClick, activeClassName, ...props }) {
        const handleClick = (e) => {
          // Allow custom onClick handler first
          if (onClick) {
            onClick(e);
            if (e.defaultPrevented) return;
          }
          
          const href = to || '#';
          
          // Handle hash navigation (scroll to element)
          if (href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId) || document.querySelector(\`[name="\${targetId}"]\`);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
          }
          
          // Allow external links to work normally
          if (href.startsWith('http://') || href.startsWith('https://')) {
            return;
          }
          
          // For same-page routes, scroll to top
          if (href.startsWith('/')) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('ℹ️ Navigation to', href, 'would happen in a real app');
          }
        };
        
        // Determine if link is "active" based on current hash
        const isActive = typeof window !== 'undefined' && window.location.hash === (to || '#');
        const finalClassName = isActive && activeClassName 
          ? \`\${className || ''} \${activeClassName}\`.trim()
          : className;
        
        return React.createElement('a', { 
          href: to || '#', 
          className: finalClassName,
          style: style,
          onClick: handleClick,
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
    
    console.log('Starting deployment render...');
    console.log('Link available:', typeof window.Link !== 'undefined');
    console.log('NavLink available:', typeof window.NavLink !== 'undefined');
    ${usesReactRouter ? `console.log('React Router detected - components should render without routing');` : ''}
    
    ${jsContent}
    
    // Find App component
    const AppComponent = typeof App !== 'undefined' ? App : 
                        typeof AppComponent !== 'undefined' ? AppComponent :
                        Object.values(window).find(c => typeof c === 'function' && c.name === 'App');
    
    if (AppComponent) {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(AppComponent));
    } else {
      document.getElementById('root').innerHTML = '<div style="padding: 40px; text-align: center;"><h1>App Component Not Found</h1><p>Please ensure your main component is named "App"</p></div>';
    }
  </script>
</body>
</html>`;
  } else if (htmlFiles.length > 0) {
    // Use existing HTML file
    htmlContent = htmlFiles[0].content;
  } else {
    // Fallback HTML
    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
</head>
<body>
  <div style="padding: 40px; text-align: center;">
    <h1>No Files Found</h1>
    <p>This project doesn't have any files yet.</p>
  </div>
</body>
</html>`;
  }

  // Add index.html
  staticFiles.push({
    path: 'index.html',
    content: htmlContent,
  });

  // Add vercel.json to skip build for static sites
  staticFiles.push({
    path: 'vercel.json',
    content: JSON.stringify({
      buildCommand: null,
      outputDirectory: '.',
      framework: null,
      installCommand: null,
    }, null, 2),
  });

  // Add other static files (CSS, images, etc.)
  cssFiles.forEach((file) => {
    staticFiles.push({
      path: file.path,
      content: file.content,
    });
  });

  return staticFiles;
}

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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    if (project.files.length === 0) {
      return NextResponse.json(
        { error: 'Project has no files to deploy' },
        { status: 400 }
      );
    }

    // Check if Vercel is configured
    if (!process.env.VERCEL_API_TOKEN) {
      console.error('VERCEL_API_TOKEN is not configured');
      return NextResponse.json(
        {
          error: 'Deployment service not configured',
          message: 'VERCEL_API_TOKEN environment variable is not set. Please add it to your .env file or environment variables.',
          instructions: [
            '1. Get your Vercel API token from: https://vercel.com/account/tokens',
            '2. Add VERCEL_API_TOKEN to your .env file: VERCEL_API_TOKEN=your_token_here',
            '3. If deploying to production, add it to your hosting platform\'s environment variables',
            '4. Restart your development server after adding the token',
          ],
        },
        { status: 500 }
      );
    }

    // Build static files
    console.log(`Building static files for project ${project.id}...`);
    const staticFiles = buildStaticFiles(project.files);
    console.log(`Built ${staticFiles.length} static files`);

    // Validate files before deployment
    if (staticFiles.length === 0) {
      return NextResponse.json(
        {
          error: 'No files to deploy',
          message: 'The project has no deployable files. Please create some files first.',
        },
        { status: 400 }
      );
    }

    // Check if index.html exists
    const hasIndexHtml = staticFiles.some(f => f.path === 'index.html');
    if (!hasIndexHtml) {
      console.warn('Warning: No index.html found in static files');
    }

    // Deploy to Vercel
    console.log(`Deploying to Vercel with project name: app-${project.id.slice(0, 8)}`);
    const deployment = await deployToVercel({
      files: staticFiles,
      projectName: `app-${project.id.slice(0, 8)}`,
      framework: project.framework || undefined,
    });
    console.log('Deployment initiated:', deployment.deploymentId);

    // Generate claimable URL
    const claimUrl = getClaimableDeploymentUrl(deployment.deploymentId);

    // Update project with deployment info
    await prisma.appProject.update({
      where: { id },
      data: {
        deploymentUrl: `https://${deployment.url}`,
        deploymentStatus: deployment.readyState === 'READY' ? 'deployed' : 'building',
        deploymentPlatform: 'vercel',
        deploymentId: deployment.deploymentId,
        claimUrl: claimUrl,
        deployedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      url: `https://${deployment.url}`,
      claimUrl: claimUrl,
      deploymentId: deployment.deploymentId,
      status: deployment.readyState,
      message: 'Deployment initiated successfully! Your app will be available shortly.',
    });
  } catch (error: any) {
    console.error('Vercel deployment error:', error);
    console.error('Error stack:', error?.stack);
    
    // Check if it's a configuration error
    if (error.message?.includes('VERCEL_API_TOKEN') || error.message?.includes('not configured')) {
      return NextResponse.json(
        {
          error: 'Deployment service not configured',
          message: 'VERCEL_API_TOKEN environment variable is not set',
          instructions: [
            '1. Get your Vercel API token:',
            '   - Go to https://vercel.com/account/tokens',
            '   - Click "Create Token"',
            '   - Give it a name (e.g., "App Builder Deployment")',
            '   - Copy the token',
            '2. Add to your .env file:',
            '   VERCEL_API_TOKEN=your_token_here',
            '3. For production deployments, add it to your hosting platform\'s environment variables',
            '4. Restart your development server after adding the token',
          ],
        },
        { status: 500 }
      );
    }
    
    // Extract error message and details
    const errorMessage = error.message || 'An unknown error occurred';
    const errorDetails: any = {
      message: errorMessage,
    };
    
    // Add helpful context based on error type
    if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
      errorDetails.suggestion = 'Your VERCEL_API_TOKEN may be invalid or expired. Please regenerate it from https://vercel.com/account/tokens';
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
      errorDetails.suggestion = 'Your Vercel token may not have deployment permissions. Check your token permissions.';
    } else if (errorMessage.includes('bad request') || errorMessage.includes('400')) {
      errorDetails.suggestion = 'There may be an issue with the deployment configuration. Check the project files.';
    }
    
    return NextResponse.json(
      {
        error: 'Deployment failed',
        message: errorMessage,
        details: errorDetails,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

