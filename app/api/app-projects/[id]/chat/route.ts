import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { getScaffoldFiles, DEFAULT_APP_CONTENT } from '@/app/lib/app-builder/scaffolds';
import { createAIClient, hasAIClient, getMaxOutputTokens, isSlowProvider } from '@/lib/ai/provider';
import type { AIProvider } from '@/lib/ai/provider';
import { trackApiRequest } from '@/lib/api-usage';
import {
  extractAgentResponse,
  parseCodeBlocksToFiles,
  isAllowedPath,
} from '@/lib/app-builder/agentSchema';
import { buildRetryPrompt } from '@/lib/app-builder/promptBuilder';
import { buildPlannerPrompt, parsePlannerResponse } from '@/lib/app-builder/agents/planner';
import { buildArchitectPrompt, parseArchitectResponse } from '@/lib/app-builder/agents/architect';
import { buildAppBuilderPrompts } from '@/lib/app-builder/contextBuilder';
import { validateProjectFiles, checkComponentStructureAndStyling } from '../../../../../src/lib/utils/validateJSX';
import { createSSEStream, sseResponse } from '@/lib/app-builder/sse';
import { enforceGenerationLimit } from '@/lib/app-builder/usage';
import { checkCreditBalance } from '@/lib/app-builder/credits';
import { getFallbackRoute, isRetryableError } from '@/lib/app-builder/model-router';
import { trackGeneration, createGenerationTimer } from '@/lib/app-builder/pipeline/generation-tracker';
import { runGenerationPipeline } from '@/lib/app-builder/pipeline/generation-pipeline';
import { getStageParams } from '@/lib/app-builder/ai-params';
import type { ChatMessage, ChatRequestBody, DatabaseError, QuestionnaireData, ProjectFile } from '@/app/types/app-builder';
import type { PlannerPlan, ArchitectTaskPlan, AppProjectState } from '@/app/types/app-builder';

export const maxDuration = 300;

type FileCreationResult = { path: string; success: boolean; error?: string; validated?: boolean; validationError?: string; sandboxIssues?: string[] };

