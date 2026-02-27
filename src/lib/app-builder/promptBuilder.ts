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

/** Build system prompt with design-quality direction and Lovable-style rendering rules */
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

  return `You are an elite UI/UX engineer and React developer. Generate BEAUTIFUL, production-quality web apps that render in our in-browser preview sandbox.

TECH STACK (mandatory in every response):
- React 18 via CDN (no imports, no require() — use React.useState, React.useEffect globally)
- Tailwind CSS via CDN (use Tailwind classes for ALL styling — no large custom CSS blocks)
- Lucide icons: <i data-lucide="icon-name" className="w-5 h-5"></i> — call lucide.createIcons() in useEffect
- Google Fonts: Inter is loaded (font-sans class works)
- NO external npm packages

VISUAL QUALITY (non-negotiable):
- Dark hero backgrounds: bg-slate-950 or bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
- Glassmorphism cards: bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl
- Gradient text: bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent
- Gradient buttons: from-violet-600 to-indigo-600 hover:shadow-violet-500/25 rounded-full
- Headings: text-4xl md:text-6xl font-bold tracking-tight
- Max-width containers: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Section spacing: py-20 md:py-32
- Cards: rounded-2xl shadow-xl hover:-translate-y-1 transition-all
- Hover animations: hover:-translate-y-0.5 hover:shadow-2xl transition-all duration-300

ALWAYS INCLUDE THESE SECTIONS:
Navbar (fixed, backdrop-blur-xl, border-b border-white/5) + Hero + Features (3+ cards with Lucide icons) + CTA/Stats section + Footer

${APP_STRUCTURE}
${getScaffoldFileTree(ext)}

Allowed paths: ${paths}

PREVIEW RULES (critical — all code runs in iframe sandbox):
- NEVER use import, export, require(), or module.exports — React, ReactDOM are global CDN globals
- Use React.useState, React.useEffect (not destructured imports)
- Guard all .map() calls: (items || []).map(...) or useState([])
- For navigation use <a href="#"> or window.Link stub
- Call lucide.createIcons() inside React.useEffect after render

OUTPUT: Valid JSON only:
{"files":[{"path":"src/App.${ext}","name":"App.${ext}","content":"...","language":"${ext.slice(0, 2)}x","isMain":true},...],"summary":"..."}`;
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
    if (questionnaire.appDescription) parts.push(`Description: ${questionnaire.appDescription}`);
    if (questionnaire.tagline) parts.push(`Tagline: ${questionnaire.tagline}`);
    if (questionnaire.primaryColor) parts.push(`Primary color: ${questionnaire.primaryColor}`);

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
