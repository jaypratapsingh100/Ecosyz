/**
 * Intelligent prompt builder for app generation (Lovable/Replit-style).
 * Converts questionnaire + user message into structured LLM prompts.
 * Includes explicit scaffold structure and preview constraints so generated apps render in iframe.
 */

import type { QuestionnaireData } from '@/app/types/app-builder';

const SCAFFOLD_HINT = 'Paths: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css, src/components/*.jsx';

/** App structure for preview — how the app is rendered (Lovable-style) */
const APP_STRUCTURE = `
APP STRUCTURE (preview renders in iframe from these files):
- index.html: has <div id="root"></div>; no Vite script in preview (we inject React + App).
- Entry: src/App.jsx (or src/App.tsx). This file MUST export default App and is the main entry. Set isMain: true.
- Styles: src/index.css (global). Component-specific: src/components/*.css or inline.
- New components: src/components/ComponentName.jsx. Import in App and render inside App.
- No Next.js, no React Router in preview. For links use <a href="..."> or window.Link (stub provided).
`;

/** File tree template so LLM outputs correct paths and types */
function getScaffoldFileTree(ext: string): string {
  return `
SCAFFOLD FILE TREE (create/update only these paths; use correct extension .${ext}):
  index.html
  src/
    main.${ext === 'tsx' ? 'tsx' : 'jsx'}
    App.${ext}
    index.css
    components/
      (e.g. Header.jsx, Hero.jsx, Footer.jsx)
Output files with path exactly as above (e.g. "src/App.${ext}", "src/components/Header.${ext}").`;
}

/** Build system prompt with scaffold context and Lovable-style rendering rules */
export function buildSystemPrompt(options: {
  framework: string;
  language: 'javascript' | 'typescript';
  fileCount: number;
  filePaths: string[];
}): string {
  const ext = options.language === 'typescript' ? 'tsx' : 'jsx';
  const paths =
    options.filePaths.length > 0
      ? options.filePaths.slice(0, 20).join(', ')
      : SCAFFOLD_HINT;

  return `You are a senior React developer. Build production-ready, professional sites that render in our in-browser preview (Lovable-style). Framework: ${options.framework}, Language: ${options.language}.

${APP_STRUCTURE}
${getScaffoldFileTree(ext)}

Allowed paths (use these exactly): ${paths}

OUTPUT: Valid JSON only, one response:
{"files":[{"path":"src/App.${ext}","name":"App.${ext}","content":"...","language":"${ext.slice(0, 2)}x","isMain":true},...],"summary":"..."}

RULES:
- JSON only. One response. Semantic HTML, responsive, accessible.
- Main entry: src/App.${ext} with export default App. New components in src/components/.
- Use CSS in src/index.css or component-level; avoid inline styles except for dynamic values.
- CRITICAL for preview: (1) For any .map() always guard: (items || []).map(...) or useState([]). Never .map() on undefined. (2) Valid JSX only; no Node/require. (3) For navigation use <a href="..."> or Link (stub provided in preview).`;
}

/** Business website requirements - injected when app type is business-like */
const BUSINESS_BRIEF = `Professional business website requirements:
- Hero: headline, subheadline, primary CTA
- Sections: Services/Features, About, Testimonials, Contact/CTA
- Layout: responsive, modern typography, clear hierarchy
- Styling: clean, trustworthy, subtle shadows, professional palette
- Components: Header (nav), Hero, ServiceCards, Testimonials, Footer
- Use realistic copy structure; no "Lorem ipsum" placeholders
- IMPORTANT: Create separate React components in src/components for each major section:
  - Header.jsx (navigation + dark mode toggle when requested)
  - Hero.jsx (hero + primary CTA)
  - Services.jsx (services / features grid or cards)
  - Testimonials.jsx (optional, if relevant)
  - ContactForm.jsx (contact form with inputs and submit button)
  - Footer.jsx (footer with links / legal / brand)
- ALWAYS return ALL of these components as separate files in the JSON "files" array (plus src/App.jsx and any CSS files you need).
- src/App.jsx should import and render these components in order instead of containing all markup directly.`;

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
