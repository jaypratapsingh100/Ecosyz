/**
 * Theme Presets for App Builder — inject into system prompt based on user selection.
 * Each preset defines a complete visual language: colors, typography emphasis, card style, etc.
 * The AI uses these to produce cohesive, professional output instead of generic blue-600 everywhere.
 */

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** Prompt snippet injected into the system prompt */
  promptSnippet: string;
  /** Compact version for slow providers (~40% of full snippet) */
  compactSnippet: string;
}

const THEME_PRESETS: Record<string, ThemePreset> = {
  'modern-minimal': {
    id: 'modern-minimal',
    label: 'Modern Minimal',
    description: 'Clean whitespace, restrained palette — Vercel, Linear quality',
    promptSnippet: `THEME: MODERN MINIMAL (Vercel / Linear aesthetic)
COLOR SYSTEM:
- Primary: gray-900 (text, buttons, strong accents)
- Accent: blue-600 for links/CTAs only — use sparingly
- Backgrounds: white for main, gray-50 for alternate sections, gray-100 for subtle cards
- Text: gray-900 headings, gray-600 body, gray-400 muted
- Borders: gray-100 default, gray-200 on hover
- Shadows: shadow-sm default, shadow-md on hover — NEVER shadow-2xl
PERSONALITY:
- Maximum whitespace. Let content breathe. py-20 lg:py-28 between sections.
- Thin borders (border border-gray-100), no heavy outlines.
- Buttons: bg-gray-900 text-white rounded-lg — NO gradients on buttons.
- Cards: bg-white border border-gray-100 rounded-xl p-6 — clean and flat.
- Nav: sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100.
- Hero: text-5xl lg:text-6xl font-bold tracking-tight text-gray-900. Subtext in gray-500.
- Avoid bright colors. If color is needed, use ONE accent (blue-600) consistently.
- Footer: bg-gray-50 border-t border-gray-100 — light, not dark.
- Icons: gray-400 or gray-500, small (w-5 h-5). No colorful icon backgrounds.
- Hover states: hover:bg-gray-50 on cards, hover:text-gray-900 on links. Subtle.`,
    compactSnippet: `THEME: Modern Minimal. Colors: gray-900 primary, blue-600 accent (sparingly), white/gray-50 bg. Max whitespace (py-20+). Cards: white, border-gray-100, rounded-xl. Nav: sticky, backdrop-blur. No gradients. shadow-sm only. Footer: bg-gray-50, light.`,
  },

  'bold-vibrant': {
    id: 'bold-vibrant',
    label: 'Bold Vibrant',
    description: 'Strong gradients, energetic — Stripe, Notion quality',
    promptSnippet: `THEME: BOLD VIBRANT (Stripe / Notion aesthetic)
COLOR SYSTEM:
- Primary gradient: bg-gradient-to-r from-violet-600 to-indigo-600 (for hero bg, CTAs)
- Accent: emerald-500 for success states, highlights, secondary CTAs
- Backgrounds: white main, violet-50 or indigo-50 for feature sections
- Dark sections: bg-gray-950 or bg-indigo-950 for CTA bands and footer
- Text: gray-900 headings (or white on dark), gray-600 body
- Borders: gray-200 default, violet-200 for accent borders
PERSONALITY:
- Bold, confident, energetic. Gradients are your signature.
- Hero: bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 with white text.
  Or: white bg with gradient text using bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600.
- Buttons: bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl px-8 py-3 font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30.
- Cards: bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300. Card icons: w-12 h-12 bg-violet-100 rounded-xl.
- Stats/numbers: text-4xl font-bold text-violet-600 or gradient text.
- Badges: bg-violet-100 text-violet-700 text-xs font-medium px-3 py-1 rounded-full.
- Nav: sticky, bg-white/90 backdrop-blur-md. Logo in gradient.
- Footer: bg-gray-950 text-gray-400. Accent links in violet-400.
- Use micro-interactions: hover:scale-[1.02], group-hover effects, transition-all duration-300.`,
    compactSnippet: `THEME: Bold Vibrant. Gradient: violet-600→indigo-600 (hero, CTAs). Accent: emerald-500. Cards: white rounded-2xl shadow-lg. Buttons: gradient bg, shadow-violet-500/25. Dark sections: gray-950. Badges: violet-100/700. hover:scale-[1.02] transitions. Footer: dark.`,
  },

  'corporate-clean': {
    id: 'corporate-clean',
    label: 'Corporate Clean',
    description: 'Trustworthy, structured — Salesforce, HubSpot quality',
    promptSnippet: `THEME: CORPORATE CLEAN (Salesforce / HubSpot aesthetic)
COLOR SYSTEM:
- Primary: blue-700 (trust color — buttons, links, headings accent)
- Secondary: slate-600 for body text, slate-800 for headings
- Backgrounds: white main, slate-50 for alternate sections, blue-50 for feature highlights
- Dark sections: slate-900 for footer and CTA bands
- Success: emerald-600 (checkmarks, positive indicators)
- Warning: amber-500 (callouts)
- Borders: slate-200, blue-200 for accent
PERSONALITY:
- Professional, trustworthy, structured. Content-dense but organized.
- Hero: Clean, text-focused. text-4xl lg:text-5xl font-bold text-slate-900. Blue-700 accents.
  Trust signals below hero: logos, "Trusted by 10,000+ companies", badges.
- Buttons: bg-blue-700 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-800.
  Secondary: border-2 border-blue-700 text-blue-700 hover:bg-blue-50.
- Cards: bg-white rounded-xl border border-slate-200 p-6 shadow-sm. Icon: w-10 h-10 bg-blue-50 rounded-lg text-blue-700.
- Data emphasis: Use number stats prominently — "99.9% uptime", "50K+ users", "4.9★ rating".
- Sections: Clear labels. text-sm font-semibold text-blue-700 uppercase tracking-wider mb-2.
- Nav: bg-white border-b border-slate-200. Clean, no blur effects.
- Footer: bg-slate-900 text-slate-400. Organized in 4-column grid with clear headings.
- Tables/grids: structured, aligned. Use divide-y divide-slate-200 for lists.
- NO playful gradients. Solid colors only. Professional and restrained.`,
    compactSnippet: `THEME: Corporate Clean. Primary: blue-700. Text: slate-900/600. Bg: white, slate-50 alternating. Cards: white, border-slate-200, shadow-sm. Buttons: bg-blue-700 solid (no gradient). Trust signals: stats, logos. Footer: bg-slate-900. Professional, structured, no playful effects.`,
  },

  'dark-elegance': {
    id: 'dark-elegance',
    label: 'Dark Elegance',
    description: 'Dark background, glowing accents — GitHub, Raycast quality',
    promptSnippet: `THEME: DARK ELEGANCE (GitHub / Raycast aesthetic)
COLOR SYSTEM:
- Background: gray-950 main, gray-900 for cards/elevated surfaces
- Text: gray-100 headings, gray-400 body, gray-500 muted
- Accent: emerald-400 primary (for CTAs, links, highlights, glows)
- Secondary accent: cyan-400 (for secondary elements, code highlights)
- Borders: gray-800 default, gray-700 on hover, emerald-500/20 for accent borders
- Glow effects: shadow-emerald-500/10, shadow-emerald-500/20 on hover
PERSONALITY:
- Dark, sophisticated, developer-friendly. Glow accents create depth.
- ENTIRE PAGE is dark. bg-gray-950 on html/body. NEVER use white sections.
- Hero: text-5xl lg:text-6xl font-bold text-white. Accent words in emerald-400.
  Or: gradient text bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400.
- Buttons: bg-emerald-500 text-gray-950 font-semibold rounded-lg hover:bg-emerald-400 shadow-lg shadow-emerald-500/20.
  Secondary: border border-gray-700 text-gray-300 hover:border-emerald-500/50 hover:text-emerald-400.
- Cards: bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all.
- Nav: sticky bg-gray-950/80 backdrop-blur-md border-b border-gray-800.
- Footer: bg-gray-950 border-t border-gray-800 text-gray-500.
- Code/mono elements: bg-gray-900 text-emerald-400 font-mono text-sm px-2 py-1 rounded.
- Subtle glow: box-shadow or ring-emerald-500/20 on focus/hover. Very subtle, not neon.
- Section dividers: border-t border-gray-800. Alternate bg-gray-950 and bg-gray-900.`,
    compactSnippet: `THEME: Dark Elegance. Bg: gray-950 entire page (NEVER white). Cards: bg-gray-900 border-gray-800. Text: gray-100/400. Accent: emerald-400 (glow). Buttons: bg-emerald-500 text-gray-950. Borders glow on hover: emerald-500/30. Nav: bg-gray-950/80 backdrop-blur. Footer: bg-gray-950 border-gray-800.`,
  },

  'glassmorphism': {
    id: 'glassmorphism',
    label: 'Glassmorphism',
    description: 'Frosted glass, blur effects, layered depth — Apple Vision Pro quality',
    promptSnippet: `THEME: GLASSMORPHISM (Apple Vision Pro / Figma aesthetic)
COLOR SYSTEM:
- Background: ALWAYS a rich gradient mesh background — e.g. bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 for the main page. NEVER plain white.
- Cards: bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl. Content shows THROUGH the glass.
- Text: text-white headings, text-white/70 body, text-white/50 muted
- Accent: Use the user's color scheme for glowing accents — ring-{color}-500/30 on hover
- Shadows: shadow-xl shadow-black/20. Cards cast depth shadows.
PERSONALITY:
- Layered, translucent, ethereal. Everything floats on glass.
- Cards: bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8. MUST use backdrop-blur.
- Buttons: bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30. Primary: bg-white text-gray-900 hover:bg-white/90.
- Nav: bg-white/10 backdrop-blur-xl border-b border-white/10. Fully translucent.
- Hero: Large text-white with text-shadow effect. Gradient text for brand words.
- Sections: Alternate bg-white/5 and transparent. NEVER use bg-white or bg-gray-50.
- Add floating gradient blobs: absolute positioned divs with bg-gradient-to-r + rounded-full + blur-3xl + opacity-30 as decorative elements behind content.
- Footer: bg-black/30 backdrop-blur-xl border-t border-white/10.
- Inputs: bg-white/10 border-white/20 text-white placeholder-white/40.`,
    compactSnippet: `THEME: Glassmorphism. Bg: gradient mesh (indigo-900 via purple-900 to pink-900). Cards: bg-white/10 backdrop-blur-xl border-white/20. Text: white/70. Buttons: bg-white/20 backdrop-blur. Nav: bg-white/10 backdrop-blur-xl. Floating gradient blobs for decoration. NEVER plain white bg. Everything translucent.`,
  },

  'creative-playful': {
    id: 'creative-playful',
    label: 'Creative Playful',
    description: 'Asymmetric layouts, artistic flair — Notion / Framer quality',
    promptSnippet: `THEME: CREATIVE PLAYFUL (Notion / Framer aesthetic)
COLOR SYSTEM:
- Background: white main with colorful accent sections (NOT all same bg)
- Cards: Mix of bg-white rounded-3xl and bg-{accent}-50 rounded-2xl. Vary border-radius per card.
- Text: gray-900 headings (some oversized text-6xl lg:text-8xl), gray-600 body
- Accent: Use the user's color scheme boldly — large color blocks, not just small accents
- Borders: border-2 (thicker than minimal), colorful border-{accent}-200
PERSONALITY:
- Playful, creative, dynamic. Break the grid intentionally.
- Hero: Oversized heading (text-6xl lg:text-8xl), mix font weights (font-light + font-black on different lines).
  Use -rotate-1 or rotate-1 on decorative elements. Scattered emoji or icons as decoration.
- Cards: Mix sizes — some cards span 2 columns, some are small squares. Use rounded-3xl on some, rounded-xl on others.
- Feature sections: Use asymmetric layouts — text at 60% width with image at 40%, not centered.
- Buttons: rounded-full px-8 py-3 with bold colors. Mix solid + outlined styles.
- Images: Some with rounded-3xl, some with rounded-full (circular crops). Mix aspect ratios.
- Decorative: Add subtle transform rotate (-rotate-2 to rotate-2) on cards, stickers, or accent shapes.
- Color blocks: Use full-width colored bands (bg-{accent}-500 py-20 text-white) between sections.
- Footer: Colorful, NOT dark gray. Use bg-{accent}-50 with playful layout.
- Typography: Mix weights dramatically — one word font-black, next word font-light.`,
    compactSnippet: `THEME: Creative Playful. Oversized headings (text-6xl lg:text-8xl), mixed font weights. Cards: varied border-radius (rounded-3xl + rounded-xl), some rotated (-rotate-1). Asymmetric layouts. Colorful sections not all white. Buttons: rounded-full. Mix card sizes. Footer: colorful (bg-accent-50) not dark. Break the grid.`,
  },

  'neo-brutalism': {
    id: 'neo-brutalism',
    label: 'Neo Brutalism',
    description: 'Thick borders, solid shadows, raw energy — Gumroad / Figma quality',
    promptSnippet: `THEME: NEO BRUTALISM (Gumroad / indie aesthetic)
COLOR SYSTEM:
- Background: bg-[#FFFDF7] or bg-amber-50 main (warm off-white, NOT pure white)
- Cards: bg-white border-2 border-black rounded-lg (NOT rounded-2xl — keep it chunky)
- Shadows: shadow-[4px_4px_0_black] on cards and buttons (SOLID block shadows, not blurred)
- Text: text-black headings (font-black weight), text-gray-700 body
- Accent: Use bold flat colors from user's scheme — no gradients. bg-{accent}-400 for highlights.
- Borders: border-2 border-black EVERYWHERE. This is the signature.
PERSONALITY:
- Raw, bold, unapologetic. Intentionally "imperfect" — this is a DESIGN CHOICE, not a bug.
- Buttons: bg-{accent}-400 border-2 border-black shadow-[4px_4px_0_black] rounded-lg px-6 py-3 font-bold hover:shadow-[2px_2px_0_black] hover:translate-x-[2px] hover:translate-y-[2px] transition-all. Active press effect.
- Cards: border-2 border-black rounded-lg shadow-[4px_4px_0_black]. Hover: shadow-[2px_2px_0_black] + translate.
- Nav: bg-white border-b-2 border-black. Brand name in font-black uppercase.
- Hero: Oversized text-5xl lg:text-7xl font-black. Some text highlighted with bg-{accent}-300 px-2 inline (marker highlight effect).
- Sections: Alternate bg-white and bg-{accent}-100. Use border-t-2 border-black between sections.
- Images: border-2 border-black rounded-lg. No soft shadows.
- Inputs: border-2 border-black rounded-lg. Focus: ring-2 ring-{accent}-400.
- Tags/badges: bg-{accent}-300 border-2 border-black rounded-full px-3 py-1 text-sm font-bold.
- Footer: bg-black text-white border-t-2 border-black. Bold and simple.`,
    compactSnippet: `THEME: Neo Brutalism. Bg: #FFFDF7 (warm off-white). Cards: border-2 border-black shadow-[4px_4px_0_black]. Buttons: same + hover translate effect. Nav: border-b-2 border-black. Hero: text-7xl font-black with bg-accent-300 marker highlights. Sections: border-t-2 between them. No gradients, no blur. Raw and bold.`,
  },
};

