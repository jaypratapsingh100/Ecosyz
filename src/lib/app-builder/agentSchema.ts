/**
 * Standard JSON Schema for App Builder AI Agent
 *
 * Lovable/Replit-style: structured output for reliable file creation.
 * Sam Bhagwat: "Structured output" — reduces parsing errors, improves reliability.
 *
 * Schema: { files: Array<{ path, name, content, language, isMain }> }
 */

/**
 * Allowed file paths for AI-generated output.
 * Infrastructure files (package.json, vite.config, etc.) are excluded —
 * they are managed by the scaffold system and protected by scaffold-guard.ts.
 */
export const ALLOWED_PATHS = [
  'styles.css',
  'src/index.css',
  'src/App.jsx',
  'src/App.tsx',
  'src/App.css',
  'src/main.jsx',
  'src/main.tsx',
] as const;

/** Paths matching src/components/ (including subdirectories like ui/, dashboard/) — .js/.jsx/.ts/.tsx */
export const COMPONENT_PATH_PATTERN = /^src\/components\/(?:[a-zA-Z0-9-]+\/)*[a-zA-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;
/** Paths for components at src root: src/Header.jsx, src/Hero.jsx */
export const SRC_ROOT_COMPONENT_PATTERN = /^src\/[A-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;
/** Paths matching src/pages/*.jsx|tsx|js|ts */
export const PAGES_PATH_PATTERN = /^src\/pages\/(?:[a-zA-Z0-9-]+\/)*[A-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;
/** Paths matching src/store/*.js(x) | *.ts(x) — state management files */
export const STORE_PATH_PATTERN = /^src\/store\/[a-zA-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;
/** Paths matching src/hooks/*.js(x) | *.ts(x) — custom hooks */
export const HOOKS_PATH_PATTERN = /^src\/hooks\/[a-zA-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;
/** Paths matching src/context/*.jsx|tsx|js|ts — React context providers */
export const CONTEXT_PATH_PATTERN = /^src\/context\/[a-zA-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;
/** Paths matching src/lib|utils|data|services|config/*.js(x)|*.ts(x) */
export const UTILS_PATH_PATTERN = /^src\/(lib|utils|data|services|config|api)\/[a-zA-Z][a-zA-Z0-9]*\.(jsx?|tsx?)$/;

/** Check if a normalized path is allowed by the sandbox. */
export function isAllowedPath(path: string): boolean {
  return (
    ALLOWED_PATHS.includes(path as (typeof ALLOWED_PATHS)[number]) ||
    COMPONENT_PATH_PATTERN.test(path) ||
    SRC_ROOT_COMPONENT_PATTERN.test(path) ||
    CSS_PATH_PATTERN.test(path) ||
    PAGES_PATH_PATTERN.test(path) ||
    STORE_PATH_PATTERN.test(path) ||
    HOOKS_PATH_PATTERN.test(path) ||
    CONTEXT_PATH_PATTERN.test(path) ||
    UTILS_PATH_PATTERN.test(path)
  );
}
/** CSS files under src/ or at root */
export const CSS_PATH_PATTERN = /^(src\/.+\.css|styles\.css)$/;

export interface AgentFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

export interface AgentResponse {
  files: AgentFile[];
  summary?: string;
}

/** JSON schema for OpenRouter/OpenAI response_format (when supported) */
export const AGENT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path e.g. src/App.jsx or src/components/Header.jsx' },
          name: { type: 'string', description: 'File name' },
          content: { type: 'string', description: 'Full file content' },
          language: { type: 'string', enum: ['jsx', 'tsx', 'css', 'html'] },
          isMain: { type: 'boolean', description: 'True only for src/App.jsx or src/App.tsx' },
        },
        required: ['path', 'name', 'content', 'language', 'isMain'],
      },
    },
    summary: { type: 'string', description: 'Brief description of changes' },
  },
  required: ['files'],
} as const;

/**
 * Loose regex-based extraction for malformed JSON (e.g. unescaped newlines inside "content").
 * Used when strict parsing fails so Extract files and display still work.
 */
function extractFilesLoosely(text: string): AgentFile[] {
  const normalized: AgentFile[] = [];

  // Strategy: find each "path":"..." occurrence, then extract its "content":"..." value
  // This works even on truncated JSON — we extract every COMPLETE file entry
  const pathMatches = [...text.matchAll(/"path"\s*:\s*"([^"]+)"/g)];

  for (const pathMatch of pathMatches) {
    const pathRaw = pathMatch[1];
    const path = pathRaw.replace(/\s+/g, '').replace(/\\/g, '/');
    if (!isAllowedPath(path)) continue;

    // Find the "content":"..." for this file entry
    // Look ahead from the path match position for the content field
    const searchStart = pathMatch.index!;
    const searchSlice = text.slice(searchStart, searchStart + 200000); // 200KB window for large files

    // Find "content":" and then walk char-by-char to find the end of the escaped string
    const contentIdx = searchSlice.indexOf('"content"');
    if (contentIdx === -1) continue;

    const colonIdx = searchSlice.indexOf(':', contentIdx + 9);
    if (colonIdx === -1) continue;

    // Find opening quote of content value
    let openQuote = colonIdx + 1;
    while (openQuote < searchSlice.length && searchSlice[openQuote] !== '"') openQuote++;
    if (openQuote >= searchSlice.length) continue;

    // Walk to find closing quote (handling escaped quotes)
    let end = openQuote + 1;
    let complete = false;
    while (end < searchSlice.length) {
      if (searchSlice[end] === '\\') { end += 2; continue; }
      if (searchSlice[end] === '"') { complete = true; break; }
      end++;
    }

    if (!complete) {
      // This file's content was truncated — skip it
      // Truncated file detected — skip silently (logged once during pipeline, not on every render)
      continue;
    }

    const rawContent = searchSlice.slice(openQuote + 1, end);
    let content: string;
    try {
      content = JSON.parse(`"${rawContent}"`);
    } catch {
      // Unescape in correct order: backslash first, then others
      content = rawContent
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"');
    }

    // Extract optional fields
    const langMatch = searchSlice.match(/"language"\s*:\s*"([^"]+)"/);
    const isMainMatch = searchSlice.match(/"isMain"\s*:\s*(true|false)/);
    const nameMatch = searchSlice.match(/"name"\s*:\s*"([^"]+)"/);
    const ext = path.split('.').pop()?.toLowerCase();

    normalized.push({
      path,
      name: nameMatch?.[1] || path.split('/').pop() || path,
      content,
      language: langMatch?.[1] || (ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx' : ext === 'css' ? 'css' : ext === 'ts' ? 'typescript' : 'javascript'),
      isMain: isMainMatch?.[1] === 'true' || path === 'src/App.jsx' || path === 'src/App.tsx',
    });
  }

  return normalized;
}

