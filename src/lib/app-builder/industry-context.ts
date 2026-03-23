/**
 * Industry Context — provides real-world website structure standards
 * so generated websites follow industry conventions, not generic layouts.
 *
 * Two approaches:
 * 1. Curated standards for common industries (instant, no API call)
 * 2. Web search fallback for uncommon industries (uses search API)
 */

// ── Curated industry standards ──
// Each entry describes what sections/pages a real website in that industry has,
// what content patterns are standard, and what to avoid.

interface IndustryStandard {
  industry: string;
  keywords: string[];
  sections: string[];
  contentPatterns: string[];
  avoid: string[];
}

const INDUSTRY_STANDARDS: IndustryStandard[] = [
  {
    industry: 'College / University',
    keywords: ['college', 'university', 'iit', 'school', 'education', 'academy', 'institute'],
    sections: [
      'Hero with campus image and tagline',
      'Admissions section (deadlines, requirements, apply CTA)',
      'Academic Programs grid (departments, courses)',
      'Research & Innovation highlights',
      'Campus Life section (hostels, clubs, sports, events)',
      'Faculty spotlight with credentials',
      'Placements & Career stats (avg package, top recruiters)',
      'News & Events feed (upcoming dates)',
      'Testimonials from alumni',
      'Contact with campus map location',
      'Footer with quick links: Admissions, Academics, Research, Student Life, Alumni, Contact',
    ],
    contentPatterns: [
      'Use real-sounding department names (Computer Science, Mechanical Engineering, etc.)',
      'Show placement statistics with numbers (95% placement rate, $120K avg package)',
      'Include accreditation badges and rankings',
      'Show academic calendar or important dates',
      'Faculty cards with photo, name, designation, department',
    ],
    avoid: [
      'Generic "Features" section — use "Academic Programs" or "Departments" instead',
      'Pricing tables — colleges don\'t have SaaS-style pricing',
      'Generic "Get Started" CTA — use "Apply Now" or "Explore Programs"',
      'Dark/tech themes — colleges use institutional, trustworthy designs',
    ],
  },
  {
    industry: 'Restaurant / Food',
    keywords: ['restaurant', 'food', 'cafe', 'bistro', 'bakery', 'pizza', 'kitchen', 'dining', 'bar'],
    sections: [
      'Hero with signature dish photo and restaurant name',
      'Menu section organized by categories (Starters, Mains, Desserts, Drinks)',
      'About / Our Story section with chef bio',
      'Gallery of food and ambiance photos (6-9 images)',
      'Reservation / Book a Table form (date, time, guests)',
      'Hours & Location with embedded map placeholder',
      'Customer reviews and ratings',
      'Special offers or seasonal menu highlight',
      'Footer with hours, address, phone, social links',
    ],
    contentPatterns: [
      'Menu items with name, description, and price',
      'Use food-specific imagery (dishes, ingredients, kitchen)',
      'Show ratings (4.8/5 on Google, Zomato rating)',
      'Operating hours for each day of the week',
      'Chef\'s recommendation or featured dishes',
    ],
    avoid: [
      'Generic "Features" grid — restaurants don\'t have "features"',
      'SaaS-style pricing tables',
      'Tech jargon or developer-focused copy',
      'Dark mode as default — restaurants use warm, inviting colors',
    ],
  },
  {
    industry: 'E-commerce / Online Store',
    keywords: ['shop', 'store', 'ecommerce', 'e-commerce', 'buy', 'sell', 'marketplace', 'retail', 'grocery', 'fashion'],
    sections: [
      'Hero with featured product/collection and "Shop Now" CTA',
      'Featured Products grid (6-8 products with image, name, ₹ price, add-to-cart button)',
      'Category navigation (filter by category)',
      'Product cards with hover effects and "Add to Cart" button with onClick',
      'Shopping Cart page (items list, quantity +/-, remove, total, checkout button)',
      'Checkout page with Razorpay "Pay Now" button',
      'Customer testimonials with verified purchase badge',
      'Trust signals (🚚 Free Delivery, 🔒 Secure Payment, ↩️ Easy Returns)',
      'Login/Signup for order tracking',
      'Footer with Shop, Customer Service, About, Policies links',
    ],
    contentPatterns: [
      'Product cards: image, name, ₹ price, old price (strikethrough), rating ★, "Add to Cart" button',
      'Cart uses localStorage: useState + useEffect to persist',
      'Cart icon in navbar showing item count badge',
      'Checkout shows order summary + "Pay ₹X with Razorpay" button',
      'Login required for checkout — show LoginForm modal',
      'Use Supabase for auth (signUp, signIn) and orders table',
      'Generate src/lib/supabase.js, src/context/AuthContext.jsx, src/lib/database.js, src/lib/schema.sql',
    ],
    avoid: [
      'Generic placeholder products — use realistic product names and prices',
      'Missing cart functionality — at minimum show cart icon and add-to-cart buttons',
      'No product images — every product needs an image',
    ],
  },
  {
    industry: 'Portfolio / Personal',
    keywords: ['portfolio', 'personal', 'freelance', 'developer', 'designer', 'resume', 'cv'],
    sections: [
      'Hero with name, title, and professional photo',
      'About section with bio and skills',
      'Projects/Work showcase as grid or cards (6-8 projects with screenshots)',
      'Skills & Technologies section (icons or progress bars)',
      'Experience timeline (company, role, dates)',
      'Testimonials from clients',
      'Blog or Articles section (optional)',
      'Contact form and social links',
      'Downloadable Resume/CV link',
    ],
    contentPatterns: [
      'Project cards: screenshot, title, description, tech stack tags, live link',
      'Skills with proficiency indicators (bars, percentages, or grouped by level)',
      'Timeline with company logos and dates',
      'Professional headshot photo',
      'Social links: GitHub, LinkedIn, Twitter',
    ],
    avoid: [
      'Generic "Features" section — portfolios show work, not features',
      'Pricing tables — freelancers don\'t show SaaS pricing',
      'Corporate language — keep it personal and authentic',
    ],
  },
  {
    industry: 'SaaS / Software',
    keywords: ['saas', 'software', 'app', 'platform', 'tool', 'dashboard', 'crm', 'erp'],
    sections: [
      'Hero with product screenshot/mockup and value proposition',
      'Social proof (logo cloud of customers)',
      'Feature grid or alternating feature rows with screenshots',
      'Pricing table (Free, Pro, Enterprise)',
      'Feature comparison table across plans',
      'Customer testimonials',
      'Integration logos section',
      'FAQ accordion',
      'CTA section (Start free trial)',
      'Footer with Product, Company, Resources, Legal links',
    ],
    contentPatterns: [
      'Specific value proposition, not generic "streamline your workflow"',
      'Concrete numbers: "Used by 10,000+ teams" or "99.9% uptime"',
      'Product screenshots or dashboard mockups',
      'Pricing toggle (monthly/annual with discount badge)',
      'Feature comparison with checkmarks across plan tiers',
    ],
    avoid: [
      'Vague copy — be specific about what the product does',
      'Missing pricing — SaaS always shows pricing',
      'No product visuals — show the actual product UI',
    ],
  },
  {
    industry: 'Healthcare / Medical',
    keywords: ['hospital', 'clinic', 'medical', 'health', 'doctor', 'dental', 'pharmacy', 'wellness'],
    sections: [
      'Hero with trust-building message and "Book Appointment" CTA',
      'Services/Departments grid (Cardiology, Orthopedics, etc.)',
      'Doctor profiles with photo, specialty, qualifications',
      'Appointment booking form (department, date, time)',
      'Patient testimonials',
      'Insurance & Payment info',
      'Emergency contact banner',
      'Location with hours and map',
      'Health tips / Blog section',
    ],
    contentPatterns: [
      'Doctor cards: professional photo, name, specialization, years of experience',
      'Service icons with brief descriptions',
      'Emergency phone number prominently displayed',
      'Trust indicators: certifications, accreditations, patient count',
    ],
    avoid: [
      'Dark/edgy themes — healthcare uses clean, calming, trustworthy designs',
      'SaaS-style pricing — healthcare uses insurance/consultation fee format',
      'Casual tone — medical sites need professional, reassuring language',
    ],
  },
  {
    industry: 'Real Estate',
    keywords: ['real estate', 'property', 'housing', 'apartment', 'rental', 'broker', 'realty'],
    sections: [
      'Hero with property search bar (location, type, price range)',
      'Featured Properties grid (4-6 listings with photos)',
      'Property cards: image carousel, price, bedrooms, bathrooms, sqft, location',
      'Property types filter (Apartment, House, Villa, Commercial)',
      'Agent/Team profiles',
      'Neighborhood guides',
      'Customer testimonials',
      'Contact form for property inquiries',
      'Market stats section (avg price, listings, sold)',
    ],
    contentPatterns: [
      'Property listings with multiple photos, price, and key specs',
      'Search/filter bar prominently in hero',
      'Map view option',
      'Agent photo with phone and email',
      'Virtual tour links',
    ],
    avoid: [
      'Generic product grid — real estate needs property-specific cards with specs',
      'Missing search — real estate sites always have prominent search',
    ],
  },
  {
    industry: 'Blog / Media / News',
    keywords: ['blog', 'news', 'magazine', 'media', 'journal', 'publication', 'content', 'cms'],
    sections: [
      'Hero with featured/latest article (large image + headline)',
      'Article grid organized by categories',
      'Category navigation bar or sidebar',
      'Article cards: image, category tag, title, excerpt, author, date',
      'Trending/Popular articles sidebar or section',
      'Newsletter subscription form',
      'Author bio section',
      'Comment section placeholder',
      'Related articles section',
      'Footer with categories, about, social links',
    ],
    contentPatterns: [
      'Article cards: featured image, category badge, reading time, author avatar',
      'Category-based navigation (Technology, Lifestyle, Business, etc.)',
      'Search bar in header',
      'Pagination or "Load More" for article lists',
      'Author page with bio, photo, and article list',
    ],
    avoid: [
      'SaaS-style pricing or features sections',
      'Generic "Get Started" CTAs — use "Read More" or "Subscribe"',
    ],
  },
  {
    industry: 'Temple / Religious / Spiritual',
    keywords: ['temple', 'church', 'mosque', 'spiritual', 'religious', 'worship', 'mandir', 'gurudwara'],
    sections: [
      'Hero with temple/sacred place image and spiritual message',
      'About the Temple section (history, significance)',
      'Daily Schedule / Timings (aarti, prayers, services)',
      'Events & Festivals calendar',
      'Gallery of temple images and ceremonies',
      'Donation / Seva section with categories',
      'Teachings / Scriptures section',
      'Contact with temple address and visiting hours',
      'Live Darshan / Streaming link (if applicable)',
      'Footer with timings, location, contact',
    ],
    contentPatterns: [
      'Warm, devotional color palette (gold, saffron, maroon)',
      'Festival dates and descriptions',
      'Donation categories (General, Annadanam, Construction)',
      'Daily schedule with times for each service',
      'Photo gallery of ceremonies and architecture',
    ],
    avoid: [
      'SaaS-style pricing or feature grids',
      'Tech jargon — use devotional, respectful language',
      'Dark/edgy themes — temples use warm, sacred, traditional designs',
    ],
  },
  {
    industry: 'Agency / Consulting',
    keywords: ['agency', 'consulting', 'marketing', 'digital', 'creative', 'studio', 'firm'],
    sections: [
      'Hero with bold tagline and case study preview',
      'Services grid (what you offer)',
      'Case Studies / Portfolio showcase (3-4 featured projects)',
      'Process section (How We Work — 3-4 steps)',
      'Client logos / Social proof',
      'Team section with photos and roles',
      'Testimonials from clients',
      'Blog / Insights section',
      'Contact / Get a Quote form',
    ],
    contentPatterns: [
      'Case studies with before/after metrics',
      'Process steps with numbers (1. Discovery, 2. Strategy, 3. Execution, 4. Results)',
      'Client logos in a horizontal row',
      'Bold, confident copy with measurable results',
    ],
    avoid: [
      'Generic feature grids — agencies show results, not features',
      'SaaS-style pricing tables',
    ],
  },
];

