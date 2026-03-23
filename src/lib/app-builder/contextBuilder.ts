import type {
  QuestionnaireData,
  ProjectFile,
} from '@/app/types/app-builder';
import { buildSystemPrompt, buildUserPrompt, buildCompactSystemPrompt } from '@/lib/app-builder/promptBuilder';
import { mapDesignStyleToTheme } from '@/lib/app-builder/themePresets';
import { analyzeProject, formatProjectStatusForPrompt } from '@/lib/app-builder/project-analyzer';

export interface AppBuilderPromptInput {
  message: string;
  questionnaireData: QuestionnaireData | null;
  frameworkForScaffold: string;
  useTypeScript: boolean;
  existingFilePaths: string[];
  hasScaffoldFiles: boolean;
  fileExtension: string;
  plan?: unknown;
  taskPlan?: { implementationSteps?: unknown[] } | null;
  currentFilePath?: string | null;
  projectFiles: Pick<ProjectFile, 'path' | 'name' | 'content'>[];
}

export interface AppBuilderPromptOutput {
  systemPrompt: string;
  userMessage: string;
  approxTokens: {
    system: number;
    user: number;
    total: number;
    maxContextHint: string;
    maxNewTokensHint: string;
  };
}

/**
 * Shared helper to build the exact system + user prompts used for app-builder LLM calls.
 * This centralizes scaffold awareness, questionnaire context and “extend, don’t rewrite” rules.
 */
