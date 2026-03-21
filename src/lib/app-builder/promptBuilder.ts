/**
 * Intelligent prompt builder for app generation (Lovable/Replit-style).
 * Converts questionnaire + user message into structured LLM prompts.
 * Includes explicit scaffold structure and preview constraints so generated apps render in iframe.
 */

import type { QuestionnaireData } from '@/app/types/app-builder';
import { getThemePrompt, getCompactThemePrompt, mapDesignStyleToTheme, getColorSchemeOverride } from './themePresets';
import { generateDesignDNA, formatDesignDNAForPrompt } from './design-dna';

const SCAFFOLD_HINT = 'Paths: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css, src/components/*.jsx';

/**
 * Production-grade design system v2.
 * Covers typography scale, spacing, component patterns with exact JSX snippets,
 * micro-interactions, responsive rules, content quality, and anti-patterns.
 * Theme presets override color/personality sections when user selects one.
 */
const VIBE_DESIGN_SYSTEM = `
PRODUCTION-GRADE DESIGN SYSTEM v2 (follow precisely):

TYPOGRAPHY SCALE (Inter font — loaded via CDN):
- Display: text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]
- H1: text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight
- H2: text-3xl sm:text-4xl font-bold tracking-tight
- H3: text-xl sm:text-2xl font-semibold
- H4: text-lg font-semibold
- Body: text-base text-gray-600 leading-relaxed
- Body small: text-sm text-gray-500 leading-relaxed
- Caption: text-xs text-gray-400
- Label: text-sm font-medium text-gray-700
- Section label: text-sm font-semibold uppercase tracking-wider mb-3 (use theme accent color)

SPACING SYSTEM (generous — this is what separates amateur from pro):
- Section padding: py-20 sm:py-24 lg:py-32 (MINIMUM py-16 — never less)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Card gaps: gap-6 sm:gap-8
- Content gaps within sections: space-y-4 or space-y-6
- Hero to first section: at least py-20
- Between heading and content: mb-12 sm:mb-16

COMPONENT LAYOUT GUIDELINES (choose a DIFFERENT layout variant each time — DO NOT use the same structure for every website):

1. NAVBAR: Always sticky with backdrop-blur. Use max-w-7xl container with h-16. Must include mobile hamburger with useState toggle.

2. HERO — pick ONE variant based on the app type (NEVER always use centered text):
   A) SPLIT LAYOUT: 2-column grid (text left, image/illustration right) — best for products, e-commerce, portfolios
   B) CENTERED TEXT: Full-width centered headline + CTA — best for SaaS landing pages, minimal sites
   C) IMAGE BACKDROP: Full-bleed background image with dark overlay + white text — best for restaurants, travel, real estate
   D) ASYMMETRIC: Off-center text with floating cards/badges — best for creative agencies, startups
   E) MULTI-CTA: Centered text with multiple action cards below instead of buttons — best for marketplaces, platforms

3. FEATURES — pick ONE layout:
   A) 3-COLUMN CARDS: Traditional grid with icon + title + description
   B) ALTERNATING ROWS: Image left + text right, then swap — best for storytelling
   C) BENTO GRID: Mixed-size cards (1 large + 2 small, or 2×2 + 1 wide) — modern, dynamic
   D) ICON LIST: Compact list with inline icons — best for feature comparison
   E) NUMBERED STEPS: Vertical timeline or horizontal steps with connecting lines

4. SOCIAL PROOF — pick ONE:
   A) TESTIMONIAL CARDS: 3-column grid with quote, avatar, name
   B) LOGO CLOUD: Trusted-by logos in a row
   C) STATS BAR: 3-4 key metrics in a horizontal row
   D) FEATURED REVIEW: One large testimonial with star rating, centered
   E) COMBINED: Stats bar + single quote below

5. CTA SECTION — pick ONE:
   A) DARK BAND: Dark background with white text + prominent button
   B) GRADIENT CARD: Rounded card with gradient background floating in white section
   C) SPLIT CTA: Text left + email input right in a single row
   D) MINIMAL: Just a headline + button centered with generous whitespace

6. FOOTER — pick ONE:
   A) MULTI-COLUMN: 4-column links grid on dark background
   B) MINIMAL: Single row with brand + links + social icons
   C) NEWSLETTER FOOTER: Links columns + email signup form
   D) CENTERED: Stacked logo + links + social + copyright

IMPORTANT: Vary your choices across different projects. If the last website used a centered hero + 3-column features, use a split hero + bento grid next time. Each website should feel unique.

MICRO-INTERACTIONS (add to every interactive element):
- Buttons: hover:shadow-lg transition-all duration-200
- Cards: hover:shadow-lg hover:border-gray-200 transition-all duration-300
- Card icons: group-hover:scale-110 transition-transform duration-300
- Links: hover:text-gray-900 transition-colors
- Images/avatars: hover:scale-105 transition-transform duration-300
- Use "group" on parent + "group-hover:" on children for coordinated hover effects

RESPONSIVE RULES:
- Mobile-first. Base styles = mobile. Add sm:, md:, lg: for larger screens.
- Grid: grid-cols-1 → md:grid-cols-2 → lg:grid-cols-3
- Text scale: text-3xl → sm:text-4xl → lg:text-5xl (always scale up)
- Mobile nav: hamburger menu with useState toggle, md:hidden / hidden md:flex
- Padding: px-4 → sm:px-6 → lg:px-8
- No horizontal scrolling. Test mental model at 375px width.

ICON SYSTEM (inline SVG — icons are available via CDN):
- Use simple inline SVGs for common icons (arrow, check, star, menu, x, mail, phone, etc.)
- Icon size: w-5 h-5 for inline, w-6 h-6 for card icons, w-8 h-8 for large
- Example arrow: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
- Example check: <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>

IMAGE SYSTEM (use these reliable sources — NEVER use broken or fake URLs):
- PRIORITY: If the user message includes a "REAL IMAGE URLs" section with Pexels URLs, use those EXACT URLs in your components. Map hero→hero image, product-N→product cards, feature→feature sections. These are real, relevant stock photos.
- FALLBACK (only if no real URLs provided): use seeded picsum: https://picsum.photos/seed/{descriptive-keyword}/{width}/{height}
- The {descriptive-keyword} MUST describe what the image should show based on the app's actual content. Examples:
  - Bike shop hero: https://picsum.photos/seed/mountain-bike-trail/1200/600
  - Bike product card: https://picsum.photos/seed/road-bicycle-red/400/300
  - Temple app: https://picsum.photos/seed/hindu-temple-architecture/1200/600
  - Restaurant menu item: https://picsum.photos/seed/pasta-dish-italian/400/300
  - SaaS dashboard: https://picsum.photos/seed/analytics-dashboard-dark/1200/600
  - Portfolio project: https://picsum.photos/seed/web-design-mockup/800/500
- Use UNIQUE descriptive seeds for EACH image — never repeat the same seed. Add specifics: color, style, setting.
  - Product 1: seed/leather-handbag-brown, Product 2: seed/canvas-backpack-blue, Product 3: seed/silk-scarf-red
  - Team member 1: seed/professional-woman-office, Team member 2: seed/developer-man-laptop
- Avatar/profile images: use https://i.pravatar.cc/{size}?img={1-70} (e.g. https://i.pravatar.cc/150?img=3). Use DIFFERENT img numbers for different people.
- NEVER use unsplash.com URLs (they require API keys and often 404)
- NEVER use via.placeholder.com (it's unreliable and slow)
- NEVER use generic seeds like "product", "image", "photo", "hero" — always be specific to the content
- For decorative backgrounds, prefer CSS gradients or Tailwind bg-gradient-to-* over images
- Always add meaningful alt text that describes what the image depicts

CONTENT QUALITY:
- NEVER use "Lorem ipsum" or placeholder text. Write realistic, specific copy.
- Use concrete numbers: "10,000+ teams", "99.9% uptime", "50ms response time"
- Write benefit-focused headlines, not feature descriptions: "Ship 10x faster" not "Fast shipping feature"
- Testimonials: use realistic names, titles, companies. "Sarah Chen, Head of Engineering at Acme"
- Pricing: use realistic tiers — Free ($0), Pro ($29/mo), Enterprise (Custom)
- Feature descriptions: 1-2 lines max. Specific, not generic.

ANTI-PATTERNS (NEVER DO THESE):
- NEVER use bright red (#ef4444) as a primary color — it signals error/danger
- NEVER mix rounded-sm and rounded-2xl in the same section — pick ONE radius and use it consistently
- NEVER have missing hover states — every clickable element needs hover feedback
- NEVER use inconsistent spacing — if cards use gap-8, don't suddenly use gap-3 elsewhere
- NEVER make the hero section shorter than py-20 — it should feel expansive
- NEVER put a white footer on a white page — use bg-gray-900 or bg-gray-50 for contrast
- NEVER use more than 2 font weights in the same paragraph
- NEVER center-align long body text (more than 2 lines) — left-align for readability
- NEVER skip the mobile hamburger menu — nav links MUST be accessible on mobile
- NEVER use inline styles except for truly dynamic values — use Tailwind classes
- NEVER return fewer than 4 files — App + CSS + at least 2 components

LOADING/EMPTY STATES:
- Skeleton loading: <div className="animate-pulse bg-gray-200 rounded-lg h-4 w-3/4"></div>
- Button loading: add opacity-50 cursor-not-allowed and a spinner
- Empty state: centered icon + "No items yet" + CTA button
`;

