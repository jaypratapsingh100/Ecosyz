/**
 * Extract files from saved chat content (JSON or code blocks) and create them in the project.
 * Use when OpenRouter returns JSON with files but auto-extraction failed, or to re-extract from chat history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { extractAgentResponse } from '@/lib/app-builder/agentSchema';

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
      select: { id: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required', message: 'Provide { content: string } with chat message or JSON' },
        { status: 400 }
      );
    }

    const agentResponse = extractAgentResponse(content);
    if (!agentResponse || agentResponse.files.length === 0) {
      return NextResponse.json({
        ok: false,
        success: false,
        message: 'No files could be extracted. The content may not contain valid JSON with a "files" array. Try sending a chat message to generate code.',
        createdCount: 0,
        files: [],
      });
    }

    const created: Array<{ path: string; success: boolean; error?: string }> = [];
    for (const f of agentResponse.files) {
      try {
        const fileName = f.name || f.path.split('/').pop() || f.path;
        const language = f.path.endsWith('.tsx') ? 'typescript' : f.path.endsWith('.jsx') ? 'javascript' : 'css';
        await prisma.appFile.upsert({
          where: { projectId_path: { projectId: id, path: f.path } },
          update: { content: f.content, language, isMain: f.isMain, name: fileName },
          create: {
            projectId: id,
            path: f.path,
            name: fileName,
            content: f.content,
            language,
            isMain: f.isMain ?? (f.path === 'src/App.jsx' || f.path === 'src/App.tsx'),
          },
        });
        created.push({ path: f.path, success: true });
      } catch (err) {
        created.push({
          path: f.path,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = created.filter((c) => c.success).length;
    if (successCount > 0) {
      await prisma.appProject.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: successCount > 0
        ? `Extracted ${successCount} file(s). Preview will refresh automatically.`
        : 'No files were saved.',
      createdCount: successCount,
      totalFound: agentResponse.files.length,
      files: created,
      summary: agentResponse.summary,
    });
  } catch (error) {
    console.error('[EXTRACT] Error:', error);
    return NextResponse.json(
      {
        error: 'Extract failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
