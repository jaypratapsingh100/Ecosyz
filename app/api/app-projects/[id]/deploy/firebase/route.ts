import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../../src/lib/auth';
import * as JSZip from 'jszip';

// Helper function to create project files for Firebase Hosting
async function prepareFirebaseFiles(project: any): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const { projectFiles } = project;

  // Add all project files
  for (const file of projectFiles) {
    // Firebase Hosting serves from 'public' directory
    // For HTML files, put them in public root
    if (file.path.endsWith('.html')) {
      const fileName = file.path.split('/').pop() || 'index.html';
      if (fileName === 'index.html' || file.isMain) {
        files['public/index.html'] = file.content;
      } else {
        files[`public/${fileName}`] = file.content;
      }
    } else if (file.path.endsWith('.css')) {
      files[`public/${file.path}`] = file.content;
    } else if (file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
      files[`public/${file.path}`] = file.content;
    } else {
      // Other files go to public directory
      files[`public/${file.path}`] = file.content;
    }
  }

  // Ensure we have an index.html
  if (!files['public/index.html']) {
    const htmlFiles = projectFiles.filter((f: any) => f.path.endsWith('.html'));
    const jsFiles = projectFiles.filter((f: any) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
    
    if (htmlFiles.length > 0) {
      files['public/index.html'] = htmlFiles[0].content;
    } else if (jsFiles.length > 0) {
      // Create HTML wrapper for React apps
      const appFile = jsFiles.find((f: any) => f.isMain) || jsFiles[0];
      files['public/index.html'] = `<!DOCTYPE html>
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
  <script type="text/babel" src="/${appFile.path}"></script>
</body>
</html>`;
      // Add the JS file
      files[`public/${appFile.path}`] = appFile.content;
    } else {
      // Fallback HTML
      files['public/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
</head>
<body>
  <h1>${project.title}</h1>
  <p>Welcome to your deployed project!</p>
</body>
</html>`;
    }
  }

  // Add firebase.json configuration
  files['firebase.json'] = JSON.stringify({
    hosting: {
      public: 'public',
      ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
      rewrites: [
        {
          source: '**',
          destination: '/index.html',
        },
      ],
    },
  }, null, 2);

  // Add .firebaserc (optional, for project ID)
  files['.firebaserc'] = JSON.stringify({
    projects: {
      default: project.title.toLowerCase().replace(/\s+/g, '-'),
    },
  }, null, 2);

  return files;
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
    const { firebaseToken, projectId } = body;

    if (!firebaseToken) {
      return NextResponse.json(
        { error: 'Firebase token is required' },
        { status: 400 }
      );
    }

    // Prepare files for Firebase
    const files = await prepareFirebaseFiles({
      ...project,
      projectFiles: project.files,
    });

    // Create a zip file for download (users can upload via Firebase Console or CLI)
    const zip = new JSZip.default();
    Object.entries(files).forEach(([path, content]) => {
      zip.file(path, content);
    });
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Convert to base64 for response
    const base64Zip = zipBuffer.toString('base64');

    // Firebase Hosting deployment instructions
    // Note: Firebase Hosting API requires Firebase CLI or Console upload
    // We'll provide the files and instructions for easy deployment

    const firebaseProjectId = projectId || project.title.toLowerCase().replace(/\s+/g, '-');

    return NextResponse.json({
      success: true,
      message: 'Project ready for Firebase Hosting deployment',
      firebaseProjectId,
      hostingUrl: `https://${firebaseProjectId}.web.app`,
      instructions: [
        '1. Download the project files (ZIP)',
        '2. Go to Firebase Console: https://console.firebase.google.com',
        '3. Create a new project (or use existing)',
        '4. Enable Hosting in the project',
        '5. Install Firebase CLI: npm install -g firebase-tools',
        '6. Extract ZIP and run: firebase login',
        '7. Run: firebase init hosting',
        '8. Run: firebase deploy --only hosting',
        '',
        'Or use Firebase Console:',
        '1. Go to Hosting section',
        '2. Click "Get started"',
        '3. Upload the files from the ZIP',
      ],
      downloadUrl: `/api/app-projects/${id}/download-firebase`,
      filesBase64: base64Zip, // Include files for potential direct upload
      fileCount: Object.keys(files).length,
    });
  } catch (error: any) {
    console.error('Firebase deployment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to prepare Firebase deployment' },
      { status: 500 }
    );
  }
}


