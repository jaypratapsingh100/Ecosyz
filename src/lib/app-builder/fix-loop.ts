/**
 * Fix Loop — context-aware validation and retry with error feedback.
 *
 * Flow: validate → if broken, send errors + targeted context to AI → re-validate → repeat.
 * Uses low temperature (0.2) for fix attempts to get precise corrections.
 *
 * Token-efficient: Only sends broken files + error context, not every file.
 * Validates against the full project file set (new + existing) to avoid false positives.
 */

import type OpenAI from 'openai';
import { validateFileSet } from './validate-files';
import { getStageParams } from './ai-params';
import { extractAgentResponse, parseCodeBlocksToFiles } from './agentSchema';

export interface FixLoopResult {
  files: Array<{ path: string; content: string; name: string; language: string; isMain: boolean }>;
  valid: boolean;
  attempts: number;
  errors: string[];
}

/** Additional project context passed to the fix-loop for smarter fixes. */
export interface FixLoopContext {
  /** Original user message that triggered generation */
  userMessage?: string;
  /** Existing project files from DB (path + content) for reference */
  existingFiles?: Array<{ path: string; content: string }>;
}

type FileEntry = { path: string; content: string; name: string; language: string; isMain: boolean };

/**
 * Run the fix loop: validate files, and if invalid, ask the AI to fix them
 * with full project context.
 *
 * @param files - The newly generated files to validate (and potentially fix)
 * @param client - The OpenAI-compatible AI client
 * @param model - The model ID to use
 * @param systemPrompt - The system prompt for the fix request
 * @param maxRetries - Maximum number of fix attempts (default 2)
 * @param context - Project context (user message, existing files) for smarter fixes
 * @param existingForValidation - Existing DB files included in validation set (not sent to AI in full)
 */
export async function runFixLoop(
  files: FileEntry[],
  client: OpenAI,
  model: string,
  systemPrompt: string,
  maxRetries: number = 2,
  context?: FixLoopContext,
  existingForValidation?: Array<{ path: string; content: string }>,
): Promise<FixLoopResult> {
  let currentFiles = files;
  let attempts = 0;

  // Build full validation set: new files + existing DB files
  const buildFullSet = (newFiles: FileEntry[]) => {
    const newPaths = new Set(newFiles.map(f => f.path));
    const existing = (existingForValidation || [])
      .filter(f => !newPaths.has(f.path));
    return [
      ...newFiles,
      ...existing.map(f => ({ ...f, name: f.path.split('/').pop() || f.path, language: 'javascript', isMain: false })),
    ];
  };

  // First validation pass (against full project)
  const fullSet = buildFullSet(currentFiles);
  const initial = await validateFileSet(fullSet);
  if (initial.valid) {
    return { files: currentFiles, valid: true, attempts: 0, errors: [] };
  }

  let currentErrors = initial.errors;

  // Fix loop
  while (attempts < maxRetries) {
    attempts++;
    console.log(`🔧 Fix loop attempt ${attempts}/${maxRetries}:`, currentErrors.slice(0, 5));

    const fixPrompt = buildFixPrompt(currentErrors, currentFiles, context, existingForValidation);
    const params = getStageParams('fix');

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fixPrompt },
        ],
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: 8192,
        stream: false,
      });

      const responseText = response.choices[0]?.message?.content || '';
      const fixedFiles = parseFixResponse(responseText, currentFiles);

      if (fixedFiles.length === 0) {
        console.warn('⚠️ Fix loop: AI returned no files, keeping originals');
        continue;
      }

      // Merge fixed files into current set (update existing, add new)
      currentFiles = mergeFiles(currentFiles, fixedFiles);

      // Re-validate against full project
      const fullSetAfterFix = buildFullSet(currentFiles);
      const validation = await validateFileSet(fullSetAfterFix);
      if (validation.valid) {
        console.log(`✅ Fix loop: resolved after ${attempts} attempt(s)`);
        return { files: currentFiles, valid: true, attempts, errors: [] };
      }

      // Update errors for next iteration
      currentErrors = validation.errors;
    } catch (err) {
      console.error(`❌ Fix loop attempt ${attempts} failed:`, err);
      // Continue to next attempt or give up
    }
  }

  // Exhausted retries — return what we have with remaining errors
  console.warn(`⚠️ Fix loop: could not fully resolve after ${attempts} attempts`);
  return {
    files: currentFiles,
    valid: false,
    attempts,
    errors: currentErrors,
  };
}

/**
 * Build a token-efficient fix prompt.
 * Only sends broken files and files involved in errors, not every file.
 * Tells the AI about existing files so it knows what's already available.
 */
