/**
 * File Creator — extracted from the monolithic chat route.
 * Handles parsing AI responses into files and upserting them to the database.
 * Used by both streaming and non-streaming generation paths.
 */

import { prisma } from '@/lib/db';
import {
  extractAgentResponse,
  parseCodeBlocksToFiles,
  ALLOWED_PATHS,
  COMPONENT_PATH_PATTERN,
  SRC_ROOT_COMPONENT_PATTERN,
  CSS_PATH_PATTERN,
} from '@/lib/app-builder/agentSchema';

export interface FileCreationResult {
  path: string;
  success: boolean;
  error?: string;
}

export interface ParsedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  css: 'css',
  html: 'html',
  json: 'json',
};

/**
 * Parse an AI response (JSON or markdown code blocks) into a list of files.
 */
export function parseResponseToFiles(responseText: string): ParsedFile[] {
  const files: ParsedFile[] = [];

  // Try structured JSON first, then markdown code blocks
  const agentResult = extractAgentResponse(responseText);
  const rawFiles = agentResult?.files?.length
    ? agentResult.files
    : parseCodeBlocksToFiles(responseText);

  for (const f of rawFiles) {
    const normalizedPath = f.path.replace(/\.\./g, '').replace(/^\//, '');
    const ext = normalizedPath.split('.').pop()?.toLowerCase() || '';
    const lang = f.language || LANGUAGE_MAP[ext] || ext;
    const name = f.name || normalizedPath.split('/').pop() || normalizedPath;
    const isMain =
      normalizedPath.includes('App.') ||
      normalizedPath.includes('main.') ||
      normalizedPath.includes('index.');

    files.push({
      path: normalizedPath,
      name,
      content: autoFixContent(f.content),
      language: lang,
      isMain: f.isMain ?? isMain,
    });
  }

  return files;
}

/**
 * Auto-fix common syntax issues in AI-generated code.
 */
function autoFixContent(content: string): string {
  let fixed = content;

  // Fix malformed imports: import*asReactfrom'react' → import React from 'react'
  fixed = fixed.replace(/import\*as(\w+)from(['"])([^'"]+)\2/g, (_m, p1, p2, p3) =>
    `import ${p1} from ${p2}${p3}${p2}`
  );

  // Fix malformed named imports
  fixed = fixed.replace(/import\*\{([^}]+)\}from(['"])([^'"]+)\2/g, (_m, p1, p2, p3) =>
    `import { ${p1.trim()} } from ${p2}${p3}${p2}`
  );

  // Fix export*default
  fixed = fixed.replace(/export\*default/g, 'export default');

  // Fix common typos
  fixed = fixed.replace(/\breutrn\b/g, 'return');
  fixed = fixed.replace(/\bimprot\b/g, 'import');
  fixed = fixed.replace(/\bexprot\b/g, 'export');

  // Fix classname → className
  if (fixed.includes('classname=') && !fixed.includes('className=')) {
    fixed = fixed.replace(/\bclassname\s*=/gi, 'className=');
  }

  // Fix export name mismatches
  const componentMatch = fixed.match(/(?:const|function|var|let)\s+(\w+)\s*[=(]/);
  const exportMatch = fixed.match(/export\s+default\s+(\w+)\s*;/);
  if (componentMatch && exportMatch && componentMatch[1] !== exportMatch[1]) {
    fixed = fixed.replace(
      /export\s+default\s+\w+\s*;/g,
      `export default ${componentMatch[1]};`
    );
  }

  return fixed;
}

/**
 * Validate that a file path is allowed by the sandbox.
 */
export function isPathAllowed(normalizedPath: string): boolean {
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.includes('://')) {
    return false;
  }
  return (
    ALLOWED_PATHS.includes(normalizedPath as (typeof ALLOWED_PATHS)[number]) ||
    COMPONENT_PATH_PATTERN.test(normalizedPath) ||
    SRC_ROOT_COMPONENT_PATTERN.test(normalizedPath) ||
    CSS_PATH_PATTERN.test(normalizedPath)
  );
}

/**
 * Upsert a batch of parsed files into the database.
 * Returns results for each file (success/failure).
 */
export async function upsertFiles(
  projectId: string,
  files: ParsedFile[],
  options?: {
    /** Callback for each file created (for SSE streaming) */
    onFileCreated?: (result: FileCreationResult) => void;
  }
): Promise<FileCreationResult[]> {
  const results: FileCreationResult[] = [];

  for (const file of files) {
    if (!isPathAllowed(file.path)) {
      const result: FileCreationResult = {
        path: file.path,
        success: false,
        error: 'Path not allowed by sandbox',
      };
      results.push(result);
      options?.onFileCreated?.(result);
      continue;
    }

    try {
      await prisma.appFile.upsert({
        where: {
          projectId_path: { projectId, path: file.path },
        },
        update: {
          content: file.content,
          language: file.language,
          isMain: file.isMain,
          name: file.name,
          updatedAt: new Date(),
        },
        create: {
          projectId,
          path: file.path,
          name: file.name,
          content: file.content,
          language: file.language,
          isMain: file.isMain,
        },
      });

      const result: FileCreationResult = { path: file.path, success: true };
      results.push(result);
      options?.onFileCreated?.(result);
    } catch (err) {
      const result: FileCreationResult = {
        path: file.path,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      results.push(result);
      options?.onFileCreated?.(result);
    }
  }

  return results;
}

/**
 * Full pipeline: parse response text → upsert files → return results.
 */
export async function parseAndCreateFiles(
  projectId: string,
  responseText: string,
  options?: {
    onFileCreated?: (result: FileCreationResult) => void;
  }
): Promise<FileCreationResult[]> {
  const files = parseResponseToFiles(responseText);
  if (files.length === 0) {
    console.warn('⚠️ No files parsed from AI response');
    return [];
  }
  console.log(`📁 Parsed ${files.length} files from response:`, files.map(f => f.path));
  return upsertFiles(projectId, files, options);
}