/**
 * Get the full theme prompt snippet for a given theme ID.
 * Falls back to empty string if theme not found (no theme = default design system).
 */
export function getThemePrompt(themeId: string | undefined | null): string {
  if (!themeId) return '';
  return THEME_PRESETS[themeId]?.promptSnippet ?? '';
}

/**
 * Get the compact theme prompt for slow providers.
 */
export function getCompactThemePrompt(themeId: string | undefined | null): string {
  if (!themeId) return '';
  return THEME_PRESETS[themeId]?.compactSnippet ?? '';
}

/**
 * Map design style IDs from the questionnaire to theme preset IDs.
 * The questionnaire uses: modern-minimal, bold-colorful, professional, creative, dark, glassmorphism
 * We map them to our 4 presets.
 */
export function mapDesignStyleToTheme(designStyle: string | undefined | null): string | null {
  if (!designStyle) return null;
  const mapping: Record<string, string> = {
    'modern-minimal': 'modern-minimal',
    'professional': 'corporate-clean',
    'bold-colorful': 'bold-vibrant',
    'creative': 'creative-playful',
    'dark': 'dark-elegance',
    'glassmorphism': 'glassmorphism',
    'neo-brutalism': 'neo-brutalism',
  };
  return mapping[designStyle] ?? null;
}

