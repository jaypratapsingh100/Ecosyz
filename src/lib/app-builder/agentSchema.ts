/**
 * Standard JSON Schema for App Builder AI Agent
 *
 * Lovable/Replit-style: structured output for reliable file creation.
 * Sam Bhagwat: "Structured output" — reduces parsing errors, improves reliability.
 *
 * Schema: { files: Array<{ path, name, content, language, isMain }> }
 */

export const ALLOWED_PATHS = [
  'index.html',
  'styles.css',
  'src/index.css',
  'src/App.jsx',
  'src/App.tsx',
  'src/App.css',
  'src/main.jsx',
  'src/main.tsx',
  'package.json',
  'vite.config.js',
  'README.md',
] as const;

/** Paths matching src/components/*.jsx | *.tsx */
export const COMPONENT_PATH_PATTERN = /^src\/components\/[A-Z][a-zA-Z0-9]*\.(jsx|tsx)$/;
/** Paths for components at src root: src/Header.jsx, src/Hero.jsx */
export const SRC_ROOT_COMPONENT_PATTERN = /^src\/[A-Z][a-zA-Z0-9]*\.(jsx|tsx)$/;
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
  const filesStart = text.indexOf('"files"');
  if (filesStart === -1) return normalized;

  const slice = text.slice(filesStart);
  // Match each file object: path, name, content (multiline; content may contain \" so we don't stop at first ")
  const fileBlockRegex =
    /\{\s*"path":\s*"([^"]+)"[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?"content":\s*"((?:[^"\\]|\\.)*)"\s*,\s*[\s\n]*"language":\s*"([^"]+)"[\s\S]*?"isMain":\s*(true|false)/g;

  let match: RegExpExecArray | null;
  while ((match = fileBlockRegex.exec(slice)) !== null) {
    const [, pathRaw, nameRaw, contentRaw, languageRaw, isMainRaw] = match;
    const path = pathRaw.replace(/\s+/g, '').replace(/\\/g, '/');
    const valid =
      ALLOWED_PATHS.includes(path as (typeof ALLOWED_PATHS)[number]) ||
      COMPONENT_PATH_PATTERN.test(path) ||
      SRC_ROOT_COMPONENT_PATTERN.test(path) ||
      CSS_PATH_PATTERN.test(path);
    if (!valid) continue;

    const content = contentRaw
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"');

    normalized.push({
      path,
      name: nameRaw || path.split('/').pop() || path,
      content,
      language:
        languageRaw ||
        (path.endsWith('.tsx') ? 'tsx' : path.endsWith('.jsx') ? 'jsx' : path.endsWith('.css') ? 'css' : 'html'),
      isMain: isMainRaw === 'true' || path === 'src/App.jsx' || path === 'src/App.tsx',
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
      const valid =
        ALLOWED_PATHS.includes(path as (typeof ALLOWED_PATHS)[number]) ||
        COMPONENT_PATH_PATTERN.test(path) ||
        SRC_ROOT_COMPONENT_PATTERN.test(path) ||
        CSS_PATH_PATTERN.test(path);

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
