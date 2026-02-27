/**
 * Intelligent prompt builder for app generation (Lovable/Replit-style).
 * Converts questionnaire + user message into structured LLM prompts.
 * Includes explicit scaffold structure and preview constraints so generated apps render in iframe.
 */

import type { QuestionnaireData } from '@/app/types/app-builder';

const SCAFFOLD_HINT = 'Paths: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css, src/components/*.jsx';

/**
 * Shared visual + UX language for our vibe coding platform.
 * This is injected into prompts so the LLM consistently produces polished,
 * on-brand UIs with good spacing, hierarchy and color usage.
 * Tailwind CSS utilities are available globally in the preview iframe.
 */
const VIBE_DESIGN_SYSTEM = `
VIBE CODING PLATFORM DESIGN SYSTEM (UI/UX RULES):
- Overall vibe: modern, minimal, production-quality, "polished SaaS" feel.
- Layout & spacing:
  - Use a centered content container (approx max-width 1024–1200px) with horizontal padding.
  - Apply generous vertical padding between sections (roughly 48–96px).
  - Use a consistent spacing scale (4, 8, 12, 16, 24, 32, 48px) for gaps, padding and margins.
  - Avoid random floating elements; align content to a clear grid.
- Navigation:
  - Top navigation bar with horizontal links, brand/logo on the left, links on the right.
  - Provide hover and active states for nav links; keep nav height comfortable (48–64px).
  - On mobile, collapse nav into a simple stacked list or menu button.
- Hero section:
  - Strong visual hierarchy: large headline, secondary subheadline, and 1 primary + 1 secondary CTA.
  - Keep text width comfortable (max-width around 640px) and center content on simple pages.
  - Use subtle background treatments (light gradients or soft neutral backgrounds) instead of harsh colors.
- Grids & cards:
  - Use cards with rounded corners and subtle shadows for projects, features, testimonials, etc.
  - Use consistent gap between cards (e.g. 16–32px) and responsive grids (1 column on mobile, 2–3 on desktop).
  - Card content: title, short description, optional meta (tags, tech stack) and clear actions.
- Color system:
  - Define 1 primary brand color, 1 accent color and a neutral gray scale for text/backgrounds.
  - Prefer light backgrounds with dark text; keep contrast high for accessibility.
  - Use the primary color for CTAs, links and key highlights only (avoid over-saturation).
- Typography:
  - Use a modern sans-serif font (e.g. Inter or system UI).
  - Base font size 16–18px with relaxed line-height (~1.5).
  - Clear heading scale: H1 > H2 > H3 with consistent spacing above/below.
  - Avoid all-caps paragraphs; keep copy scannable with short sentences and lists.
- Components:
  - Buttons: medium border radius, visible focus ring, hover and active states.
  - Inputs/forms: full-width fields with labels, placeholders and error states.
  - Sections: Heading + short description + content; never leave sections visually disconnected.
- Responsiveness:
  - Mobile-first: single-column layout on small screens, multi-column only on medium and up.
  - Ensure no horizontal scrolling; allow stacks to collapse naturally.
- Code quality:
  - Extract reusable React components for repeated patterns (Hero, Section, Card, Navbar, Footer).
  - Prefer CSS or utility classes over inline styles (except for dynamic values). Tailwind CSS is available globally in preview, so you can safely use Tailwind utility classNames without additional setup.
  - Use semantic HTML elements and aria attributes for accessibility.
`;

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

  return `You are a senior front-end engineer working inside a vibe coding platform.
Build production-ready, professional React sites with modern, aesthetic UI that render in our in-browser preview (Lovable-style).
Framework: ${options.framework}, Language: ${options.language}.

${APP_STRUCTURE}
${getScaffoldFileTree(ext)}

Follow the VIBE CODING PLATFORM DESIGN SYSTEM for layout, spacing, colors, typography and component structure:
${VIBE_DESIGN_SYSTEM}

Allowed paths (use these exactly): ${paths}

OUTPUT: Valid JSON only, one response:
{"files":[{"path":"src/App.${ext}","name":"App.${ext}","content":"...","language":"${ext.slice(0, 2)}x","isMain":true},...],"summary":"..."}

RULES:
- JSON only. One response. Semantic HTML, responsive, accessible.
- Main entry: src/App.${ext} with export default App. New components in src/components/.
- Use CSS in src/index.css or component-level; avoid inline styles except for dynamic values.
- BEFORE WRITING CODE: silently decide the full set of React components, pages and support files needed to satisfy the user request.
- OUTPUT REQUIREMENT: for every component, hook, utility or page you reference (e.g. <Hero />, useNavbar(), getData(), etc.), include a corresponding file in the "files" array with matching "path".
- NEVER return a partial app. At minimum include: src/App.${ext}, all components imported into App, and any shared layout/section components those depend on, plus required CSS files.
- DO NOT return only a single file like src/App.${ext}; always return the complete, self-contained file set needed for the app to run without missing imports.
- CRITICAL for preview: (1) For any .map() always guard: (items || []).map(...) or useState([]). Never .map() on undefined. (2) Valid JSX only; no Node/require. (3) For navigation use <a href="..."> or Link (stub provided in preview).`;
}

/** Business / portfolio website requirements - injected when app type is business-like */
const BUSINESS_BRIEF = `High-conversion business / portfolio website requirements:
- Hero (above the fold): use a strong, specific headline that clearly states the value proposition (avoid generic "Hi, I'm a developer" style copy), a short benefit-focused subheadline, and 1–2 primary CTAs (e.g. "Book a call", "View projects", "Get in touch").
- Sections: Services/Features, Selected Work / Portfolio, About, Testimonials / social proof, Contact / final CTA.
- Layout: responsive, centered content container, generous vertical spacing, and distinct visual sections (e.g. alternating background colors or subtle gradients) so the page does not feel like one large empty white block.
- Styling: clean, trustworthy, subtle shadows, soft gradients where appropriate, professional color palette.
- Copy: write concrete, niche-specific copy based on the questionnaire (audience, brand name, primary goal, style); avoid "Lorem ipsum" and obviously placeholder or ultra-generic text.
- Design system: follow the VIBE CODING PLATFORM DESIGN SYSTEM for spacing, typography, colors and components so the page feels like a polished vibe coding experience.
- Components: Header (nav), Hero, ServiceCards / Services section, Portfolio / Projects grid, Testimonials, Footer.
- Use realistic, scannable copy; favor short paragraphs and bullet lists over dense text blocks.
- IMPORTANT: Create separate React components in src/components for each major section:
  - Header.jsx (navigation + dark mode toggle when requested)
  - Hero.jsx (hero + primary CTA)
  - Services.jsx (services / features grid or cards)
  - Projects.jsx or Portfolio.jsx (featured work grid or case studies)
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

  // Global instruction so every prompt leads to a complete file set, not a single incomplete file
  out += `\n\nPLANNING & COMPLETENESS REQUIREMENTS:\n` +
    `- First, think through the full UI and app structure (sections, components, hooks, utilities, styles) needed to satisfy this request.\n` +
    `- Then implement ALL of those as files in the JSON "files" array.\n` +
    `- If you import or reference a component, hook, helper or config from any path, you MUST include that file in "files".\n` +
    `- Do not return an incomplete subset of files; the response should be a fully working app with no missing imports.`;

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