/**
 * Generate a color scheme override snippet that remaps the theme's primary/accent colors
 * to the user's selected palette. Injected after the theme prompt in the system prompt.
 */
export function getColorSchemeOverride(colorScheme: string | undefined | null): string {
  if (!colorScheme) return '';
  const lower = colorScheme.toLowerCase();

  // Map palette names to Tailwind color families
  const COLOR_MAP: Record<string, { family: string; primary: string; light: string; dark: string }> = {
    emerald: { family: 'emerald', primary: 'emerald-600', light: 'emerald-50', dark: 'emerald-900' },
    blue: { family: 'blue', primary: 'blue-600', light: 'blue-50', dark: 'blue-900' },
    purple: { family: 'purple', primary: 'purple-600', light: 'purple-50', dark: 'purple-900' },
    violet: { family: 'violet', primary: 'violet-600', light: 'violet-50', dark: 'violet-900' },
    rose: { family: 'rose', primary: 'rose-600', light: 'rose-50', dark: 'rose-900' },
    amber: { family: 'amber', primary: 'amber-500', light: 'amber-50', dark: 'amber-900' },
    cyan: { family: 'cyan', primary: 'cyan-600', light: 'cyan-50', dark: 'cyan-900' },
    indigo: { family: 'indigo', primary: 'indigo-600', light: 'indigo-50', dark: 'indigo-900' },
    slate: { family: 'slate', primary: 'slate-600', light: 'slate-50', dark: 'slate-900' },
    red: { family: 'red', primary: 'red-600', light: 'red-50', dark: 'red-900' },
    orange: { family: 'orange', primary: 'orange-500', light: 'orange-50', dark: 'orange-900' },
    teal: { family: 'teal', primary: 'teal-600', light: 'teal-50', dark: 'teal-900' },
    pink: { family: 'pink', primary: 'pink-600', light: 'pink-50', dark: 'pink-900' },
  };

  // Find matching palette
  const match = Object.entries(COLOR_MAP).find(([key]) => lower.includes(key));
  if (!match) return '';

  const [, palette] = match;
  return `\nCOLOR OVERRIDE (apply to ALL theme colors):
Use ${palette.family} as the primary color family throughout. Specifically:
- Primary/accent buttons and links: bg-${palette.primary}, text-${palette.primary}, hover:bg-${palette.family}-700
- Light backgrounds for alternate sections: bg-${palette.light}
- Card highlights and icon backgrounds: bg-${palette.family}-100
- Dark sections (CTA, footer): bg-${palette.dark} or bg-gray-900
- Gradient accents: from-${palette.family}-500 to-${palette.family}-700
- Borders: border-${palette.family}-200 for cards, border-${palette.family}-500/30 for accents
Replace ALL hardcoded color references (violet-600, blue-600, emerald-500, etc.) with the ${palette.family} equivalents above.`;
}

/** All available theme presets for UI display. */
export const ALL_THEME_PRESETS = Object.values(THEME_PRESETS);

export default THEME_PRESETS;
