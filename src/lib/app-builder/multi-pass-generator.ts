/**
 * Multi-pass generation orchestrator for the App Studio.
 *
 * Instead of a single 8192-token LLM call that produces 3 files, this breaks
 * generation into multiple focused passes:
 *
 *   Pass 1 — Planning:     LLM call via planner agent → structured plan
 *   Pass 2 — Scaffold + Shared: deterministic scaffold + LLM for App/Layout/Header/Footer
 *   Pass 3-N — Pages:      remaining files in batches of 2-3
 *
 * Total LLM calls for a typical 10-file project: 1 + 1 + ceil(remaining/3) ≈ 5
 */

import type OpenAI from 'openai';
import type { AIProvider } from '@/lib/ai/provider';
import type { QuestionnaireData, PlannerPlan } from '@/app/types/app-builder';
import type { SSEEvent } from './sse';
import { getMaxOutputTokens } from '@/lib/ai/provider';
import { buildPlannerPrompt, parsePlannerResponse } from './agents/planner';
import { getScaffoldFiles } from '@/app/lib/app-builder/scaffolds';
import { buildCompactSystemPrompt } from './promptBuilder';
import { validateFileSet } from './validate-files';
import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiPassConfig {
  projectId: string;
  description: string;
  questionnaireData: QuestionnaireData | null;
  projectTitle?: string;
  client: OpenAI;
  model: string;
  provider: AIProvider;
  onProgress: (event: SSEEvent) => void;
}

export interface MultiPassResult {
  filesCreated: string[];
  totalPasses: number;
  plan: PlannerPlan | null;
}

// ---------------------------------------------------------------------------
// File format parser
// ---------------------------------------------------------------------------

interface ParsedFileEntry {
  path: string;
  content: string;
}

/**
 * Parse LLM output that uses the multi-file delimiter format:
 *
 *   --- FILE: src/App.jsx ---
 *   [content]
 *   --- FILE: src/components/Header.jsx ---
 *   [content]
 *
 * Falls back to JSON array of {path, content} objects.
 */
