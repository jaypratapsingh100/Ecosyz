import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import type {
  ChatRequestBody,
  DatabaseError,
  QuestionnaireData,
  ProjectFile,
} from '@/app/types/app-builder';
import { buildAppBuilderPrompts } from '@/lib/app-builder/contextBuilder';
import { createAIClient, hasAIClient } from '@/lib/ai/provider';

type DebugProjectFile = Pick<ProjectFile, 'path' | 'name' | 'content'>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);

    // Params
    const { id } = await params;

    // Load project with files + questionnaire
    const project = await prisma.appProject.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        type: true,
        framework: true,
        questionnaireData: true,
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Basic ownership check (same as main chat route)
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized', message: 'You do not own this project.' },
        { status: 403 }
      );
    }

    // Request body
    const body = (await req.json()) as ChatRequestBody;
    let { message, userProvider, userModel, currentFile } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const questionnaireData: QuestionnaireData =
      (project.questionnaireData as QuestionnaireData) || {};

    // Determine language from questionnaire or default
    const projectLanguage = questionnaireData?.language || 'javascript';
    const useTypeScript = projectLanguage === 'typescript';
    const fileExtension = useTypeScript ? 'tsx' : 'jsx';

    const projectFiles = (project.files || []) as DebugProjectFile[];
    const existingFilePaths = projectFiles.map((f) => f.path);
    const hasScaffoldFiles =
      existingFilePaths.some((p) => p.includes('App.jsx') || p.includes('App.tsx')) ||
      existingFilePaths.some((p) => p.includes('index.js') || p.includes('index.ts')) ||
      existingFilePaths.some((p) => p === 'index.html' || p.endsWith('/index.html')) ||
      existingFilePaths.some((p) => p.includes('App.css'));

    const frameworkForScaffold = project.framework || 'react';
    const currentFilePath = currentFile;

    // Build prompts via shared helper
    const promptResult = buildAppBuilderPrompts({
      message,
      questionnaireData,
      frameworkForScaffold,
      useTypeScript,
      existingFilePaths,
      hasScaffoldFiles,
      fileExtension,
      plan: undefined,
      taskPlan: null,
      currentFilePath,
      projectFiles,
    });

    // Resolve provider/model without calling the LLM (for observability)
    let provider: string | 'none' = 'none';
    let model: string | 'none' = 'none';
    if (hasAIClient()) {
      try {
        const clientConfig = createAIClient({
          userProvider: userProvider === 'openrouter' || userProvider === 'groq' ? userProvider : undefined,
          userModel: typeof userModel === 'string' ? userModel : undefined,
        });
        provider = clientConfig.provider;
        model = clientConfig.model;
      } catch (e) {
        console.warn('⚠️ Debug route: failed to create AI client for inspection:', e);
      }
    }

    return NextResponse.json({
      provider,
      model,
      project: {
        id: project.id,
        title: project.title,
        type: project.type,
        framework: project.framework,
        fileCount: existingFilePaths.length,
      },
      context: {
        systemPrompt: promptResult.systemPrompt,
        userMessage: promptResult.userMessage,
        approxTokens: promptResult.approxTokens,
      },
    });
  } catch (error: unknown) {
    const err = error as DatabaseError | Error;
    console.error('❌ Error in app-projects chat debug route:', err);
    return NextResponse.json(
      {
        error: 'Failed to build debug LLM context',
        message: err.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

