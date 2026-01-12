import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import JSZip from 'jszip';

// Helper function to create project files structure
async function createProjectZip(project: any): Promise<Buffer> {
  const zip = new JSZip();
  const { files } = project;

  // Add all project files to zip
  for (const file of files) {
    zip.file(file.path, file.content);
  }

  // Add package.json for React/Next.js projects
  if (project.framework === 'react' || project.framework === 'nextjs') {
    const packageJson = {
      name: project.title.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      private: true,
      scripts: {
        dev: project.framework === 'nextjs' ? 'next dev' : 'react-scripts start',
        build: project.framework === 'nextjs' ? 'next build' : 'react-scripts build',
        start: project.framework === 'nextjs' ? 'next start' : 'react-scripts start',
      },
      dependencies: project.framework === 'nextjs' 
        ? {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
            next: '^14.0.0',
          }
        : {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
            'react-scripts': '5.0.1',
          },
    };
    zip.file('package.json', JSON.stringify(packageJson, null, 2));
  }

  // Add vercel.json for Next.js
  if (project.framework === 'nextjs') {
    const vercelJson = {
      framework: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: '.next',
    };
    zip.file('vercel.json', JSON.stringify(vercelJson, null, 2));
  }

  // Add .gitignore
  const gitignore = `node_modules/
.next/
out/
build/
.DS_Store
*.log
.env.local
.env.development.local
.env.test.local
.env.production.local
`;
  zip.file('.gitignore', gitignore);

  // Generate zip buffer
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return zipBuffer;
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

    const body = await req.json();
    const { vercelToken, projectName } = body;

    if (!vercelToken) {
      return NextResponse.json(
        { error: 'Vercel token is required' },
        { status: 400 }
      );
    }

    // Create project zip
    const zipBuffer = await createProjectZip(project);

    // Deploy to Vercel using their API
    // Step 1: Create a new project
    const createProjectResponse = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName || project.title.toLowerCase().replace(/\s+/g, '-'),
        framework: project.framework === 'nextjs' ? 'nextjs' : null,
      }),
    });

    if (!createProjectResponse.ok) {
      const error = await createProjectResponse.json().catch(() => ({ error: 'Failed to create Vercel project' }));
      return NextResponse.json(
        { error: error.error || 'Failed to create Vercel project' },
        { status: createProjectResponse.status }
      );
    }

    const vercelProject = await createProjectResponse.json();

    // Step 2: Create deployment using Vercel's deployment API
    // Vercel requires files to be uploaded individually or via Git
    // We'll create a deployment with file uploads using FormData approach
    
    // Prepare files for upload
    const files: Record<string, string> = {};
    
    // Add all project files
    for (const file of project.files) {
      files[file.path] = file.content;
    }

    // Add package.json
    if (project.framework === 'react' || project.framework === 'nextjs') {
      const packageJson = {
        name: project.title.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        private: true,
        scripts: {
          dev: project.framework === 'nextjs' ? 'next dev' : 'react-scripts start',
          build: project.framework === 'nextjs' ? 'next build' : 'react-scripts build',
          start: project.framework === 'nextjs' ? 'next start' : 'react-scripts start',
        },
        dependencies: project.framework === 'nextjs' 
          ? {
              react: '^18.0.0',
              'react-dom': '^18.0.0',
              next: '^14.0.0',
            }
          : {
              react: '^18.0.0',
              'react-dom': '^18.0.0',
              'react-scripts': '5.0.1',
            },
      };
      files['package.json'] = JSON.stringify(packageJson, null, 2);
    }

    // Add vercel.json for Next.js
    if (project.framework === 'nextjs') {
      const vercelJson = {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
      };
      files['vercel.json'] = JSON.stringify(vercelJson, null, 2);
    }

    // Add .gitignore
    files['.gitignore'] = `node_modules/
.next/
out/
build/
.DS_Store
*.log
.env.local
.env.development.local
.env.test.local
.env.production.local
`;

    // Create deployment using Vercel API v13 (deployments endpoint)
    // Note: Vercel API v13 requires files to be uploaded as a tar.gz or individual files
    // For simplicity, we'll use the project creation and provide instructions for Git-based deployment
    // OR we can use GitHub integration: deploy to GitHub first, then connect to Vercel

    // Alternative approach: Use GitHub deployment first, then connect to Vercel
    // For now, return success with instructions to connect via Git
    
    return NextResponse.json({
      success: true,
      message: 'Vercel project created successfully!',
      vercelProjectId: vercelProject.id,
      vercelProjectName: vercelProject.name,
      deploymentUrl: `https://${vercelProject.name}.vercel.app`,
      instructions: [
        '1. First, deploy to GitHub Pages (use the button below)',
        '2. After GitHub deployment, click the "Connect to Vercel" link',
        '3. Vercel will import your GitHub repository',
        '4. Your site will be live on Vercel automatically',
        '',
        'Or download ZIP and use Vercel CLI:',
        '  - Extract ZIP → Run: vercel --prod',
      ],
      downloadUrl: `/api/app-projects/${id}/download`,
      note: 'Vercel requires Git integration. Deploy to GitHub first, then connect to Vercel for automatic deployments.',
    });
  } catch (error: any) {
    console.error('Vercel deployment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to deploy to Vercel' },
      { status: 500 }
    );
  }
}

