import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../../src/lib/auth';
import * as JSZip from 'jszip';

// Helper function to create project files structure for GitHub Pages
async function createProjectZip(project: any): Promise<Buffer> {
  const zip = new JSZip();
  const { files } = project;

  // Add all project files to zip
  for (const file of files) {
    zip.file(file.path, file.content);
  }

  // For GitHub Pages, we need an index.html
  const htmlFiles = files.filter((f: any) => f.path.endsWith('.html'));
  const jsFiles = files.filter((f: any) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));

  // If no HTML file exists, create one for React apps
  if (htmlFiles.length === 0 && jsFiles.length > 0) {
    const appFile = jsFiles.find((f: any) => f.isMain) || jsFiles[0];
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="${appFile.path}"></script>
</body>
</html>`;
    zip.file('index.html', indexHtml);
  }

  // Add package.json
  const packageJson = {
    name: project.title.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    homepage: `https://${project.title.toLowerCase().replace(/\s+/g, '-')}.github.io`,
  };
  zip.file('package.json', JSON.stringify(packageJson, null, 2));

  // Add .gitignore
  const gitignore = `node_modules/
.DS_Store
*.log
.env.local
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
    const { githubToken, repositoryName } = body;

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is required' },
        { status: 400 }
      );
    }

    const repoName = repositoryName || `${project.title.toLowerCase().replace(/\s+/g, '-')}`;

    // Step 1: Create GitHub repository
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: project.description || `Deployed from ${project.title}`,
        private: false,
        auto_init: false,
      }),
    });

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.json().catch(() => ({ message: 'Failed to create GitHub repository' }));
      return NextResponse.json(
        { error: error.message || 'Failed to create GitHub repository' },
        { status: createRepoResponse.status }
      );
    }

    const githubRepo = await createRepoResponse.json();

    // Step 2: Create project zip
    const zipBuffer = await createProjectZip(project);

    // Step 3: Create initial commit with all files
    // For GitHub Pages, we'll create a simple structure
    const files = project.files;
    const commits = [];

    // Create files in the repository
    for (const file of files) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${githubRepo.full_name}/contents/${file.path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Add ${file.name}`,
            content: Buffer.from(file.content).toString('base64'),
          }),
        }
      );

      if (!fileResponse.ok) {
        console.error(`Failed to create file ${file.path}`);
      }
    }

    // Step 4: Enable GitHub Pages
    const enablePagesResponse = await fetch(
      `https://api.github.com/repos/${githubRepo.full_name}/pages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            branch: 'main',
            path: '/',
          },
        }),
      }
    );

    // Pages might already be enabled or need main branch to exist first
    if (!enablePagesResponse.ok && enablePagesResponse.status !== 422) {
      console.error('Failed to enable GitHub Pages');
    }

    return NextResponse.json({
      success: true,
      message: 'Project deployed to GitHub Pages',
      repositoryUrl: githubRepo.html_url,
      repositoryFullName: githubRepo.full_name, // For Vercel import
      pagesUrl: `https://${githubRepo.owner.login}.github.io/${repoName}`,
      repositoryName: repoName,
      instructions: [
        '1. Wait 2-5 minutes for GitHub Pages to build',
        '2. Visit the Pages URL to see your deployed site',
        '3. To deploy to Vercel: Click "Connect to Vercel" link above',
        '4. You can update files by pushing to the repository',
      ],
      vercelImportUrl: `https://vercel.com/new?import=${encodeURIComponent(githubRepo.full_name)}`,
    });
  } catch (error: any) {
    console.error('GitHub Pages deployment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to deploy to GitHub Pages' },
      { status: 500 }
    );
  }
}