/** App structure for preview — how the app is rendered (Lovable-style) */
const APP_STRUCTURE = `
APP STRUCTURE (preview renders in iframe from these files):
- index.html: has <div id="root"></div>; no Vite script in preview (we inject React + App).
- Entry: src/App.jsx (or src/App.tsx). This file MUST export default App and is the main entry. Set isMain: true.
- Styles: src/index.css (global). Component-specific: src/components/*.css or inline.
- New components: src/components/ComponentName.jsx. Import in App and render inside App.
- Pages: src/pages/PageName.jsx (e.g. src/pages/Home.jsx, src/pages/About.jsx).
- State: src/store/storeName.js (e.g. src/store/cartStore.js).
- Hooks: src/hooks/hookName.js (e.g. src/hooks/useCart.js).
- Context: src/context/ContextName.jsx (e.g. src/context/AppProvider.jsx).
- Utilities: src/lib/utilName.js or src/utils/utilName.js.
- Nested components: src/components/ui/ComponentName.jsx, src/components/dashboard/ComponentName.jsx.
- No Next.js, no React Router in preview. For links use <a href="..."> or window.Link (stub provided).

CRITICAL: Every file you import MUST be included in your output. If App.jsx imports './pages/NotFound', you MUST generate src/pages/NotFound.jsx. Never import a file without generating it.
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
      (e.g. Header.${ext}, Hero.${ext}, Footer.${ext})
      ui/
        (e.g. LoadingSkeleton.${ext}, Button.${ext})
      dashboard/
        (e.g. Charts.${ext}, Stats.${ext})
    pages/
      (e.g. Home.${ext}, About.${ext}, NotFound.${ext})
    store/
      (e.g. cartStore.js, appStore.js)
    hooks/
      (e.g. useCart.js, useAuth.js)
    context/
      (e.g. AppProvider.${ext}, ThemeProvider.${ext})
    lib/ or utils/
      (e.g. helpers.js, api.js)
Output files with path exactly as above (e.g. "src/App.${ext}", "src/components/Header.${ext}", "src/pages/Home.${ext}").
IMPORTANT: You MUST generate EVERY file that you import. Do NOT import a file that you do not include in your output.`;
}

