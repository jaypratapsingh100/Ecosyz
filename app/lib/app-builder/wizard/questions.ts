/**
 * Wizard questionnaire questions and definitions
 */

export interface WizardQuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface WizardQuestion {
  key: string;
  question: string;
  type: 'text' | 'select' | 'multi-select';
  options?: WizardQuestionOption[];
  placeholder?: string;
  required: boolean;
}

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  { 
    key: 'appDescription', 
    question: "Let's start! What kind of app or website do you want to build? Describe your idea in a few sentences.", 
    type: 'text', 
    required: true 
  },
  { 
    key: 'appType', 
    question: "What type of app is this?", 
    type: 'select', 
    options: [
      { id: 'portfolio', label: 'Portfolio/Personal Website' },
      { id: 'business', label: 'Business Website' },
      { id: 'ecommerce', label: 'E-commerce Store' },
      { id: 'saas', label: 'SaaS Application' },
      { id: 'blog', label: 'Blog/Content Site' },
      { id: 'landing', label: 'Landing Page' },
      { id: 'other', label: 'Other' },
    ],
    required: true 
  },
  { 
    key: 'mainPurpose', 
    question: "What's the main purpose of your app?", 
    type: 'select', 
    options: [
      { id: 'showcase', label: 'Showcase work/portfolio' },
      { id: 'sell', label: 'Sell products/services' },
      { id: 'leads', label: 'Generate leads' },
      { id: 'share', label: 'Share information/blog' },
      { id: 'application', label: 'Build a web application' },
      { id: 'other', label: 'Other' },
    ],
    required: true 
  },
  { 
    key: 'targetAudience', 
    question: "Who is your target audience?", 
    type: 'select', 
    options: [
      { id: 'general', label: 'General Public' },
      { id: 'b2b', label: 'Businesses (B2B)' },
      { id: 'b2c', label: 'Consumers (B2C)' },
      { id: 'developers', label: 'Developers/Technical' },
      { id: 'students', label: 'Students/Educational' },
      { id: 'other', label: 'Other' },
    ],
    required: true 
  },
  { 
    key: 'technicalLevel', 
    question: "What's the technical level of your target audience?", 
    type: 'select', 
    options: [
      { id: 'non-technical', label: 'Non-technical' },
      { id: 'somewhat-technical', label: 'Somewhat technical' },
      { id: 'very-technical', label: 'Very technical' },
    ],
    required: true 
  },
  { 
    key: 'designStyle', 
    question: "What design style do you prefer?", 
    type: 'select', 
    options: [
      { id: 'modern-minimal', label: 'Modern & Minimal', description: 'Clean, simple, focused' },
      { id: 'bold-colorful', label: 'Bold & Colorful', description: 'Vibrant, energetic' },
      { id: 'professional', label: 'Professional & Corporate', description: 'Trustworthy, formal' },
      { id: 'creative', label: 'Creative & Artistic', description: 'Unique, expressive' },
      { id: 'clean-simple', label: 'Clean & Simple', description: 'Minimal, elegant' },
    ],
    required: true 
  },
  { 
    key: 'layoutStyle', 
    question: "What layout style?", 
    type: 'select', 
    options: [
      { id: 'single-page', label: 'Single Page (Scroll)', description: 'All content on one page' },
      { id: 'multi-page', label: 'Multi-page Navigation', description: 'Separate pages' },
      { id: 'dashboard', label: 'Dashboard/App Layout', description: 'Application interface' },
      { id: 'blog', label: 'Blog/Content Layout', description: 'Content-focused' },
      { id: 'landing', label: 'Landing Page Layout', description: 'Single focused page' },
    ],
    required: true 
  },
  { 
    key: 'requiredSections', 
    question: "What sections do you need? (Select all that apply)", 
    type: 'multi-select', 
    options: [
      { id: 'hero', label: 'Home/Hero Section' },
      { id: 'about', label: 'About/Bio' },
      { id: 'portfolio', label: 'Portfolio/Projects' },
      { id: 'services', label: 'Services/Features' },
      { id: 'contact', label: 'Contact Form' },
      { id: 'blog', label: 'Blog/News' },
      { id: 'testimonials', label: 'Testimonials' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'faq', label: 'FAQ' },
      { id: 'team', label: 'Team/About Us' },
    ],
    required: true 
  },
  { 
    key: 'specialFeatures', 
    question: "Any special features? (Select all that apply)", 
    type: 'multi-select', 
    options: [
      { id: 'contact-form', label: 'Contact Form' },
      { id: 'newsletter', label: 'Email Newsletter Signup' },
      { id: 'social', label: 'Social Media Links' },
      { id: 'gallery', label: 'Image Gallery' },
      { id: 'video', label: 'Video Integration' },
      { id: 'maps', label: 'Maps Integration' },
      { id: 'chat', label: 'Chat Widget' },
      { id: 'analytics', label: 'Analytics Integration' },
    ],
    required: false 
  },
  { 
    key: 'contentReady', 
    question: "Do you have content ready?", 
    type: 'select', 
    options: [
      { id: 'Yes, I have all content', label: 'Yes, I have all content' },
      { id: 'Partial content', label: 'Partial content' },
      { id: 'No, generate placeholder content', label: 'No, generate placeholder content' },
    ],
    required: true 
  },
  { 
    key: 'brandName', 
    question: "What's your brand or project name? (Optional)", 
    type: 'text', 
    required: false 
  },
  { 
    key: 'tagline', 
    question: "Do you have a tagline or short description? (Optional)", 
    type: 'text', 
    required: false 
  },
  { 
    key: 'keyPoints', 
    question: "Any key points to highlight? (Optional - separate with commas)", 
    type: 'text', 
    placeholder: "e.g., Fast performance, Easy to use, Modern design, Mobile-friendly",
    required: false 
  },
  { 
    key: 'frameworkPreference', 
    question: "Framework preference?", 
    type: 'select', 
    options: [
      { id: 'react', label: 'React (Recommended)' },
      { id: 'nextjs', label: 'Next.js' },
      { id: 'vue', label: 'Vue.js' },
      { id: 'html', label: 'Plain HTML/CSS/JS' },
      { id: 'auto', label: 'Auto (AI chooses)' },
    ],
    required: false 
  },
  { 
    key: 'mobileResponsiveness', 
    question: "Mobile responsiveness priority?", 
    type: 'select', 
    options: [
      { id: 'essential', label: 'Essential (Mobile-first)' },
      { id: 'important', label: 'Important' },
      { id: 'not-priority', label: 'Not a priority' },
    ],
    required: false 
  },
  { 
    key: 'performancePriority', 
    question: "Performance priority?", 
    type: 'select', 
    options: [
      { id: 'high', label: 'High (Optimize for speed)' },
      { id: 'balanced', label: 'Balanced' },
      { id: 'features', label: 'Features over performance' },
    ],
    required: false 
  },
];