export function parseMultiFileResponse(text: string): ParsedFileEntry[] {
  const files: ParsedFileEntry[] = [];

  // Try delimiter format first
  const delimiterRegex = /^---\s*FILE:\s*(.+?)\s*---\s*$/gm;
  const matches = [...text.matchAll(delimiterRegex)];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const filePath = matches[i][1].trim();
      const startIdx = matches[i].index! + matches[i][0].length;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      const content = text.slice(startIdx, endIdx).trim();
      if (filePath && content) {
        files.push({ path: filePath, content });
      }
    }
    if (files.length > 0) return files;
  }

  // Try JSON array fallback: [{path, content}, ...]
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]) as unknown[];
      for (const item of arr) {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          if (typeof o.path === 'string' && typeof o.content === 'string') {
            files.push({ path: o.path, content: o.content });
          }
        }
      }
      if (files.length > 0) return files;
    }
  } catch {
    // Not valid JSON — continue
  }

  // Try JSON object with "files" key: {"files":[{path, content}, ...]}
  try {
    const jsonObjMatch = text.match(/\{[\s\S]*"files"[\s\S]*\}/);
    if (jsonObjMatch) {
      const parsed = JSON.parse(jsonObjMatch[0]) as Record<string, unknown>;
      if (Array.isArray(parsed.files)) {
        for (const item of parsed.files as unknown[]) {
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            if (typeof o.path === 'string' && (typeof o.content === 'string')) {
              files.push({ path: o.path, content: o.content });
            }
          }
        }
        if (files.length > 0) return files;
      }
    }
  } catch {
    // Not valid JSON
  }

  // Try markdown code block format: ```file:path/to/file.jsx ... ```
  const codeBlockRegex = /```(?:file:|jsx:|tsx:|css:|html:|js:|ts:)?\s*(src\/[^\s`]+)\s*\n([\s\S]*?)```/g;
  const codeMatches = [...text.matchAll(codeBlockRegex)];
  for (const m of codeMatches) {
    const filePath = m[1].trim();
    const content = m[2].trim();
    if (filePath && content) {
      files.push({ path: filePath, content });
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferLanguage(filePath: string): string {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return filePath.endsWith('.tsx') ? 'tsx' : 'jsx';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'text';
}

function fileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

async function saveFileToDB(
  projectId: string,
  path: string,
  content: string,
  isMain: boolean = false,
): Promise<void> {
  const name = fileName(path);
  const language = inferLanguage(path);
  await prisma.appFile.upsert({
    where: { projectId_path: { projectId, path } },
    update: { name, content, language, isMain },
    create: { projectId, path, name, content, language, isMain },
  });
}

async function llmCall(
  client: OpenAI,
  model: string,
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const maxTokens = getMaxOutputTokens(provider, model);
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content ?? '';
}

/** Build a default fallback plan when the planner LLM call fails. */
function buildDefaultPlan(description: string, projectTitle?: string): PlannerPlan {
  return {
    name: projectTitle || 'My App',
    description: description.slice(0, 200),
    techstack: 'React, Vite, Tailwind CSS',
    features: ['Landing page', 'Responsive design'],
    files: [
      { path: 'src/App.jsx', purpose: 'Main app component with routing' },
      { path: 'src/components/Layout.jsx', purpose: 'Layout with Header and Footer wrapping routes' },
      { path: 'src/components/Header.jsx', purpose: 'Navigation header' },
      { path: 'src/components/Footer.jsx', purpose: 'Site footer' },
      { path: 'src/pages/Home.jsx', purpose: 'Home page' },
      { path: 'src/index.css', purpose: 'Global styles' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Shared files — the core files generated in pass 2
// ---------------------------------------------------------------------------

const SHARED_FILE_PATHS = [
  'src/App.jsx',
  'src/components/Layout.jsx',
  'src/components/Header.jsx',
  'src/components/Footer.jsx',
  'src/index.css',
];

/** Check if features suggest a database is needed */
function needsDatabase(plan: PlannerPlan, questionnaire: QuestionnaireData | null): boolean {
  const dbKeywords = ['auth', 'login', 'signup', 'dashboard', 'crud', 'database', 'user', 'admin', 'account', 'profile', 'data'];
  const allText = [
    plan.description,
    ...plan.features,
    ...(plan.files.map(f => f.purpose)),
    questionnaire?.appType ?? '',
    questionnaire?.projectGoal ?? '',
    ...(questionnaire?.requiredFeatures ?? []),
    ...(questionnaire?.specialFeatures ?? []),
  ].join(' ').toLowerCase();
  return dbKeywords.some(kw => allText.includes(kw));
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runMultiPassGeneration(config: MultiPassConfig): Promise<MultiPassResult> {
  const {
    projectId,
    description,
    questionnaireData,
    projectTitle,
    client,
    model,
    provider,
    onProgress,
  } = config;

  const filesCreated: string[] = [];
  let totalPasses = 0;
  let plan: PlannerPlan | null = null;

  // -------------------------------------------------------------------------
  // Pass 1 — Planning
  // -------------------------------------------------------------------------
  totalPasses++;
  onProgress({ type: 'status', data: { message: 'Planning project structure...', pass: 1, total: '?' } });

  try {
    const plannerUserPrompt = buildPlannerPrompt(description, questionnaireData);

    const PLANNER_SYSTEM_PROMPT = `You are a product planner. Given a user's app idea, output a structured project plan as valid JSON only.
