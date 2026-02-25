import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { CreateAppProject } from '@/lib/validation';
import { getScaffoldFiles } from '@/app/lib/app-builder/scaffolds';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      );
    }

    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('Database connection error (linkedin-portfolio):', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 },
      );
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const projectTitle = (formData.get('projectTitle') as string | null)?.trim() || 'LinkedIn Portfolio';
    const originalFileName = (formData.get('fileName') as string | null) || 'linkedin-profile';

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'LinkedIn document is required' },
        { status: 400 },
      );
    }

    let rawText = '';
    try {
      if (typeof (file as any).text === 'function') {
        rawText = await (file as any).text();
      }
    } catch (readError) {
      console.warn('Failed to read LinkedIn file as text:', readError);
    }

    const projectInput = {
      title: projectTitle,
      description: 'Portfolio generated from a LinkedIn document upload. Use the Chat tab to refine the design and content.',
      type: 'web' as const,
      framework: 'react',
      previewVersion: 'v2' as const,
      appType: 'portfolio',
      questionnaireData: {
        source: 'linkedin-doc-upload',
        originalFileName,
        rawTextSnippet: rawText ? rawText.slice(0, 8000) : undefined,
      },
    };

    const parse = CreateAppProject.safeParse(projectInput);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 },
      );
    }

    const project = await prisma.appProject.create({
      data: {
        ...parse.data,
        ownerId: prismaUser.id,
        previewVersion: parse.data.previewVersion || 'v2',
      },
    });

    try {
      const scaffoldFiles = getScaffoldFiles('react', {
        projectTitle: project.title || 'My Portfolio',
      });

      const extraFiles = rawText
        ? [
            {
              path: 'src/linkedin-profile.txt',
              name: 'linkedin-profile.txt',
              content: rawText,
              language: 'text',
              isMain: false,
            },
          ]
        : [];

      await prisma.appFile.createMany({
        data: [...scaffoldFiles, ...extraFiles].map((f) => ({
          projectId: project.id,
          path: f.path,
          name: f.name,
          content: f.content ?? '',
          language:
            f.language ??
            (f.path.endsWith('.css')
              ? 'css'
              : f.path.endsWith('.html')
              ? 'html'
              : f.path.endsWith('.txt')
              ? 'text'
              : 'jsx'),
          isMain: f.isMain ?? false,
        })),
      });
    } catch (scaffoldErr) {
      console.warn('[linkedin-portfolio] Scaffold creation failed, project still created:', scaffoldErr);
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating LinkedIn portfolio project:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio from LinkedIn document' },
      { status: 500 },
    );
  }
}

