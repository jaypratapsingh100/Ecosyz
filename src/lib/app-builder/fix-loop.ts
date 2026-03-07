/**
 * Fix Loop — context-aware validation and retry with error feedback.
 *
 * Flow: validate → if broken, send errors + full project context to AI → re-validate → repeat.
 * Uses low temperature (0.2) for fix attempts to get precise corrections.
 *
 * Context-aware: AI sees ALL generated files (not just broken ones), existing project
 * file tree, and the original user request — so it can make informed fixes.
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

/**
 * Run the fix loop: validate files, and if invalid, ask the AI to fix them
 * with full project context.
 *
 * @param files - The files to validate (and potentially fix)
 * @param client - The OpenAI-compatible AI client
 * @param model - The model ID to use
 * @param systemPrompt - The system prompt for the fix request
 * @param maxRetries - Maximum number of fix attempts (default 2)
 * @param context - Project context (user message, existing files) for smarter fixes
 */
export async function runFixLoop(
  files: Array<{ path: string; content: string; name: string; language: string; isMain: boolean }>,
  client: OpenAI,
  model: string,
  systemPrompt: string,
  maxRetries: number = 2,
  context?: FixLoopContext
): Promise<FixLoopResult> {
  let currentFiles = files;
  let attempts = 0;

  // First validation pass
  const initial = await validateFileSet(currentFiles);
  if (initial.valid) {
    return { files: currentFiles, valid: true, attempts: 0, errors: [] };
  }

  // Fix loop
  while (attempts < maxRetries) {
    attempts++;
    console.log(`🔧 Fix loop attempt ${attempts}/${maxRetries}:`, initial.errors.slice(0, 5));

    const fixPrompt = buildFixPrompt(initial.errors, currentFiles, context);
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

      // Merge fixed files into current set (update existing, keep unchanged)
      currentFiles = mergeFiles(currentFiles, fixedFiles);

      // Re-validate
      const validation = await validateFileSet(currentFiles);
      if (validation.valid) {
        console.log(`✅ Fix loop: resolved after ${attempts} attempt(s)`);
        return { files: currentFiles, valid: true, attempts, errors: [] };
      }

      // Update errors for next iteration
      initial.errors.length = 0;
      initial.errors.push(...validation.errors);
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
    errors: initial.errors,
  };
}

/**
 * Build a context-aware fix prompt from validation errors, all generated files,
 * and project context (existing files, user request).
 */
function buildFixPrompt(
  errors: string[],
  files: Array<{ path: string; content: string }>,
  context?: FixLoopContext
): string {
  const errorList = errors.slice(0, 10).map((e) => `- ${e}`).join('\n');

  // Include ALL generated files (not just broken ones) so AI can see imports/dependencies
  const allFileContents = files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  // Existing project files (paths only to save tokens)
  let existingFileSection = '';
  if (context?.existingFiles?.length) {
    const existingPaths = context.existingFiles
      .map((f) => f.path)
      .filter((p) => !files.some((gen) => gen.path === p)) // exclude files being fixed
      .join(', ');
    if (existingPaths) {
      existingFileSection = `\nEXISTING PROJECT FILES (already saved — do NOT regenerate these):\n${existingPaths}\n`;
    }
  }

  // Original user request for intent context
  let requestSection = '';
  if (context?.userMessage) {
    // Truncate long messages to save tokens
    const msg = context.userMessage.length > 500
      ? context.userMessage.slice(0, 500) + '...'
      : context.userMessage;
    requestSection = `\nORIGINAL USER REQUEST:\n${msg}\n`;
  }

  return `The following generated files have validation errors. Fix ONLY the errors listed — do not change working code or add new features.
${requestSection}
ERRORS:
${errorList}
${existingFileSection}
ALL GENERATED FILES:
${allFileContents}

Return JSON: {"files":[{"path":"...","name":"...","content":"...FULL corrected content...","language":"jsx","isMain":false}],"summary":"Fixed: ..."}
Only include files that you actually changed. Return the FULL file content, not a partial diff.`;
}

/**
 * Parse the AI's fix response into files.
 */
function parseFixResponse(
  responseText: string,
  _currentFiles: Array<{ path: string; content: string; name: string; language: string; isMain: boolean }>
): Array<{ path: string; content: string; name: string; language: string; isMain: boolean }> {
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
 * Fixed files replace existing ones by path; unchanged files are kept.
 */
function mergeFiles(
  current: Array<{ path: string; content: string; name: string; language: string; isMain: boolean }>,
  fixed: Array<{ path: string; content: string; name: string; language: string; isMain: boolean }>
): Array<{ path: string; content: string; name: string; language: string; isMain: boolean }> {
  const fixedMap = new Map(fixed.map((f) => [f.path, f]));
  return current.map((f) => fixedMap.get(f.path) || f);
}
