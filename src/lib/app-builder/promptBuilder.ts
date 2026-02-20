/**
 * Intelligent prompt builder for app generation.
 * Converts questionnaire + user message into structured LLM prompts.
 */

import type { QuestionnaireData } from '@/app/types/app-builder';

const SCAFFOLD_HINT = 'Paths: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css, src/components/*.jsx';

/** Build system prompt with scaffold context */
export function buildSystemPrompt(options: {
  framework: string;
  language: 'javascript' | 'typescript';
  fileCount: number;
  filePaths: string[];
}): string {
  const ext = options.language === 'typescript' ? 'tsx' : 'jsx';
  const paths =
    options.filePaths.length > 0
      ? options.filePaths.slice(0, 15).join(', ')
      : SCAFFOLD_HINT;

  return `Senior React developer. Build production-ready, professional sites. Framework: ${options.framework}, Language: ${options.language}.
Allowed paths: ${paths}
OUTPUT: Valid JSON only: {"files":[{"path":"src/App.${ext}","name":"App.${ext}","content":"...","language":"${ext.slice(0, 2)}x","isMain":true},...],"summary":"..."}
Rules: JSON only. One response. Semantic HTML, responsive, accessible. Components in src/components/.
Use CSS classes in styles.css; avoid inline styles except for dynamic values.
CRITICAL: For any list/array used in .map(): always guard against undefined. Use useState([]) for list state; for props use (items || []).map(...) or (tasks ?? []).map(...). Never call .map() on a value that might be undefined.`;
}

/** Business website requirements - injected when app type is business-like */
const BUSINESS_BRIEF = `Professional business website requirements:
- Hero: headline, subheadline, primary CTA
- Sections: Services/Features, About, Testimonials, Contact/CTA
- Layout: responsive, modern typography, clear hierarchy
- Styling: clean, trustworthy, subtle shadows, professional palette
- Components: Header (nav), Hero, ServiceCards, Testimonials, Footer
- Use realistic copy structure; no "Lorem ipsum" placeholders`;

/** Build intelligent user prompt from questionnaire + message */
export function buildUserPrompt(
  message: string,
  questionnaire: QuestionnaireData | null,
  existingPaths: string[]
): string {
  let out = message.trim();

  if (questionnaire && typeof questionnaire === 'object' && Object.keys(questionnaire).length > 0) {
    const parts: string[] = [];
    if (questionnaire.appType) parts.push(`App type: ${questionnaire.appType}`);
    if (questionnaire.targetAudience) parts.push(`Audience: ${questionnaire.targetAudience}`);
    if (questionnaire.designStyle) parts.push(`Style: ${questionnaire.designStyle}`);
    if (questionnaire.colorScheme) parts.push(`Colors: ${questionnaire.colorScheme}`);
    if (questionnaire.layoutStyle) parts.push(`Layout: ${questionnaire.layoutStyle}`);
    if (Array.isArray(questionnaire.requiredFeatures) && questionnaire.requiredFeatures.length > 0) {
      parts.push(`Features: ${(questionnaire.requiredFeatures as string[]).join(', ')}`);
    }
    if (Array.isArray(questionnaire.specialFeatures) && questionnaire.specialFeatures.length > 0) {
      parts.push(`Special: ${(questionnaire.specialFeatures as string[]).join(', ')}`);
    }
    if (questionnaire.brandName) parts.push(`Brand: ${questionnaire.brandName}`);

    if (parts.length > 0) {
      out = `[Context: ${parts.join(' | ')}]\n\n${out}`;
    }

    const appType = String(questionnaire.appType ?? '').toLowerCase();
    const isBusiness =
      appType.includes('business') ||
      appType.includes('landing') ||
      appType.includes('portfolio') ||
      appType.includes('e-commerce') ||
      appType.includes('agency') ||
      appType.includes('corporate');
    if (isBusiness) {
      out = `${BUSINESS_BRIEF}\n\n${out}`;
    }
  }

  if (existingPaths.length > 0) {
    out += `\n\nExisting: ${existingPaths.slice(0, 10).join(', ')}. Extend or update these.`;
  }

  return out;
}

/** Build fix prompt for auto-repair on render errors */
export function buildFixPrompt(
  errorMessage: string,
  failedPaths: string[],
  attempt: number
): string {
  return `FIX RENDER ERROR (attempt ${attempt}):
${errorMessage}

Affected files: ${failedPaths.join(', ')}

Return JSON: {"files":[{"path":"...","name":"...","content":"...","language":"jsx","isMain":false}],"summary":"Fixed: ..."}`;
}