function buildFixPrompt(
  errors: string[],
  files: Array<{ path: string; content: string }>,
  context?: FixLoopContext,
  existingFiles?: Array<{ path: string; content: string }>,
): string {
  const errorList = errors.slice(0, 10).map((e) => `- ${e}`).join('\n');

  // Extract file paths mentioned in errors
  const errorFilePaths = new Set<string>();
  for (const err of errors) {
    // Errors look like: "[import] src/pages/CartPage.jsx: unresolved import '../store/cartStore' → 'src/store/cartStore'"
    const match = err.match(/(?:\[(?:import|syntax)\]\s*)?([^:]+\.(?:jsx?|tsx?)):/);
    if (match) errorFilePaths.add(match[1]);
    // Also extract target of unresolved imports
    const importTarget = err.match(/→\s*'([^']+)'/);
    if (importTarget) {
      // Check if target matches an existing file (with common extensions)
      const target = importTarget[1];
      for (const f of files) {
        if (f.path === target || f.path.startsWith(target)) errorFilePaths.add(f.path);
      }
    }
  }

  // Only send files involved in errors (saves tokens)
  const brokenFiles = files.filter(f => errorFilePaths.has(f.path));
  // If we couldn't identify specific broken files, send all (fallback)
  const filesToSend = brokenFiles.length > 0 ? brokenFiles : files;

  const fileContents = filesToSend
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  // List ALL file paths (new + existing) so AI knows what's available for imports
  const allNewPaths = files.map(f => f.path);
  const allExistingPaths = (existingFiles || []).map(f => f.path);
  const allAvailablePaths = [...new Set([...allNewPaths, ...allExistingPaths])];

  // Existing project files (paths only to save tokens)
  let existingFileSection = '';
  if (context?.existingFiles?.length) {
    const existingPaths = context.existingFiles
      .map((f) => f.path)
      .filter((p) => !files.some((gen) => gen.path === p))
      .join(', ');
    if (existingPaths) {
      existingFileSection = `\nEXISTING PROJECT FILES (already saved — do NOT regenerate these unless they have errors):\n${existingPaths}\n`;
    }
  }

  // Classify errors to give targeted instructions
  const hasUnresolvedImports = errors.some(e => e.includes('unresolved import'));
  const hasSyntaxErrors = errors.some(e => e.includes('[syntax]'));

  let instructions = '';
  if (hasUnresolvedImports) {
    instructions += `\nFor UNRESOLVED IMPORT errors: Either create the missing file OR fix the import path. Do NOT regenerate files that already work.\n`;
    instructions += `Available file paths in this project: ${allAvailablePaths.join(', ')}\n`;
  }
  if (hasSyntaxErrors) {
    instructions += `\nFor SYNTAX errors: Fix only the specific syntax issue in the affected file. Return the complete corrected file content.\n`;
  }

  // Original user request for intent context
  let requestSection = '';
  if (context?.userMessage) {
    const msg = context.userMessage.length > 300
      ? context.userMessage.slice(0, 300) + '...'
      : context.userMessage;
    requestSection = `\nORIGINAL USER REQUEST:\n${msg}\n`;
  }

  return `The following generated files have validation errors. Fix ONLY the errors listed below.

CRITICAL RULES:
- Do NOT restructure, rewrite, or reorganize ANY file that is not broken.
- Do NOT change the routing pattern (e.g., do not change state-based routing to window.location or React Router).
- Do NOT change imports, component structure, or navigation logic in files that have no errors.
- Do NOT add, remove, or rename components unless required to fix a specific error.
- If a file has a syntax error (like an unescaped quote), fix ONLY that syntax error — return the same file with the minimal fix applied.
- Only return files you actually changed or created. Do NOT return unchanged files.
${requestSection}
ERRORS:
${errorList}
${instructions}${existingFileSection}
FILES WITH ERRORS:
${fileContents}

Return JSON: {"files":[{"path":"...","name":"...","content":"...FULL corrected content...","language":"jsx","isMain":false}],"summary":"Fixed: ..."}
Return the FULL file content for each changed file, not a partial diff.
If a file is missing (unresolved import), create it with a minimal working implementation.`;
}

/**
 * Parse the AI's fix response into files.
 */
function parseFixResponse(
  responseText: string,
  _currentFiles: FileEntry[]
): FileEntry[] {
  const agentResult = extractAgentResponse(responseText);
  if (agentResult?.files?.length) {
    return agentResult.files;
  }

  const codeBlocks = parseCodeBlocksToFiles(responseText);
  if (codeBlocks.length > 0) {
    return codeBlocks;
  }

  return [];
}

/**
 * Merge fixed files into the current file set.
 * Fixed files replace existing ones by path; new files are added.
 */
function mergeFiles(current: FileEntry[], fixed: FileEntry[]): FileEntry[] {
  const currentPaths = new Set(current.map((f) => f.path));
  const fixedMap = new Map(fixed.map((f) => [f.path, f]));
  // Update existing files
  const merged = current.map((f) => fixedMap.get(f.path) || f);
  // Add new files that weren't in the original set (e.g., missing imports)
  for (const f of fixed) {
    if (!currentPaths.has(f.path)) {
      merged.push(f);
    }
  }
  return merged;
}