export function buildAppBuilderPrompts(input: AppBuilderPromptInput): AppBuilderPromptOutput {
  const {
    frameworkForScaffold,
    useTypeScript,
    existingFilePaths,
    hasScaffoldFiles,
    fileExtension,
    questionnaireData,
    plan,
    taskPlan,
    currentFilePath,
  } = input;

  let { message } = input;

  // Resolve theme + color + app type from questionnaire data
  const themeId = (questionnaireData?.themePreset as string) || undefined;
  const designStyle = (questionnaireData?.designStyle as string) || undefined;
  const colorScheme = (questionnaireData?.colorScheme as string) || undefined;
  const appType = (questionnaireData?.appType as string) || undefined;
  const brandName = (questionnaireData?.brandName as string) || undefined;
  const projectGoal = (questionnaireData?.projectGoal as string) || undefined;

  // Base Lovable/Replit-style system prompt with theme + color + layout DNA + industry context
  let systemPrompt = buildSystemPrompt({
    framework: frameworkForScaffold,
    language: useTypeScript ? 'typescript' : 'javascript',
    fileCount: existingFilePaths.length,
    filePaths: existingFilePaths,
    themeId,
    designStyle,
    colorScheme,
    brandName,
    projectGoal,
    appType,
  });

  // When project has scaffold files, add explicit entry/file list so LLM aligns output with preview
  if (existingFilePaths.length > 0) {
    systemPrompt += buildScaffoldContext(frameworkForScaffold);
    systemPrompt += `\nCurrent project files (preview uses these): ${existingFilePaths.join(
      ', '
    )}. Main entry for preview: src/App.${fileExtension}.`;
  }

  // Token-optimized user prompt (questionnaire + message + existing paths; optional plan/taskPlan)
  let userMessage = buildUserPrompt(message, questionnaireData, existingFilePaths);
  if (plan) {
    try {
      userMessage += `\n\nSTRUCTURED PLAN (implement this):\n${JSON.stringify(plan, null, 2)}`;
    } catch {
      // Fallback: avoid crashing if plan is not serializable
      userMessage += `\n\nSTRUCTURED PLAN (implement this) is available but could not be stringified.`;
    }
  }
  if (taskPlan?.implementationSteps?.length) {
    try {
      userMessage += `\n\nIMPLEMENTATION STEPS (follow in order):\n${JSON.stringify(
        taskPlan.implementationSteps,
        null,
        2
      )}`;
    } catch {
      userMessage += `\n\nIMPLEMENTATION STEPS (follow in order) are available but could not be stringified.`;
    }
  }
  if (hasScaffoldFiles && existingFilePaths.length > 0) {
    userMessage += `\n\nEXTEND existing files. Add imports and render new components in App.${fileExtension}.`;
  }

  // ── PROJECT ANALYSIS: Context-aware state tracking ──
  const isContinuation = message.startsWith('[CONTINUE]');
  const SCAFFOLD_ONLY = new Set([
    'index.html', 'src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx',
    'src/index.css', 'package.json', 'vite.config.js', 'README.md',
  ]);
  const hasUserGeneratedFiles = existingFilePaths.some(p => !SCAFFOLD_ONLY.has(p));

  // Run project analysis when files exist — gives AI full context
  if (hasUserGeneratedFiles && input.projectFiles.length > 0) {
    const projectStatus = analyzeProject(
      input.projectFiles.map(f => ({ path: f.path, content: f.content || '' })),
      (questionnaireData?.requiredFeatures as string[]) || undefined,
    );
    const statusPrompt = formatProjectStatusForPrompt(projectStatus);

    if (isContinuation) {
      systemPrompt += `\n\nCONTINUATION MODE (OVERRIDES previous rules):
- This is a CONTINUATION of a truncated generation.
- Generate ONLY the files that are MISSING. Do NOT regenerate files that already exist.
- The minimum file count rule does NOT apply. If only 1 file is missing, return only that 1 file.
- Match the existing design system, theme, colors, and component naming patterns.
${statusPrompt}`;
      console.log(`🔄 CONTINUATION: ${projectStatus.health} — ${projectStatus.healthDetails}`);
    } else {
      // Check if App.jsx still has scaffold default content
      const appContent = input.projectFiles.find(f => f.path === `src/App.${fileExtension}`)?.content || '';
      const appIsScaffold = appContent.includes('Welcome to your new app') || appContent.includes('tell me what kind of product');

      if (appIsScaffold) {
        systemPrompt += '\n\nIMPORTANT: src/App.' + fileExtension + ' currently has placeholder content. You MUST generate a real App.' + fileExtension + ' that imports and renders all the components. This is the MOST critical file.';
      } else {
        systemPrompt += '\n\nEDIT MODE (OVERRIDES "return ALL files" and "minimum 4 files" rules):'
          + '\nThis project already has ' + existingFilePaths.length + ' files. The user is requesting a MODIFICATION, not a full rebuild.'
          + '\n- Do NOT regenerate the entire app. Only output files that need to CHANGE.'
          + '\n- If the user asks to "fix" something, only fix that specific file.'
          + '\n- If the user asks to "add" something, create the new file(s) AND update App.' + fileExtension + ' to import/render them.'
          + '\n- The minimum file count rule does NOT apply.'
          + '\n- Do NOT change the app\'s architecture, component names, theme, or routing pattern.'
          + '\n- PRESERVE all existing imports, components, and state management patterns.';
      }
      systemPrompt += '\n' + statusPrompt;
      console.log('✏️ EDIT MODE: ' + projectStatus.health + ' — ' + projectStatus.healthDetails);
    }
  }

  // CURSOR-LIKE: Include current file context for editing
  // Detect file mentions in message: "edit Header.jsx", "update App.jsx", "modify index.js"
  const fileMentionPattern =
    /(?:edit|update|modify|change|add to|remove from|in|to)\s+([a-zA-Z0-9_/-]+\.(jsx?|tsx?|css|html|json))/i;
  const fileMention = message.match(fileMentionPattern);
  const mentionedFilePath = fileMention ? fileMention[1] : null;

  // Use mentioned file, current file, or neither
  const fileToEdit = mentionedFilePath || currentFilePath || null;

  if (fileToEdit) {
    // Find the file (check multiple patterns)
    const file = input.projectFiles.find((f) =>
      f.path === fileToEdit ||
      f.path.endsWith(`/${fileToEdit}`) ||
      f.path.endsWith(`\\${fileToEdit}`) ||
      f.name === fileToEdit ||
      f.path.includes(fileToEdit)
    );

    if (file) {
      if (file.content.length < 8000) {
        // Include full file for editing - instruct to EXTEND, not replace
        userMessage += `\n\nEXISTING FILE TO EXTEND (${file.path}):\n`;
        userMessage += `⚠️ DO NOT DELETE OR REWRITE THIS FILE. EXTEND IT by adding new imports, functions, or components.\n`;
        userMessage += `Preserve all existing code and functionality.\n\n`;
        userMessage += file.content;
        console.log(
          `📝 EXTEND MODE: Including full file context for extension: ${file.path} (${file.content.length} chars)`
        );
      } else {
        // Large file - include beginning and end with extension instructions
        const start = file.content.substring(0, 2000);
        const end = file.content.substring(file.content.length - 1000);
        userMessage += `\n\nEXISTING FILE TO EXTEND (${file.path}):\n`;
        userMessage += `⚠️ DO NOT DELETE OR REWRITE THIS FILE. EXTEND IT by adding new imports, functions, or components.\n`;
        userMessage += `Preserve all existing code and functionality.\n\n`;
        userMessage += `File start:\n${start}\n\n... (${file.content.length - 3000} chars omitted) ...\n\nFile end:\n${end}`;
        console.log(
          `📝 EXTEND MODE: Including partial file context: ${file.path} (showing start/end of ${file.content.length} chars)`
        );
      }
    } else {
      console.log(`⚠️ File mentioned/selected but not found: ${fileToEdit}`);
      console.log(`Available files:`, input.projectFiles.map((f) => f.path));
    }
  }

  const approxSystemTokens = Math.ceil(systemPrompt.length / 4);
  const approxUserTokens = Math.ceil(userMessage.length / 4);
  const approxTotalTokens = approxSystemTokens + approxUserTokens;

  console.log('📝 App-builder prompts prepared:', {
    systemPromptTokens: approxSystemTokens,
    userMessageTokens: approxUserTokens,
    totalTokens: approxTotalTokens,
    maxContext: '128K-class (Groq Llama / DeepSeek V3)',
    maxNewTokens: '4K–8K (provider-dependent)',
  });

  return {
    systemPrompt,
    userMessage,
    approxTokens: {
      system: approxSystemTokens,
      user: approxUserTokens,
      total: approxTotalTokens,
      maxContextHint: '128K-class (Groq Llama / DeepSeek V3)',
      maxNewTokensHint: '4K–8K (provider-dependent)',
    },
  };
}

