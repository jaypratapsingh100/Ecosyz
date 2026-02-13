/**
 * Professional business website prompts for the app builder.
 * Use these to generate production-ready business sites.
 */

/** Primary prompt for professional business websites */
export const PROFESSIONAL_BUSINESS_WEBSITE_PROMPT = `Create a professional, business-ready website with:

1. **Hero section**: Compelling headline, subheadline, and primary CTA button. Clean layout with strong visual hierarchy.
2. **Services/Features section**: 3–4 service or feature cards with icons, titles, and short descriptions. Use a responsive grid.
3. **About section**: Brief company value proposition (2–3 sentences). Professional, trustworthy tone.
4. **Testimonials**: 2–3 customer quotes with names and roles. Use card layout with subtle styling.
5. **Contact/CTA section**: Clear call-to-action, optional contact form (name, email, message) or contact info.
6. **Header**: Sticky navigation with logo and menu links (Services, About, Contact).
7. **Footer**: Copyright, links to Privacy/Terms, social links or contact info.

Design requirements:
- Responsive: mobile-first, works on all screen sizes
- Modern typography: system fonts or Google Fonts (e.g. Inter, DM Sans)
- Professional color palette: blues/grays for trust, or brand accent color
- Adequate whitespace, subtle shadows, rounded corners
- Semantic HTML, accessible (proper headings, alt text for images)
- Use CSS classes in styles.css; no inline styles except where necessary
`;

/** Shorter variant for quick generation */
export const BUSINESS_WEBSITE_SHORT_PROMPT =
  'Create a professional business website with Hero, Services, About, Testimonials, Contact, Header nav, and Footer. Responsive, modern design with clean typography.';

/** Agency/corporate variant */
export const AGENCY_WEBSITE_PROMPT = `Create a professional agency or corporate website with:
- Hero: Bold headline and CTA
- Services: 4–6 service offerings in a grid
- Case studies/Work: 3 placeholder project cards
- About: Team or company story
- Contact: Form and/or contact details
- Header with nav, Footer with links
Modern, polished design. Responsive.`;

/** E-commerce / product landing variant */
export const PRODUCT_LANDING_PROMPT = `Create a professional product/SaaS landing page with:
- Hero: Product name, tagline, CTA
- Features: 3–4 key features in cards
- Pricing: 2–3 plan cards (optional)
- Testimonials or social proof
- Final CTA section
- Header nav, Footer
Clean, conversion-focused design.`;

/** All suggested prompts for the Chat UI */
export const SUGGESTED_PROMPTS = [
  {
    label: 'Professional Business Website',
    prompt: PROFESSIONAL_BUSINESS_WEBSITE_PROMPT,
    shortLabel: 'Business Website',
  },
  {
    label: 'SaaS Landing Page',
    prompt: 'Build a professional SaaS product landing page with Hero, Features, Pricing, Testimonials, and CTA. Modern, conversion-focused design.',
    shortLabel: 'SaaS Landing',
  },
  {
    label: 'Freelancer Portfolio',
    prompt: 'Create a portfolio site for a freelancer with Hero, Projects/Work, Skills, About, and Contact. Clean, professional design.',
    shortLabel: 'Portfolio',
  },
  {
    label: 'Todo App with Dark Mode',
    prompt: 'Build a simple todo app with dark mode, add/remove tasks, and filters. Use React state.',
    shortLabel: 'Todo App',
  },
] as const;
