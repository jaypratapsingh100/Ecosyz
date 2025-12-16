import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';
import * as JSZip from 'jszip';

export async function GET(
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

    // Create zip file
    const zip = new JSZip();
    
    // Add all project files
    for (const file of project.files) {
      zip.file(file.path, file.content);
    }

    // Add package.json if it's a React/Next.js project
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

    // Return zip file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.title.replace(/\s+/g, '-')}.zip"`,
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to download project' },
      { status: 500 }
    );
  }
}

