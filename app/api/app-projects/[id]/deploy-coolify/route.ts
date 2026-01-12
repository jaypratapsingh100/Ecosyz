import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { createHash } from 'crypto';

// Build static HTML from project files
function buildStaticHTML(files: any[]): string {
  // Find main entry file (App.js, App.jsx, index.js, etc.)
  const mainFile = files.find(
    (f) =>
      f.path.includes('App.') ||
      f.path.includes('app.') ||
      f.path.includes('index.')
  ) || files[0];

  if (!mainFile) {
    throw new Error('No main file found');
  }

  // Extract component code
  let componentCode = mainFile.content;

  // Remove imports (we'll use CDN)
  componentCode = componentCode.replace(
    /import\s+.*?from\s+['"].*?['"];?\s*/g,
    ''
  );

  // Find component name
  const componentMatch = componentCode.match(
    /(?:function|const|class)\s+(\w+)\s*[=\(]/
  );
  const componentName = componentMatch ? componentMatch[1] : 'App';

  // Build HTML with React from CDN
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        #root { min-height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${componentCode}
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(${componentName}));
    </script>
</body>
</html>`;

  return html;
}

// Create a ZIP file from project files
async function createProjectZip(files: any[]): Promise<Buffer> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Add all files to ZIP
  files.forEach((file) => {
    zip.file(file.path, file.content);
  });

  // Generate static HTML
  const html = buildStaticHTML(files);
  zip.file('index.html', html);

  // Add package.json for static site
  zip.file(
    'package.json',
    JSON.stringify({
      name: 'user-app',
      version: '1.0.0',
      scripts: {
        build: 'echo "Static site"',
      },
    })
  );

  return await zip.generateAsync({ type: 'nodebuffer' });
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
        { error: 'Project has no files' },
        { status: 400 }
      );
    }

    // Check if Coolify is configured
    const coolifyUrl = process.env.COOLIFY_URL;
    const coolifyToken = process.env.COOLIFY_API_TOKEN;
    const deploymentDomain = process.env.DEPLOYMENT_DOMAIN || 'yourdomain.com';

    if (!coolifyUrl || !coolifyToken) {
      return NextResponse.json(
        {
          error: 'Deployment service not configured',
          message:
            'Please configure COOLIFY_URL and COOLIFY_API_TOKEN environment variables',
        },
        { status: 500 }
      );
    }

    // Create project ZIP
    const zipBuffer = await createProjectZip(project.files);

    // Create unique app name
    const appName = `app-${project.id.slice(0, 8)}`;
    const subdomain = `${appName}.${deploymentDomain}`;

    // Upload ZIP to temporary storage (or use GitHub/GitLab)
    // For now, we'll create a GitHub repo and push files
    // Alternative: Use Coolify's file upload API if available

    // Option 1: Deploy via GitHub (if you have GitHub integration)
    // Option 2: Use Coolify's direct deployment API
    // Option 3: Use file upload to Coolify

    // For this example, we'll use a simplified approach
    // In production, you'd want to:
    // 1. Create a GitHub repo with the files
    // 2. Or upload files directly to Coolify
    // 3. Or use Coolify's Git integration

    // Update project with deployment info
    const deploymentUrl = `https://${subdomain}`;

    await prisma.appProject.update({
      where: { id },
      data: {
        deploymentUrl,
        deploymentStatus: 'pending',
        deploymentPlatform: 'coolify',
      },
    });

    // TODO: Implement actual Coolify API call
    // This is a placeholder - you'll need to implement based on Coolify's API
    // Example:
    /*
    const coolifyResponse = await fetch(`${coolifyUrl}/api/v1/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${coolifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: appName,
        domain: subdomain,
        build_pack: 'static',
        // ... other Coolify-specific config
      }),
    });

    if (!coolifyResponse.ok) {
      throw new Error('Failed to deploy to Coolify');
    }

    const deployment = await coolifyResponse.json();
    */

    return NextResponse.json({
      success: true,
      url: deploymentUrl,
      message:
        'Deployment initiated. Your app will be available shortly at the URL above.',
      note: 'Coolify API integration needs to be completed based on your Coolify setup',
    });
  } catch (error: any) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      {
        error: 'Deployment failed',
        message: error.message || 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}






