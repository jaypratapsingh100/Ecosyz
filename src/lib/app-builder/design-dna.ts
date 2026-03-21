/**
 * Design DNA — weighted random layout combination generator.
 * Produces a unique "blueprint" each generation so every website looks different.
 * 5×5×5×4×4 = 2,000 base combinations × extra sections = massive visual variety.
 */

export type HeroVariant = 'split-layout' | 'centered-text' | 'image-backdrop' | 'asymmetric' | 'multi-cta';
export type FeaturesVariant = '3-col-cards' | 'alternating-rows' | 'bento-grid' | 'icon-list' | 'numbered-steps';
export type SocialProofVariant = 'testimonial-cards' | 'logo-cloud' | 'stats-bar' | 'featured-review' | 'combined';
export type CtaVariant = 'dark-band' | 'gradient-card' | 'split-cta' | 'minimal';
export type FooterVariant = 'multi-column' | 'minimal' | 'newsletter' | 'centered';

export interface DesignDNA {
  heroVariant: HeroVariant;
  featuresVariant: FeaturesVariant;
  socialProofVariant: SocialProofVariant;
  ctaVariant: CtaVariant;
  footerVariant: FooterVariant;
  extraSections: string[];
}

// ── Weighted random picker ──

function weightedPick<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Default (equal) weights ──

const DEFAULT_HERO: Record<HeroVariant, number> = {
  'split-layout': 20, 'centered-text': 20, 'image-backdrop': 20, 'asymmetric': 20, 'multi-cta': 20,
};
const DEFAULT_FEATURES: Record<FeaturesVariant, number> = {
  '3-col-cards': 20, 'alternating-rows': 20, 'bento-grid': 20, 'icon-list': 20, 'numbered-steps': 20,
};
const DEFAULT_SOCIAL: Record<SocialProofVariant, number> = {
  'testimonial-cards': 20, 'logo-cloud': 20, 'stats-bar': 20, 'featured-review': 20, 'combined': 20,
};
const DEFAULT_CTA: Record<CtaVariant, number> = {
  'dark-band': 25, 'gradient-card': 25, 'split-cta': 25, 'minimal': 25,
};
const DEFAULT_FOOTER: Record<FooterVariant, number> = {
  'multi-column': 25, 'minimal': 25, 'newsletter': 25, 'centered': 25,
};

// ── App-type-specific weight overrides ──

interface AppTypeWeights {
  hero?: Partial<Record<HeroVariant, number>>;
  features?: Partial<Record<FeaturesVariant, number>>;
  social?: Partial<Record<SocialProofVariant, number>>;
  cta?: Partial<Record<CtaVariant, number>>;
  footer?: Partial<Record<FooterVariant, number>>;
  extraPool: string[];
}

const APP_TYPE_WEIGHTS: Record<string, AppTypeWeights> = {
  saas: {
    hero: { 'centered-text': 30, 'split-layout': 25, 'asymmetric': 20, 'image-backdrop': 15, 'multi-cta': 10 },
    features: { '3-col-cards': 25, 'bento-grid': 25, 'alternating-rows': 20, 'icon-list': 15, 'numbered-steps': 15 },
    social: { 'logo-cloud': 30, 'stats-bar': 25, 'testimonial-cards': 20, 'combined': 15, 'featured-review': 10 },
    extraPool: ['pricing-toggle', 'comparison-table', 'tabbed-features', 'animated-counters', 'accordion-faq'],
  },
  landing: {
    hero: { 'centered-text': 25, 'image-backdrop': 25, 'split-layout': 20, 'asymmetric': 20, 'multi-cta': 10 },
    features: { 'alternating-rows': 25, '3-col-cards': 25, 'bento-grid': 20, 'numbered-steps': 15, 'icon-list': 15 },
    social: { 'testimonial-cards': 30, 'combined': 25, 'stats-bar': 20, 'logo-cloud': 15, 'featured-review': 10 },
    extraPool: ['accordion-faq', 'testimonial-carousel', 'animated-counters', 'pricing-toggle'],
  },
  ecommerce: {
    hero: { 'split-layout': 40, 'image-backdrop': 25, 'centered-text': 15, 'asymmetric': 15, 'multi-cta': 5 },
    features: { 'bento-grid': 35, '3-col-cards': 25, 'alternating-rows': 20, 'icon-list': 15, 'numbered-steps': 5 },
    social: { 'testimonial-cards': 30, 'featured-review': 25, 'stats-bar': 20, 'combined': 15, 'logo-cloud': 10 },
    footer: { 'multi-column': 40, 'newsletter': 30, 'minimal': 20, 'centered': 10 },
    extraPool: ['image-gallery', 'testimonial-carousel', 'accordion-faq', 'comparison-table'],
  },
  portfolio: {
    hero: { 'asymmetric': 30, 'split-layout': 25, 'centered-text': 20, 'image-backdrop': 20, 'multi-cta': 5 },
    features: { 'bento-grid': 40, 'alternating-rows': 25, '3-col-cards': 15, 'icon-list': 10, 'numbered-steps': 10 },
    social: { 'testimonial-cards': 30, 'featured-review': 30, 'stats-bar': 20, 'combined': 15, 'logo-cloud': 5 },
    footer: { 'minimal': 35, 'centered': 30, 'multi-column': 25, 'newsletter': 10 },
    extraPool: ['image-gallery', 'tabbed-features', 'testimonial-carousel', 'animated-counters'],
  },
  blog: {
    hero: { 'image-backdrop': 35, 'centered-text': 25, 'split-layout': 20, 'asymmetric': 15, 'multi-cta': 5 },
    features: { 'alternating-rows': 30, '3-col-cards': 25, 'bento-grid': 20, 'icon-list': 15, 'numbered-steps': 10 },
    social: { 'featured-review': 30, 'testimonial-cards': 25, 'combined': 20, 'stats-bar': 15, 'logo-cloud': 10 },
    footer: { 'newsletter': 40, 'multi-column': 30, 'centered': 20, 'minimal': 10 },
    extraPool: ['accordion-faq', 'testimonial-carousel', 'image-gallery'],
  },
  dashboard: {
    hero: { 'centered-text': 35, 'split-layout': 30, 'asymmetric': 20, 'image-backdrop': 10, 'multi-cta': 5 },
    features: { 'icon-list': 30, '3-col-cards': 25, 'bento-grid': 20, 'numbered-steps': 15, 'alternating-rows': 10 },
    social: { 'stats-bar': 35, 'logo-cloud': 25, 'combined': 20, 'testimonial-cards': 10, 'featured-review': 10 },
    extraPool: ['tabbed-features', 'comparison-table', 'animated-counters', 'pricing-toggle'],
  },
  tool: {
    hero: { 'split-layout': 30, 'centered-text': 25, 'asymmetric': 20, 'image-backdrop': 15, 'multi-cta': 10 },
    features: { 'numbered-steps': 30, 'icon-list': 25, '3-col-cards': 20, 'alternating-rows': 15, 'bento-grid': 10 },
    extraPool: ['accordion-faq', 'tabbed-features', 'comparison-table', 'animated-counters'],
  },
};

