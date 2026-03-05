/**
 * Production-grade suggested prompts for the app builder chat UI.
 * These are designed to produce impressive, polished output that showcases
 * the platform's capabilities — each one generates a complete, multi-section app.
 */

/** SaaS Landing Page — generates a Vercel/Linear-quality marketing site */
export const SAAS_LANDING_PROMPT = `Build a SaaS landing page for "TaskFlow" — a project management tool for engineering teams.

Sections: sticky nav with "TaskFlow" logo + Get Started CTA, hero with gradient text headline "Ship 10x faster with AI-powered project management", 3-stat bar (10K+ teams, 99.9% uptime, 50ms response), 6-feature grid with icons (Sprint Planning, Code Reviews, CI/CD Integration, Team Analytics, Slack Integration, API Access), pricing table with 3 tiers (Free $0/mo, Pro $29/mo, Enterprise custom), 3 testimonials from engineering leaders, dark CTA section "Ready to transform your workflow?", footer with 4 columns.

Style: Modern minimal. Clean whitespace, gray-900 buttons, blue-600 accent sparingly. Professional and trustworthy. Hover transitions on all cards.`;

/** Developer Portfolio — dark theme with glow effects */
export const PORTFOLIO_PROMPT = `Build a developer portfolio for "Alex Chen" — a full-stack engineer specializing in AI/ML products.

Sections: dark sticky nav with name + Resume/Contact links, hero with large gradient text "I build AI products that scale" + "Full-Stack Engineer · San Francisco" subtitle, featured projects grid (4 projects: AI Chat Platform, ML Pipeline Dashboard, Real-time Analytics Engine, Open Source CLI Tool — each with tech tags, description, and link buttons), skills section (React, TypeScript, Python, AWS, etc. as styled badges), about section with professional bio, dark CTA "Let's build something together" with email link, minimal dark footer.

Style: Dark elegance theme. bg-gray-950 entire page, emerald-400 accent glows, cards with border-gray-800 hover:border-emerald-500/30. Sophisticated, developer-focused.`;

/** E-commerce Store — bold, conversion-focused */
export const ECOMMERCE_PROMPT = `Build an e-commerce storefront for "Elevate" — a premium minimalist clothing brand.

Sections: clean nav with "ELEVATE" logo + Shop/Collections/About links + cart icon, hero with full-width image placeholder and "Designed for the Modern Minimalist" headline, featured collection (4 product cards with image placeholder, name, price, "Add to Cart" button with hover effect), "Why Elevate" section with 3 value props (Sustainable Materials, Timeless Design, Free Returns), newsletter signup with email input, customer reviews (3 cards), footer with shop links, social icons, and newsletter.

Style: Modern minimal with bold typography. Lots of whitespace, text-gray-900 dominant, clean product cards with subtle hover shadows. No bright colors — let the products speak.`;

/** Digital Agency — vibrant gradients, energetic */
export const AGENCY_PROMPT = `Build a website for "Pixel & Code" — a digital product agency that builds SaaS apps.

Sections: sticky nav with gradient logo text + Work/Services/About/Contact links, hero with bold headline "We turn ideas into products people love" + violet-to-indigo gradient accent text + "See our work" and "Start a project" dual CTAs, client logos bar ("Trusted by" with 6 placeholder logo boxes), 3 case study cards (each with project image placeholder, client name, result metric like "+340% conversion"), services grid (Product Strategy, UI/UX Design, Full-Stack Development, Growth & Analytics — with icons), team section with 4 member cards (avatar placeholder, name, role), process timeline (Discovery → Design → Develop → Launch), dark CTA section, gradient footer.

Style: Bold vibrant. violet-600→indigo-600 gradients, energetic hover animations, shadow-violet-500/25 on buttons, rounded-2xl cards with shadow-lg. Stripe/Notion quality.`;

/** All suggested prompts for the Chat UI */
export const SUGGESTED_PROMPTS = [
  {
    label: 'SaaS Landing Page',
    prompt: SAAS_LANDING_PROMPT,
    shortLabel: 'SaaS Landing',
  },
  {
    label: 'Developer Portfolio (Dark)',
    prompt: PORTFOLIO_PROMPT,
    shortLabel: 'Dev Portfolio',
  },
  {
    label: 'E-commerce Store',
    prompt: ECOMMERCE_PROMPT,
    shortLabel: 'E-commerce',
  },
  {
    label: 'Digital Agency Site',
    prompt: AGENCY_PROMPT,
    shortLabel: 'Agency Site',
  },
] as const;
