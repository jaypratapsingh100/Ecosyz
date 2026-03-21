/**
 * Generation Pipeline — orchestrates the deterministic file processing pipeline.
 *
 * Flow: Parse AI response → Filter protected paths → Sanitize imports →
 *       Validate syntax + imports → Fix loop (if needed) → Save to DB
 *
 * This replaces the duplicated file-creation logic across streaming/non-streaming paths
 * in the chat route.
 */

import type OpenAI from 'openai';
import { parseResponseToFiles, upsertFiles } from './file-creator';
import type { ParsedFile, FileCreationResult } from './file-creator';
import { filterAIFiles } from '../scaffold-guard';
import { sanitizeFileImports } from '../sanitize-imports';
import { validateFileSet } from '../validate-files';
import { runFixLoop } from '../fix-loop';
import type { FixLoopContext } from '../fix-loop';

export interface PipelineConfig {
  projectId: string;
  responseText: string;
  /** AI client for fix-loop retries */
  client?: OpenAI;
  /** Model ID for fix-loop */
  model?: string;
  /** System prompt for fix-loop context */
  systemPrompt?: string;
  /** Max fix-loop retries (default 2) */
  maxFixRetries?: number;
  /** Skip validation (e.g., for scaffold files) */
  skipValidation?: boolean;
  /** Original user message for fix-loop context */
  userMessage?: string;
  /** Existing project files from DB for fix-loop context */
  existingFiles?: Array<{ path: string; content: string }>;
  /** Callback for each file created (for SSE streaming) */
  onFileCreated?: (result: FileCreationResult) => void;
  /** Callback for pipeline status updates */
  onStatus?: (status: string) => void;
}

export interface PipelineResult {
  files: FileCreationResult[];
  totalParsed: number;
  totalSaved: number;
  totalRejected: number;
  rejectedPaths: string[];
  removedImports: Map<string, string[]>;
  validationErrors: string[];
  fixLoopAttempts: number;
  wasFixed: boolean;
}

/**
 * Run the full generation pipeline on an AI response.
 *
 * 1. Parse response text into files
 * 2. Filter out protected scaffold paths
 * 3. Sanitize disallowed imports
 * 4. Validate syntax and import resolution
 * 5. Run fix-loop if validation fails
 * 6. Upsert files to database
 */
export async function runGenerationPipeline(
  config: PipelineConfig
): Promise<PipelineResult> {
  const {
    projectId,
    responseText,
    client,
    model,
    systemPrompt,
    maxFixRetries = 2,
    skipValidation = false,
    userMessage,
    existingFiles,
    onFileCreated,
    onStatus,
  } = config;

  // Step 1: Parse AI response into files
  onStatus?.('parsing');
  const parsedFiles = parseResponseToFiles(responseText);
  if (parsedFiles.length === 0) {
    console.warn('⚠️ Pipeline: No files parsed from AI response');
    return {
      files: [],
      totalParsed: 0,
      totalSaved: 0,
      totalRejected: 0,
      rejectedPaths: [],
      removedImports: new Map(),
      validationErrors: [],
      fixLoopAttempts: 0,
      wasFixed: false,
    };
  }
  console.log(`📁 Pipeline: Parsed ${parsedFiles.length} files:`, parsedFiles.map(f => f.path));

  // Step 2: Filter protected scaffold paths
  onStatus?.('filtering');
  const { allowed, rejected: rejectedPaths } = filterAIFiles(parsedFiles);
  if (rejectedPaths.length > 0) {
    console.warn(`🛡️ Pipeline: Blocked ${rejectedPaths.length} protected paths:`, rejectedPaths);
  }

  // Step 3: Sanitize imports
  onStatus?.('sanitizing');
  const { files: sanitizedFiles, removedImports } = sanitizeFileImports(allowed);
  if (removedImports.size > 0) {
    console.warn('📦 Pipeline: Removed disallowed imports:', Object.fromEntries(removedImports));
  }

  let finalFiles: ParsedFile[] = sanitizedFiles;
  let validationErrors: string[] = [];
  let fixLoopAttempts = 0;
  let wasFixed = false;

  // Step 4: Validate syntax and imports
  // Merge with existing project files so cross-batch imports resolve correctly.
  // E.g., if CartPage.jsx (new) imports ../store/cartStore (already in DB), we
  // need cartStore in the validation set so the import doesn't flag as unresolved.
  if (!skipValidation) {
    onStatus?.('validating');

    // Build the full file set: new files take precedence over existing DB files
    const newPathSet = new Set(sanitizedFiles.map(f => f.path));
    const existingForValidation = (existingFiles || [])
      .filter(f => !newPathSet.has(f.path))  // don't duplicate files being updated
      .filter(f => /\.(jsx?|tsx?)$/.test(f.path));  // only JS/TS files matter for import resolution

    const fullFileSet = [
      ...sanitizedFiles,
      ...existingForValidation.map(f => ({ ...f, name: f.path.split('/').pop() || f.path, language: 'javascript', isMain: false })),
    ];

    const validation = await validateFileSet(fullFileSet);

    if (!validation.valid) {
      console.warn(`⚠️ Pipeline: Validation found ${validation.errors.length} errors`);
      validationErrors = validation.errors;

      // Step 5: Fix loop (if AI client available)
      if (client && model && systemPrompt) {
        onStatus?.('fixing');
        const fixContext: FixLoopContext | undefined =
          (userMessage || existingFiles) ? { userMessage, existingFiles } : undefined;
        const fixResult = await runFixLoop(
          sanitizedFiles,
          client,
          model,
          systemPrompt,
          maxFixRetries,
          fixContext,
          existingForValidation,
        );
        finalFiles = fixResult.files;
        fixLoopAttempts = fixResult.attempts;
        wasFixed = fixResult.valid;
        validationErrors = fixResult.errors;

        if (wasFixed) {
          console.log(`✅ Pipeline: Fix loop resolved issues in ${fixLoopAttempts} attempt(s)`);
        } else {
          console.warn(`⚠️ Pipeline: Fix loop could not resolve all issues, saving anyway`);
        }
      } else {
        console.warn('⚠️ Pipeline: Validation failed but no AI client for fix-loop, saving as-is');
      }
    }
  }

  // Step 6: Save to database
  onStatus?.('saving');
  const results = await upsertFiles(projectId, finalFiles, { onFileCreated });
  const totalSaved = results.filter(r => r.success).length;
  console.log(`💾 Pipeline: Saved ${totalSaved}/${finalFiles.length} files`);

  return {
    files: results,
    totalParsed: parsedFiles.length,
    totalSaved,
    totalRejected: rejectedPaths.length,
    rejectedPaths,
    removedImports,
    validationErrors,
    fixLoopAttempts,
    wasFixed,
  };
}
