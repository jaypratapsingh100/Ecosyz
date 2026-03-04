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
- Overall vibe: modern, minimal, production-quality, "polished SaaS" feel. Think Linear, Vercel, Stripe quality.
- Layout & spacing (USE THESE EXACT TAILWIND CLASSES):
  - Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
  - Section spacing: py-16 sm:py-20 lg:py-24 (generous vertical padding between sections)
  - Spacing scale: gap-2, gap-4, gap-6, gap-8, gap-12, gap-16 (consistent throughout)
  - Avoid random floating elements; align content to a clear grid.
- Navigation:
  - Sticky top nav: className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
  - Nav links: className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
  - CTA in nav: className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
  - Mobile: use useState for menu toggle, simple slide-down menu.
- Hero section:
  - Strong visual hierarchy: text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900
  - Subheadline: text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto
  - Primary CTA: className="bg-gray-900 text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
  - Secondary CTA: className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-base font-semibold hover:bg-gray-50 transition-colors"
  - Background: bg-gradient-to-b from-white to-gray-50 or bg-gradient-to-br from-blue-50 via-white to-indigo-50
- Grids & cards:
  - Grid: className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
  - Card: className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all"
  - Card icon area: className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4"
  - Card title: className="text-lg font-semibold text-gray-900 mb-2"
  - Card description: className="text-sm text-gray-600 leading-relaxed"
- COLOR PALETTE (use these exact Tailwind classes consistently):
  - Primary: bg-blue-600, text-blue-600, hover:bg-blue-700, ring-blue-500
  - Primary light: bg-blue-50, text-blue-700
  - Surface: bg-white, bg-gray-50 (alternate sections)
  - Dark surface: bg-gray-900, bg-gray-950
  - Text primary: text-gray-900
  - Text secondary: text-gray-600
  - Text muted: text-gray-400
  - Border: border-gray-100, border-gray-200
  - Shadow: shadow-sm, shadow-md, shadow-xl
  - Radius: rounded-lg, rounded-xl, rounded-2xl
  - Accent (for highlights/badges): bg-emerald-50 text-emerald-700, bg-amber-50 text-amber-700
- Typography:
  - Font: font-sans (Inter loaded via CDN — already configured in preview).
  - H1: text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight
  - H2: text-3xl sm:text-4xl font-bold tracking-tight
  - H3: text-xl font-semibold
  - Body: text-base text-gray-600 leading-relaxed
  - Small: text-sm text-gray-500
  - Section label: text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3
- Buttons & inputs:
  - Primary btn: bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm
  - Secondary btn: border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors
  - Input: w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
  - Label: text-sm font-medium text-gray-700 mb-1
- Sections pattern:
  - Alternate between bg-white and bg-gray-50 for visual rhythm.
  - Each section: section label (colored) + H2 + description + content.
  - Example: <div className="text-center mb-12"><p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Features</p><h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">Everything you need</h2><p className="text-lg text-gray-600 max-w-2xl mx-auto">Description here</p></div>
- Footer:
  - className="bg-gray-900 text-gray-400 py-12"
  - Links: className="text-sm text-gray-400 hover:text-white transition-colors"
  - Grid layout with columns for different link groups.
- Responsiveness:
  - Mobile-first: single-column on small screens, multi-column on md: and lg:.
  - Use sm:, md:, lg: breakpoint prefixes consistently.
  - No horizontal scrolling; allow stacks to collapse naturally.
- Code quality:
  - Extract reusable React components for repeated patterns (Hero, Section, Card, Navbar, Footer).
  - USE TAILWIND UTILITY CLASSES for all styling. Tailwind CSS is available globally in preview.
  - Use semantic HTML elements and aria attributes for accessibility.
  - Always guard .map() calls: (items || []).map(...) or initialize state with useState([]).
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

OUTPUT FORMAT (use one; both are accepted):
- PREFERRED: Valid JSON: {"files":[{"path":"src/App.${ext}","name":"App.${ext}","content":"...","language":"${ext.slice(0, 2)}x","isMain":true},...],"summary":"..."}
- ALTERNATIVE: Markdown code blocks with \`\`\`file:path/to/file.${ext}\`\`\` or \`\`\`jsx:src/components/Name.${ext}\`\`\`

RULES:
- Return ALL files in one response (JSON or code blocks). Semantic HTML, responsive, accessible.
- Main entry: src/App.${ext} with export default App. New components in src/components/.
- Use CSS in src/index.css or component-level; avoid inline styles except for dynamic values.
- BEFORE WRITING CODE: silently decide the full set of React components, pages and support files needed to satisfy the user request.
- OUTPUT REQUIREMENT: for every component, hook, utility or page you reference (e.g. <Hero />, useNavbar(), getData(), etc.), include a corresponding file in the "files" array with matching "path".
- NEVER return a partial app. At minimum include: src/App.${ext}, all components imported into App, and any shared layout/section components those depend on, plus required CSS files.
- DO NOT return only a single file like src/App.${ext}; always return the complete, self-contained file set needed for the app to run without missing imports.
- CRITICAL for preview: (1) For any .map() always guard: (items || []).map(...) or useState([]). Never .map() on undefined. (2) Valid JSX only; no Node/require. (3) For navigation use <a href="..."> or Link (stub provided in preview).

CONSISTENCY (apply for every request): Always return the complete file set. Never return only src/App.${ext}. Include App + every component it imports (Header, Hero, Footer, etc.) as separate files. Same structure every time.`;
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
    if (questionnaire.projectGoal) parts.push(`Vision: ${questionnaire.projectGoal}`);
    if (questionnaire.targetAudience) parts.push(`Audience: ${questionnaire.targetAudience}`);
    if (questionnaire.primaryGoal) parts.push(`Primary goal: ${questionnaire.primaryGoal}`);
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
    if (questionnaire.tagline) parts.push(`Tagline: ${questionnaire.tagline}`);

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

/** Build retry prompt when initial response lacks valid output (used for both Groq and OpenRouter) */
export function buildRetryPrompt(originalMessage: string, ext: string): string {
  return `${originalMessage}

STRICT OUTPUT (retry - ensure complete response):
- Return ALL files: src/App.${ext} plus every component (Header, Hero, Footer, etc.) as separate files.
- Use either: (A) JSON {"files":[...]} OR (B) Markdown code blocks \`\`\`file:path/to/file.${ext}\`\`\`
- Do NOT return only one file. Include the complete, self-contained file set.
- Every component imported in App MUST have its own file in the output.`;
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
