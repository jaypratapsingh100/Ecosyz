import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';
import { deployToVercel, getClaimableDeploymentUrl } from '../../../../../src/lib/vercel';

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
    // Build React app
    const cssContent = cssFiles.map((f) => f.content).join('\n\n');
    
    // Combine JS files
    const jsContent = jsFiles
      .map((f) => {
        // Remove imports
        let content = f.content.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
        // Clean exports
        content = content.replace(/export\s+default\s+/g, '');
        content = content.replace(/export\s+/g, '');
        return `// ${f.path}\n${content}`;
      })
      .join('\n\n');

    htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      min-height: 100vh;
    }
    #root {
      min-height: 100vh;
    }
    ${cssContent}
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } = React;
    
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