// ── Merge weights helper ──

function mergeWeights<T extends string>(
  defaults: Record<T, number>,
  overrides?: Partial<Record<T, number>>,
): Record<T, number> {
  if (!overrides) return defaults;
  return { ...defaults, ...overrides } as Record<T, number>;
}

// ── Normalize app type ──

function normalizeAppType(appType?: string): string {
  if (!appType) return 'saas';
  const lower = appType.toLowerCase();
  if (/e-?commerce|shop|store/i.test(lower)) return 'ecommerce';
  if (/blog|cms|magazine|news/i.test(lower)) return 'blog';
  if (/portfolio|personal|resume/i.test(lower)) return 'portfolio';
  if (/dashboard|admin|panel/i.test(lower)) return 'dashboard';
  if (/landing|one.?page/i.test(lower)) return 'landing';
  if (/tool|utility|calculator/i.test(lower)) return 'tool';
  return 'saas';
}

// ── Main generator ──

export function generateDesignDNA(appType?: string, designStyle?: string): DesignDNA {
  const type = normalizeAppType(appType);
  const weights = APP_TYPE_WEIGHTS[type] || APP_TYPE_WEIGHTS.saas;

  const heroVariant = weightedPick(mergeWeights(DEFAULT_HERO, weights.hero));
  const featuresVariant = weightedPick(mergeWeights(DEFAULT_FEATURES, weights.features));
  const socialProofVariant = weightedPick(mergeWeights(DEFAULT_SOCIAL, weights.social));
  const ctaVariant = weightedPick(mergeWeights(DEFAULT_CTA, weights.cta));
  const footerVariant = weightedPick(mergeWeights(DEFAULT_FOOTER, weights.footer));

  // Pick 1-2 extra sections from the app-type pool
  const pool = weights.extraPool || ['accordion-faq', 'pricing-toggle'];
  const extraCount = Math.random() < 0.6 ? 1 : 2;
  const extraSections = pickN(pool, extraCount);

  return { heroVariant, featuresVariant, socialProofVariant, ctaVariant, footerVariant, extraSections };
}

// ── Variant descriptions for the prompt ──

const HERO_DESC: Record<HeroVariant, string> = {
  'split-layout': 'SPLIT LAYOUT — 2-column grid: compelling headline + CTA on left, large product/hero image on right. Use lg:grid-cols-2 with items-center.',
  'centered-text': 'CENTERED TEXT — full-width centered headline with gradient accent text, subtitle, and dual CTA buttons. No image in hero.',
  'image-backdrop': 'IMAGE BACKDROP — full-bleed background image with dark gradient overlay (bg-gradient-to-b from-black/60 to-black/30), white text on top, centered layout.',
  'asymmetric': 'ASYMMETRIC — off-center headline (text-left on lg), with floating stat cards or feature badges positioned around the text using absolute/relative positioning.',
  'multi-cta': 'MULTI-CTA — centered headline followed by 3 action cards in a row (not buttons), each with icon + title + arrow. Cards link to different sections.',
};

