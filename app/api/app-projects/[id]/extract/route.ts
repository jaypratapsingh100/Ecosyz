/**
 * Extract files from saved chat content (JSON or code blocks) and create them in the project.
 * Use when OpenRouter returns JSON with files but auto-extraction failed, or to re-extract from chat history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import {
  extractAgentResponse,
  ALLOWED_PATHS,
  COMPONENT_PATH_PATTERN,
  SRC_ROOT_COMPONENT_PATTERN,
  CSS_PATH_PATTERN,
} from '@/lib/app-builder/agentSchema';

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
    const rawFiles = Array.isArray(body.files) ? body.files : null;

    let filesToSave: Array<{ path: string; name: string; content: string; language?: string; isMain?: boolean }>;

    if (rawFiles && rawFiles.length > 0) {
      // Client sent pre-parsed files (e.g. from display); validate paths and use
      filesToSave = [];
      for (const f of rawFiles) {
        if (!f || typeof f !== 'object' || typeof (f as { path?: string }).path !== 'string') continue;
        const o = f as { path?: string; name?: string; content?: string; language?: string; isMain?: boolean };
        if (!o.path || typeof o.content !== 'string') continue;
        const path = o.path.replace(/\s+/g, '').replace(/\\/g, '/');
        const valid =
          ALLOWED_PATHS.includes(path as (typeof ALLOWED_PATHS)[number]) ||
          COMPONENT_PATH_PATTERN.test(path) ||
          SRC_ROOT_COMPONENT_PATTERN.test(path) ||
          CSS_PATH_PATTERN.test(path);
        if (!valid) continue;
        filesToSave.push({
          path,
          name: typeof o.name === 'string' ? o.name : path.split('/').pop() || path,
          content: o.content,
          language: o.language,
          isMain: o.isMain,
        });
      }
    } else if (content) {
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
      filesToSave = agentResponse.files.map((f) => ({
        path: f.path,
        name: f.name,
        content: f.content,
        language: f.language,
        isMain: f.isMain,
      }));
    } else {
      return NextResponse.json(
        { error: 'Content is required', message: 'Provide { content: string } or { files: [...] }' },
        { status: 400 }
      );
    }

    if (filesToSave.length === 0) {
      return NextResponse.json({
        ok: false,
        success: false,
        message: 'No valid files to extract. Check that paths are allowed (e.g. src/App.jsx, src/components/*.jsx).',
        createdCount: 0,
        files: [],
      });
    }

    const created: Array<{ path: string; success: boolean; error?: string }> = [];
    for (const f of filesToSave) {
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
        console.error('Error saving extracted file:', err);
        created.push({
          path: f.path,
          success: false,
          error: 'Failed to save file',
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
      totalFound: filesToSave.length,
      files: created,
      summary: undefined,
    });
  } catch (error) {
    console.error('[EXTRACT] Error:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Extract failed',
        ...(isDev && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    );
  }
}
