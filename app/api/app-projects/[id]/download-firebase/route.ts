import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import JSZip from 'jszip';

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

    // Create zip file for Firebase Hosting
    const zip = new JSZip();
    
    // Add all project files to public directory
    for (const file of project.files) {
      if (file.path.endsWith('.html')) {
        const fileName = file.path.split('/').pop() || 'index.html';
        if (fileName === 'index.html' || file.isMain) {
          zip.file('public/index.html', file.content);
        } else {
          zip.file(`public/${fileName}`, file.content);
        }
      } else {
        zip.file(`public/${file.path}`, file.content);
      }
    }

    // Ensure index.html exists
    const htmlFiles = project.files.filter((f: any) => f.path.endsWith('.html'));
    if (htmlFiles.length === 0) {
      const jsFiles = project.files.filter((f: any) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
      if (jsFiles.length > 0) {
        const appFile = jsFiles.find((f: any) => f.isMain) || jsFiles[0];
        zip.file('public/index.html', `<!DOCTYPE html>
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
</html>`);
        zip.file(`public/${appFile.path}`, appFile.content);
      }
    }

    // Add firebase.json
    zip.file('firebase.json', JSON.stringify({
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
    }, null, 2));

    // Add .firebaserc
    zip.file('.firebaserc', JSON.stringify({
      projects: {
        default: project.title.toLowerCase().replace(/\s+/g, '-'),
      },
    }, null, 2));

    // Add README with instructions
    zip.file('README.md', `# ${project.title}

## Firebase Hosting Deployment

### Quick Start (Using Firebase Console - Easiest for Non-Technical Users)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Sign in with your Google account

2. **Create a Project**
   - Click "Add project"
   - Enter a project name: "${project.title}"
   - Follow the setup wizard

3. **Enable Hosting**
   - In your project, click "Hosting" in the left menu
   - Click "Get started"
   - Follow the setup steps

4. **Upload Files**
   - Extract this ZIP file
   - Go to Hosting section in Firebase Console
   - Click "Upload files" or drag and drop the \`public\` folder contents
   - Your site will be live immediately!

### Alternative: Using Firebase CLI (For Technical Users)

1. Install Firebase CLI:
   \`\`\`bash
   npm install -g firebase-tools
   \`\`\`

2. Login:
   \`\`\`bash
   firebase login
   \`\`\`

3. Initialize:
   \`\`\`bash
   firebase init hosting
   \`\`\`
   - Select existing project
   - Use \`public\` as public directory
   - Configure as single-page app: Yes

4. Deploy:
   \`\`\`bash
   firebase deploy --only hosting
   \`\`\`

Your site will be available at: https://YOUR-PROJECT-ID.web.app

## Need Help?

- Firebase Documentation: https://firebase.google.com/docs/hosting
- Firebase Console: https://console.firebase.google.com
`);

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return zip file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.title.replace(/\s+/g, '-')}-firebase.zip"`,
      },
    });
  } catch (error: any) {
    console.error('Firebase download error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to download Firebase project' },
      { status: 500 }
    );
  }
}