// GET endpoint to fetch chat history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const { id } = await params;
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Load project WITH FILES - CRITICAL FIX
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: { 
        chats: { orderBy: { updatedAt: 'desc' }, take: 1 },
        files: { orderBy: { path: 'asc' } } // ✅ FIX: Include files to check existing files
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check authorization
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the most recent chat (or create empty one)
    const chat = project.chats[0];
    const rawMessages = chat?.messages;
    const messages: ChatMessage[] = Array.isArray(rawMessages) ?
      (rawMessages as unknown as ChatMessage[]) : [];

    return NextResponse.json({
      messages: messages.map((msg: ChatMessage & { provider?: string; model?: string }, idx: number) => ({
        id: `msg-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp as string) : new Date(),
        provider: msg.provider,
        model: msg.model,
      })),
      questionnaireData: project.questionnaireData ?? null,
    });
  } catch (error: unknown) {
    console.error('Error fetching chat history:', error);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to fetch chat history',
        ...(isDev && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[CHAT] Request received');
  }
  
  // Declare provider at function scope for error handling
  let provider: string = 'unknown';
  let model: string = 'unknown';
  
  try {
    // Step 1: Authentication
    let user;
    try {
      user = await getCurrentUser();
    } catch (authError: unknown) {
      console.error('❌ Authentication error:', authError);
      const errorMessage = authError instanceof Error ? authError.message : 'Failed to authenticate user';
      return NextResponse.json(
        { error: 'Authentication failed', message: errorMessage },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Step 2: Ensure user in database
    try {
      await ensureUserInDb(user);
    } catch (dbError: unknown) {
      const err = dbError as DatabaseError;
      console.error('❌ Database error (ensureUserInDb):', err.message);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to ensure user in database' },
        { status: 500 }
      );
    }
    
    // Step 3: Get user from database
    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: unknown) {
      const err = dbError as DatabaseError;
      console.error('❌ Database error (findUnique user):', err.message);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch user from database' },
        { status: 500 }
      );
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Step 4: Get project ID and load project
    let id: string;
    try {
      const paramsObj = await params;
      id = paramsObj.id;
    } catch (paramsError: unknown) {
      console.error('❌ Error getting params:', paramsError);
      const errorMessage = paramsError instanceof Error ? paramsError.message : 'Failed to get project ID from request';
      return NextResponse.json(
        { error: 'Invalid request', message: errorMessage },
        { status: 400 }
      );
    }
    
    let project;
    try {
      project = await prisma.appProject.findUnique({
        where: { id },
        select: {
          id: true,
          ownerId: true, // Required for authorization check
          title: true,
          description: true,
          type: true,
          framework: true,
          config: true,
          questionnaireData: true,
          appType: true,
          targetAudience: true,
          designStyle: true,
          colorScheme: true,
          layoutStyle: true,
          requiredFeatures: true,
          brandName: true,
          tagline: true,
          keyPoints: true,
          generationState: true,
          files: {
            orderBy: { path: 'asc' },
          },
        },
      });
    } catch (projectError: unknown) {
      console.error('❌ Database error (findUnique project):', projectError);
      const errorMessage = projectError instanceof Error ? projectError.message : 'Failed to load project from database';
      return NextResponse.json(
        { error: 'Database error', message: errorMessage },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check authorization - handle null ownerId and type mismatches
    if (!project.ownerId) {
      console.error('Project has no ownerId:', {
        projectId: project.id,
        projectTitle: project.title,
      });
      return NextResponse.json(
        { 
          error: 'Project ownership not set',
          message: 'This project was created without an owner. Please contact support or recreate the project.'
        },
        { status: 403 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      console.error('Authorization failed:', {
        projectId: project.id,
        projectOwnerId: project.ownerId,
        projectOwnerIdType: typeof project.ownerId,
        currentUserId: prismaUser.id,
        currentUserIdType: typeof prismaUser.id,
        idsMatch: project.ownerId === prismaUser.id,
        idsEqual: String(project.ownerId) === String(prismaUser.id),
        supabaseUserId: user.id,
      });
      return NextResponse.json(
        { 
          error: 'Not authorized',
          message: 'You do not have permission to access this project. Please ensure you are signed in with the correct account.',
          debug: process.env.NODE_ENV === 'development' ? {
            projectOwnerId: project.ownerId,
            currentUserId: prismaUser.id,
          } : undefined
        },
        { status: 403 }
      );
    }

    // Step 5: Parse request body
    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch (parseError: unknown) {
      const error = parseError as Error;
      console.error('❌ Error parsing request body:', error.message);
      return NextResponse.json(
        { error: 'Invalid request', message: 'Failed to parse request body' },
        { status: 400 }
      );
    }
    
    let { message, userProvider, userModel } = body;
    const currentFile = body.currentFile;
    const useStreaming = body.stream === true;
    
    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    
    // currentFile is a path string or undefined
    const currentFilePath = currentFile;
    // userProvider / userModel: user can select OpenRouter + DeepSeek Coder from chat UI

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // ============================================
    // ENFORCE GENERATION LIMITS
    // ============================================
    const limitViolation = await enforceGenerationLimit(
      prismaUser.id,
      {
        subscriptionPlan: (prismaUser as any).subscriptionPlan ?? null,
        subscriptionStatus: (prismaUser as any).subscriptionStatus ?? null,
        subscriptionEndDate: (prismaUser as any).subscriptionEndDate ?? null,
        trialStartDate: (prismaUser as any).trialStartDate ?? null,
        trialEndDate: (prismaUser as any).trialEndDate ?? null,
      },
      userProvider ?? undefined,
      prismaUser.email
    );
    if (limitViolation) {
      return NextResponse.json(limitViolation.body, { status: limitViolation.status });
    }

    // Check credit balance
    const creditViolation = await checkCreditBalance(
      prismaUser.id,
      {
        subscriptionPlan: (prismaUser as any).subscriptionPlan ?? null,
        subscriptionStatus: (prismaUser as any).subscriptionStatus ?? null,
        subscriptionEndDate: (prismaUser as any).subscriptionEndDate ?? null,
        trialStartDate: (prismaUser as any).trialStartDate ?? null,
        trialEndDate: (prismaUser as any).trialEndDate ?? null,
      }
    );
    if (creditViolation) {
      return NextResponse.json(creditViolation.body, { status: creditViolation.status });
    }

    // ============================================
    // CREATE SCAFFOLD FILES FIRST (BEFORE AI REQUEST)
    // ============================================
    // Ensure scaffold files exist so preview renders immediately
    // This happens BEFORE AI client creation so users see something right away
    
    const questionnaireData: QuestionnaireData = project.questionnaireData as QuestionnaireData || {};
    
    // Determine language from questionnaire or default to JavaScript
    const projectLanguage = questionnaireData?.language || 'javascript';
    const useTypeScript = projectLanguage === 'typescript';
    const fileExtension = useTypeScript ? 'tsx' : 'jsx';
    const indexExtension = useTypeScript ? 'ts' : 'js';
    
    // Check for existing files to prevent duplicates
    const existingFiles = project.files || [];
    const hasAppJsx = existingFiles.some((f: ProjectFile) => f.path.includes('App.jsx'));
    const hasAppTsx = existingFiles.some((f: ProjectFile) => f.path.includes('App.tsx'));
    const hasIndexJs = existingFiles.some((f: ProjectFile) => f.path.includes('index.js'));
    const hasIndexTs = existingFiles.some((f: ProjectFile) => f.path.includes('index.ts'));
    const hasIndexHtml = existingFiles.some((f: ProjectFile) => f.path === 'index.html' || f.name === 'index.html');
    
    const hasScaffoldFiles = hasAppJsx || hasAppTsx || hasIndexJs || hasIndexTs || hasIndexHtml ||
      project.files?.some((f: ProjectFile) => f.path.includes('App.css')) || false;
    const frameworkPreference = questionnaireData?.frameworkPreference;
    const frameworkForScaffold = (frameworkPreference && frameworkPreference !== 'auto')
      ? frameworkPreference
      : (project.framework || 'react');
    
    // Track scaffold creation for response
    let scaffoldCreated = 0;
    
    // Create scaffold files if they don't exist (works for all providers, not just Groq)
    if (!hasScaffoldFiles) {
      console.log(`\n📦 Creating scaffold files for framework: ${frameworkForScaffold}`);
      console.log('='.repeat(60));
      
      try {
        const scaffoldFiles = getScaffoldFiles(frameworkForScaffold);
        let scaffoldSkipped = 0;
        
        // Create a visible default App component
        const defaultAppContent = DEFAULT_APP_CONTENT;
        
        for (const scaffoldFile of scaffoldFiles) {
          // Adjust file extensions based on project language
          let filePath = scaffoldFile.path;
          let fileName = scaffoldFile.name;
          let fileContent = scaffoldFile.content;
          
          // Replace extensions if TypeScript is used
          if (useTypeScript) {
            filePath = filePath.replace(/\.jsx?$/i, '.tsx').replace(/\.js$/i, '.ts');
            fileName = fileName.replace(/\.jsx?$/i, '.tsx').replace(/\.js$/i, '.ts');
            // Remove import React statements (not needed in modern React)
            fileContent = fileContent.replace(/import\s+React\s+from\s+['"]react['"];?\s*/g, '');
          }
          
          // Use custom default App component instead of scaffold default
          if (scaffoldFile.isMain && (filePath.includes('App.') || fileName.includes('App.'))) {
            fileContent = defaultAppContent;
            console.log(`  🎨 Using custom default App component for immediate rendering`);
          }
          
          // Check if file already exists
          const fileExists = existingFiles.some((f: ProjectFile) => f.path === filePath);
          if (fileExists) {
            console.log(`  ⏭️ Skipping existing file: ${filePath}`);
            scaffoldSkipped++;
            continue;
          }
          
          // Create scaffold file
          try {
            await prisma.appFile.create({
              data: {
                projectId: id,
                path: filePath,
                name: fileName,
                content: fileContent,
                language: scaffoldFile.language,
                isMain: scaffoldFile.isMain,
              },
            });
            console.log(`  ✅ Created scaffold file: ${filePath}`);
            scaffoldCreated++;
          } catch (scaffoldError: unknown) {
            const errorMessage = scaffoldError instanceof Error ? scaffoldError.message : 'Unknown error';
            console.error(`  ❌ Error creating scaffold file ${filePath}:`, errorMessage);
          }
        }
        
        console.log(`\n📊 Scaffold creation summary:`);
        console.log(`  Created: ${scaffoldCreated} files`);
        console.log(`  Skipped: ${scaffoldSkipped} files (already exist)`);
        console.log(`  🎨 Default component ready for immediate rendering`);
        console.log('='.repeat(60) + '\n');
        
        // Refresh existing files list after scaffold creation
        if (scaffoldCreated > 0) {
          const updatedProject = await prisma.appProject.findUnique({
            where: { id },
            include: { files: true },
          });
          if (updatedProject) {
            project.files = updatedProject.files;
            existingFiles.push(...updatedProject.files.filter((f: ProjectFile) => 
              !existingFiles.some((ef: ProjectFile) => ef.path === f.path)
            ));
            
            console.log(`  🔄 Default component created - preview should auto-refresh`);
          }
        }
      } catch (scaffoldError: unknown) {
        console.error('❌ Error creating scaffold files:', scaffoldError);
        // Don't fail the request - continue without scaffold
      }
    } else if (hasScaffoldFiles) {
      console.log(`✅ Scaffold files already exist, skipping creation`);
    }
    
    // ============================================
    // AI PROVIDER SELECTION (Groq Only - Currently Disabled)
    // ============================================
    
    // Check if this is a "Create default React app" request - if so, return early without AI generation
    const isDefaultAppRequest = message.toLowerCase().trim() === 'create default react app' || 
                                 message.toLowerCase().trim() === 'create default app' ||
                                 message.toLowerCase().includes('create default react app');
    
    // If no AI provider OR this is a default app request, return early with scaffold files created
    if (!hasAIClient() || isDefaultAppRequest) {
      const reason = isDefaultAppRequest ? 'Default app request - skipping AI generation' : 'No AI provider configured (set GROQ_API_KEY or OPENROUTER_API_KEY)';
      console.log(`⚠️ ${reason} - returning early with scaffold files`);
      
      // Get list of created scaffold files for response
      const scaffoldFilePaths: string[] = [];
      if (scaffoldCreated > 0) {
        const updatedProject = await prisma.appProject.findUnique({
          where: { id },
          include: { files: { orderBy: { path: 'asc' } } },
        });
        if (updatedProject) {
          scaffoldFilePaths.push(...updatedProject.files.map((f: { path: string }) => f.path));
        }
      } else if (hasScaffoldFiles) {
        scaffoldFilePaths.push(...(project.files || []).map((f: { path: string }) => f.path));
      }
      
      return NextResponse.json({
        response: scaffoldCreated > 0 
          ? `✅ Default React app created! You can now see your app in the preview.`
          : `✅ Project is ready! Scaffold files already exist.`,
        suggestions: [
          scaffoldCreated > 0 
            ? `✅ Created ${scaffoldCreated} scaffold file(s): ${scaffoldFilePaths.join(', ')}`
            : `✅ Scaffold files already exist: ${scaffoldFilePaths.join(', ')}`,
          '🔄 Preview should auto-refresh to show your app'
        ],
        filesCreated: scaffoldFilePaths.map(path => ({ path, success: true, validated: true })),
        provider: 'none',
        model: 'none',
        summary: {
          totalFiles: scaffoldFilePaths.length,
          successful: scaffoldFilePaths.length,
          validated: scaffoldFilePaths.length,
          warnings: 0,
          failed: 0,
          provider: 'none',
          filePaths: scaffoldFilePaths,
          hasDefaultComponent: scaffoldCreated > 0 || hasScaffoldFiles
        }
      });
    }
    
    // Step 6: Create AI client (Groq, OpenRouter, OpenAI, or Anthropic; user can select via userProvider/userModel)
    const validProviders: AIProvider[] = ['groq', 'openrouter', 'openai', 'anthropic'];
    let client;
    try {
      const clientResult = createAIClient({
        userProvider: validProviders.includes(userProvider as AIProvider) ? (userProvider as AIProvider) : undefined,
        userModel: typeof userModel === 'string' ? userModel : undefined,
      });
      client = clientResult.client;
      model = clientResult.model;
      provider = clientResult.provider;
    } catch (clientError: unknown) {
      console.error('❌ Error creating AI client:', clientError);
      const errorMessage = clientError instanceof Error ? clientError.message : String(clientError);
      // Even if AI client fails, scaffold files are created, so return success
      return NextResponse.json({
        response: scaffoldCreated > 0 
          ? `✅ Default React component created! Preview should render now. AI client configuration error: ${errorMessage}`
          : `⚠️ AI client configuration error: ${errorMessage}. Scaffold files already exist.`,
        suggestions: [
          scaffoldCreated > 0 
            ? `✅ Created ${scaffoldCreated} scaffold file(s) - preview should render now`
            : `✅ Scaffold files already exist`,
          `⚠️ AI client error: ${errorMessage}`
        ],
        filesCreated: scaffoldCreated > 0 ? [{ path: 'scaffold', success: true, validated: true }] : [],
        provider: 'none',
        model: 'none',
        summary: {
          totalFiles: scaffoldCreated,
          successful: scaffoldCreated,
          validated: scaffoldCreated,
          warnings: 0,
          failed: 0,
          provider: 'none',
          filePaths: [],
          hasDefaultComponent: scaffoldCreated > 0 || hasScaffoldFiles
        }
      });
    }
    
    // Dynamic max output tokens per provider — Claude/OpenAI support higher limits for more complete apps
    const maxOutputTokens = getMaxOutputTokens(provider as AIProvider, model);
    console.log(`✅ Using ${provider.toUpperCase()}:`, {
      model: model,
      maxNewTokens: maxOutputTokens
    });

    const existingFilePaths = project.files?.map((f: { path: string }) => f.path) || [];
    let plan: PlannerPlan | null = null;
    let taskPlan: ArchitectTaskPlan | null = null;

    // ============================================
    // STREAMING MODE: Return SSE response and run pipeline in background
    // ============================================
    if (useStreaming) {
      const { stream: sseStream, emit, close } = createSSEStream();
      const slowProvider = isSlowProvider(provider as AIProvider, model);

      // Run pipeline in background (not awaited — response is returned immediately)
      (async () => {
        const timer = createGenerationTimer();
        let activeClient = client;
        let activeModel = model;
        let activeProvider = provider;
        let usedFallback = false;
        let streamUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
        let streamGenerationId: string | undefined;
        let streamTtfbMs: number | undefined;

        try {
          let promptRes;
          let streamPlan: PlannerPlan | null = null;

          // ── FULL PATH for ALL providers: Plan → Architect → Code ──
          const SCAFFOLD_PATHS_S = new Set([
            'index.html', 'src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx',
            'src/index.css', 'src/index.js', 'src/index.ts',
            'README.md', 'package.json', 'vite.config.js', 'vite.config.ts',
          ]);
          const hasUserFiles = existingFilePaths.some((p: string) => !SCAFFOLD_PATHS_S.has(p));

          if (!hasUserFiles) {
            emit({ type: 'status', data: 'planning' });
            try {
              const plannerPrompt = buildPlannerPrompt(message, questionnaireData);
              const planRes = await activeClient.chat.completions.create({
                model: activeModel,
                messages: [
                  { role: 'system', content: 'You are a product planner. Output valid JSON only: {"name":"","description":"","techstack":"","features":[],"files":[{"path":"","purpose":""}]}' },
                  { role: 'user', content: plannerPrompt },
                ],
                temperature: 0.4,
                max_tokens: 1024,
                stream: false,
              });
              streamPlan = parsePlannerResponse(planRes.choices[0]?.message?.content || '');

              // Send the plan to the client so user can see what will be built
              if (streamPlan) {
                emit({ type: 'plan', data: streamPlan });
              }

              if (streamPlan?.files?.length) {
                emit({ type: 'status', data: 'architecting' });
                const archPrompt = buildArchitectPrompt(streamPlan, existingFilePaths);
                const archRes = await activeClient.chat.completions.create({
                  model: activeModel,
                  messages: [
                    { role: 'system', content: 'You are a software architect. Output valid JSON only: {"implementationSteps":[{"filepath":"","taskDescription":"","priority":"high|medium|low"}]}' },
                    { role: 'user', content: archPrompt },
                  ],
                  temperature: 0.4,
                  max_tokens: 1024,
                  stream: false,
                });
                const archResult = parseArchitectResponse(archRes.choices[0]?.message?.content || '');
                if (archResult) {
                  emit({ type: 'architecture', data: archResult });
                }
              }
            } catch (err) {
              console.warn('Planner/Architect failed in stream mode:', err);
            }
          }

          emit({ type: 'status', data: 'coding' });

          // ── Fetch relevant images from Pexels (runs for ALL generations, not just first) ──
          let imagePromptSection = '';
          if (process.env.PEXELS_API_KEY) {
            try {
              const { buildImageMap, formatImageMapForPrompt, clearImageCache } = await import('@/lib/app-builder/image-search');
              clearImageCache();
              const appType = questionnaireData?.appType || streamPlan?.name || message.slice(0, 50);
              const brandName = questionnaireData?.brandName || streamPlan?.name || '';
              const features: string[] = streamPlan?.features || questionnaireData?.requiredFeatures || [];
              const imageMap = await buildImageMap(appType, brandName, features);
              imagePromptSection = formatImageMapForPrompt(imageMap);
              if (Object.keys(imageMap).length > 0) {
                console.log(`🖼️ Fetched ${Object.keys(imageMap).length} real images from Pexels`);
              }
            } catch (imgErr) {
              console.warn('Image search failed (non-blocking):', imgErr);
            }
          }
          promptRes = buildAppBuilderPrompts({
            message: message + imagePromptSection,
            questionnaireData,
            frameworkForScaffold,
            useTypeScript,
            existingFilePaths,
            hasScaffoldFiles,
            fileExtension,
            plan: streamPlan,
            taskPlan: null,
            currentFilePath,
            projectFiles: project.files as unknown as { path: string; name: string; content: string }[],
          });

          // Also inject image URLs into system prompt so AI can't miss them
          if (imagePromptSection) {
            promptRes.systemPrompt += '\n\n' + imagePromptSection;
          }

          // ── Stream AI coder response (with fallback on failure) ──
          const coderParams = getStageParams('coder');
          let fullResponse = '';

          const streamWithProvider = async (aiClient: typeof client, aiModel: string, aiMaxTokens: number) => {
            const streamStartMs = Date.now();
            let firstTokenMs: number | null = null;
            streamUsage = null;
            streamGenerationId = undefined;

            const completion = await aiClient.chat.completions.create({
              model: aiModel,
              messages: [
                { role: 'system', content: promptRes.systemPrompt },
                { role: 'user', content: promptRes.userMessage },
              ],
              temperature: coderParams.temperature,
              top_p: coderParams.top_p,
              max_tokens: aiMaxTokens,
              stream: true,
              stream_options: { include_usage: true },
            });
            for await (const chunk of completion) {
              if (!streamGenerationId && chunk.id) {
                streamGenerationId = chunk.id;
              }
              const delta = chunk.choices[0]?.delta?.content || '';
              if (delta) {
                if (firstTokenMs === null) firstTokenMs = Date.now();
                fullResponse += delta;
                emit({ type: 'token', data: delta });
              }
              // Final chunk may include usage data
              if ((chunk as any).usage) {
                streamUsage = (chunk as any).usage;
              }
            }
            streamTtfbMs = firstTokenMs ? firstTokenMs - streamStartMs : undefined;
            console.log(`[STREAM] Generation ID: ${streamGenerationId ?? 'none'}, Usage: ${streamUsage ? JSON.stringify(streamUsage) : 'none'}, TTFB: ${streamTtfbMs ?? 'n/a'}ms`);
          };

          try {
            await streamWithProvider(activeClient, activeModel, maxOutputTokens);
          } catch (primaryErr) {
            // ── FALLBACK: Try alternative provider on retryable errors ──
            if (isRetryableError(primaryErr)) {
              const fallback = getFallbackRoute({
                provider: activeProvider as AIProvider,
                model: activeModel,
                maxTokens: maxOutputTokens,
                isFast: !slowProvider,
                timeout: 180_000,
              });
              if (fallback) {
                console.warn(`🔄 [FALLBACK] ${activeProvider}/${activeModel} failed, trying ${fallback.provider}/${fallback.model}`);
                emit({ type: 'status', data: `fallback-${fallback.provider}` });
                usedFallback = true;
                fullResponse = ''; // Reset for fresh attempt

                const fallbackClient = createAIClient({
                  userProvider: fallback.provider,
                  userModel: fallback.model,
                });
                activeClient = fallbackClient.client;
                activeModel = fallbackClient.model;
                activeProvider = fallbackClient.provider;

                trackGeneration({
                  projectId: id,
                  userId: prismaUser.id,
                  provider,
                  model,
                  stage: 'coder',
                  durationMs: timer.elapsed(),
                  status: 'fallback',
                  filesCreated: 0,
                  errorMessage: primaryErr instanceof Error ? primaryErr.message : 'Unknown',
                  usedFallback: true,
                  fallbackProvider: fallback.provider,
                  fallbackModel: fallback.model,
                  generationId: activeProvider === 'openrouter' ? streamGenerationId : undefined,
                });

                await streamWithProvider(activeClient, activeModel, fallback.maxTokens);
              } else {
                throw primaryErr; // No fallback available
              }
            } else {
              throw primaryErr; // Not retryable
            }
          }

          // ── Parse, validate, and create files via deterministic pipeline ──
          emit({ type: 'status', data: 'creating-files' });

          const pipelineResult = await runGenerationPipeline({
            projectId: id,
            responseText: fullResponse,
            client: activeClient,
            model: activeModel,
            systemPrompt: promptRes.systemPrompt,
            maxFixRetries: 2,
            userMessage: message,
            existingFiles: project.files?.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content })),
            onFileCreated: (result) => {
              emit({ type: 'file-created', data: result });
            },
            onStatus: (status) => {
              emit({ type: 'status', data: status });
            },
          });

          const createdPaths = pipelineResult.files
            .filter(f => f.success)
            .map(f => f.path);

          if (pipelineResult.rejectedPaths.length > 0) {
            console.warn(`🛡️ [STREAM] Blocked ${pipelineResult.rejectedPaths.length} protected paths:`, pipelineResult.rejectedPaths);
          }
          if (pipelineResult.removedImports.size > 0) {
            console.warn('📦 [STREAM] Removed disallowed imports:', Object.fromEntries(pipelineResult.removedImports));
          }

          // ── Auto-retry (fast providers only) — if too few files created ──
          if (!slowProvider && !usedFallback) {
            const jsxCreated = createdPaths.filter(p => p.endsWith('.jsx') || p.endsWith('.tsx'));
            const planExpected = streamPlan?.files?.length ?? 0;

            if (jsxCreated.length < 3 && planExpected > 3) {
              emit({ type: 'status', data: 'retrying' });
              try {
                const missingFiles = (streamPlan?.files?.map(f => f.path) ?? []).filter(p => !createdPaths.includes(p));
                const retryPrompt = buildRetryPrompt(
                  `You only generated ${jsxCreated.length} component file(s) but the plan requires ${planExpected} files. Missing: ${missingFiles.join(', ')}. Generate the REMAINING files now.`,
                  fileExtension,
                );
                let retryResponse = '';
                const retryStream = await activeClient.chat.completions.create({
                  model: activeModel,
                  messages: [
                    { role: 'system', content: promptRes.systemPrompt },
                    { role: 'user', content: promptRes.userMessage },
                    { role: 'assistant', content: fullResponse },
                    { role: 'user', content: retryPrompt },
                  ],
                  temperature: coderParams.temperature,
                  top_p: coderParams.top_p,
                  max_tokens: maxOutputTokens,
                  stream: true,
                });
                for await (const chunk of retryStream) {
                  const delta = chunk.choices[0]?.delta?.content || '';
                  if (delta) {
                    retryResponse += delta;
                    emit({ type: 'token', data: delta });
                  }
                }

                // Run retry response through the pipeline too
                const retryPipeline = await runGenerationPipeline({
                  projectId: id,
                  responseText: retryResponse,
                  userMessage: message,
                  existingFiles: project.files?.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content })),
                  onFileCreated: (result) => {
                    emit({ type: 'file-created', data: result });
                  },
                });
                for (const f of retryPipeline.files) {
                  if (f.success && !createdPaths.includes(f.path)) {
                    createdPaths.push(f.path);
                  }
                }
                fullResponse += '\n\n' + retryResponse;
              } catch (retryErr) {
                console.warn('[STREAM RETRY] Failed:', retryErr);
              }
            }
          }

          // Save chat history
          try {
            const existingChat = await prisma.appChat.findFirst({ where: { projectId: id } });
            const msgs = existingChat ? (existingChat.messages as any[]) : [];
            msgs.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
            msgs.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), provider: activeProvider, model: activeModel });
            await prisma.appChat.upsert({
              where: { id: existingChat?.id || 'temp' },
              update: { messages: msgs as any, updatedAt: new Date() },
              create: { projectId: id, messages: msgs as any },
            });
          } catch { /* non-critical */ }

          // Update project timestamp
          if (createdPaths.length > 0) {
            await prisma.appProject.update({ where: { id }, data: { updatedAt: new Date() } }).catch(() => {});
          }

          void trackApiRequest(activeProvider, 'llm');

          // ── Track generation metrics ──
          trackGeneration({
            projectId: id,
            userId: prismaUser.id,
            provider: activeProvider,
            model: activeModel,
            stage: 'coder',
            durationMs: timer.elapsed(),
            status: 'completed',
            filesCreated: createdPaths.length,
            themePreset: (questionnaireData?.themePreset as string) || (questionnaireData?.designStyle as string) || undefined,
            usedFallback,
            inputTokens: (streamUsage as any)?.prompt_tokens,
            outputTokens: (streamUsage as any)?.completion_tokens,
            totalTokens: (streamUsage as any)?.total_tokens,
            generationId: activeProvider === 'openrouter' ? streamGenerationId : undefined,
            ttfbMs: streamTtfbMs,
          });

          emit({
            type: 'done',
            data: {
              filesCreated: createdPaths.map(p => ({ path: p, success: true })),
              summary: { totalFiles: createdPaths.length, successful: createdPaths.length, provider: activeProvider, model: activeModel },
              response: fullResponse,
            },
          });
        } catch (err) {
          trackGeneration({
            projectId: id,
            userId: prismaUser.id,
            provider: activeProvider,
            model: activeModel,
            stage: 'coder',
            durationMs: timer.elapsed(),
            status: 'failed',
            filesCreated: 0,
            errorMessage: err instanceof Error ? err.message : 'Unknown',
            generationId: activeProvider === 'openrouter' ? streamGenerationId : undefined,
          });
          emit({ type: 'error', data: { message: err instanceof Error ? err.message : 'Generation failed' } });
        } finally {
          close();
        }
      })();

      return sseResponse(sseStream);
    }

    // ============================================
    // NON-STREAMING MODE (existing behavior)
    // ============================================

    let promptResult;

    // ── FULL PATH for ALL providers: Plan → Architect → Code ──
    const SCAFFOLD_PATHS = new Set([
      'index.html', 'src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx',
      'src/index.css', 'src/index.js', 'src/index.ts',
      'README.md', 'package.json', 'vite.config.js', 'vite.config.ts',
    ]);
    const hasUserGeneratedFiles = existingFilePaths.some((p: string) => !SCAFFOLD_PATHS.has(p));
    if (!hasUserGeneratedFiles) {
      try {
        const plannerUserPrompt = buildPlannerPrompt(message, questionnaireData);
        const plannerRes = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are a product planner. Output valid JSON only: {"name":"","description":"","techstack":"","features":[],"files":[{"path":"","purpose":""}]}' },
            { role: 'user', content: plannerUserPrompt },
          ],
          temperature: 0.4,
          max_tokens: 1024,
          stream: false,
        });
        const plannerText = plannerRes.choices[0]?.message?.content || '';
        plan = parsePlannerResponse(plannerText);
        if (plan && plan.files?.length) {
          const architectUserPrompt = buildArchitectPrompt(plan, existingFilePaths);
          const architectRes = await client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: 'You are a software architect. Output valid JSON only: {"implementationSteps":[{"filepath":"","taskDescription":"","priority":"high|medium|low"}]}' },
              { role: 'user', content: architectUserPrompt },
            ],
            temperature: 0.4,
            max_tokens: 1024,
            stream: false,
          });
          const architectText = architectRes.choices[0]?.message?.content || '';
          taskPlan = parseArchitectResponse(architectText);
        }
      } catch (agentErr) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Planner/Architect step failed (continuing with direct coder):', agentErr);
        }
      }
    }

    promptResult = buildAppBuilderPrompts({
      message,
      questionnaireData,
      frameworkForScaffold,
      useTypeScript,
      existingFilePaths,
      hasScaffoldFiles,
      fileExtension,
      plan,
      taskPlan,
      currentFilePath,
      projectFiles: project.files as unknown as { path: string; name: string; content: string }[],
    });

    const systemPrompt = promptResult.systemPrompt;
    message = promptResult.userMessage;

    // Helper function to validate file integration by checking preview
    const validateFileIntegration = async (filePath: string): Promise<{ valid: boolean; error?: string; previewLength?: number }> => {
      try {
        // Reload project with updated files
        const updatedProject = await prisma.appProject.findUnique({
          where: { id },
          include: { files: { orderBy: { path: 'asc' } } },
        });

        if (!updatedProject) {
          return { valid: false, error: 'Project not found' };
        }

        // Check if we have at least one JS file (required for preview)
        const jsFiles = updatedProject.files.filter((f: { path: string }) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
        if (jsFiles.length === 0) {
          // No JS files yet - this is okay for CSS files
          if (filePath.endsWith('.css')) {
            return { valid: true };
          }
          return { valid: false, error: 'No JS files found for preview' };
        }

        // Basic syntax validation first (fast check)
        const appFile = jsFiles.find((f: { path: string; name: string }) => 
          (f.path.includes('App') || f.name.includes('App')) && 
          !f.path.includes('index')
        ) || jsFiles[0];

        if (!appFile) {
          return { valid: false, error: 'No App file found' };
        }

        const content = appFile.content;
        
        // Basic syntax checks
        // Check for basic React component structure
        const hasComponentStructure = content.includes('function') || 
                                     content.includes('const') || 
                                     content.includes('class') ||
                                     content.includes('return');
        
        const hasExport = content.includes('export') || content.includes('module.exports');
        
        // For CSS files, just check it's not empty
        if (filePath.endsWith('.css')) {
          if (content.trim().length > 0) {
            return { valid: true, previewLength: content.length };
          }
          return { valid: false, error: 'CSS file is empty' };
        }

        // For JS/JSX files, check basic structure
        if (!hasComponentStructure) {
          return { valid: false, error: 'File does not contain valid component structure' };
        }

        // Check for common syntax errors
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        // Allow some imbalance for incomplete files, but flag major issues
        if (Math.abs(openBraces - closeBraces) > 3) {
          return { valid: false, error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close` };
        }

        // If it's a main file (App file), ensure it has export
        if (filePath.includes('App') && !hasExport) {
          // This might be okay if it's being modified, but log it
          console.warn(`⚠️ App file ${filePath} doesn't have export statement`);
        }

        // Validation passed
        return { valid: true, previewLength: content.length };
      } catch (validationError: unknown) {
        console.error(`⚠️ Validation error for ${filePath}:`, validationError);
        const errorMessage = validationError instanceof Error ? validationError.message : 'Validation failed';
        return { valid: false, error: errorMessage };
      }
    };

    // ============================================
    // SANDBOXED FILE CREATION WITH VALIDATION
    // ============================================
    // Each file is created and validated individually
    // If validation fails, we log the error but continue
    
    const parseAndCreateFiles = async (responseText: string): Promise<FileCreationResult[]> => {
      
      const createdFiles: FileCreationResult[] = [];

      console.log('\n' + '='.repeat(60));
      console.log('📁 SANDBOXED FILE CREATION - STARTING');
      console.log('='.repeat(60));
      console.log('📄 Response length:', responseText.length, 'characters');
      console.log('📄 Response preview (first 500 chars):');
      console.log('-'.repeat(40));
      console.log(responseText.substring(0, 500));
      console.log('-'.repeat(40));

      // Use shared parsing from agentSchema.ts (single source of truth)
      const allMatches: Array<{ path: string; content: string }> = [];

      console.log('📝 Parsing response for file creation...');
      console.log('Response length:', responseText.length);

      // Use shared parsing from agentSchema.ts — single source of truth
      // Try structured JSON extraction first, then fall back to markdown code blocks
      const agentResult = extractAgentResponse(responseText);
      if (agentResult && agentResult.files.length > 0) {
        for (const f of agentResult.files) {
          allMatches.push({ path: f.path, content: f.content });
        }
        console.log(`✅ Extracted ${agentResult.files.length} files via JSON parsing`);
      } else {
        // Fallback: parse markdown code blocks
        const codeBlockFiles = parseCodeBlocksToFiles(responseText);
        for (const f of codeBlockFiles) {
          allMatches.push({ path: f.path, content: f.content });
        }
        console.log(`✅ Extracted ${codeBlockFiles.length} files via code block parsing`);
      }

      console.log(`📁 Total files found: ${allMatches.length}`);
      if (allMatches.length > 0) {
        allMatches.forEach((m, idx) => {
          console.log(`  ${idx + 1}. ${m.path} (${m.content.length} chars)`);
        });
      } else {
        console.warn('⚠️ NO FILES FOUND IN RESPONSE!');
        console.warn('Response preview:', responseText.substring(0, 300));
      }

      // Process each match — paths are already normalized from PASS 1/PASS 2
      for (const fileMatch of allMatches) {
        let filePath = fileMatch.path; // Already normalized
        let fileContent = fileMatch.content;
        
        console.log('🔍 Processing file:', {
          filePath,
          contentLength: fileContent.length,
          contentPreview: fileContent.substring(0, 100)
        });

        // Basic syntax validation before creating file
        // Check for common syntax errors that would break preview
        const syntaxErrors: string[] = [];
        
        // Check for orphaned export statements (e.g., "Default Header;" without definition)
        const orphanedExportPattern = /^\s*(?:Default|export\s+default)\s+(\w+)\s*;?\s*$/gm;
        const orphanedMatches = fileContent.match(orphanedExportPattern);
        if (orphanedMatches) {
          orphanedMatches.forEach((match) => {
            const componentName = match.match(/(?:Default|export\s+default)\s+(\w+)/)?.[1];
            if (componentName && !fileContent.match(new RegExp(`(?:function|const|class|var|let)\\s+${componentName}\\s*[=(]`))) {
              syntaxErrors.push(`Orphaned export: "${match.trim()}" - component ${componentName} not defined`);
            }
          });
        }
        
        // Check for unbalanced braces/parentheses
        const openBraces = (fileContent.match(/{/g) || []).length;
        const closeBraces = (fileContent.match(/}/g) || []).length;
        const openParens = (fileContent.match(/\(/g) || []).length;
        const closeParens = (fileContent.match(/\)/g) || []).length;
        
        if (Math.abs(openBraces - closeBraces) > 2) {
          syntaxErrors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
        }
        if (Math.abs(openParens - closeParens) > 2) {
          syntaxErrors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
        }
        
        // AUTO-FIX: Fix common syntax errors automatically
        let processedContent = fileContent; // Use a new variable to avoid const reassignment issues
        const fixesApplied: string[] = [];
        
        // CRITICAL FIX: Fix malformed imports/exports with missing spaces
        // Fix: import*asReactfrom'react' → import React from 'react'
        const malformedImportPattern = /import\*as(\w+)from(['"])([^'"]+)\2/g;
        if (malformedImportPattern.test(processedContent)) {
          processedContent = processedContent.replace(malformedImportPattern, (match, p1, p2, p3) => {
            fixesApplied.push(`Fixed malformed import: ${match}`);
            return `import ${p1} from ${p2}${p3}${p2}`;
          });
        }
        
        // Fix: import*{(\w+)}from → import { $1 } from
        const malformedNamedImportPattern = /import\*\{([^}]+)\}from(['"])([^'"]+)\2/g;
        if (malformedNamedImportPattern.test(processedContent)) {
          processedContent = processedContent.replace(malformedNamedImportPattern, (match, p1, p2, p3) => {
            fixesApplied.push(`Fixed malformed named import: ${match}`);
            return `import { ${p1.trim()} } from ${p2}${p3}${p2}`;
          });
        }
        
        // Fix: export*default → export default
        if (processedContent.includes('export*default')) {
          processedContent = processedContent.replace(/export\*default/g, 'export default');
          fixesApplied.push('Fixed malformed export default');
        }
        
        // Fix: return( → return (
        if (processedContent.includes('return(') && !processedContent.includes('return (')) {
          processedContent = processedContent.replace(/return\(/g, 'return (');
          fixesApplied.push('Fixed return statement spacing');
        }
        
        // Fix 1: Common typos
        if (processedContent.includes('reutrn')) {
          processedContent = processedContent.replace(/reutrn/g, 'return');
          fixesApplied.push('Fixed typo: reutrn → return');
        }
        if (processedContent.includes('improt')) {
          processedContent = processedContent.replace(/improt/g, 'import');
          fixesApplied.push('Fixed typo: improt → import');
        }
        if (processedContent.includes('exprot')) {
          processedContent = processedContent.replace(/exprot/g, 'export');
          fixesApplied.push('Fixed typo: exprot → export');
        }
        
        // Fix 2: Fix broken imports (spaces in import paths)
        processedContent = processedContent.replace(/import\s+.*?from\s+["']\s*([^"']+?)\s*["']/g, (match, path) => {
          return match.replace(path, path.trim());
        });

        // Fix 3: Fix React import (lowercase 'react' should be 'React')
        if (processedContent.includes("import react from") && !processedContent.includes("import React from")) {
          processedContent = processedContent.replace(/import\s+react\s+from\s+["']react["']/gi, "import React from 'react'");
          fixesApplied.push('Fixed: import react → import React');
        }

        // Fix 4: Fix classname → className (common React error)
        if (processedContent.includes('classname=') && !processedContent.includes('className=')) {
          processedContent = processedContent.replace(/\bclassname\s*=/gi, 'className=');
          fixesApplied.push('Fixed: classname → className');
        }

        // Fix 5: Fix export name mismatches (export default Headername when component is Header)
        const componentMatch = processedContent.match(/(?:const|function|var|let)\s+(\w+)\s*[=(]/);
        const exportMatch = processedContent.match(/export\s+default\s+(\w+)\s*;/);
        if (componentMatch && exportMatch) {
          const componentName = componentMatch[1];
          const exportName = exportMatch[1];
          if (componentName !== exportName) {
            processedContent = processedContent.replace(/export\s+default\s+\w+\s*;/g, `export default ${componentName};`);
            fixesApplied.push(`Fixed export mismatch: ${exportName} → ${componentName}`);
          }
        }
        
        // Update fileContent with processed content if fixes were applied
        if (fixesApplied.length > 0) {
          console.log(`🔧 Auto-fixed ${fixesApplied.length} issues:`, fixesApplied);
          fileContent = processedContent; // Now this works because fileContent is declared as 'let'
        }
        
        // Log syntax errors but don't block file creation (preview will show errors)
        if (syntaxErrors.length > 0) {
          console.warn(`⚠️ Syntax warnings for ${filePath}:`, syntaxErrors);
        }
        
        // Determine language from file extension
        const extension = filePath.split('.').pop()?.toLowerCase() || '';
        const languageMap: Record<string, string> = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'css': 'css',
          'html': 'html',
          'json': 'json',
          'md': 'markdown',
          'py': 'python',
          'java': 'java',
          'cpp': 'cpp',
          'c': 'c',
        };
        const language = languageMap[extension] || extension;

        // Extract filename from path
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;

        try {
          // SIMPLIFIED: Direct file creation like OpenRouter version
          const fileIndex = allMatches.indexOf(fileMatch) + 1;
          const totalFiles = allMatches.length;
          
          console.log(`\n📄 Creating file ${fileIndex}/${totalFiles}: ${filePath}`);
          
          // Validate and normalize path (simplified)
          const normalizedPath = filePath
            .replace(/\.\./g, '') // Remove path traversal
            .replace(/^\//, ''); // Remove leading slash
          
          if (normalizedPath !== filePath) {
            console.log(`  🔧 Normalized path: ${filePath} → ${normalizedPath}`);
          }
          
          // Security: Prevent path traversal and validate structure
          if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.includes('://')) {
            console.log(`  ❌ INVALID PATH - skipping: ${normalizedPath}`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: 'Invalid file path' 
            });
            continue;
          }

          // Sandbox: only allow paths that match scaffold + components (no arbitrary paths)
          const pathAllowed = isAllowedPath(normalizedPath);
          if (!pathAllowed) {
            console.log(`  ❌ SANDBOX: path not allowed - skipping: ${normalizedPath}`);
            createdFiles.push({
              path: filePath,
              success: false,
              error: `Path not allowed. Use src/App.jsx, src/components/*.jsx, src/pages/*.jsx, src/store/*.js, src/hooks/*.js, src/context/*.jsx, src/lib/*.js, or src/*.css.`,
            });
            continue;
          }
          
          // Validate file name is correct
          const fileName = normalizedPath.split('/').pop() || '';
          if (!fileName || !fileName.includes('.')) {
            console.log(`  ❌ INVALID FILENAME - skipping: ${fileName}`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: 'Invalid filename' 
            });
            continue;
          }
          
          // CRITICAL: Prevent duplicate files (App.jsx vs App.tsx, index.js vs index.ts)
          const fileBaseName = fileName.split('.')[0];
          const fileExt = fileName.split('.').pop()?.toLowerCase();
          
          // Check for duplicate App files
          if (fileBaseName.toLowerCase() === 'app') {
            const conflictingExt = fileExt === 'jsx' ? 'tsx' : fileExt === 'tsx' ? 'jsx' : null;
            if (conflictingExt) {
              const conflictingPath = normalizedPath.replace(`.${fileExt}`, `.${conflictingExt}`);
              const hasConflict = existingFiles.some((f: ProjectFile) => f.path === conflictingPath);
              if (hasConflict) {
                console.log(`  ⚠️ DUPLICATE DETECTED: ${conflictingPath} exists, skipping ${normalizedPath}`);
                createdFiles.push({ 
                  path: filePath, 
                  success: false, 
                  error: `Duplicate file: ${conflictingPath} already exists. Use consistent language.` 
                });
                continue;
              }
            }
          }
          
          // Check for duplicate index files
          if (fileBaseName.toLowerCase() === 'index') {
            const conflictingExt = fileExt === 'js' ? 'ts' : fileExt === 'ts' ? 'js' : null;
            if (conflictingExt) {
              const conflictingPath = normalizedPath.replace(`.${fileExt}`, `.${conflictingExt}`);
              const hasConflict = existingFiles.some((f: ProjectFile) => f.path === conflictingPath);
              if (hasConflict) {
                console.log(`  ⚠️ DUPLICATE DETECTED: ${conflictingPath} exists, skipping ${normalizedPath}`);
                createdFiles.push({ 
                  path: filePath, 
                  success: false, 
                  error: `Duplicate file: ${conflictingPath} already exists. Use consistent language.` 
                });
                continue;
              }
            }
          }
          
          // Enforce language consistency based on project config
          if (fileBaseName.toLowerCase() === 'app' && fileExt !== fileExtension) {
            console.log(`  ⚠️ LANGUAGE MISMATCH: Project uses ${fileExtension}, but file is .${fileExt}. Skipping.`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: `Language mismatch: Project uses ${useTypeScript ? 'TypeScript' : 'JavaScript'}, but file uses .${fileExt}` 
            });
            continue;
          }
          
          if (fileBaseName.toLowerCase() === 'index' && fileExt !== indexExtension) {
            console.log(`  ⚠️ LANGUAGE MISMATCH: Project uses ${indexExtension}, but file is .${fileExt}. Skipping.`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: `Language mismatch: Project uses ${useTypeScript ? 'TypeScript' : 'JavaScript'}, but file uses .${fileExt}` 
            });
            continue;
          }

          // Determine if this is a main file (App file or index file)
          const isMain = normalizedPath.includes('index') || 
                        normalizedPath.includes(`App.${fileExtension}`) || 
                        normalizedPath.includes(`App.${indexExtension}`) ||
                        normalizedPath.includes('App.jsx') || 
                        normalizedPath.includes('App.tsx') ||
                        normalizedPath.includes('App.js') ||
                        normalizedPath.includes('App.ts') ||
                        normalizedPath.includes('main');
          console.log(`  📝 Is main file: ${isMain}`);

          // CRITICAL: Create file IMMEDIATELY (incremental creation like Cursor/Lovable)
          // Add small delay between files to allow preview to update and render
          if (createdFiles.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between files
          }
          // This ensures files appear in UI as soon as they're parsed
          try {
            // Check if file already exists
            const existingFile = await prisma.appFile.findUnique({
              where: {
                projectId_path: {
                  projectId: id,
                  path: normalizedPath,
                },
              },
            });
            
            if (existingFile) {
              console.log(`  📝 File exists - UPDATING with new content (Cursor-like editing)`);
              console.log(`  📝 Existing content length: ${existingFile.content.length} chars`);
              console.log(`  📝 New content length: ${fileContent.length} chars`);
              console.log(`  📝 Content changed: ${existingFile.content !== fileContent}`);
            } else {
              console.log(`  📝 File is NEW - creating immediately`);
            }

            // If setting as main, unset other main files
            if (isMain) {
              await prisma.appFile.updateMany({
                where: { projectId: id, isMain: true },
                data: { isMain: false },
              });
            }

            // Create or update file using Prisma - IMMEDIATE creation
            
            // DIAGNOSTIC: Check file quality before saving
            const hasImports = /import\s+/.test(fileContent);
            const hasExports = /export\s+/.test(fileContent);
            const hasComponent = /(?:function|const|class)\s+[A-Z]/.test(fileContent);
            const hasJSX = /<[A-Z]/.test(fileContent) || /<div/.test(fileContent);
            const importCount = (fileContent.match(/import\s+/g) || []).length;
            const exportCount = (fileContent.match(/export\s+/g) || []).length;
            
            console.log(`  📊 File quality check (${provider}):`, {
              path: normalizedPath,
              hasImports,
              importCount,
              hasExports,
              exportCount,
              hasComponent,
              hasJSX,
              contentLength: fileContent.length,
              firstLine: fileContent.split('\n')[0]?.substring(0, 80)
            });
            
            // CRITICAL: Use upsert to update scaffold files or create new ones
            // This ensures AI-generated files replace scaffold files when paths match
            const upsertResult = await prisma.appFile.upsert({
              where: {
                projectId_path: {
                  projectId: id,
                  path: normalizedPath,
                },
              },
              update: {
                content: fileContent,
                language: language,
                isMain: isMain,
                name: fileName,
                updatedAt: new Date(), // Ensure updatedAt is refreshed
              },
              create: {
                projectId: id,
                path: normalizedPath,
                name: fileName,
                content: fileContent,
                language: language,
                isMain: isMain,
              },
            });

            const wasUpdate = upsertResult.updatedAt && upsertResult.createdAt && 
                              upsertResult.updatedAt.getTime() > upsertResult.createdAt.getTime();
            console.log(`  ${wasUpdate ? '🔄 Updated' : '✅ Created'} file in database: ${normalizedPath}`);
            
            // Trigger preview refresh after each file (incremental rendering)
            // This allows the preview to update as each file is added
            try {
              // Dispatch event or trigger preview refresh mechanism here if needed
              // The frontend should listen for file updates and refresh preview
              console.log(`  🔄 Preview should refresh for: ${normalizedPath}`);
            } catch (previewError) {
              // Don't fail file creation if preview refresh fails
              console.warn('  ⚠️ Preview refresh notification failed (non-critical):', previewError);
            }
            
            // Mark file as successfully created FIRST (before validation)
            const fileEntry: { path: string; success: boolean; validated?: boolean; validationError?: string; sandboxIssues?: string[] } = { 
              path: normalizedPath, // Use normalized path, not original
              success: true, 
              validated: true // Will be updated by sandbox validation below
            };
            createdFiles.push(fileEntry);
            // Small delay after each file creation to allow preview to update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // ============================================
            // SANDBOX VALIDATION - Validate file one by one
            // ============================================
            // Validate each file immediately after creation to catch issues early
            try {
              const savedFile = await prisma.appFile.findUnique({
                where: {
                  projectId_path: {
                    projectId: id,
                    path: normalizedPath,
                  },
                },
              });
              
              if (savedFile) {
                // Run validation on this single file
                const validation = validateProjectFiles([savedFile]);
                
                // Check for imports (will be removed in preview)
                const hasImports = /import\s+/.test(savedFile.content);
                const importCount = (savedFile.content.match(/import\s+/g) || []).length;
                
                // Check component structure
                const hasComponent = /(?:function|const|class)\s+[A-Z]/.test(savedFile.content);
                const hasReturn = savedFile.content.includes('return');
                const hasJSX = /<[A-Z]/.test(savedFile.content) || /<div/.test(savedFile.content);
                
                // Check syntax errors
                const openBraces = (savedFile.content.match(/{/g) || []).length;
                const closeBraces = (savedFile.content.match(/}/g) || []).length;
                const openParens = (savedFile.content.match(/\(/g) || []).length;
                const closeParens = (savedFile.content.match(/\)/g) || []).length;
                
                const sandboxIssues: string[] = [];
                if (hasImports) {
                  sandboxIssues.push(`${importCount} import statement(s) - will be removed in preview`);
                }
                if (!validation.valid) {
                  validation.errors.forEach(e => sandboxIssues.push(`Validation error: ${e.message}`));
                }
                if (validation.warnings.length > 0) {
                  validation.warnings.forEach(w => sandboxIssues.push(`Warning: ${w.message}`));
                }
                if (hasComponent && !hasReturn && hasJSX) {
                  sandboxIssues.push('Component defined but missing return statement');
                }
                if (Math.abs(openBraces - closeBraces) > 2) {
                  sandboxIssues.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
                }
                if (Math.abs(openParens - closeParens) > 2) {
                  sandboxIssues.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
                }
                
                // Log sandbox validation results
                if (sandboxIssues.length > 0) {
                  console.log(`  ⚠️ Sandbox validation issues for ${normalizedPath}:`);
                  sandboxIssues.forEach(issue => console.log(`    - ${issue}`));
                } else {
                  console.log(`  ✅ Sandbox validation passed for ${normalizedPath}`);
                }
                
                // Update fileEntry with validation results
                fileEntry.validated = validation.valid;
                if (!validation.valid && validation.errors.length > 0) {
                  fileEntry.validationError = validation.errors[0].message;
                }
                if (sandboxIssues.length > 0) {
                  fileEntry.sandboxIssues = sandboxIssues;
                }
              }
            } catch (validationError: unknown) {
              const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
              console.error(`  ⚠️ Error during sandbox validation for ${normalizedPath}:`, errorMessage);
              // Don't fail file creation if validation fails
            }
            
            // Notify frontend immediately (would be better with streaming, but this works)
            // The frontend will refresh when it receives the response
          } catch (dbError: unknown) {
            console.error(`  ❌ Database error creating file ${normalizedPath}:`, dbError);
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
            createdFiles.push({
              path: normalizedPath,
              success: false,
              error: `Database error: ${errorMessage}`
            });
            continue;
          }
          
          console.log(`  ✅ File creation complete: ${normalizedPath}`);
        } catch (fileError: unknown) {
          console.error(`❌ Error creating file ${filePath}:`, fileError);
          const errorMessage = fileError instanceof Error ? fileError.message : String(fileError) || 'Unknown error';
          createdFiles.push({ 
            path: filePath, 
            success: false, 
            error: errorMessage
          });
        }
      }
      
      const summary = {
        totalFound: createdFiles.length,
        successful: createdFiles.filter((f: FileCreationResult) => f.success).length,
        failed: createdFiles.filter((f: FileCreationResult) => !f.success).length,
        validated: createdFiles.filter((f: FileCreationResult) => f.validated === true).length,
        validationFailed: createdFiles.filter((f: FileCreationResult) => f.validated === false).length,
        files: createdFiles.map(f => ({ 
          path: f.path, 
          success: f.success, 
          validated: f.validated,
          error: f.error,
          validationError: f.validationError
        }))
      };

      console.log('📊 File creation summary:', summary);
      console.log('✅ Returning createdFiles array with', createdFiles.length, 'files');
      
      if (summary.validationFailed > 0) {
        console.warn(`⚠️ ${summary.validationFailed} file(s) created but failed validation:`);
        createdFiles
          .filter((f: FileCreationResult) => f.validated === false)
          .forEach((f: FileCreationResult) => {
            console.warn(`   - ${f.path}: ${f.validationError || 'Unknown validation error'}`);
          });
      }

      // VALIDATE FILES: Run validation on created files
      if (createdFiles.length > 0) {
        const successfulFiles = createdFiles.filter((f: FileCreationResult) => f.success);
        console.log(`\n🔍 Validating ${successfulFiles.length} successfully created files...`);
        
        try {
          // Fetch created files from database for validation
          const filePaths = successfulFiles.map(f => f.path);
          const dbFiles = await prisma.appFile.findMany({
            where: {
              projectId: id,
              path: { in: filePaths }
            }
          });
          
          // Validate each file
          const validationResults = await Promise.all(
            dbFiles.map(async (file: { path: string; content: string }) => {
              const validation = validateProjectFiles([file]);
              const hasImports = /import\s+/.test(file.content);
              const importCount = (file.content.match(/import\s+/g) || []).length;
              
              return {
                path: file.path,
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings,
                hasImports,
                importCount,
                contentLength: file.content.length,
                provider: provider // Track which provider created this file
              };
            })
          );
          
          // Log validation summary
          const validFiles = validationResults.filter((r: { valid: boolean }) => r.valid);
          const invalidFiles = validationResults.filter((r: { valid: boolean }) => !r.valid);
          const filesWithImports = validationResults.filter((r: { hasImports: boolean }) => r.hasImports);
          
          console.log(`\n📊 File Validation Summary (${provider}):`);
          console.log(`  ✅ Valid files: ${validFiles.length}/${validationResults.length}`);
          console.log(`  ❌ Invalid files: ${invalidFiles.length}/${validationResults.length}`);
          console.log(`  📦 Files with imports: ${filesWithImports.length}/${validationResults.length}`);
          
          if (invalidFiles.length > 0) {
            console.log(`\n⚠️ Files with validation errors:`);
            invalidFiles.forEach((f: { path: string; errors: Array<{ message: string }> }) => {
              console.log(`  - ${f.path}:`);
              f.errors.forEach((e) => console.log(`    ❌ ${e.message}`));
            });
          }
          
          if (filesWithImports.length > 0) {
            console.log(`\n📦 Files containing import statements:`);
            filesWithImports.forEach((f: { path: string; importCount: number }) => {
              console.log(`  - ${f.path}: ${f.importCount} import(s)`);
            });
          }
          
          // Update createdFiles with validation results
          createdFiles.forEach(cf => {
            const validation = validationResults.find((v: { path: string }) => v.path === cf.path);
            if (validation) {
              cf.validated = validation.valid;
              if (!validation.valid && validation.errors.length > 0) {
                cf.validationError = validation.errors[0].message;
              }
            }
          });
        } catch (validationError: any) {
          console.error('❌ Error during file validation:', validationError);
        }
      }
      
      // CRITICAL: Verify files were actually saved to database
      if (createdFiles.length > 0) {
        const successfulPaths = createdFiles.filter((f: FileCreationResult) => f.success).map((f: FileCreationResult) => f.path);
        console.log('🔍 Verifying files in database:', successfulPaths);
        
        try {
          const verifyFiles = await prisma.appFile.findMany({
            where: {
              projectId: id,
              path: { in: successfulPaths }
            },
            select: { path: true, name: true }
          });
          
          console.log('✅ Verified files in database:', verifyFiles.length, 'of', successfulPaths.length);
          if (verifyFiles.length !== successfulPaths.length) {
            console.warn('⚠️ Mismatch: Some files may not have been saved');
            const savedPaths = verifyFiles.map((f: { path: string }) => f.path);
            const missingPaths = successfulPaths.filter(p => !savedPaths.includes(p));
            console.warn('Missing files:', missingPaths);
          }
        } catch (verifyError) {
          console.error('❌ Error verifying files:', verifyError);
        }
      }

      // If no files were created, log warning with more details
      if (createdFiles.length === 0) {
        console.warn('⚠️ No files were created from the response!');
        console.warn('Response length:', responseText.length);
        console.warn('Response sample (first 2000 chars):', responseText.substring(0, 2000));
        console.warn('Looking for code blocks with pattern: /```(?:file:)?\\s*([^\\n`]+?)(?:\\n|$)([\\s\\S]*?)```/g');

        // Check if there are any code blocks at all
        const codeBlocks = responseText.match(/```[\s\S]*?```/g);
        console.warn('Total code blocks found in response:', codeBlocks?.length || 0);
        if (codeBlocks) {
          console.warn('First few code blocks:', codeBlocks.slice(0, 3).map(block => block.substring(0, 100) + '...'));
        }
      }

      // Fallback: ONLY create fallback files if:
      // 1. No files were created (createdFiles.length === 0)
      // 2. AND no code blocks exist in response (!hasCodeBlocks)
      // 3. AND project has no existing files (to avoid overwriting user's work)
      // CRITICAL: This prevents creating unnecessary files when user already has files
      const codeBlocksMatch = responseText.match(/```[\s\S]*?```/g);
      const hasCodeBlocks = (codeBlocksMatch?.length || 0) > 0;
      const projectHasFiles = (project.files?.length || 0) > 0;
      
      // Only create fallback if truly no files exist and no code was generated
      if (createdFiles.length === 0 && !hasCodeBlocks && !projectHasFiles) {
        console.warn('⚠️ No files were parsed from AI response, no code blocks found, and project has no files. Creating basic fallback files...');

        const fallbackFiles = [
          {
            path: `src/App.${fileExtension}`,
            name: `App.${fileExtension}`,
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${project.brandName || project.title || 'My App'}</h1>
        <p>${project.tagline || 'Welcome to my app'}</p>
      </header>
    </div>
  );
}

export default App;`,
            language: useTypeScript ? 'typescript' : 'javascript',
            isMain: true
          },
          {
            path: `src/index.${indexExtension}`,
            name: `index.${indexExtension}`,
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
            language: useTypeScript ? 'typescript' : 'javascript',
            isMain: false
          },
          {
            path: 'src/App.css',
            name: 'App.css',
            content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 40px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.App-header h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.App-header p {
  font-size: 1.2rem;
}`,
            language: 'css',
            isMain: false
          }
        ];

        // Create fallback files
        for (const file of fallbackFiles) {
          try {
            await prisma.appFile.upsert({
              where: {
                projectId_path: {
                  projectId: id,
                  path: file.path,
                },
              },
              update: {
                content: file.content,
                language: file.language,
                isMain: file.isMain,
                name: file.name,
              },
              create: {
                projectId: id,
                path: file.path,
                name: file.name,
                content: file.content,
                language: file.language,
                isMain: file.isMain,
              },
            });
            createdFiles.push({ path: file.path, success: true });
            console.log('✅ Created fallback file:', file.path);
          } catch (error) {
            console.error('❌ Error creating fallback file:', file.path, error);
            createdFiles.push({ path: file.path, success: false, error: 'Fallback creation failed' });
          }
        }
      }

      // ============================================
      // FILE CREATION SUMMARY
      // ============================================
      if (process.env.NODE_ENV === 'development') {
        const summary = {
          total: createdFiles.length,
          successful: createdFiles.filter((f: FileCreationResult) => f.success).length,
          failed: createdFiles.filter((f: FileCreationResult) => !f.success).length,
          validated: createdFiles.filter((f: FileCreationResult) => f.validated === true).length,
        };
        console.log(`[FILE] Summary: ${summary.successful}/${summary.total} successful, ${summary.validated} validated`);
      }
      
      return createdFiles;
    };

    // Call AI API
    let response: string = '';
    let requestSuccess = false;
    const nsTimer = createGenerationTimer();
    let nsUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
    let nsGenerationId: string | undefined;
    
    // Calculate token usage (rough estimate: 1 token ≈ 4 characters)
    const systemTokens = Math.ceil(systemPrompt.length / 4);
    const userTokens = Math.ceil(message.length / 4);
    const totalInputTokens = systemTokens + userTokens;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${provider.toUpperCase()}] Request: ~${totalInputTokens} input tokens, max ${maxOutputTokens} output tokens`);
      if (totalInputTokens > 12000) {
        console.warn(`[${provider.toUpperCase()}] Warning: Input tokens exceed 12K - may be truncated`);
      }
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Abort before Vercel kills the function (2 min < 5 min maxDuration)
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000);
      
      const nsCoderParams = getStageParams('coder');
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: nsCoderParams.temperature,
        top_p: nsCoderParams.top_p,
        max_tokens: maxOutputTokens,
        stream: false,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (process.env.NODE_ENV === 'development') {
        const responseLength = completion.choices[0]?.message?.content?.length || 0;
        console.log(`[${provider.toUpperCase()}] Response received: ${responseLength} chars from ${provider}/${model}`);
      }

      response = completion.choices[0]?.message?.content || '';
      nsUsage = completion.usage ?? undefined;
      nsGenerationId = provider === 'openrouter' ? completion.id : undefined;

      // Validate response quality
      if (!response || response.trim().length < 50) {
        console.warn('⚠️ Response too short, might be incomplete');
        throw new Error(`${provider.toUpperCase()} returned an empty or incomplete response`);
      }
      
      // Check if response contains parseable output (JSON or code blocks)
      const hasCodeBlocks = /```/.test(response);
      const hasJsonFiles = /\{\s*"files"\s*:/.test(response);
      if (!hasCodeBlocks && !hasJsonFiles) {
        console.warn('⚠️ Response has neither JSON nor code blocks');
        console.warn('Response preview:', response.substring(0, 500));

        // Retry with unified format instruction (works for both Groq and OpenRouter)
        const strictMessage = buildRetryPrompt(message, fileExtension);
        console.warn('🔁 Retrying with unified output format...');
        const retryCompletion = await client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: strictMessage },
          ],
          temperature: 0.4,
          max_tokens: maxOutputTokens,
          stream: false,
        });
        const retryResponse = retryCompletion.choices[0]?.message?.content || '';
        const retryHasCodeBlocks = retryResponse && /```/.test(retryResponse);
        const retryHasJson = retryResponse && /\{\s*"files"\s*:/.test(retryResponse);
        if (retryResponse && (retryHasCodeBlocks || retryHasJson)) {
          response = retryResponse;
          console.log(`✅ Retry returned ${retryHasJson ? 'JSON' : 'code blocks'}`);
        }
      }
      
      requestSuccess = true;
      void trackApiRequest(provider, 'llm');
      trackGeneration({
        projectId: id,
        userId: prismaUser.id,
        provider,
        model,
        stage: 'coder',
        durationMs: nsTimer.elapsed(),
        status: 'completed',
        filesCreated: 0, // Updated later after file parsing
        inputTokens: nsUsage?.prompt_tokens,
        outputTokens: nsUsage?.completion_tokens,
        totalTokens: nsUsage?.total_tokens,
        generationId: nsGenerationId,
      });
    } catch (error: unknown) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      const err = error as Error & { code?: string; status?: number; type?: string };
      console.log('\n' + '='.repeat(80));
      console.log(`❌ ${provider.toUpperCase()} REQUEST FAILED`);
      console.log('='.repeat(80));
      
      // Enhanced error logging
      const errorDetails = {
        message: err.message || 'Unknown error',
        name: err.name,
        code: err.code,
        status: err.status,
        type: err.type,
        errorType: 'UNKNOWN' as string,
        responseData: undefined as string | undefined,
      };
      
      // Check for timeout
      if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        errorDetails.errorType = 'TIMEOUT';
        errorDetails.message = 'Request timed out after 2 minutes';
      }

      // Check for network errors
      if (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('ECONNREFUSED')) {
        errorDetails.errorType = 'NETWORK_ERROR';
        errorDetails.message = `Cannot connect to ${provider} API`;
      }
      
      // Check for API errors
      if (err.status || (err as any).response) {
        errorDetails.errorType = 'API_ERROR';
        if ((err as any).response) {
          try {
            errorDetails.responseData = typeof (err as any).response === 'string'
              ? (err as any).response
              : JSON.stringify((err as any).response);
          } catch {
            errorDetails.responseData = 'Could not parse error response';
          }
        }
      }
      
      console.log('Error details:', JSON.stringify(errorDetails, null, 2));
      console.log('='.repeat(80) + '\n');
      
      // Provide helpful error messages
      let userFriendlyError = errorDetails.message || `${provider} request failed`;
      
      if (errorDetails.errorType === 'TIMEOUT') {
        userFriendlyError = 'Request timed out. The model might be processing a large request. Please try again with a simpler request.';
      } else if (errorDetails.errorType === 'NETWORK_ERROR') {
        const keyHint = provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GROQ_API_KEY';
        userFriendlyError = `Cannot connect to ${provider} API. Please check your connection and ${keyHint}.`;
      } else if (errorDetails.errorType === 'API_ERROR') {
        userFriendlyError = `${provider} API error: ${errorDetails.message}`;
      }
      
      throw new Error(userFriendlyError);
    }

    // Ensure response is not empty before parsing
    if (!response || response.trim().length === 0) {
      console.error(`❌ Empty response from ${provider.toUpperCase()}`);
      throw new Error(`${provider.toUpperCase()} returned an empty response. Please try again.`);
    }
    
    // Validate response contains parseable output (JSON or code blocks)
    const codeBlockCount = (response.match(/```/g) || []).length / 2;
    const hasJsonFiles = /\{\s*"files"\s*:/.test(response);
    if (codeBlockCount === 0 && !hasJsonFiles) {
      console.warn('⚠️ Response has neither JSON nor code blocks');
      console.warn('Response preview:', response.substring(0, 500));
      // Don't throw - let parsing handle it, but log warning
    } else {
      console.log(`✅ Response contains ${hasJsonFiles ? 'JSON' : ''}${hasJsonFiles && codeBlockCount > 0 ? ' + ' : ''}${codeBlockCount > 0 ? `${codeBlockCount} code blocks` : ''}`);
    }
    
    // ── Parse, validate, and create files via deterministic pipeline ──
    let createdFiles: FileCreationResult[] = [];
    let agentProvidedApp = false;

    try {
      const nsPipelineResult = await runGenerationPipeline({
        projectId: id,
        responseText: response,
        client,
        model,
        systemPrompt,
        maxFixRetries: 2,
        userMessage: message,
        existingFiles: project.files?.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content })),
      });

      createdFiles = nsPipelineResult.files;

      // Check if pipeline created an App file
      agentProvidedApp = createdFiles.some(f =>
        f.success && (f.path === 'src/App.jsx' || f.path === 'src/App.tsx')
      );

      if (nsPipelineResult.rejectedPaths.length > 0) {
        console.warn(`🛡️ Blocked ${nsPipelineResult.rejectedPaths.length} protected paths:`, nsPipelineResult.rejectedPaths);
      }
      if (nsPipelineResult.removedImports.size > 0) {
        console.warn('📦 Removed disallowed imports:', Object.fromEntries(nsPipelineResult.removedImports));
      }
      if (nsPipelineResult.fixLoopAttempts > 0) {
        console.log(`🔧 Fix loop: ${nsPipelineResult.fixLoopAttempts} attempt(s), resolved: ${nsPipelineResult.wasFixed}`);
      }

      console.log(`[PIPELINE] ${nsPipelineResult.totalSaved}/${nsPipelineResult.totalParsed} files saved`);

      // AUTO-RETRY: If AI returned too few JSX files but plan expected more, retry once
      const successfulJsxFiles = createdFiles.filter((f: FileCreationResult) =>
        f.success && (f.path.endsWith('.jsx') || f.path.endsWith('.tsx'))
      );
      const planExpectedFiles = plan?.files?.length ?? 0;
      if (successfulJsxFiles.length < 3 && planExpectedFiles > 3 && client) {
        console.log(`⚠️ Only ${successfulJsxFiles.length} JSX files created but plan expected ${planExpectedFiles}. Auto-retrying...`);
        try {
          const retryMessage = buildRetryPrompt(message, fileExtension);
          const retryParams = getStageParams('coder');
          const retryCompletion = await client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: retryMessage },
            ],
            temperature: retryParams.temperature,
            top_p: retryParams.top_p,
            max_tokens: maxOutputTokens,
            stream: false,
          });
          const retryText = retryCompletion.choices[0]?.message?.content || '';

          // Run retry through the pipeline
          const retryPipeline = await runGenerationPipeline({
            projectId: id,
            responseText: retryText,
            userMessage: message,
            existingFiles: project.files?.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content })),
          });
          for (const f of retryPipeline.files) {
            if (f.success && !createdFiles.some(cf => cf.path === f.path)) {
              createdFiles.push(f);
            }
          }
          if (retryPipeline.files.some(f => f.success && (f.path === 'src/App.jsx' || f.path === 'src/App.tsx'))) {
            agentProvidedApp = true;
          }
        } catch (retryErr) {
          console.warn('Auto-retry for insufficient files failed:', retryErr);
        }
      }

      // AUTO-FIX: If files were created but have validation errors, attempt to fix them
      const filesWithErrors = createdFiles.filter((f: FileCreationResult) => f.success && f.validated === false);
      if (filesWithErrors.length > 0) {
        console.log(`🔧 Auto-fixing ${filesWithErrors.length} files with validation errors...`);
        // Note: Auto-fix can be implemented here if needed
        // For now, we log warnings and let the user know
      }
      console.log('✅ File parsing completed:', {
        totalFiles: createdFiles.length,
        successful: createdFiles.filter((f: FileCreationResult) => f.success).length,
        failed: createdFiles.filter((f: FileCreationResult) => !f.success).length,
        validated: createdFiles.filter((f: FileCreationResult) => f.validated === true).length,
        validationFailed: createdFiles.filter((f: FileCreationResult) => f.validated === false).length
      });

      // Update project's updatedAt timestamp when files are created
      // This ensures the project appears at the top of the project list
      if (createdFiles.length > 0 && createdFiles.some((f: FileCreationResult) => f.success)) {
        try {
          await prisma.appProject.update({
            where: { id },
            data: { updatedAt: new Date() }
          });
          if (process.env.NODE_ENV === 'development') {
            console.log('[PROJECT] Updated timestamp');
          }
        } catch (updateError) {
          console.error('[PROJECT] Error updating timestamp:', updateError);
          // Don't fail the request if timestamp update fails
        }
      }
      
      // ============================================
      // INTELLIGENT COMPONENT INTEGRATION
      // ============================================
      // Skip when agent already provided complete App.jsx (avoids overwriting with stale project.files)
      // Automatically identify components and integrate into App.jsx
      if (!agentProvidedApp && createdFiles.length > 0 && createdFiles.some((f: FileCreationResult) => f.success)) {
        const successfulFiles = createdFiles.filter((f: FileCreationResult) => f.success);
        const componentFiles = successfulFiles.filter(f => 
          f.path.includes('components/') || 
          f.path.match(/src\/[A-Z][a-zA-Z0-9]*\.(jsx|js)$/) ||
          (f.path.includes('/') && f.path.split('/').pop()?.match(/^[A-Z]/))
        );
        
        if (componentFiles.length > 0) {
          console.log('\n' + '='.repeat(80));
          console.log('🧠 INTELLIGENT COMPONENT INTEGRATION');
          console.log('='.repeat(80));
          console.log(`Found ${componentFiles.length} component file(s) to integrate:`);
          componentFiles.forEach((f: FileCreationResult) => console.log(`  - ${f.path}`));
          
          try {
            // CRITICAL: Fetch FRESH App from DB (project.files is stale - from before our upserts)
            const appFileFromDb = await prisma.appFile.findFirst({
              where: {
                projectId: id,
                path: { in: ['src/App.jsx', 'src/App.tsx', 'src/App.js', 'src/App.ts'] },
              },
            });
            const appFile = appFileFromDb ?? project.files?.find((f: { path: string; isMain?: boolean | null }) =>
              f.path === `src/App.${fileExtension}` || f.path === 'src/App.jsx' || f.path === 'src/App.tsx' ||
              (f.isMain && f.path.includes('App.'))
            );
            
            if (appFile) {
              console.log(`\n📝 Updating App.${fileExtension} to import and render new components...`);
              
              // Extract component names from file paths
              const componentNames: string[] = [];
              componentFiles.forEach(file => {
                const fileName = file.path.split('/').pop() || file.path.split('\\').pop() || '';
                // Handle Header.component.js → Header, Header.jsx → Header
                let componentName = fileName.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                // If still has dot (e.g., Header.component), take first part
                if (componentName.includes('.')) {
                  componentName = componentName.split('.')[0];
                }
                if (componentName && componentName.match(/^[A-Z]/)) {
                  componentNames.push(componentName);
                }
              });
              
              console.log(`Identified components: ${componentNames.join(', ')}`);
              
              
              // Read component files to verify they export correctly
              const componentFilesData = await prisma.appFile.findMany({
                where: {
                  projectId: id,
                  path: { in: componentFiles.map(f => f.path) }
                }
              });
              
              // REVIEW: Validate component files
              console.log(`\n🔍 REVIEWING COMPONENT FILES...`);
              const componentReviews: Array<{path: string; valid: boolean; issues: string[]}> = [];
              componentFilesData.forEach((file: { path: string; content: string }) => {
                const issues: string[] = [];
                const hasExport = file.content.includes('export') || file.content.includes('module.exports');
                const hasComponent = !!file.content.match(/(?:function|const|class|var|let)\s+[A-Z]/);
                const hasReturn = file.content.includes('return');
                const hasReactImport = file.content.includes('import') && (file.content.includes('react') || file.content.includes('React'));
                
                if (!hasExport) issues.push('missing export');
                if (!hasComponent) issues.push('no component definition');
                if (!hasReturn) issues.push('no return statement');
                if (!hasReactImport) issues.push('missing React import');
                
                const isValid = hasExport && hasComponent && hasReturn;
                componentReviews.push({ path: file.path, valid: isValid, issues });
                console.log(`  ${isValid ? '✅' : '⚠️'} ${file.path}: ${isValid ? 'valid' : issues.join(', ')}`);
              });
              
              
              // Update App.jsx with imports and component usage
              let appContent = appFile.content;
              let appUpdated = false;
              
              // Add imports for new components
              componentNames.forEach(compName => {
                const componentFile = componentFilesData.find((f: { path: string }) => {
                  const fileName = f.path.split('/').pop() || '';
                  // Match both Header.jsx and Header.component.js → Header
                  let nameWithoutExt = fileName.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                  // Handle Header.component → Header
                  if (nameWithoutExt.includes('.')) {
                    nameWithoutExt = nameWithoutExt.split('.')[0];
                  }
                  return nameWithoutExt === compName;
                });
                
                if (componentFile) {
                  // Determine import path (handle Header.component.js → ./components/Header)
                  let importPath = '';
                  if (componentFile.path.includes('components/')) {
                    // Extract directory path and component name
                    const pathParts = componentFile.path.split('/');
                    const componentsIndex = pathParts.indexOf('components');
                    if (componentsIndex >= 0) {
                      const afterComponents = pathParts.slice(componentsIndex + 1);
                      const fileName = afterComponents[afterComponents.length - 1];
                      const nameWithoutExt = fileName.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                      const baseName = nameWithoutExt.includes('.') ? nameWithoutExt.split('.')[0] : nameWithoutExt;
                      const subPath = afterComponents.slice(0, -1).join('/');
                      importPath = subPath ? `./components/${subPath}/${baseName}` : `./components/${baseName}`;
                    }
                  } else if (componentFile.path.startsWith('src/')) {
                    const relativePath = componentFile.path.replace('src/', './');
                    importPath = relativePath.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                    // Remove .component if present
                    if (importPath.includes('.component')) {
                      importPath = importPath.replace(/\.component$/, '');
                    }
                  }
                  
                  // Check if import already exists
                  const importPattern = new RegExp(`import\\s+.*?\\s+from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
                  if (!importPattern.test(appContent) && importPath) {
                    // Add import after React import or at top
                    const reactImportMatch = appContent.match(/import\s+React[^;]*;/);
                    if (reactImportMatch) {
                      const insertPos = reactImportMatch.index! + reactImportMatch[0].length;
                      appContent = appContent.slice(0, insertPos) + 
                        `\nimport ${compName} from '${importPath}';` + 
                        appContent.slice(insertPos);
                      appUpdated = true;
                      console.log(`  ✅ Added import: import ${compName} from '${importPath}'`);
                    } else {
                      // Add at top
                      appContent = `import ${compName} from '${importPath}';\n${appContent}`;
                      appUpdated = true;
                      console.log(`  ✅ Added import at top: import ${compName} from '${importPath}'`);
                    }
                  }
                  
                  // Add component to JSX if not already present
                  const componentUsagePattern = new RegExp(`<${compName}\\s*/?>`, 'i');
                  if (!componentUsagePattern.test(appContent)) {
                    // Find return statement and add component
                    const returnMatch = appContent.match(/return\s*\([\s\S]*?\)/);
                    if (returnMatch) {
                      const returnContent = returnMatch[0];
                      // Add component before closing div or at end
                      if (returnContent.includes('</div>')) {
                        appContent = appContent.replace(
                          /(return\s*\([\s\S]*?)(<\/div>\s*\))/,
                          `$1    <${compName} />\n$2`
                        );
                        appUpdated = true;
                        console.log(`  ✅ Added <${compName} /> to JSX`);
                      } else {
                        // Add at end of return
                        appContent = appContent.replace(
                          /(return\s*\([\s\S]*?)(\))/,
                          `$1    <${compName} />\n$2`
                        );
                        appUpdated = true;
                        console.log(`  ✅ Added <${compName} /> to JSX (end)`);
                      }
                    }
                  }
                }
              });
              
              // Save updated App.jsx
              if (appUpdated) {
                await prisma.appFile.update({
                  where: { id: appFile.id },
                  data: { content: appContent }
                });
                console.log(`\n✅ App.jsx updated successfully with ${componentNames.length} component(s)`);
                console.log(`   Components integrated: ${componentNames.join(', ')}`);
                console.log(`   Preview will automatically refresh to show new components`);
              } else {
                console.log(`\nℹ️ App.jsx already contains all components or no updates needed`);
              }
            } else {
              console.log(`\n⚠️ App.jsx not found - skipping auto-integration`);
            }
          } catch (integrationError: unknown) {
            console.error('❌ Error during component integration:', integrationError);
            // Don't fail the request - files were created successfully
          }
          console.log('='.repeat(80) + '\n');
        }
      }

      // Note: Validation + fix-loop is now handled inside runGenerationPipeline above.
      // The pipeline validates syntax, resolves imports, and runs the AI fix-loop automatically.
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      const errorStack = parseError instanceof Error ? parseError.stack : undefined;
      console.error('\n' + '='.repeat(80));
      console.error('❌ ERROR PARSING FILES FROM RESPONSE');
      console.error('='.repeat(80));
      console.error('Error:', errorMessage);
      console.error('Stack:', errorStack?.substring(0, 500));
      console.error('Response length:', response?.length);
      console.error('='.repeat(80) + '\n');
      
      
      // CRITICAL: Even if parsing fails, ensure createdFiles is an empty array
      // This prevents undefined errors in frontend
      createdFiles = [];
      
      // Log warning but don't fail the request - user can use "Extract Files" button
      console.warn('⚠️ File parsing failed, but request will continue. User can manually extract files.');
    }

    // Save chat message to database
    try {
      const existingChat = await prisma.appChat.findFirst({
        where: { projectId: id },
      });

      const messages = existingChat
        ? (existingChat.messages as any[])
        : [];

      messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });
      messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        provider: provider || undefined,
        model: model || undefined,
      });

      await prisma.appChat.upsert({
        where: { id: existingChat?.id || 'temp' },
        update: {
          messages: messages as any,
          updatedAt: new Date(),
        },
        create: {
          projectId: id,
          messages: messages as any,
        },
      });
    } catch (chatError) {
      console.error('Error saving chat:', chatError);
      // Don't fail the request if chat saving fails
    }

    // Ensure filesCreated is always an array
    const filesCreatedResult = Array.isArray(createdFiles) ? createdFiles : [];
    
    // Build response with helpful information
    const successfulFiles = filesCreatedResult.filter((f: FileCreationResult) => f.success);
    const failedFiles = filesCreatedResult.filter((f: FileCreationResult) => !f.success);
    const validatedFiles = filesCreatedResult.filter((f: FileCreationResult) => f.validated === true);
    const filesWithWarnings = filesCreatedResult.filter((f: FileCreationResult) => f.success && f.validated === false);
    
    // Generate suggestions based on results
    const suggestions: string[] = [];
    if (successfulFiles.length > 0) {
      suggestions.push(`✅ Created ${successfulFiles.length} file(s): ${successfulFiles.map(f => f.path).join(', ')}`);
    }
    if (filesWithWarnings.length > 0) {
      suggestions.push(`⚠️ ${filesWithWarnings.length} file(s) created but may have issues. Check preview for errors.`);
    }
    if (failedFiles.length > 0) {
      suggestions.push(`❌ Failed to create ${failedFiles.length} file(s). Please try again or check the code format.`);
    }
    if (successfulFiles.length === 0 && response.length > 0) {
      suggestions.push(`💡 No files were extracted from the response. Make sure code uses \`\`\`file:path/to/file.jsx format.`);
    }

    // Agent check: component structure and styling (so preview renders something with CSS)
    try {
      const projectForCheck = await prisma.appProject.findUnique({
        where: { id },
        include: { files: { orderBy: { path: 'asc' } } },
      });
      if (projectForCheck?.files?.length) {
        const structureCheck = checkComponentStructureAndStyling(
          projectForCheck.files.map((f: { path: string; content: string }) => ({ path: f.path, content: f.content }))
        );
        if (!structureCheck.componentsValid) {
          suggestions.push(`⚠️ Component check: App may not return JSX. Preview might be blank.`);
        }
        if (!structureCheck.hasStyling) {
          suggestions.push(`💡 Add className or style (or CSS) to your components so the preview shows visible styling.`);
        }
        if (structureCheck.issues.length > 0) {
          structureCheck.issues.slice(0, 3).forEach((issue: string) => {
            suggestions.push(`📋 ${issue}`);
          });
        }
      }
    } catch (structureErr) {
      // Non-blocking; don't fail response
    }
    
    // CRITICAL: Ensure filesCreated is always an array and properly formatted
    const finalFilesCreated = Array.isArray(filesCreatedResult) ? filesCreatedResult : [];
    
    
    console.log('\n' + '='.repeat(80));
    console.log('📤 SENDING RESPONSE TO FRONTEND');
    console.log('='.repeat(80));
    console.log('Response length:', response.length, 'characters');
    console.log('Files created array:', finalFilesCreated.length, 'items');
    console.log('Successful files:', successfulFiles.length);
    console.log('File paths:', successfulFiles.map(f => f.path));
    console.log('Response will include filesCreated:', finalFilesCreated.length > 0);
    console.log('='.repeat(80) + '\n');
    
    // Build response with guaranteed filesCreated array
    const responseData = {
      response,
      suggestions,
      filesCreated: finalFilesCreated, // Always an array
      provider: provider,
      model: model,
      summary: {
        totalFiles: finalFilesCreated.length,
        successful: successfulFiles.length,
        validated: validatedFiles.length,
        warnings: filesWithWarnings.length,
        failed: failedFiles.length,
        provider: provider, // Include provider in summary for tracking
        filePaths: successfulFiles.map(f => f.path), // Include file paths for debugging
        hasDefaultComponent: scaffoldCreated > 0 || hasScaffoldFiles // Indicate if default component was created
      }
    };
    
    // Log provider-specific file creation summary
    console.log(`\n📊 ${provider.toUpperCase()} File Creation Summary:`);
    console.log(`  Total files: ${finalFilesCreated.length}`);
    console.log(`  Successful: ${successfulFiles.length}`);
    console.log(`  Validated: ${validatedFiles.length}`);
    console.log(`  With warnings: ${filesWithWarnings.length}`);
    console.log(`  Failed: ${failedFiles.length}`);
    if (scaffoldCreated > 0) {
      console.log(`  🎨 Default component created - preview should render immediately`);
    }
    if (successfulFiles.length > 0) {
      console.log(`  Files created: ${successfulFiles.map(f => f.path).join(', ')}`);
    }
    
    // Log final response structure
    console.log('📦 Final response structure:', {
      hasResponse: !!responseData.response,
      hasFilesCreated: Array.isArray(responseData.filesCreated),
      filesCreatedLength: responseData.filesCreated.length,
      hasSummary: !!responseData.summary
    });

    // Persist agentic pipeline state (plan, taskPlan, status) when we have it
    if (plan || taskPlan) {
      try {
        const generationState: AppProjectState = {
          userPrompt: message,
          plan: plan ?? null,
          taskPlan: taskPlan ?? null,
          status: 'done',
          lastError: failedFiles.length > 0 ? `Failed files: ${failedFiles.map((f: FileCreationResult) => f.path).join(', ')}` : null,
        };
        await prisma.appProject.update({
          where: { id },
          data: { generationState: generationState as object },
        });
      } catch (stateErr) {
        if (process.env.NODE_ENV === 'development') console.warn('Failed to persist generationState:', stateErr);
      }
    }

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const err = error as Error & { code?: string; status?: number; type?: string };
    // Enhanced error logging with stack trace
    console.error('\n' + '='.repeat(80));
    console.error(`❌ AI CHAT API - UNHANDLED ERROR (Provider: ${provider || 'unknown'})`);
    console.error('='.repeat(80));
    console.error('Error object:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      status: err.status,
      code: err.code,
      type: err.type,
      provider: provider || 'unknown',
      model: model || 'unknown',
    });
    console.error('='.repeat(80) + '\n');
    
    // Handle connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('fetch failed') || err.message?.includes('network') || err.message?.includes('connection')) {
      const errorProvider = provider || 'unknown';
      const keyName = errorProvider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'GROQ_API_KEY';
      const errorMessage = `Unable to connect to ${errorProvider} API. Please check your internet connection and ${keyName} environment variable.`;
      const suggestion = `Verify that ${keyName} is set in your environment variables.`;
      
      return NextResponse.json(
        { 
          error: 'Connection error',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? err.message : undefined,
          suggestion: suggestion,
          provider: errorProvider,
          model: model || 'unknown',
          filesCreated: []
        },
        { status: 503 }
      );
    }

    // Handle timeout errors
    if (err.name === 'AbortError' || err.message?.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Timeout',
          message: 'Request timed out. The model might be processing a large request. Please try again with a simpler request.',
          suggestion: 'Try breaking your request into smaller parts or wait a moment and retry.',
          provider: provider || 'unknown',
          model: model || 'unknown',
          canRetry: true,
          filesCreated: []
        },
        { status: 504 }
      );
    }

    // Handle server errors (500/503)
    if (err.status === 500 || err.status === 503) {
      const errorProvider = provider || 'unknown';
      const errorMessage = `${errorProvider} API server error. The service might be temporarily unavailable.`;
      const suggestion = 'Wait a moment and try again, or check API status.';
      
      return NextResponse.json(
        { 
          error: 'Server Error',
          message: errorMessage,
          suggestion: suggestion,
          provider: errorProvider,
          model: model || 'unknown',
          canRetry: true,
          filesCreated: []
        },
        { status: 502 }
      );
    }

    // Handle authentication errors
    if (err.status === 401 || err.message?.includes('Not authenticated')) {
      return NextResponse.json(
        { 
          error: 'Authentication Error',
          message: 'You are not authenticated. Please sign in and try again.',
          suggestion: 'Refresh the page and ensure you are logged in.',
          filesCreated: []
        },
        { status: 401 }
      );
    }

    // Generic error handler - return proper error response
    const errorMessage = err.message || 'An unexpected error occurred';
    const errorStatus = err.status || 500;
    const errorProvider = provider || 'unknown';
    
    return NextResponse.json(
      { 
        error: 'Request Failed',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          name: err.name,
          stack: err.stack?.substring(0, 500), // Limit stack trace length
          code: err.code,
          provider: errorProvider,
        } : undefined,
        suggestion: 'Please try again. If the problem persists, check server logs.',
        provider: errorProvider,
        model: model || 'unknown',
        canRetry: true,
        filesCreated: []
      },
      { status: errorStatus }
    );
  }
}

