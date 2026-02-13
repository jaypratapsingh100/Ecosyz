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
    } catch { /* ignore */ }
    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      const filesArr = (parsed as { files?: unknown }).files;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(filesArr)) continue;
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
          language: o.language || (path.endsWith('.tsx') ? 'tsx' : path.endsWith('.jsx') ? 'jsx' : path.endsWith('.css') ? 'css' : 'html'),
          isMain: o.isMain === true || path === 'src/App.jsx' || path === 'src/App.tsx',
        });
      }
      if (normalized.length > 0) return { files: normalized, summary };
    } catch {
      continue;
    }
  }
  return null;
}