Output exactly this JSON shape, no other text:
{"name":"string","description":"string","techstack":"string","features":["string"],"files":[{"path":"string","purpose":"string"}]}
Rules: name = short app name. description = 1-2 sentences. techstack = e.g. "React, Vite, Tailwind CSS". features = list of main features. files = array of file paths and purpose (use paths like src/App.jsx, src/components/Hero.jsx, src/pages/Home.jsx, src/index.css).
Always include: src/App.jsx (main entry with routing), src/components/Layout.jsx, src/components/Header.jsx, src/components/Footer.jsx, src/index.css.
For apps needing auth or data: also include src/lib/supabase.js, src/context/AuthContext.jsx, src/lib/schema.sql.
Plan at least 8-12 files for a complete multi-page app.`;

    const plannerResponse = await llmCall(client, model, provider, PLANNER_SYSTEM_PROMPT, plannerUserPrompt);
    plan = parsePlannerResponse(plannerResponse);

    if (!plan) {
      console.warn('Multi-pass: planner returned unparseable response, using default plan');
      plan = buildDefaultPlan(description, projectTitle);
    }
  } catch (err) {
    console.error('Multi-pass: planner failed, using default plan', err);
    plan = buildDefaultPlan(description, projectTitle);
  }

  // If features suggest DB needs, ensure schema.sql is in the plan
  if (needsDatabase(plan, questionnaireData)) {
    const hasSchema = plan.files.some(f => f.path.includes('schema.sql'));
    if (!hasSchema) {
      plan.files.push({ path: 'src/lib/schema.sql', purpose: 'Database schema for Supabase' });
    }
    const hasSupabase = plan.files.some(f => f.path.includes('supabase.js') || f.path.includes('supabase.ts'));
    if (!hasSupabase) {
      plan.files.push({ path: 'src/lib/supabase.js', purpose: 'Supabase client configuration' });
    }
    const hasAuthContext = plan.files.some(f => f.path.includes('AuthContext'));
    if (!hasAuthContext) {
      plan.files.push({ path: 'src/context/AuthContext.jsx', purpose: 'Authentication context provider' });
    }
  }

  onProgress({ type: 'plan', data: plan });

  // -------------------------------------------------------------------------
  // Pass 2 — Scaffold + Shared files
  // -------------------------------------------------------------------------
  totalPasses++;
  onProgress({ type: 'status', data: { message: 'Setting up project scaffold and generating shared components...', pass: 2, total: '?' } });

  // 2a. Deterministic scaffold files
  const scaffoldFiles = getScaffoldFiles('react', { projectTitle: projectTitle || plan.name });
  for (const sf of scaffoldFiles) {
    // Skip src/App.jsx from scaffold — we generate a better one via LLM
    if (sf.path === 'src/App.jsx' || sf.path === 'src/App.tsx') continue;
    await saveFileToDB(projectId, sf.path, sf.content, sf.isMain ?? false);
    filesCreated.push(sf.path);
  }
  onProgress({ type: 'status', data: { message: `Saved ${scaffoldFiles.length - 1} scaffold files` } });

  // 2b. LLM call for shared files (App.jsx, Layout, Header, Footer, index.css, schema.sql if needed)
  const sharedFilesToGenerate = [...SHARED_FILE_PATHS];
  const dbNeeded = needsDatabase(plan, questionnaireData);
  if (dbNeeded) {
    sharedFilesToGenerate.push('src/lib/schema.sql');
    sharedFilesToGenerate.push('src/lib/supabase.js');
    sharedFilesToGenerate.push('src/context/AuthContext.jsx');
  }

  // Build the system prompt with compact design system
  const allPlanPaths = plan.files.map(f => f.path);
  const designSystemPrompt = buildCompactSystemPrompt({
    framework: 'react',
    language: 'javascript',
    filePaths: allPlanPaths,
    themeId: questionnaireData?.themePreset ?? null,
    designStyle: questionnaireData?.designStyle ?? null,
    colorScheme: questionnaireData?.colorScheme ?? null,
    appType: questionnaireData?.appType ?? null,
  });

  const sharedSystemPrompt = `${designSystemPrompt}

IMPORTANT: You are generating the SHARED/CORE files for this project. Other files (pages) will be generated separately.

OUTPUT FORMAT: Use this exact delimiter format (NOT JSON):
--- FILE: src/App.jsx ---
[file content here]
--- FILE: src/components/Layout.jsx ---
[file content here]

Generate ONLY these files, nothing else.`;

  const planSummary = `Project: ${plan.name}
Description: ${plan.description}
Tech: ${plan.techstack}
Features: ${plan.features.join(', ')}
All planned files: ${plan.files.map(f => `${f.path} (${f.purpose})`).join(', ')}`;

  const sharedUserPrompt = `${planSummary}

Generate these specific shared/core files:
${sharedFilesToGenerate.map(p => {
    const planFile = plan!.files.find(f => f.path === p);
    return `- ${p}${planFile ? ': ' + planFile.purpose : ''}`;
  }).join('\n')}

CRITICAL for src/App.jsx:
- Must have "export default App" and isMain=true behavior
- Must import and set up React Router with Routes, Route
- Must import Layout from './components/Layout'
- Must import all page components from './pages/' that are in the plan
- Use BrowserRouter is already in main.jsx, so just use Routes/Route/etc.