/**
 * Scaffold context appended to the system prompt so the LLM aligns output with the preview scaffold.
 */
export function buildScaffoldContext(framework: string): string {
  const entryHint = framework || 'react';
  return `\nPROJECT SCAFFOLD (align output to this structure):
- Framework: ${entryHint}
- Entry: src/App.(jsx|tsx)
- Files: package.json, vite.config.js, index.html, src/main.(jsx|tsx), src/App.(jsx|tsx), src/index.css, src/components/*`;
}

/**
 * Fast-path prompt builder for slow providers (OpenRouter/DeepSeek).
 * Skips Planner + Architect steps — uses a compact system prompt with inline planning.
 * Produces ~60% fewer input tokens for significantly faster generation.
 */
export function buildFastPathPrompts(input: Omit<AppBuilderPromptInput, 'plan' | 'taskPlan'>): AppBuilderPromptOutput {
  const {
    frameworkForScaffold,
    useTypeScript,
    existingFilePaths,
    hasScaffoldFiles,
    fileExtension,
    questionnaireData,
    currentFilePath,
  } = input;

  let { message } = input;

  // Resolve theme + color + app type for compact prompt
  const themeId = (questionnaireData?.themePreset as string) || undefined;
  const designStyle = (questionnaireData?.designStyle as string) || undefined;
  const colorScheme = (questionnaireData?.colorScheme as string) || undefined;
  const appType = (questionnaireData?.appType as string) || undefined;

  // Compact system prompt with theme + color + layout DNA injection
  let systemPrompt = buildCompactSystemPrompt({
    framework: frameworkForScaffold,
    language: useTypeScript ? 'typescript' : 'javascript',
    filePaths: existingFilePaths,
    themeId,
    designStyle,
    colorScheme,
    appType,
  });

  // Streamlined user prompt — no separate plan/taskPlan sections
  let userMessage = message.trim();

  // Add minimal questionnaire context
  if (questionnaireData && typeof questionnaireData === 'object') {
    const q = questionnaireData;
    const parts: string[] = [];
    if (q.appType) parts.push(`Type: ${q.appType}`);
    if (q.projectGoal) parts.push(`Goal: ${q.projectGoal}`);
    if (q.designStyle) parts.push(`Style: ${q.designStyle}`);
    if (q.brandName) parts.push(`Brand: ${q.brandName}`);
    if (Array.isArray(q.requiredFeatures) && q.requiredFeatures.length > 0) {
      parts.push(`Features: ${(q.requiredFeatures as string[]).slice(0, 5).join(', ')}`);
    }
    if (parts.length > 0) {
      userMessage = `[${parts.join(' | ')}]\n\n${userMessage}`;
    }
  }

  if (hasScaffoldFiles && existingFilePaths.length > 0) {
    userMessage += `\nExtend existing files. Main entry: src/App.${fileExtension}.`;
  }

  // Include current file context for editing (compact version)
  if (currentFilePath) {
    const file = input.projectFiles.find((f) =>
      f.path === currentFilePath || f.path.endsWith(`/${currentFilePath}`) || f.name === currentFilePath
    );
    if (file && file.content.length < 4000) {
      userMessage += `\n\nCurrent file (${file.path}):\n${file.content}`;
    }
  }

  // Edit mode for fast path — same logic as full path
  const FP_SCAFFOLD = new Set([
    'index.html', 'src/App.jsx', 'src/App.tsx', 'src/main.jsx', 'src/main.tsx',
    'src/index.css', 'package.json', 'vite.config.js', 'README.md',
  ]);
  const fpHasUserFiles = existingFilePaths.some(p => !FP_SCAFFOLD.has(p));
  if (fpHasUserFiles && input.projectFiles.length > 0) {
    // Compact project analysis for fast path
    const fpStatus = analyzeProject(
      input.projectFiles.map(f => ({ path: f.path, content: f.content || '' })),
    );
    const issues = [
      ...fpStatus.unresolvedImports.map(i => `MISSING: ${i.importPath} (imported by ${i.importedBy})`),
      ...fpStatus.missingPages.map(p => `MISSING PAGE: ${p}`),
      ...fpStatus.undefinedComponents.map(c => `UNDEFINED: <${c} />`),
    ];
    const issueStr = issues.length > 0 ? `\nISSUES TO FIX:\n${issues.join('\n')}` : '';
    systemPrompt += `\nEDIT MODE: Project has ${existingFilePaths.length} files (${fpStatus.health}). Only output files that need to CHANGE.${issueStr}\nExisting: ${existingFilePaths.join(', ')}`;
    userMessage += `\n\nOnly return files that need to change. Do NOT regenerate the entire app.`;
  } else {
    userMessage += `\n\nReturn ALL files as JSON. Include App + every component it imports as separate files.`;
  }

  const approxSystemTokens = Math.ceil(systemPrompt.length / 4);
  const approxUserTokens = Math.ceil(userMessage.length / 4);

  console.log('⚡ Fast-path prompts (OpenRouter):', {
    systemTokens: approxSystemTokens,
    userTokens: approxUserTokens,
    total: approxSystemTokens + approxUserTokens,
  });

  return {
    systemPrompt,
    userMessage,
    approxTokens: {
      system: approxSystemTokens,
      user: approxUserTokens,
      total: approxSystemTokens + approxUserTokens,
      maxContextHint: '128K (DeepSeek V3)',
      maxNewTokensHint: '8K (fast mode)',
    },
  };
}

