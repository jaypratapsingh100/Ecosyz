import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

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

    const isReactProject = project.framework === 'react';

    // Find main HTML file or index.html
    const htmlFile = project.files.find(
      (f: { path: string; name: string; isMain: boolean }) =>
        f.path === 'index.html' || f.name === 'index.html' || f.isMain
    );

    if (!htmlFile) {
      return NextResponse.json(
        { error: 'No HTML file found in project' },
        { status: 400 }
      );
    }

    // Build HTML starting from main HTML file
    let html = htmlFile.content;

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

    // For non-React projects, also inject JS/JSX files into the HTML.
    // React projects are expected to reference their scripts from index.html
    // directly (e.g. via CDN or bundled script), so we skip JS injection to
    // avoid double-executing React code.
    if (!isReactProject) {
      // Inject JS/JSX files
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
        const scriptTag = `<script type="text/babel">${jsFile.content}</script>`;
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
        const scriptTag = `<script type="text/babel">${mainJsFile.content}</script>`;
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