For Layout.jsx: wrap routes with Header + <Outlet /> + Footer.
For Header.jsx: sticky nav with NavLink for each page route.
For Footer.jsx: site footer with links and copyright.
For src/index.css: Tailwind directives (@tailwind base/components/utilities) + any custom global styles.
${dbNeeded ? 'For schema.sql: complete Supabase-compatible SQL schema.\nFor supabase.js: Supabase client using import.meta.env.\nFor AuthContext.jsx: Auth context with Supabase auth.' : ''}

Use the delimiter format: --- FILE: path ---`;

  try {
    const sharedResponse = await llmCall(client, model, provider, sharedSystemPrompt, sharedUserPrompt);
    const parsedShared = parseMultiFileResponse(sharedResponse);

    if (parsedShared.length > 0) {
      for (const file of parsedShared) {
        const isMain = file.path === 'src/App.jsx' || file.path === 'src/App.tsx';
        await saveFileToDB(projectId, file.path, file.content, isMain);
        filesCreated.push(file.path);
        onProgress({ type: 'file-created', data: { path: file.path } });
      }
    } else {
      console.warn('Multi-pass: shared files pass returned no parseable files');
      onProgress({ type: 'status', data: { message: 'Warning: could not parse shared files from LLM, continuing...' } });
    }
  } catch (err) {
    console.error('Multi-pass: shared files generation failed', err);
    onProgress({ type: 'error', data: { message: `Shared files generation error: ${err instanceof Error ? err.message : 'unknown'}` } });
  }

  // -------------------------------------------------------------------------
  // Pass 3-N — Remaining page files in batches
  // -------------------------------------------------------------------------

  // Collect remaining files from the plan that were not generated as shared files
  const generatedPaths = new Set(filesCreated);
  // Also exclude scaffold paths
  const scaffoldPaths = new Set(scaffoldFiles.map(f => f.path));

  const remainingFiles = plan.files.filter(f => {
    return !generatedPaths.has(f.path) && !scaffoldPaths.has(f.path);
  });

  if (remainingFiles.length > 0) {
    // Batch remaining files into groups of 2-3
    const batchSize = 3;
    const batches: typeof remainingFiles[] = [];
    for (let i = 0; i < remainingFiles.length; i += batchSize) {
      batches.push(remainingFiles.slice(i, i + batchSize));
    }

    // Load shared files content for context (truncated)
    let appJsxContent = '';
    let layoutContent = '';
    try {
      const appFile = await prisma.appFile.findUnique({
        where: { projectId_path: { projectId, path: 'src/App.jsx' } },
        select: { content: true },
      });
      appJsxContent = appFile?.content?.slice(0, 3000) ?? '';
    } catch { /* ignore */ }
    try {
      const layoutFile = await prisma.appFile.findUnique({
        where: { projectId_path: { projectId, path: 'src/components/Layout.jsx' } },
        select: { content: true },
      });
      layoutContent = layoutFile?.content?.slice(0, 3000) ?? '';
    } catch { /* ignore */ }

    const pageSystemPrompt = `You are a world-class React developer generating specific page/component files for an existing project.
Use Tailwind CSS for styling. Use functional components with hooks. Export default from each file.
Use ESM imports only. Guard .map() calls: (items || []).map(...).
Allowed imports: react, react-dom, react-router-dom, lucide-react, react-icons, zustand, framer-motion, @tanstack/react-query, swr, react-hook-form, zod, date-fns, clsx, class-variance-authority, tailwind-merge, recharts, sonner, @supabase/supabase-js.
Use realistic, professional content — never lorem ipsum.
Images: ALWAYS use seeded picsum with descriptive keywords matching the content: https://picsum.photos/seed/{descriptive-keyword}/{w}/{h}. Use UNIQUE descriptive seeds per image (e.g. seed/mountain-bike-red/400/300, not seed/product/400/300). Avatars: i.pravatar.cc with different img numbers.

OUTPUT FORMAT: Use this exact delimiter format (NOT JSON):
--- FILE: src/pages/SomePage.jsx ---
[file content here]
--- FILE: src/components/SomeComponent.jsx ---
[file content here]

Generate ONLY the requested files.`;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const passNumber = 3 + batchIdx;
      const totalEstimated = 2 + batches.length;
      totalPasses++;

      const fileNames = batch.map(f => fileName(f.path)).join(', ');
      onProgress({
        type: 'status',
        data: {
          message: `Generating files (${passNumber}/${totalEstimated}): ${fileNames}...`,
          pass: passNumber,
          total: totalEstimated,
        },
      });

      const batchUserPrompt = `Project: ${plan.name} — ${plan.description}