const FEATURES_DESC: Record<FeaturesVariant, string> = {
  '3-col-cards': '3-COLUMN CARDS — grid-cols-1 md:grid-cols-2 lg:grid-cols-3 with icon, title, description per card.',
  'alternating-rows': 'ALTERNATING ROWS — each feature is a full-width 2-column row (image + text), alternating sides. Use flex-row-reverse on even items.',
  'bento-grid': 'BENTO GRID — mixed-size card grid: 1 large card spanning 2 columns + 2-3 smaller cards. Use col-span-2 and row-span-2 for variety.',
  'icon-list': 'ICON LIST — compact vertical list with small inline icons, title, and one-line description per feature. Use space-y-4, not a grid.',
  'numbered-steps': 'NUMBERED STEPS — vertical timeline with numbered circles (1, 2, 3...) connected by a vertical line, title + description per step.',
};

const SOCIAL_DESC: Record<SocialProofVariant, string> = {
  'testimonial-cards': 'TESTIMONIAL CARDS — 3-column grid with quote, star rating, avatar + name + title per card.',
  'logo-cloud': 'LOGO CLOUD — horizontal row of 5-6 company/partner logos (use placeholder gray boxes with company names) with "Trusted by" heading.',
  'stats-bar': 'STATS BAR — 3-4 key metrics in a horizontal row (e.g., "10K+ Users", "99.9% Uptime", "50+ Countries"). Use text-4xl font-bold for numbers.',
  'featured-review': 'FEATURED REVIEW — single large testimonial centered, with 5-star rating, large quote text, avatar, and company logo.',
  'combined': 'COMBINED — stats bar (3 metrics) on top + single featured testimonial quote below. Two distinct visual sections.',
};

const CTA_DESC: Record<CtaVariant, string> = {
  'dark-band': 'DARK BAND — full-width dark background section with white centered heading, subtitle, and prominent CTA button.',
  'gradient-card': 'GRADIENT CARD — floating rounded-2xl card with gradient background centered in a white/light section. Card contains heading + CTA.',
  'split-cta': 'SPLIT CTA — 2-column layout: heading + description on left, email input + submit button on right. Single row.',
  'minimal': 'MINIMAL — just a headline + single button centered with generous py-24+ whitespace. No background color change.',
};

const FOOTER_DESC: Record<FooterVariant, string> = {
  'multi-column': 'MULTI-COLUMN — dark background, 4-column grid of links (Product, Company, Resources, Legal) + bottom copyright bar.',
  'minimal': 'MINIMAL — single row: brand name left, 4-5 inline links center, social icons right. Light or dark background.',
  'newsletter': 'NEWSLETTER — 3-column links grid + email signup form in the 4th column. Dark background.',
  'centered': 'CENTERED — vertically stacked: logo, horizontal link row, social icons row, copyright. All centered.',
};

const EXTRA_DESC: Record<string, string> = {
  'pricing-toggle': 'PRICING TOGGLE — useState to switch Monthly/Annual. 3-column pricing cards, highlighted "Popular" tier. Annual shows discount badge.',
  'accordion-faq': 'ACCORDION FAQ — expandable Q&A list using useState per item. Chevron icon rotates on open. 6-8 questions.',
  'tabbed-features': 'TABBED FEATURES — horizontal tab bar with 3-4 tabs. useState for activeTab. Each tab shows different content panel with image + text.',
  'image-gallery': 'IMAGE GALLERY — responsive grid of 6-9 images with hover overlay showing title. Optional: lightbox modal with useState.',
  'animated-counters': 'ANIMATED COUNTERS — 3-4 large numbers that count up from 0 using useEffect + setInterval. Trigger on mount.',
  'testimonial-carousel': 'TESTIMONIAL CAROUSEL — single testimonial shown at a time with left/right arrows and dots. useState for current index. Auto-advance optional.',
  'comparison-table': 'COMPARISON TABLE — feature rows with check/x marks across 3 plan columns. Sticky header row. Responsive horizontal scroll on mobile.',
};

// ── Format for prompt injection ──

export function formatDesignDNAForPrompt(dna: DesignDNA): string {
  const lines = [
    'LAYOUT BLUEPRINT (follow these EXACT layout choices — do NOT substitute):',
    `- Hero: ${HERO_DESC[dna.heroVariant]}`,
    `- Features: ${FEATURES_DESC[dna.featuresVariant]}`,
    `- Social Proof: ${SOCIAL_DESC[dna.socialProofVariant]}`,
    `- CTA: ${CTA_DESC[dna.ctaVariant]}`,
    `- Footer: ${FOOTER_DESC[dna.footerVariant]}`,
  ];

  if (dna.extraSections.length > 0) {
    lines.push(`- Extra sections to include:`);
    for (const extra of dna.extraSections) {
      const desc = EXTRA_DESC[extra];
      if (desc) lines.push(`  • ${desc}`);
    }
  }

  lines.push('');
  lines.push('IMPORTANT: Use the EXACT layout structures described above. Each section should feel visually distinct from the others.');

  return lines.join('\n');
}