/** Extract JSON from LLM response (handles markdown code blocks, prose, multiple blocks) */
export function extractAgentResponse(text: string): AgentResponse | null {
  const trimmed = text.trim();
  const candidates: string[] = [];

  // 1. All ```...``` blocks (prefer ones with "files")
  const blocks = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  for (const m of blocks) {
    const s = m[1].trim();
    if (s.includes('"files"')) candidates.push(s);
  }
  // 2. Raw JSON object in text
  const objMatch = trimmed.match(/\{\s*"files"\s*:[\s\S]*\}/);
  if (objMatch) candidates.push(objMatch[0]);
  // 3. Any {...} as fallback
  if (candidates.length === 0) {
    const fallback = trimmed.match(/\{[\s\S]*\}/);
    if (fallback) candidates.push(fallback[0]);
  }

  for (let i = 0; i < candidates.length; i++) {
    let jsonStr = candidates[i];
    // Repair common LLM JSON issues: trailing commas, control chars in strings
    try {
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1'); // trailing commas
    } catch {
      // ignore
    }

    const tryParse = (): unknown | null => {
      // 1) Try strict JSON first
      try {
        return JSON.parse(jsonStr) as unknown;
      } catch {
        // 2) Fallback: treat as JS object literal (handles unescaped newlines in strings)
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function(`return (${jsonStr});`);
          return fn() as unknown;
        } catch {
          return null;
        }
      }
    };

    const parsed = tryParse();
    if (!parsed || typeof parsed !== 'object') continue;

    const filesArr = (parsed as { files?: unknown }).files;
    if (!Array.isArray(filesArr)) continue;

    const files = filesArr as unknown[];
    const summary = (parsed as { summary?: string }).summary;

    const normalized: AgentFile[] = [];
    const rejectedPaths: string[] = [];
    for (const f of files) {
      if (!f || typeof f !== 'object') continue;
      const o = f as { path?: string; name?: string; content?: string; language?: string; isMain?: boolean };
      if (!o.path || typeof o.content !== 'string') continue;

      const path = o.path.replace(/\s+/g, '').replace(/\\/g, '/');
      const valid = isAllowedPath(path);

      if (!valid) {
        rejectedPaths.push(path);
        continue;
      }

      normalized.push({
        path,
        name: typeof o.name === 'string' ? o.name : path.split('/').pop() || path,
        content: o.content,
        language:
          o.language ||
          (path.endsWith('.tsx')
            ? 'tsx'
            : path.endsWith('.jsx')
              ? 'jsx'
              : path.endsWith('.css')
                ? 'css'
                : 'html'),
        isMain: o.isMain === true || path === 'src/App.jsx' || path === 'src/App.tsx',
      });
    }
    if (normalized.length > 0) return { files: normalized, summary };
  }

  // Strict parsing failed (e.g. unescaped newlines in "content"); try loose regex extraction
  const looseFiles = extractFilesLoosely(trimmed);
  if (looseFiles.length > 0) return { files: looseFiles, summary: undefined };

  return null;
}

