/**
 * File Creator — extracted from the monolithic chat route.
 * Handles parsing AI responses into files and upserting them to the database.
 * Used by both streaming and non-streaming generation paths.
 */

import { prisma } from '@/lib/db';
import {
  extractAgentResponse,
  parseCodeBlocksToFiles,
  isAllowedPath,
} from '@/lib/app-builder/agentSchema';

export interface FileCreationResult {
  path: string;
  success: boolean;
  error?: string;
  /** Whether the file was newly created or an existing file was updated */
  action?: 'created' | 'updated';
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
    let normalizedPath = f.path.replace(/\.\./g, '').replace(/^\//, '');
    // Add src/ prefix if missing — AI sometimes returns "App.jsx" or "components/Header.jsx"
    if (!normalizedPath.startsWith('src/') && !['index.html', 'package.json', 'vite.config.js', 'README.md', 'styles.css'].includes(normalizedPath)) {
      if (normalizedPath.match(/\.(jsx?|tsx?|css)$/)) {
        normalizedPath = 'src/' + normalizedPath;
      }
    }
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

  // Fix stray backslashes from malformed JSON unescaping (e.g., ',\        subject' → newline)
  fixed = fixed.replace(/,\\\s{2,}/g, ',\n');
  fixed = fixed.replace(/'\\\s{2,}/g, "'\n");
  fixed = fixed.replace(/;\\\s{2,}/g, ';\n');

  // Fix unescaped apostrophes inside single-quoted strings (common AI mistake)
  // e.g., 'team's productivity' → 'team\\'s productivity'
  // Only fix inside string literals that are clearly broken (quote mismatch)
  fixed = fixed.replace(/'([^']*?)\b(\w)'(\w)\b([^']*?)'/g, (match, before, w1, w2, after) => {
    // Common contractions: it's, don't, team's, what's, we're, you'll, etc.
    if (/^[a-z]$/.test(w2)) {
      return `'${before}${w1}\\'${w2}${after}'`;
    }
    return match;
  });

  // Fix classname → className
  if (fixed.includes('classname=') && !fixed.includes('className=')) {
    fixed = fixed.replace(/\bclassname\s*=/gi, 'className=');
  }

  // Fix export name mismatches — prefer PascalCase component name over data variables
  const exportMatch = fixed.match(/export\s+default\s+(\w+)\s*;/);
  if (exportMatch) {
    const exportedName = exportMatch[1];
    // Find all PascalCase declarations (component names like Header, FeatureComparison)
    const componentDecls = [...fixed.matchAll(/(?:const|function|var|let)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/g)];
    // Find all camelCase/lowercase declarations (data variables like features, pricingPlans)
    const allDecls = [...fixed.matchAll(/(?:const|function|var|let)\s+(\w+)\s*[=(]/g)];

    if (componentDecls.length > 0) {
      // If exporting a non-component name but a PascalCase component exists, fix it
      const exportedIsComponent = /^[A-Z]/.test(exportedName);
      if (!exportedIsComponent) {
        // Export the first PascalCase component instead
        fixed = fixed.replace(
          /export\s+default\s+\w+\s*;/g,
          `export default ${componentDecls[0][1]};`
        );
      } else if (!allDecls.some(d => d[1] === exportedName)) {
        // Exported name doesn't exist, use first component
        fixed = fixed.replace(
          /export\s+default\s+\w+\s*;/g,
          `export default ${componentDecls[0][1]};`
        );
      }
    } else if (allDecls.length > 0 && !allDecls.some(d => d[1] === exportedName)) {
      // No PascalCase component found, but exported name doesn't match any declaration
      fixed = fixed.replace(
        /export\s+default\s+\w+\s*;/g,
        `export default ${allDecls[0][1]};`
      );
    }
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
  return isAllowedPath(normalizedPath);
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

    // Skip truncated files — incomplete code that would break the preview
    // Strip comments and strings before counting braces to avoid false positives
    if (file.path.match(/\.(jsx?|tsx?)$/) && file.content.length > 50) {
      const trimmed = file.content.trimEnd();
      // Remove single-line comments, multi-line comments, and string literals before counting
      const codeOnly = trimmed
        .replace(/\/\/[^\n]*/g, '')           // single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')     // multi-line comments
        .replace(/'(?:[^'\\]|\\.)*'/g, '""')  // single-quoted strings → empty
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')  // double-quoted strings → empty
        .replace(/`(?:[^`\\]|\\.)*`/g, '""'); // template literals → empty
      const openBraces = (codeOnly.match(/\{/g) || []).length;
      const closeBraces = (codeOnly.match(/\}/g) || []).length;
      const openParens = (codeOnly.match(/\(/g) || []).length;
      const closeParens = (codeOnly.match(/\)/g) || []).length;
      // More lenient: JSX components naturally have brace imbalances in templates
      const isTruncated = (openBraces - closeBraces > 5) || (openParens - closeParens > 5)
        || /[,{(\[]\s*$/.test(trimmed);

      if (isTruncated) {
        console.warn(`⚠️ Skipping truncated file: ${file.path} (${openBraces} open vs ${closeBraces} close braces)`);
        const result: FileCreationResult = {
          path: file.path,
          success: false,
          error: 'File appears truncated (incomplete code)',
        };
        results.push(result);
        options?.onFileCreated?.(result);
        continue;
      }
    }

    try {
      // Check if file already exists to determine created vs updated
      const existing = await prisma.appFile.findUnique({
        where: { projectId_path: { projectId, path: file.path } },
        select: { id: true, content: true },
      });

      // Save previous version before overwriting (enables undo)
      if (existing && existing.content) {
        try {
          const lastVersion = await prisma.appFileVersion.findFirst({
            where: { fileId: existing.id },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          await prisma.appFileVersion.create({
            data: {
              fileId: existing.id,
              content: existing.content,
              version: (lastVersion?.version ?? 0) + 1,
            },
          });
        } catch (versionErr) {
          // Non-blocking: don't fail the upsert if version save fails
          console.warn('⚠️ Failed to save file version:', file.path, versionErr);
        }
      }

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

      const result: FileCreationResult = {
        path: file.path,
        success: true,
        action: existing ? 'updated' : 'created',
      };
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