/** Build system prompt with scaffold context and Lovable-style rendering rules */
export function buildSystemPrompt(options: {
  framework: string;
  language: 'javascript' | 'typescript';
  fileCount: number;
  filePaths: string[];
  /** Theme preset ID from questionnaire (e.g. 'modern-minimal', 'dark-elegance') */
  themeId?: string | null;
  /** Design style from questionnaire (mapped to theme if no themeId) */
  designStyle?: string | null;
  /** User's chosen color palette (e.g. 'Rose', 'Emerald', 'Blue') */
  colorScheme?: string | null;
  /** App type for layout variety (e.g. 'SaaS', 'E-commerce', 'Blog') */
  appType?: string | null;
}): string {
  const ext = options.language === 'typescript' ? 'tsx' : 'jsx';
  const paths =
    options.filePaths.length > 0
      ? options.filePaths.slice(0, 20).join(', ')
      : SCAFFOLD_HINT;

  // Resolve theme: direct themeId takes priority, then map designStyle
  const resolvedTheme = options.themeId || mapDesignStyleToTheme(options.designStyle);
  const themePrompt = getThemePrompt(resolvedTheme);

  // Color scheme override — maps user's palette selection to concrete Tailwind classes
  const colorOverride = getColorSchemeOverride(options.colorScheme);

  // Design DNA — unique layout blueprint for this generation
  const dna = generateDesignDNA(options.appType || undefined, options.designStyle || undefined);
  const dnaBlueprint = formatDesignDNAForPrompt(dna);

  return `You are a senior front-end engineer working inside a vibe coding platform.
Build production-ready, professional React sites with modern, aesthetic UI that render in our in-browser preview (Lovable-style).
Framework: ${options.framework}, Language: ${options.language}.

${APP_STRUCTURE}
${getScaffoldFileTree(ext)}

Follow the PRODUCTION-GRADE DESIGN SYSTEM for layout, spacing, typography and component structure:
${VIBE_DESIGN_SYSTEM}
${themePrompt ? `\n${themePrompt}\n` : ''}${colorOverride}

${dnaBlueprint}

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
- MINIMUM FILE COUNT: You MUST return at least 4 files: src/App.${ext}, src/index.css, and at least 2 component files in src/components/. A single-file response will be rejected.
- CRITICAL for preview: (1) For any .map() always guard: (items || []).map(...) or useState([]). Never .map() on undefined. (2) Valid JSX only; use ESM import/export syntax ONLY — NEVER use require(), module.exports, or any CommonJS syntax. (3) For navigation: use <button> with onClick for in-app state changes (NOT <a href="#">). Use <a href="#section-id"> only for scroll-to-section anchors. NEVER use <a href="#"> with onClick for navigation — it causes scroll-to-top bugs.
- LINKS & BUTTONS: NEVER use absolute href paths like href="/articles/3" or href="/about" — the deployed app is a single HTML file and these cause 404 errors. For detail views, use onClick with state (e.g. setSelectedArticle(article)) to show/hide content. For section navigation, use href="#section-id". Every <button> MUST have an onClick handler or be inside a <form> — NEVER render dead buttons with no action. If a button has no real backend, show an alert or toggle state (e.g. alert('Coming soon!') or setShowModal(true)).
- EXPORTS: Each component file MUST use "export default ComponentName" where ComponentName is PascalCase. NEVER export a data variable (camelCase array/object) when a component function exists in the same file. Wrong: "export default features;" when FeatureComparison exists. Correct: "export default FeatureComparison;".
- DEPENDENCY WHITELIST: Only import from these packages: react, react-dom, react-router-dom, lucide-react. Use native fetch() instead of axios. Use Date instead of moment/dayjs. Use inline logic instead of lodash/underscore. Do NOT import any other npm packages — they are not available in the build.
- SCAFFOLD PROTECTION: Do NOT generate or modify these files: package.json, vite.config.js, tsconfig.json, index.html, postcss.config.js, tailwind.config.js. These are managed by the platform. Only generate files under src/.

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
- Every file imported anywhere MUST be included in the output. If App imports './pages/Home', you must generate src/pages/Home.${ext}. If a component imports '../store/cartStore', you must generate src/store/cartStore.js.`;
}