const VALID_FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md'];
const KNOWN_LANG_TAGS = new Set([
  'jsx', 'javascript', 'typescript', 'tsx', 'js', 'ts', 'css', 'html',
  'json', 'markdown', 'python', 'java', 'cpp', 'c', 'bash', 'sh',
  'sql', 'yaml', 'yml', 'xml', 'text', 'plaintext', 'diff', 'md',
]);

function normalizePath(p: string): string {
  return p
    .replace(/\s+/g, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\.jxs$/i, '.jsx')
    .replace(/\.tsxs$/i, '.tsx')
    .replace(/^\.\//, '')
    .trim();
}

function isFilePath(s: string): boolean {
  if (!s) return false;
  const cleaned = normalizePath(s);
  const hasValidExt = VALID_FILE_EXTENSIONS.some((ext) => cleaned.toLowerCase().endsWith(ext));
  return hasValidExt || (cleaned.includes('.') && cleaned.includes('/'));
}

function inferPathFromContent(content: string, langTag: string): string | null {
  let ext = '.jsx';
  if (langTag === 'tsx' || langTag === 'typescript') ext = '.tsx';
  else if (langTag === 'ts') ext = '.ts';
  else if (langTag === 'css') ext = '.css';
  else if (langTag === 'html') ext = '.html';
  else if (langTag === 'json') ext = '.json';
  else if (content.includes('interface ') || content.match(/:\s*(string|number|boolean|React)/)) ext = '.tsx';

  if (ext === '.css') return content.includes('.App') ? 'src/App.css' : 'src/styles.css';
  if (ext === '.html') return 'index.html';
  if (ext === '.json' && content.includes('"name"') && content.includes('"version"')) return 'package.json';

  const patterns = [
    /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/,
    /(?:^|\n)\s*function\s+([A-Z][a-zA-Z0-9]*)/,
    /(?:^|\n)\s*(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*=/,
    /(?:^|\n)\s*(?:export\s+)?class\s+([A-Z][a-zA-Z0-9]*)/,
    /export\s+default\s+([A-Z][a-zA-Z0-9]*)\s*;?\s*$/,
  ];
  let componentName: string | null = null;
  for (const pattern of patterns) {
    const m = content.match(pattern);
    if (m) {
      componentName = m[1];
      break;
    }
  }
  if (!componentName) return null;
  if (componentName === 'App') return `src/App${ext}`;
  return `src/components/${componentName}${ext}`;
}

/**
 * Parse markdown code blocks into AgentFile[] when JSON extraction fails.
 * Supports: ```file:path, ```jsx:path, ```jsx path, first line as path, inferred from content.
 */
export function parseCodeBlocksToFiles(text: string): AgentFile[] {
  const trimmed = text.trim();
  const codeBlockRegex = /```([^\n`]*)\n([\s\S]*?)```/g;
  const rawBlocks: Array<{ header: string; content: string }> = [];
  let match;
  while ((match = codeBlockRegex.exec(trimmed)) !== null) {
    const header = (match[1] || '').trim();
    const content = (match[2] || '').trim();
    if (content.length > 0) rawBlocks.push({ header, content });
  }

  const allMatches: Array<{ path: string; content: string }> = [];
  const inferredBlocks: Array<{ header: string; content: string }> = [];

  for (const block of rawBlocks) {
    let { header, content } = block;
    let filePath: string | null = null;

    if (header.startsWith('file:')) filePath = header.substring(5).trim();
    else if (header.includes(':') && !KNOWN_LANG_TAGS.has(header.split(':')[0].toLowerCase())) filePath = header;
    else if (header.includes(':')) {
      const afterColon = header.split(':').slice(1).join(':').trim();
      if (isFilePath(afterColon)) filePath = afterColon;
    }
    if (!filePath && header.includes(' ')) {
      const parts = header.split(/\s+/);
      if (parts.length >= 2) {
        const possiblePath = parts.slice(1).join(' ').trim();
        if (isFilePath(possiblePath)) filePath = possiblePath;
      }
    }
    if (!filePath && isFilePath(header)) filePath = header;
    if (!filePath) {
      const lines = content.split('\n');
      const firstNonEmptyIndex = lines.findIndex((l) => l.trim().length > 0);
      if (firstNonEmptyIndex !== -1) {
        const firstLine = lines[firstNonEmptyIndex].trim();
        if (isFilePath(firstLine)) {
          filePath = firstLine;
          content = [...lines.slice(0, firstNonEmptyIndex), ...lines.slice(firstNonEmptyIndex + 1)].join('\n').trim();
        }
      }
    }

    if (filePath) {
      const normalized = normalizePath(filePath);
      const valid =
        isAllowedPath(normalized);
      if (valid) {
        const existing = allMatches.findIndex((m) => m.path === normalized);
        if (existing >= 0 && content.length > allMatches[existing].content.length) {
          allMatches[existing].content = content;
        } else if (existing < 0) {
          allMatches.push({ path: normalized, content });
        }
      }
    } else {
      inferredBlocks.push(block);
    }
  }

  for (const block of inferredBlocks) {
    const { header, content } = block;
    const langTag = KNOWN_LANG_TAGS.has(header.toLowerCase()) ? header.toLowerCase() : '';
    const looksLikeCode =
      content.includes('import ') ||
      content.includes('export ') ||
      content.includes('function ') ||
      content.includes('const ') ||
      content.includes('class ') ||
      content.includes('return ') ||
      content.includes('{') ||
      content.includes('<');
    if (!looksLikeCode) continue;

    const inferredPath = inferPathFromContent(content, langTag);
    if (inferredPath) {
      const normalized = normalizePath(inferredPath);
      const valid =
        isAllowedPath(normalized);
      if (valid) {
        const existing = allMatches.findIndex((m) => m.path === normalized);
        if (existing >= 0 && content.length > allMatches[existing].content.length) {
          allMatches[existing].content = content;
        } else if (existing < 0) {
          allMatches.push({ path: normalized, content });
        }
      }
    }
  }

  return allMatches.map((m) => ({
    path: m.path,
    name: m.path.split('/').pop() || m.path,
    content: m.content,
    language:
      m.path.endsWith('.tsx') ? 'tsx' : m.path.endsWith('.jsx') ? 'jsx' : m.path.endsWith('.css') ? 'css' : 'html',
    isMain: m.path === 'src/App.jsx' || m.path === 'src/App.tsx',
  }));
}