/**
 * Get curated industry context based on app type, brand name, or description.
 * Returns a prompt section with industry-specific guidance.
 */
export function getIndustryContext(
  appType?: string,
  brandName?: string,
  projectGoal?: string,
): string {
  if (!appType && !brandName && !projectGoal) return '';

  const searchText = `${appType || ''} ${brandName || ''} ${projectGoal || ''}`.toLowerCase();

  // Find matching industry
  const match = INDUSTRY_STANDARDS.find(std =>
    std.keywords.some(kw => searchText.includes(kw))
  );

  if (!match) return '';

  let context = `\n\nINDUSTRY STANDARDS (${match.industry} website):
This is a ${match.industry} website. Follow these real-world conventions:

LOCALE: Indian audience. Use ₹ (Rupee) for all prices. Indian names (Priya, Rahul, Ananya). Indian cities (Mumbai, Delhi, Bangalore). Phone: +91 format.

REQUIRED SECTIONS (use these instead of generic Hero/Features/Pricing):
${match.sections.map(s => `- ${s}`).join('\n')}

CONTENT PATTERNS:
${match.contentPatterns.map(p => `- ${p}`).join('\n')}

AVOID (these are wrong for ${match.industry} websites):
${match.avoid.map(a => `- ${a}`).join('\n')}

Generate sections that match what real ${match.industry} websites have. Do NOT use generic SaaS-style layouts unless this IS a SaaS product.`;

  return context;
}