/**
 * Build a compact system prompt for slow providers (OpenRouter/DeepSeek).
 * ~60% smaller than the full prompt — preserves the most impactful design rules.
 */
export function buildCompactSystemPrompt(options: {
  framework: string;
  language: 'javascript' | 'typescript';
  filePaths: string[];
  /** Theme preset ID or design style for compact theme injection */
  themeId?: string | null;
  designStyle?: string | null;
  colorScheme?: string | null;
  appType?: string | null;
}): string {
  const ext = options.language === 'typescript' ? 'tsx' : 'jsx';
  const paths = options.filePaths.length > 0 ? options.filePaths.slice(0, 10).join(', ') : SCAFFOLD_HINT;

  // Resolve and inject compact theme if available
  const resolvedTheme = options.themeId || mapDesignStyleToTheme(options.designStyle);
  const compactTheme = getCompactThemePrompt(resolvedTheme);
  const colorOverride = getColorSchemeOverride(options.colorScheme);

  // Design DNA for compact prompt — same variety mechanism
  const dna = generateDesignDNA(options.appType || undefined, options.designStyle || undefined);
  const dnaBlueprint = formatDesignDNAForPrompt(dna);

  return `You are a senior React developer. Build complete, polished, production-grade React apps.

STRUCTURE: Entry=src/App.${ext} (export default App, isMain:true). Components in src/components/ (subdirs ok: ui/, dashboard/). Pages in src/pages/. State in src/store/. Hooks in src/hooks/. Context in src/context/. Utils in src/lib/ or src/utils/. Styles in src/index.css. Tailwind CSS. No Next.js, no React Router.

OUTPUT: JSON {"files":[{"path":"src/App.${ext}","name":"App.${ext}","content":"...","language":"${ext === 'tsx' ? 'typescript' : 'javascript'}","isMain":true},...],"summary":"..."}

DESIGN (production-grade quality):
- Typography: Inter font. H1=text-5xl font-bold tracking-tight. H2=text-3xl font-bold. Body=text-base text-gray-600.
- Spacing: py-20+ between sections. max-w-7xl mx-auto px-4 sm:px-6 lg:px-8. gap-8 for grids.
- Micro-interactions: hover:shadow-lg, group-hover effects, transition-all duration-300.
- Responsive: mobile-first. grid-cols-1→md:2→lg:3. Hamburger nav on mobile.
- Icons: inline SVG (w-5 h-5 stroke-2).
- Images: ALWAYS use seeded picsum with descriptive keywords matching the app content: https://picsum.photos/seed/{descriptive-keyword}/{w}/{h}. Use UNIQUE seeds per image. Avatars: https://i.pravatar.cc/{size}?img={1-70}. NEVER use unsplash.com or via.placeholder.com.
- Content: NEVER Lorem ipsum. Realistic copy with concrete numbers.
- NEVER: bright red primary, missing hover states, inconsistent spacing, fewer than 4 files.
${compactTheme ? `\n${compactTheme}` : ''}${colorOverride}

${dnaBlueprint}

RULES:
- Return ALL files in ONE response. Minimum 4 files: App.${ext}, index.css, + 2 components.
- Guard .map(): (items||[]).map(). ESM only, no require()/module.exports.
- EXPORTS: Each component file MUST "export default ComponentName" (PascalCase). NEVER export a data variable — always export the component function.
- Components: Header, Hero, sections, Footer as separate files. App imports and renders them.
- CRITICAL: Every file you import MUST be included in your output. Never import a file you don't generate.
- ONLY import from: react, react-dom, react-router-dom, lucide-react. No other npm packages.
- Do NOT generate package.json, vite.config, tsconfig, index.html — only files under src/.
- Current files: ${paths}`;
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