Features: ${plan.features.join(', ')}

Context — App.jsx (shared entry):
\`\`\`jsx
${appJsxContent}
\`\`\`

Context — Layout.jsx (shared layout):
\`\`\`jsx
${layoutContent}
\`\`\`

Generate these files — match the import/component patterns used in App.jsx and Layout.jsx:
${batch.map(f => `- ${f.path}: ${f.purpose}`).join('\n')}

Use the delimiter format: --- FILE: path ---`;

      try {
        const batchResponse = await llmCall(client, model, provider, pageSystemPrompt, batchUserPrompt);
        const parsedBatch = parseMultiFileResponse(batchResponse);

        if (parsedBatch.length > 0) {
          for (const file of parsedBatch) {
            await saveFileToDB(projectId, file.path, file.content, false);
            filesCreated.push(file.path);
            onProgress({ type: 'file-created', data: { path: file.path } });
          }
        } else {
          console.warn(`Multi-pass: batch ${batchIdx + 1} returned no parseable files`);
          onProgress({
            type: 'status',
            data: { message: `Warning: batch ${batchIdx + 1} returned no files` },
          });
        }
      } catch (err) {
        console.error(`Multi-pass: batch ${batchIdx + 1} failed`, err);
        onProgress({
          type: 'error',
          data: {
            message: `Batch ${batchIdx + 1} error: ${err instanceof Error ? err.message : 'unknown'}`,
          },
        });
        // Continue with remaining batches
      }
    }
  }

  // Deduplicate filesCreated (shared files may overlap with scaffold)
  const uniqueFiles = [...new Set(filesCreated)];

  // -------------------------------------------------------------------------
  // Final pass — Validate + auto-fix
  // -------------------------------------------------------------------------
  onProgress({ type: 'status', data: { message: 'Validating generated files...' } });

  try {
    // Load all generated JSX/TSX files from DB for validation
    const allFiles = await prisma.appFile.findMany({
      where: { projectId },
      select: { path: true, content: true, name: true, language: true, isMain: true },
    });

    const jsFiles = allFiles.filter(f => /\.(jsx?|tsx?)$/.test(f.path));
    if (jsFiles.length > 0) {
      const validation = await validateFileSet(jsFiles);

      if (!validation.valid && validation.errors.length > 0) {
        onProgress({ type: 'status', data: { message: `Found ${validation.errors.length} issues, attempting auto-fix...` } });
        totalPasses++;

        // Build a fix prompt with the errors
        const errorList = validation.errors.slice(0, 8).map(e => `- ${e}`).join('\n');
        const brokenFiles = jsFiles
          .filter(f => validation.errors.some(err => err.includes(f.path) || err.includes(fileName(f.path))))
          .slice(0, 5);

        if (brokenFiles.length > 0) {
          const fixSystemPrompt = `You are fixing validation errors in React files. Fix ONLY the listed errors. Keep all working code unchanged.
OUTPUT FORMAT: Use delimiter format:
--- FILE: src/path/to/file.jsx ---
[full corrected file content]

Return the COMPLETE file content for each file you fix.`;

          const fixUserPrompt = `Errors found:
${errorList}

Files with errors:
${brokenFiles.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')}

Fix the errors and return corrected files using the delimiter format.`;

          try {
            const fixResponse = await llmCall(client, model, provider, fixSystemPrompt, fixUserPrompt);
            const fixedFiles = parseMultiFileResponse(fixResponse);

            for (const file of fixedFiles) {
              const isMain = file.path === 'src/App.jsx' || file.path === 'src/App.tsx';
              await saveFileToDB(projectId, file.path, file.content, isMain);
              onProgress({ type: 'file-created', data: { path: file.path, fixed: true } });
            }

            if (fixedFiles.length > 0) {
              onProgress({ type: 'status', data: { message: `Auto-fixed ${fixedFiles.length} file(s)` } });
            }
          } catch (fixErr) {
            console.warn('Multi-pass: auto-fix failed, continuing with original files', fixErr);
          }
        }
      } else {
        onProgress({ type: 'status', data: { message: 'All files validated successfully' } });
      }
    }
  } catch (valErr) {
    console.warn('Multi-pass: validation pass failed', valErr);
  }

  return {
    filesCreated: uniqueFiles,
    totalPasses,
    plan,
  };
}