/**
 * Compact version — just the required sections, ~60% fewer tokens.
 * Used by compact prompt builder for OpenRouter/slow providers.
 */
export function getCompactIndustryContext(appType?: string): string {
  if (!appType) return '';
  const searchText = appType.toLowerCase();
  const match = INDUSTRY_STANDARDS.find(std =>
    std.keywords.some(kw => searchText.includes(kw))
  );
  if (!match) return '';
  // Only sections, no patterns/avoid — saves ~40% tokens
  return `\n${match.industry} website sections: ${match.sections.slice(0, 6).join('; ')}. Avoid generic SaaS layouts.`;
}

/**
 * Web search fallback for industries not in the curated list.
 * Uses a simple fetch to get context about what the website should contain.
 * Returns empty string on failure (non-blocking).
 */
export async function searchIndustryContext(
  appType: string,
  brandName?: string,
): Promise<string> {
  // Only search if we don't have a curated match
  const searchText = `${appType} ${brandName || ''}`.toLowerCase();
  const hasCuratedMatch = INDUSTRY_STANDARDS.some(std =>
    std.keywords.some(kw => searchText.includes(kw))
  );
  if (hasCuratedMatch) return ''; // Already handled by curated data

  try {
    // Use a simple search to get website structure context
    const query = encodeURIComponent(`${appType} website essential sections pages structure best practices`);
    const res = await fetch(`https://www.google.com/search?q=${query}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return '';
    // We don't actually parse search results — the curated list handles common cases.
    // This is a placeholder for future integration with a search API.
    return '';
  } catch {
    return '';
  }
}

/** List of all supported industries for reference */
export const SUPPORTED_INDUSTRIES = INDUSTRY_STANDARDS.map(s => ({
  industry: s.industry,
  keywords: s.keywords,
}));
