import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';
import { getLoadBalancer, getProviderWithFallback } from '../../../../../src/lib/llm-load-balancer';

// Provider configuration
type Provider = 'openai' | 'groq' | 'together' | 'huggingface' | 'deepseek' | 'ollama' | 'openrouter' | 'perplexity' | 'cohere' | 'anthropic';

interface ProviderConfig {
  baseURL: string;
  defaultModel: string;
  models: string[];
}

// GROQ_MODEL_MAP: Maps UI-friendly names to valid Groq model IDs
const GROQ_MODEL_MAP: Record<string, string> = {
  // Llama models for Groq
  'llama': 'llama-3.3-70b-versatile',
  'llama3': 'llama-3.3-70b-versatile',
  'llama3.2': 'llama-3.3-70b-versatile', // Groq doesn't have llama3.2, use 3.3
  'llama3.3': 'llama-3.3-70b-versatile',
  'llama-3.2': 'llama-3.3-70b-versatile',
  'llama-3.3': 'llama-3.3-70b-versatile',
  'llama-small': 'llama-3.1-8b-instant',
  'llama-3.1': 'llama-3.1-8b-instant',
  'llama-3.1-8b': 'llama-3.1-8b-instant',
  'llama-fast': 'llama-3.1-8b-instant',
  
  // Mixtral models for Groq
  'mixtral': 'mixtral-8x7b-32768',
  'mixtral-8x7b': 'mixtral-8x7b-32768',
  
  // Gemma models for Groq
  'gemma': 'gemma2-9b-it',
  'gemma2': 'gemma2-9b-it',
};

// MODEL_MAP: Maps UI-friendly names to valid OpenRouter model IDs
// NEVER send raw user-provided model names to OpenRouter - always normalize through this map
const MODEL_MAP: Record<string, string> = {
  // Llama models
  'llama': 'meta-llama/llama-3.2-70b-instruct',
  'llama3': 'meta-llama/llama-3.2-70b-instruct',
  'llama3.2': 'meta-llama/llama-3.2-70b-instruct',
  'llama-3.2': 'meta-llama/llama-3.2-70b-instruct',
  'llama-small': 'meta-llama/llama-3.1-8b-instruct',
  'llama-3.1': 'meta-llama/llama-3.1-8b-instruct',
  'llama-3.1-8b': 'meta-llama/llama-3.1-8b-instruct',
  
  // DeepSeek models
  'deepseek': 'deepseek/deepseek-chat',
  'deepseek-chat': 'deepseek/deepseek-chat',
  'deepseek-coder': 'deepseek/deepseek-coder',
  'deepseekcoder': 'deepseek/deepseek-coder',
  
  // Grok models
  'grok': 'x-ai/grok-2',
  'grok-2': 'x-ai/grok-2',
  'grok-beta': 'x-ai/grok-beta',
  
  // Mixtral models
  'mixtral': 'mistralai/mixtral-8x7b-instruct',
  'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct',
  'mixtral-8x22b': 'mistralai/mixtral-8x22b-instruct',
  
  // Mistral models
  'mistral': 'mistralai/mistral-7b-instruct',
  'mistral-7b': 'mistralai/mistral-7b-instruct',
  'mistral-large': 'mistralai/mistral-large',
  
  // GPT models (OpenRouter format)
  'gpt-4': 'openai/gpt-4',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-3.5': 'openai/gpt-3.5-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  
  // Claude models
  'claude': 'anthropic/claude-3-haiku',
  'claude-3-haiku': 'anthropic/claude-3-haiku',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet',
  'claude-3-opus': 'anthropic/claude-3-opus',
  
  // Free models
  'llama-free': 'meta-llama/llama-3.2-3b-instruct:free',
  'gemma-free': 'google/gemma-2-2b-it:free',
  'mistral-free': 'mistralai/mistral-7b-instruct:free',
};

// Normalize model name to valid provider-specific model ID
function normalizeModelName(modelName: string | undefined, provider: Provider): string {
  if (!modelName) {
    return PROVIDER_CONFIGS[provider].defaultModel;
  }
  
  const modelKey = modelName.toLowerCase();
  
  // If provider is Groq, normalize through GROQ_MODEL_MAP
  if (provider === 'groq') {
    const normalized = GROQ_MODEL_MAP[modelKey];
    if (normalized) {
      console.log(`🔄 Normalized Groq model: "${modelName}" → "${normalized}"`);
      return normalized;
    }
    
    // Check if it's already a valid Groq model name (contains hyphens, no slashes)
    // Groq models are like: llama-3.3-70b-versatile, mixtral-8x7b-32768
    if (!modelName.includes('/') && (modelName.includes('-') || PROVIDER_CONFIGS.groq.models.includes(modelName))) {
      return modelName;
    }
    
    // Unknown model name - default to safe fallback
    console.warn(`⚠️ Unknown model name "${modelName}" for Groq, using default: ${PROVIDER_CONFIGS[provider].defaultModel}`);
    return PROVIDER_CONFIGS[provider].defaultModel;
  }
  
  // If provider is OpenRouter, normalize through MODEL_MAP
  if (provider === 'openrouter') {
    const normalized = MODEL_MAP[modelKey];
    if (normalized) {
      console.log(`🔄 Normalized OpenRouter model: "${modelName}" → "${normalized}"`);
      return normalized;
    }
    
    // If model already looks like a valid OpenRouter ID (contains /), use it
    if (modelName.includes('/')) {
      return modelName;
    }
    
    // Unknown model name - default to safe fallback
    console.warn(`⚠️ Unknown model name "${modelName}" for OpenRouter, using default: ${PROVIDER_CONFIGS[provider].defaultModel}`);
    return PROVIDER_CONFIGS[provider].defaultModel;
  }
  
  // For other providers, check if model exists in their models list
  const providerModels = PROVIDER_CONFIGS[provider].models;
  if (providerModels.includes(modelName)) {
    return modelName;
  }
  
  // Unknown model - use default
  console.warn(`⚠️ Unknown model name "${modelName}" for ${provider}, using default: ${PROVIDER_CONFIGS[provider].defaultModel}`);
  return PROVIDER_CONFIGS[provider].defaultModel;
}

const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  together: {
    baseURL: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3-8b-chat-hf',
    models: [
      'meta-llama/Llama-3-8b-chat-hf',
      'meta-llama/Llama-3-70b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
    ],
  },
  huggingface: {
    baseURL: 'https://api-inference.huggingface.co/v1',
    defaultModel: 'meta-llama/Llama-3-8b-chat-hf',
    models: ['meta-llama/Llama-3-8b-chat-hf'],
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  ollama: {
    baseURL: 'http://localhost:11434/v1', // Local Ollama instance
    defaultModel: 'llama3.2',
    models: [
      'llama3.2',
      'llama3.1',
      'mistral',
      'codellama',
      'phi3',
      'gemma2',
      'qwen2.5',
    ],
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat', // Safe default - works reliably
    models: [
      'meta-llama/llama-3.2-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-coder',
      'x-ai/grok-2',
      'mistralai/mixtral-8x7b-instruct',
      'mistralai/mistral-7b-instruct',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3-haiku',
      // Free models
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-2-2b-it:free',
    ],
  },
  perplexity: {
    baseURL: 'https://api.perplexity.ai',
    defaultModel: 'llama-3.1-sonar-small-128k-online',
    models: [
      'llama-3.1-sonar-small-128k-online',
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-huge-128k-online',
    ],
  },
  cohere: {
    baseURL: 'https://api.cohere.ai/v1',
    defaultModel: 'command-r-plus',
    models: [
      'command-r-plus',
      'command-r',
      'command',
      'command-light',
    ],
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-haiku-20240307',
    models: [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
    ],
  },
};

// Detect provider from API key format or explicit provider
function detectProvider(apiKey: string, explicitProvider?: string): Provider {
  if (explicitProvider && ['openai', 'groq', 'together', 'huggingface', 'deepseek', 'ollama', 'openrouter', 'perplexity', 'cohere', 'anthropic'].includes(explicitProvider)) {
    return explicitProvider as Provider;
  }
  
  // Detect by API key prefix
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('hf_')) return 'huggingface';
  if (apiKey.startsWith('sk-or-')) return 'openrouter'; // OpenRouter uses sk-or- prefix
  if (apiKey.startsWith('pplx-')) return 'perplexity'; // Perplexity uses pplx- prefix
  if (apiKey.startsWith('sk-ant-')) return 'anthropic'; // Anthropic uses sk-ant- prefix
  if (apiKey.startsWith('sk-') && apiKey.length > 50) {
    // Could be DeepSeek or OpenAI, check length/format
    return 'deepseek'; // Default to DeepSeek for sk- keys
  }
  if (apiKey.length > 50 && !apiKey.startsWith('sk-')) return 'together';
  
  // Default to OpenAI
  return 'openai';
}

// Get provider config and create client
function createClient(apiKey: string, provider: Provider, model?: string) {
  const config = PROVIDER_CONFIGS[provider];
  
  // Normalize model name - CRITICAL for OpenRouter to prevent invalid model errors
  const selectedModel = normalizeModelName(model, provider);
  
  // For Ollama, API key is not needed (uses localhost)
  // For other providers, API key is required
  const clientConfig: any = {
    baseURL: config.baseURL,
  };
  
  if (provider !== 'ollama') {
    clientConfig.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  }
  
  // OpenRouter requires special headers - MUST be set correctly
  if (provider === 'openrouter') {
    clientConfig.defaultHeaders = {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000',
      'X-Title': 'Open Idea - AI App Builder',
    };
  }
  
  return {
    client: new OpenAI(clientConfig),
    model: selectedModel,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let provider: Provider = 'groq'; // Default to Groq (fastest, free tier available)
  let apiKey: string | undefined; // Declare outside try block for error handling
  let requestedModel: string | undefined; // Store requested model for error handling
  
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true, // Required for authorization check
        title: true,
        description: true,
        type: true,
        framework: true,
        config: true,
        questionnaireData: true,
        appType: true,
        targetAudience: true,
        designStyle: true,
        colorScheme: true,
        layoutStyle: true,
        requiredFeatures: true,
        brandName: true,
        tagline: true,
        keyPoints: true,
        files: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check authorization - handle null ownerId and type mismatches
    if (!project.ownerId) {
      console.error('Project has no ownerId:', {
        projectId: project.id,
        projectTitle: project.title,
      });
      return NextResponse.json(
        { 
          error: 'Project ownership not set',
          message: 'This project was created without an owner. Please contact support or recreate the project.'
        },
        { status: 403 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      console.error('Authorization failed:', {
        projectId: project.id,
        projectOwnerId: project.ownerId,
        projectOwnerIdType: typeof project.ownerId,
        currentUserId: prismaUser.id,
        currentUserIdType: typeof prismaUser.id,
        idsMatch: project.ownerId === prismaUser.id,
        idsEqual: String(project.ownerId) === String(prismaUser.id),
        supabaseUserId: user.id,
      });
      return NextResponse.json(
        { 
          error: 'Not authorized',
          message: 'You do not have permission to access this project. Please ensure you are signed in with the correct account.',
          debug: process.env.NODE_ENV === 'development' ? {
            projectOwnerId: project.ownerId,
            currentUserId: prismaUser.id,
          } : undefined
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    let { 
      message, 
      apiKey: userApiKey, 
      model: userModel, 
      provider: userProvider,
      currentFile 
    } = body;
    
    // Store userModel for error handling (before it might be overwritten)
    requestedModel = userModel; // Assign to outer scope variable

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Auto-enhance simple website creation requests with professional prompt
    const questionnaireData = project.questionnaireData as any;
    const lowerMessage = message.toLowerCase().trim();
    const websiteCreationKeywords = [
      'create website', 'build website', 'make website', 'generate website',
      'create app', 'build app', 'make app', 'generate app',
      'create site', 'build site', 'make site',
      'create a website', 'build a website', 'make a website',
      'create an app', 'build an app', 'make an app',
      'start building', 'start creating', 'generate the app', 'generate the website'
    ];
    
    const isWebsiteCreationRequest = websiteCreationKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // If user asks to create website/app, enhance the prompt with professional requirements
    if (isWebsiteCreationRequest) {
      const designStyle = questionnaireData?.designStyle || project.designStyle || 'creative';
      const colorScheme = questionnaireData?.colorScheme || project.colorScheme || 'purple';
      const layoutStyle = questionnaireData?.layoutStyle || project.layoutStyle || 'multi-page';
      const targetAudience = questionnaireData?.targetAudience || project.targetAudience || 'general';
      const brandName = questionnaireData?.brandName || project.brandName || project.title || 'Your Brand';
      const tagline = questionnaireData?.tagline || project.tagline || 'Your tagline';
      const keyPoints = questionnaireData?.keyPoints || project.keyPoints || 'Your key points';
      const requiredSections = questionnaireData?.requiredSections || ['hero', 'features', 'about', 'testimonials', 'pricing', 'contact'];
      const specialFeatures = questionnaireData?.specialFeatures || ['responsive-design', 'modern-ui', 'animations'];

      // Build comprehensive internal prompt with Lovable/Cursor-quality standards
      const colorPalette = colorScheme === 'purple' 
        ? { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#EC4899', bg: '#F5F3FF', text: '#4C1D95' }
        : colorScheme === 'blue'
        ? { primary: '#3B82F6', secondary: '#2563EB', accent: '#10B981', bg: '#F8FAFC', text: '#0F172A' }
        : colorScheme === 'orange-red'
        ? { primary: '#F97316', secondary: '#EF4444', accent: '#F59E0B', bg: '#FFF7ED', text: '#1C1917' }
        : colorScheme === 'green-teal'
        ? { primary: '#10B981', secondary: '#14B8A6', accent: '#06B6D4', bg: '#ECFDF5', text: '#064E3B' }
        : { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#EC4899', bg: '#F5F3FF', text: '#4C1D95' };

      message = `You are building a production-ready, market-grade ${project.appType || 'web'} application that MUST match the quality of Lovable.dev, Cursor, Stripe, Linear, Vercel, and Notion. This is NOT a template - it's a professional SaaS product.

**BRAND & CONTENT:**
- Brand Name: ${brandName}
- Tagline: ${tagline}
- Key Points: ${keyPoints}
- Target Audience: ${targetAudience}

**DESIGN SYSTEM (STRICT REQUIREMENTS):**
- Design Style: ${designStyle}
- Color Scheme: ${colorScheme}
  * Primary: ${colorPalette.primary}
  * Secondary: ${colorPalette.secondary}
  * Accent: ${colorPalette.accent}
  * Background: ${colorPalette.bg}
  * Text: ${colorPalette.text}
- Layout: ${layoutStyle}

**REQUIRED SECTIONS (CREATE ALL AS SEPARATE COMPONENTS):**
${requiredSections.map((s: string) => `- ${s.charAt(0).toUpperCase() + s.slice(1)}`).join('\n')}

**SPECIAL FEATURES (IMPLEMENT ALL):**
${specialFeatures.map((f: string) => `- ${f.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`).join('\n')}

**🚨 QUALITY STANDARD: LOVABLE/CURSOR LEVEL (NON-NEGOTIABLE) 🚨**

Your output MUST be indistinguishable from:
- Lovable.dev (lovable.dev) - Modern, polished, professional
- Cursor (cursor.com) - Clean, sophisticated, developer-focused
- Stripe (stripe.com) - Perfect spacing, typography, interactions
- Linear (linear.app) - Modern gradients, smooth animations
- Vercel (vercel.com) - Professional design system
- Notion (notion.so) - Clean, elegant, polished

**VISUAL QUALITY REQUIREMENTS (MANDATORY):**

1. **Hero Section (if included):**
   - Large, bold typography: text-6xl md:text-8xl font-bold with gradient text
   - Gradient text effect: bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.accent}] bg-clip-text text-transparent
   - Subtle background: bg-gradient-to-br from-[${colorPalette.bg}] via-white to-[${colorPalette.bg}]
   - CTA buttons: rounded-full px-8 py-4 bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.secondary}] text-white font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300
   - Animated elements: fade-in, slide-up animations using CSS transforms
   - Example structure:
     \`\`\`jsx
     <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[${colorPalette.bg}] via-white to-[${colorPalette.bg}]">
       <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
       <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
         <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.accent}] bg-clip-text text-transparent">
           ${brandName}
         </h1>
         <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl">${tagline}</p>
         <button className="rounded-full px-8 py-4 bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.secondary}] text-white font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
           Get Started
         </button>
       </div>
     </section>
     \`\`\`

2. **Feature Cards (if included):**
   - Modern card design: rounded-2xl p-8 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2
   - Icon containers: w-16 h-16 rounded-xl bg-gradient-to-br from-[${colorPalette.primary}] to-[${colorPalette.secondary}] flex items-center justify-center mb-4
   - Typography: text-2xl font-bold mb-3 text-gray-900, text-gray-600 for descriptions
   - Grid layout: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
   - Example:
     \`\`\`jsx
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
       {features.map((feature, idx) => (
         <div key={idx} className="rounded-2xl p-8 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
           <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[${colorPalette.primary}] to-[${colorPalette.secondary}] flex items-center justify-center mb-4">
             <FeatureIcon className="w-8 h-8 text-white" />
           </div>
           <h3 className="text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
           <p className="text-gray-600">{feature.description}</p>
         </div>
       ))}
     </div>
     \`\`\`

3. **Testimonials (if included):**
   - Professional card: rounded-2xl p-8 bg-gradient-to-br from-white to-[${colorPalette.bg}] shadow-xl border border-gray-100
   - Avatar: w-16 h-16 rounded-full ring-4 ring-[${colorPalette.primary}] ring-opacity-20
   - Quote styling: text-lg italic text-gray-700 before:content-['"'] after:content-['"']
   - Author info: font-semibold text-gray-900, text-sm text-gray-500
   - Carousel/slider with smooth transitions

4. **Pricing Tables (if included):**
   - Card design: rounded-2xl p-8 bg-white shadow-xl border-2 border-gray-100 hover:border-[${colorPalette.primary}] transition-all duration-300
   - Featured plan: border-[${colorPalette.primary}] ring-4 ring-[${colorPalette.primary}] ring-opacity-20 scale-105
   - Price display: text-5xl font-bold bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.secondary}] bg-clip-text text-transparent
   - Feature list: space-y-4 with checkmark icons
   - CTA button: w-full rounded-xl py-4 font-semibold transition-all duration-300

5. **Contact Forms (if included):**
   - Modern inputs: rounded-xl border-2 border-gray-200 focus:border-[${colorPalette.primary}] focus:ring-4 focus:ring-[${colorPalette.primary}] focus:ring-opacity-20 px-4 py-3 transition-all duration-300
   - Labels: text-sm font-semibold text-gray-700 mb-2
   - Submit button: rounded-xl bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.secondary}] text-white font-semibold py-4 px-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300
   - Form validation states: error borders, success states

6. **Navigation (MANDATORY):**
   - Sticky header: fixed top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm
   - Logo: text-2xl font-bold bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.secondary}] bg-clip-text text-transparent
   - Nav links: text-gray-700 hover:text-[${colorPalette.primary}] transition-colors duration-200 font-medium
   - Mobile menu: hamburger icon, slide-in menu with backdrop
   - Active state: text-[${colorPalette.primary}] font-semibold border-b-2 border-[${colorPalette.primary}]

7. **Footer (MANDATORY):**
   - Multi-column layout: grid grid-cols-2 md:grid-cols-4 gap-8
   - Links: text-gray-600 hover:text-[${colorPalette.primary}] transition-colors
   - Social icons: w-10 h-10 rounded-full bg-gray-100 hover:bg-[${colorPalette.primary}] hover:text-white transition-all duration-300
   - Copyright: text-center text-gray-500 pt-8 border-t border-gray-200

**CODE ARCHITECTURE REQUIREMENTS:**

1. **Component Structure:**
   \`\`\`
   src/
   ├── components/
   │   ├── layout/
   │   │   ├── Navigation.jsx
   │   │   └── Footer.jsx
   │   ├── sections/
   │   │   ├── Hero.jsx
   │   │   ├── Features.jsx
   │   │   ├── Testimonials.jsx
   │   │   ├── Pricing.jsx
   │   │   └── Contact.jsx
   │   └── common/
   │       ├── Button.jsx
   │       └── Card.jsx
   ├── App.jsx
   └── index.js
   \`\`\`

2. **Component Best Practices:**
   - Functional components ONLY (NO class components)
   - Use React Hooks (useState, useEffect) appropriately
   - Extract reusable components (Button, Card, Input)
   - Props destructuring: const Component = ({ title, description, ...props }) => {}
   - Conditional rendering: {condition && <Component />} or {condition ? <A /> : <B />}
   - Map for lists: {items.map((item, idx) => <Item key={idx} {...item} />)}

3. **Styling Requirements:**
   - Use Tailwind CSS classes ONLY (NO inline styles, NO separate CSS files)
   - Use Tailwind's color system: from-[${colorPalette.primary}], to-[${colorPalette.secondary}]
   - Responsive classes: sm:, md:, lg:, xl: breakpoints
   - Hover states: hover:shadow-xl, hover:scale-105, hover:text-[${colorPalette.primary}]
   - Transitions: transition-all duration-300 ease-in-out
   - Dark mode support (optional): dark: classes

4. **Routing (if multi-page):**
   - Install: npm install react-router-dom
   - Structure:
     \`\`\`jsx
     import { BrowserRouter, Routes, Route } from 'react-router-dom';
     
     function App() {
       return (
         <BrowserRouter>
           <Navigation />
           <Routes>
             <Route path="/" element={<Home />} />
             <Route path="/about" element={<About />} />
             <Route path="/contact" element={<Contact />} />
           </Routes>
           <Footer />
         </BrowserRouter>
       );
     }
     \`\`\`

**RESPONSIVE DESIGN (MANDATORY):**
- Mobile-first: Base styles for mobile (320px+), then md: (768px+), lg: (1024px+), xl: (1280px+)
- Typography scaling: text-4xl md:text-6xl lg:text-8xl
- Grid responsiveness: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Padding: p-4 md:p-8 lg:p-12
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- NO horizontal overflow at ANY viewport size

**ANIMATIONS & INTERACTIONS:**
- Smooth transitions: transition-all duration-300 ease-in-out
- Hover effects: hover:scale-105, hover:shadow-xl, hover:-translate-y-2
- Fade-in animations: opacity-0 animate-fade-in (use CSS keyframes or Tailwind animate)
- Scroll animations: Use Intersection Observer or CSS scroll-timeline
- Loading states: Skeleton loaders or spinners
- Button feedback: active:scale-95

**CONTENT QUALITY:**
- NO "Lorem ipsum" - Use real, meaningful content related to ${brandName}
- NO placeholder text - Every text should be relevant and professional
- NO markdown in JSX - Use proper HTML/JSX elements
- NO chatty explanations - Just clean, professional code
- Realistic data: Use arrays of objects with proper structure

**FAILURE CONDITIONS (AUTO-REJECT):**
❌ Generic template-looking design
❌ Missing components or incomplete sections
❌ Poor code quality (console.logs, inline styles, magic numbers)
❌ Broken responsiveness (horizontal scroll, poor mobile experience)
❌ No animations or interactions (static, boring UI)
❌ Placeholder content ("Lorem ipsum", "Sample text")
❌ Missing routing (if multi-page layout)
❌ Inconsistent design system (different button styles, spacing)

**FILE GENERATION FORMAT:**
- Generate ALL files in ONE response
- Use exact format: \`\`\`file:src/components/sections/Hero.jsx\`\`\`
- Include ALL required sections as separate components
- MUST include: App.jsx (with routing if multi-page), index.js, Navigation.jsx, Footer.jsx
- Each component must be complete, functional, and production-ready

**EXAMPLE COMPONENT STRUCTURE:**
\`\`\`jsx
// src/components/sections/Hero.jsx
import React from 'react';

const Hero = ({ brandName, tagline }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[${colorPalette.bg}] via-white to-[${colorPalette.bg}]">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
        <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.accent}] bg-clip-text text-transparent">
          {brandName}
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {tagline}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="rounded-full px-8 py-4 bg-gradient-to-r from-[${colorPalette.primary}] to-[${colorPalette.secondary}] text-white font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            Get Started
          </button>
          <button className="rounded-full px-8 py-4 bg-white text-[${colorPalette.primary}] font-semibold border-2 border-[${colorPalette.primary}] hover:bg-[${colorPalette.primary}] hover:text-white transition-all duration-300">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
\`\`\`

🚨 START GENERATING NOW - Create a complete, beautiful, market-grade application matching Lovable.dev quality with ALL files in ONE response! 🚨`;
      
      console.log('✨ Auto-enhanced simple request with comprehensive professional prompt');
      console.log('📝 Original message:', message.substring(0, 100) + '...');
      console.log('📝 Enhanced message length:', message.length);
      console.log('🎨 Design:', designStyle, '| Colors:', colorScheme, '| Layout:', layoutStyle);
    }

    // Initialize load balancer
    const loadBalancer = getLoadBalancer();
    
    // Use user-provided API key or fall back to environment variable
    // Priority: user-provided key > .env GROQ_API_KEY (fastest) > .env OPENROUTER_API_KEY > .env DEEPSEEK_API_KEY > .env OPENAI_API_KEY
    apiKey = userApiKey || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    
    // Use load balancer to get best provider with fallback
    // Detect provider: explicit > from API key format > load balancer > defaults
    let detectedProvider: Provider;
    if (userProvider) {
      detectedProvider = detectProvider('', userProvider);
      console.log('📡 Using user-provided provider:', detectedProvider);
      // Use load balancer to verify provider has capacity
      const bestProvider = loadBalancer.getBestProvider(detectedProvider, userApiKey || apiKey);
      if (bestProvider && bestProvider !== detectedProvider) {
        console.log('🔄 Load balancer switched provider:', detectedProvider, '->', bestProvider);
        detectedProvider = bestProvider;
      }
    } else if (userApiKey) {
      detectedProvider = detectProvider(userApiKey);
      console.log('🔑 Detected provider from API key:', detectedProvider);
      // Use load balancer to get best available
      const bestProvider = loadBalancer.getBestProvider(detectedProvider, userApiKey);
      if (bestProvider && bestProvider !== detectedProvider) {
        detectedProvider = bestProvider;
      }
    } else {
      // Default to Groq (fastest) if API key is available, otherwise use load balancer
      if (process.env.GROQ_API_KEY || apiKey) {
        detectedProvider = 'groq';
        console.log('⚡ Defaulting to Groq (fastest, API key available)');
      } else if (process.env.OPENROUTER_API_KEY) {
        detectedProvider = 'openrouter';
        console.log('🌐 Defaulting to OpenRouter (API key available)');
      } else {
        detectedProvider = getProviderWithFallback(userProvider, apiKey);
        console.log('⚖️ Using load balancer fallback:', detectedProvider);
      }
    }
    
    provider = detectedProvider;
    console.log('✅ Final provider:', provider, '| Model:', userModel || 'default', '| Has API key:', !!apiKey);
    
    // Update load balancer with API key if provided
    if (userApiKey) {
      loadBalancer.setProviderApiKey(provider, userApiKey);
    } else if (apiKey) {
      loadBalancer.setProviderApiKey(provider, apiKey);
    }

    // Ollama doesn't need API key (uses localhost)
    if (!apiKey && provider !== 'ollama') {
      return NextResponse.json({
        response: `I'm your AI Code Assistant! To enable AI-powered code generation, please configure your API key.\n\n**🆓 TOP 5 FREE OPEN SOURCE OPTIONS:**\n\n1. **Ollama (100% FREE - Runs Locally)**\n   - Install: https://ollama.ai/\n   - Completely free, runs on your computer\n   - No API key needed (uses localhost)\n   - Best for privacy and unlimited usage\n\n2. **OpenRouter (FREE Models Available)**\n   - Get API key: https://openrouter.ai/keys\n   - Access to multiple free models\n   - Free tier with good limits\n   - Aggregates best open source models\n\n3. **Groq (FREE & Fast)**\n   - Get API key: https://console.groq.com/keys\n   - Free tier with high limits\n   - Very fast responses\n\n4. **DeepSeek (FREE - Great for Code)**\n   - Get API key: https://platform.deepseek.com/api_keys\n   - Free tier available\n   - Excellent for code generation\n\n5. **Together AI (FREE)**\n   - Get API key: https://api.together.xyz/\n   - Free tier available\n   - Multiple open source models\n\n**OTHER FREE OPTIONS:**\n- **Hugging Face**: https://huggingface.co/settings/tokens\n- **Perplexity**: https://www.perplexity.ai/settings/api\n- **Cohere**: https://dashboard.cohere.com/api-keys\n\n**Setup:**\n- Add API key in chat settings (⚙️ icon)\n- Or add GROQ_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY to your .env file\n- For Ollama: Install locally, no API key needed!\n\n**Recommended:** Start with Ollama (100% free, local) or OpenRouter (multiple free models)!`,
        suggestions: [],
      });
    }
    
    // For Ollama, use empty API key (it uses localhost)
    const finalApiKey = provider === 'ollama' ? 'ollama' : (apiKey || '');

    const { client, model } = createClient(finalApiKey, provider, userModel);
    
    // Store model for error handling
    const attemptedModel = model;

    // Build project context for the AI
    let projectContext = `=== PROJECT CONTEXT ===\n`;
    projectContext += `Project: ${project.title}\n`;
    projectContext += `Type: ${project.type}\n`;
    if (project.framework) {
      projectContext += `Framework: ${project.framework}\n`;
    }
    
    // Add questionnaire context if available
    if (questionnaireData) {
      projectContext += `\n=== USER REQUIREMENTS (from questionnaire) ===\n`;
      projectContext += `App Type: ${questionnaireData.appType || project.appType || 'web'}\n`;
      projectContext += `Main Purpose: ${questionnaireData.mainPurpose || 'Not specified'}\n`;
      projectContext += `Target Audience: ${questionnaireData.targetAudience || project.targetAudience || 'General public'}\n`;
      projectContext += `Technical Level: ${questionnaireData.technicalLevel || 'Not specified'}\n`;
      projectContext += `Design Style: ${questionnaireData.designStyle || project.designStyle || 'Modern'}\n`;
      projectContext += `Color Scheme: ${questionnaireData.colorScheme || project.colorScheme || 'Auto'}\n`;
      projectContext += `Layout Style: ${questionnaireData.layoutStyle || project.layoutStyle || 'Single page'}\n`;
      if (questionnaireData.requiredSections && questionnaireData.requiredSections.length > 0) {
        projectContext += `Required Sections: ${questionnaireData.requiredSections.join(', ')}\n`;
      }
      if (questionnaireData.specialFeatures && questionnaireData.specialFeatures.length > 0) {
        projectContext += `Special Features: ${questionnaireData.specialFeatures.join(', ')}\n`;
      }
      if (questionnaireData.brandName || project.brandName) {
        projectContext += `Brand Name: ${questionnaireData.brandName || project.brandName}\n`;
      }
      if (questionnaireData.tagline || project.tagline) {
        projectContext += `Tagline: ${questionnaireData.tagline || project.tagline}\n`;
      }
      if (questionnaireData.keyPoints || project.keyPoints) {
        projectContext += `Key Points: ${questionnaireData.keyPoints || project.keyPoints}\n`;
      }
      projectContext += `\n`;
    }
    
    projectContext += `\n=== PROJECT FILES ===\n`;

    project.files.forEach((file) => {
      projectContext += `\n[File: ${file.path}]\n`;
      projectContext += `Language: ${file.language || 'unknown'}\n`;
      if (file.isMain) {
        projectContext += `Main Entry File: Yes\n`;
      }
      projectContext += `Content:\n${file.content}\n`;
      projectContext += `---\n`;
    });

    // Build enhanced system prompt with quality guidelines
    const designStyle = questionnaireData?.designStyle || project.designStyle || 'modern-minimal';
    const colorScheme = questionnaireData?.colorScheme || project.colorScheme || 'auto';
    const targetAudience = questionnaireData?.targetAudience || project.targetAudience || 'general';
    
    let systemPrompt = `You are an expert AI code assistant specializing in ${project.framework || project.type} development. Your role is to help users build high-quality, professional applications through natural conversation.

${projectContext}

${questionnaireData ? `
🚨 CRITICAL REMINDER: USER HAS COMPLETED A DETAILED QUESTIONNAIRE 🚨
The user has already provided ALL requirements through a questionnaire. DO NOT ask them questions - USE the questionnaire data immediately!

When the user asks to:
- "Create an app"
- "Build my app"  
- "Generate the app"
- "Start building"
- Or any similar request

YOU MUST IMMEDIATELY:
1. Use ALL questionnaire answers to build the complete app
2. Create ALL required sections/components
3. Apply the exact design style, colors, and layout specified
4. Include ALL special features requested
5. Use the brand name, tagline, and key points provided
6. Build it for the target audience specified

DO NOT ask follow-up questions - the questionnaire has ALL the information you need!
` : ''}

=== PROFESSIONAL MARKET-GRADE QUALITY STANDARDS (LOVABLE-STYLE) ===

**CRITICAL: Generate production-ready, market-grade websites that look professional and polished, not basic templates.**

1. **Modern Design System:**
   - Use professional color palettes with proper gradients and shadows
   - Implement glassmorphism, subtle backdrop blur effects where appropriate
   - Use modern typography hierarchy (headings: 2.5rem-4rem, body: 1rem-1.125rem)
   - Apply consistent border-radius (8px-16px for cards, 24px-32px for buttons)
   - Use professional shadows: box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
   - Implement hover effects and micro-interactions
   - Use gradient backgrounds and modern color schemes

2. **Professional Component Structure:**
   - Create reusable, well-structured components
   - Use proper component composition and separation of concerns
   - Implement proper prop types and component interfaces
   - Add loading states, error boundaries, and empty states
   - Use modern React patterns (custom hooks, context when needed)

3. **Visual Hierarchy & Layout:**
   - Use proper spacing: 16px, 24px, 32px, 48px, 64px, 96px (consistent scale)
   - Implement proper max-width containers (1200px-1400px for content)
   - Use grid and flexbox for professional layouts
   - Add proper section padding (py-16 to py-24)
   - Implement proper content width constraints

4. **Professional Styling:**
   - Use Tailwind CSS classes for modern styling
   - Apply gradient text effects: bg-gradient-to-r from-color1 to-color2 bg-clip-text text-transparent
   - Use professional button styles with hover states
   - Implement card designs with proper shadows and borders
   - Add smooth transitions: transition-all duration-300 ease-in-out
   - Use backdrop-blur for modern glass effects

5. **Hero Sections:**
   - Create impressive hero sections with gradients
   - Use large, bold typography (text-5xl to text-7xl)
   - Add call-to-action buttons with proper styling
   - Include subtle animations (fade-in, slide-up)
   - Use professional background patterns or gradients

6. **Content Sections:**
   - Design professional feature sections with icons
   - Create testimonial cards with proper styling
   - Implement pricing tables with hover effects
   - Design contact forms with modern input styling
   - Add proper section dividers and spacing

7. **Responsive Design:**
   - Mobile-first approach (sm:, md:, lg:, xl: breakpoints)
   - Proper responsive typography scaling
   - Responsive grid layouts
   - Mobile-friendly navigation (hamburger menu if needed)
   - Touch-friendly button sizes (min 44x44px)

8. **Modern UI Patterns:**
   - Use cards with hover effects and shadows
   - Implement smooth scroll animations
   - Add professional navigation bars
   - Use modern form inputs with focus states
   - Create professional footer designs

9. **Color & Typography:**
   - Use professional color palettes (not just basic colors)
   - Implement proper text contrast (WCAG AA minimum)
   - Use modern font weights (400, 500, 600, 700)
   - Apply proper line-height (1.5-1.75 for body, 1.2-1.3 for headings)
   - Use proper letter-spacing for headings

10. **Performance & Best Practices:**
    - Optimize images (use proper sizing, lazy loading)
    - Minimize re-renders with proper React patterns
    - Use CSS variables for theming
    - Implement proper semantic HTML
    - Add proper meta tags and accessibility attributes

=== PROFESSIONAL DESIGN REQUIREMENTS (MARKET-GRADE) ===
${questionnaireData ? `
**Design Style: ${designStyle}**

${designStyle === 'modern-minimal' ? `
→ **Modern Minimal Design:**
- Clean, sophisticated design with generous whitespace
- Subtle shadows and soft borders (border-gray-200, shadow-lg)
- Professional typography with clear hierarchy
- Minimal color palette (1-2 primary colors + neutrals)
- Modern card designs with rounded corners (rounded-xl, rounded-2xl)
- Subtle hover effects and transitions
- Professional gradients for accents
- Example colors: Slate/Gray palette with one accent color (blue/emerald/purple)
` : ''}

${designStyle === 'bold-colorful' ? `
→ **Bold & Colorful Design:**
- Vibrant, energetic color schemes with gradients
- Bold typography (large headings, strong weights)
- Eye-catching elements with proper contrast
- Dynamic layouts with creative spacing
- Colorful buttons and CTAs with hover effects
- Modern gradient backgrounds
- Example colors: Bright blues, purples, oranges with gradients
` : ''}

${designStyle === 'professional' ? `
→ **Professional Corporate Design:**
- Trustworthy, formal color schemes
- Structured, grid-based layouts
- Professional typography (serif or clean sans-serif)
- Corporate color palette (blues, grays, whites)
- Professional button styles and form inputs
- Clean, organized sections
- Example colors: Navy blue (#1e3a8a), slate gray (#475569), white
` : ''}

${designStyle === 'creative' ? `
→ **Creative & Unique Design:**
- Unique, expressive layouts
- Creative use of colors and gradients
- Artistic elements and custom graphics
- Innovative UI patterns
- Asymmetric layouts where appropriate
- Creative typography choices
- Example colors: Purple (#8b5cf6), pink (#ec4899), teal (#14b8a6)
` : ''}

${designStyle === 'clean-simple' ? `
→ **Clean & Simple Design:**
- Minimal, uncluttered layouts
- Elegant typography
- Clean aesthetics with proper spacing
- Simple color palette
- Focus on content and readability
- Subtle design elements
- Example colors: Neutral grays with one accent color
` : ''}

**Color Scheme: ${colorScheme}**

${colorScheme === 'blue' ? `
→ **Professional Blue Palette:**
- Primary: #3B82F6 (blue-500), #2563EB (blue-600)
- Secondary: #60A5FA (blue-400), #1E40AF (blue-800)
- Accent: #10B981 (emerald-500) for CTAs
- Background: #F8FAFC (slate-50), #FFFFFF (white)
- Text: #0F172A (slate-900), #475569 (slate-600)
- Use gradients: bg-gradient-to-r from-blue-500 to-blue-600
` : ''}

${colorScheme === 'orange-red' ? `
→ **Energetic Orange/Red Palette:**
- Primary: #F97316 (orange-500), #EF4444 (red-500)
- Secondary: #FB923C (orange-400), #DC2626 (red-600)
- Accent: #F59E0B (amber-500)
- Background: #FFF7ED (orange-50), #FFFFFF (white)
- Text: #1C1917 (stone-900), #78716C (stone-600)
- Use gradients: bg-gradient-to-r from-orange-500 to-red-500
` : ''}

${colorScheme === 'green-teal' ? `
→ **Calm Green/Teal Palette:**
- Primary: #10B981 (emerald-500), #14B8A6 (teal-500)
- Secondary: #34D399 (emerald-400), #2DD4BF (teal-400)
- Accent: #06B6D4 (cyan-500)
- Background: #ECFDF5 (emerald-50), #FFFFFF (white)
- Text: #064E3B (emerald-900), #047857 (emerald-700)
- Use gradients: bg-gradient-to-r from-emerald-500 to-teal-500
` : ''}

${colorScheme === 'purple' ? `
→ **Elegant Purple Palette:**
- Primary: #8B5CF6 (violet-500), #7C3AED (violet-600)
- Secondary: #A78BFA (violet-400), #6D28D9 (violet-700)
- Accent: #EC4899 (pink-500)
- Background: #F5F3FF (violet-50), #FFFFFF (white)
- Text: #4C1D95 (violet-900), #6B21A8 (violet-800)
- Use gradients: bg-gradient-to-r from-violet-500 to-purple-600
` : ''}

${colorScheme === 'gray-black' ? `
→ **Neutral Gray/Black Palette:**
- Primary: #1F2937 (gray-800), #111827 (gray-900)
- Secondary: #374151 (gray-700), #4B5563 (gray-600)
- Accent: #3B82F6 (blue-500) or #10B981 (emerald-500) for highlights
- Background: #F9FAFB (gray-50), #FFFFFF (white)
- Text: #111827 (gray-900), #6B7280 (gray-500)
- Use gradients: bg-gradient-to-r from-gray-800 to-gray-900
` : ''}

${colorScheme === 'auto' ? `
→ **Auto Color Scheme (Choose Based on Design Style):**
- For modern-minimal: Blue or Gray palette
- For bold-colorful: Purple/Pink or Orange/Red gradients
- For professional: Blue or Gray/Black
- For creative: Purple/Pink/Teal combination
- For clean-simple: Gray with one accent color
` : ''}

**Target Audience: ${targetAudience}**

${targetAudience === 'general' ? `
→ Design for general public:
- Clear, intuitive navigation
- Accessible design (WCAG AA)
- User-friendly interface
- Clear call-to-actions
- Professional but approachable
` : ''}

${targetAudience === 'b2b' ? `
→ Design for businesses:
- Professional, trustworthy appearance
- Feature-rich sections
- Professional testimonials/case studies
- Clear value propositions
- Corporate color schemes
- Professional typography
` : ''}

${targetAudience === 'b2c' ? `
→ Design for consumers:
- Engaging, conversion-focused
- Eye-catching hero sections
- Social proof (testimonials, reviews)
- Clear pricing and benefits
- User-friendly forms
- Mobile-optimized
` : ''}

${targetAudience === 'developers' ? `
→ Design for technical users:
- Functional, efficient layouts
- Code examples or technical content
- Developer-friendly navigation
- Dark mode option (if applicable)
- Technical documentation style
- Clean, code-focused design
` : ''}

${targetAudience === 'students' ? `
→ Design for students:
- Educational, clear layouts
- Easy to understand
- Engaging visuals
- Simple navigation
- Learning-focused content
- Friendly, approachable design
` : ''}
` : 'Use modern, professional design with appropriate color schemes and layouts'}

Layout Style: ${questionnaireData?.layoutStyle || project.layoutStyle || 'single-page'}
- ${questionnaireData?.layoutStyle === 'single-page' ? 'Create a single-page scrollable layout with smooth scroll navigation' : ''}
- ${questionnaireData?.layoutStyle === 'multi-page' ? 'Create multi-page navigation with proper routing structure' : ''}
- ${questionnaireData?.layoutStyle === 'dashboard' ? 'Create a dashboard/app layout with sidebar navigation' : ''}
- ${questionnaireData?.layoutStyle === 'blog' ? 'Create a content-focused blog layout' : ''}
- ${questionnaireData?.layoutStyle === 'landing' ? 'Create a focused landing page layout' : ''}

=== YOUR CAPABILITIES ===
- Generate, modify, and explain code
- Create new files or update existing ones
- Provide code suggestions and best practices
- Debug and fix code issues
- Answer questions about the codebase
- Suggest improvements and optimizations
- Add images and graphics to components
- Create image galleries and carousels
- Generate SVG icons and graphics

=== CRITICAL: QUESTIONNAIRE REQUIREMENTS ===
${questionnaireData ? `
🚨🚨🚨 CRITICAL: USER HAS COMPLETED QUESTIONNAIRE - USE THIS DATA IMMEDIATELY 🚨🚨🚨

The user has ALREADY answered ALL questions. When they ask to "create", "build", or "generate" - IMMEDIATELY build the complete app using ALL questionnaire data. DO NOT ask questions!

**MANDATORY REQUIREMENTS:**

1. **Design Style**: ${designStyle}
   ${designStyle === 'modern-minimal' ? '→ Clean, minimal, lots of whitespace, subtle shadows' : ''}
   ${designStyle === 'bold-colorful' ? '→ Vibrant, bold colors, eye-catching elements' : ''}
   ${designStyle === 'professional' ? '→ Formal, corporate colors, structured layouts' : ''}
   ${designStyle === 'creative' ? '→ Unique, expressive, creative layouts' : ''}
   ${designStyle === 'clean-simple' ? '→ Minimal, uncluttered, elegant typography' : ''}

2. **Color Scheme**: ${colorScheme}
   ${colorScheme === 'blue' ? '→ PRIMARY: #3B82F6, #2563EB' : ''}
   ${colorScheme === 'orange-red' ? '→ PRIMARY: #F97316, #EF4444' : ''}
   ${colorScheme === 'green-teal' ? '→ PRIMARY: #10B981, #14B8A6' : ''}
   ${colorScheme === 'purple' ? '→ PRIMARY: #8B5CF6, #7C3AED' : ''}
   ${colorScheme === 'gray-black' ? '→ Neutral grays/blacks with accents' : ''}
   ${colorScheme === 'auto' ? '→ Choose colors matching design style' : ''}

3. **Layout**: ${questionnaireData.layoutStyle || project.layoutStyle || 'single-page'}
   ${questionnaireData.layoutStyle === 'single-page' ? '→ Single scrollable page' : ''}
   ${questionnaireData.layoutStyle === 'multi-page' ? '→ Multiple pages with nav' : ''}
   ${questionnaireData.layoutStyle === 'dashboard' ? '→ Dashboard with sidebar' : ''}
   ${questionnaireData.layoutStyle === 'blog' ? '→ Blog layout' : ''}
   ${questionnaireData.layoutStyle === 'landing' ? '→ Landing page' : ''}

4. **Sections**: ${questionnaireData.requiredSections?.length > 0 ? questionnaireData.requiredSections.join(', ') : 'None'}
   → CREATE ALL of these sections/components

5. **Features**: ${questionnaireData.specialFeatures?.length > 0 ? questionnaireData.specialFeatures.join(', ') : 'None'}
   → IMPLEMENT ALL of these features

6. **Brand**: "${questionnaireData.brandName || project.brandName || 'Not specified'}"
7. **Tagline**: "${questionnaireData.tagline || project.tagline || 'Not specified'}"
8. **Key Points**: "${questionnaireData.keyPoints || project.keyPoints || 'Not specified'}"
9. **Audience**: ${targetAudience}

**WHEN USER SAYS "CREATE/BUILD/GENERATE":**
→ Build COMPLETE app immediately using ALL above requirements
→ Create ALL sections/components in one response
→ Use exact colors, design style, layout
→ Include ALL features
→ DO NOT ask questions - questionnaire has everything!

**NEVER:**
❌ Ask about design/colors/features (already answered!)
❌ Create generic templates
❌ Skip sections or features
❌ Use wrong colors/style
` : ''}

=== QUALITY BAR (NON-NEGOTIABLE) ===

**🚨🚨🚨 CRITICAL: The website MUST look like a real, modern SaaS product 🚨🚨🚨**

**THIS IS NON-NEGOTIABLE. IF THE OUTPUT DOES NOT MEET THESE STANDARDS, IT IS A FAILURE.**

**VISUAL QUALITY STANDARDS (MANDATORY):**

1. **Reference Quality:**
   - Visual quality MUST be comparable to Stripe (stripe.com), Linear (linear.app), Vercel (vercel.com), or Notion (notion.so)
   - Study these sites: Notice their spacing, typography, color usage, component design
   - Your output should be indistinguishable from these in terms of visual polish
   - If a designer reviewed your output, they should say "This looks professional"

2. **Visual Polish:**
   - Every pixel must be intentional and polished
   - NO amateur UI, NO placeholder vibes, NO template-looking designs
   - Clean spacing, typography hierarchy, and layout balance
   - Professional color systems with proper contrast (WCAG AA minimum)
   - Modern, sophisticated design language
   - Consistent visual rhythm throughout the site

3. **Design Sophistication:**
   - Subtle gradients and shadows (not overdone)
   - Proper use of white space (generous but not excessive)
   - Visual hierarchy that guides the eye naturally
   - Professional color palettes (not garish or amateur)
   - Refined typography choices (system fonts or professional web fonts)

**DESIGN PRINCIPLES TO APPLY (MANDATORY):**

1. **Strong Visual Hierarchy (Hero → Features → Proof → CTA):**
   - Hero section: Large, bold headline (text-5xl to text-7xl), clear value proposition, prominent CTA
   - Features section: Clear feature cards with icons/titles/descriptions, proper grid layout
   - Social Proof: Testimonials, logos, stats - builds trust
   - CTA section: Final conversion point, clear and prominent
   - Clear information architecture throughout
   - Proper content prioritization (most important content first)
   - Visual weight distribution (larger = more important)

2. **Consistent Color System (MANDATORY):**
   - Use CSS variables or Tailwind config for colors (DO NOT hardcode colors)
   - Define: Primary, secondary, accent, neutral colors
   - Proper contrast ratios: WCAG AA minimum (4.5:1 for text, 3:1 for UI)
   - Consistent color usage across ALL components
   - Example structure:
     \`\`\`css
     :root {
       --color-primary: #8B5CF6;
       --color-secondary: #7C3AED;
       --color-accent: #EC4899;
       --color-neutral-50: #F9FAFB;
       --color-neutral-900: #111827;
     }
     \`\`\`

3. **Modern Typography (STRICT REQUIREMENTS):**
   - Font scale: 12px, 14px, 16px, 18px, 20px, 24px, 32px, 40px, 48px, 64px (use Tailwind: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-4xl, text-5xl, text-6xl, text-7xl)
   - Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold) - NO other weights
   - Line heights: 1.5-1.75 for body text, 1.2-1.3 for headings
   - Letter spacing: -0.02em to -0.03em for large headings (text-4xl+)
   - Font families: Use system fonts stack: font-sans (Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
   - NO custom font imports unless absolutely necessary

4. **Subtle Animations & Interactions (PERFORMANCE-FIRST):**
   - Smooth hover states on ALL interactive elements (buttons, cards, links)
   - Subtle fade-in animations on scroll (use Intersection Observer)
   - Micro-interactions: hover:scale-105, hover:shadow-lg transitions
   - Transition duration: 150ms-300ms ONLY (fast, snappy - NO slow animations)
   - Use transform and opacity ONLY (GPU-accelerated, performant)
   - NO jarring or distracting animations
   - NO animation on page load (only on scroll/hover)
   - Example: \`transition-all duration-300 ease-in-out hover:scale-105\`

5. **Responsive-First Design (MOBILE-FIRST APPROACH):**
   - Mobile: 320px-640px (single column, stacked, touch-friendly)
   - Tablet: 641px-1024px (2 columns max, adjusted spacing)
   - Desktop: 1025px+ (full layout, proper spacing, max-width containers)
   - Test at ALL breakpoints: 320px, 375px, 768px, 1024px, 1280px, 1920px
   - Touch-friendly targets: Minimum 44x44px for buttons/links
   - NO horizontal scrolling at ANY breakpoint
   - Use Tailwind responsive prefixes: sm:, md:, lg:, xl:, 2xl:

6. **White Space Used Intentionally (GENEROUS BUT STRUCTURED):**
   - Section padding: py-16 md:py-24 lg:py-32 (generous vertical spacing)
   - Consistent margins: mb-4, mb-6, mb-8, mb-12, mb-16 (use spacing scale)
   - Container padding: px-4 sm:px-6 lg:px-8 (horizontal spacing)
   - Breathing room between elements (minimum 16px between related items)
   - NO cramped layouts (if it feels tight, add more space)
   - Spacing scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px

7. **Components Aligned to Design System (CONSISTENCY IS KEY):**
   - Button styles: Primary (bg-gradient-to-r from-violet-500 to-purple-600), Secondary (border), Ghost (transparent)
   - Card styles: Consistent elevation (shadow-lg), padding (p-6 or p-8), border-radius (rounded-xl or rounded-2xl)
   - Input styles: Consistent focus states (ring-2 ring-violet-500), error states (border-red-500), sizes
   - Consistent spacing scale across ALL components
   - NO one-off styles (if you style something, use it consistently)

**ENGINEERING STANDARDS (MANDATORY):**

1. **Modern React (FUNCTIONAL COMPONENTS ONLY):**
   - ✅ Functional components ONLY (NO class components, NO React.Component)
   - ✅ React Hooks: useState, useEffect, useCallback, useMemo (use appropriately)
   - ✅ Proper prop types or TypeScript interfaces (define ALL props)
   - ✅ Component composition over inheritance
   - ✅ Custom hooks for reusable logic
   - ❌ NO class components, NO this.state, NO componentDidMount

2. **Clean Folder Structure (ORGANIZED & SCALABLE):**
   - ✅ src/components/common/ (Button, Card, Input, Modal - reusable UI components)
   - ✅ src/components/sections/ (Hero, Features, Pricing, Testimonials - page sections)
   - ✅ src/components/layout/ (Navigation, Footer, Container - layout components)
   - ✅ src/pages/ (Home, About, Contact - page components)
   - ✅ src/styles/ (globals.css, variables.css - global styles)
   - ✅ src/utils/ (helpers, constants, formatters - utility functions)
   - ✅ src/hooks/ (useScroll, useMediaQuery - custom hooks)
   - ❌ NO flat file structure, NO components in root

3. **Reusable Components (DRY PRINCIPLE):**
   - ✅ Extract common UI patterns into reusable components
   - ✅ Props for customization (variant, size, color, etc.)
   - ✅ NO hardcoded values (use props/config)
   - ✅ Single responsibility principle (one component, one purpose)
   - ✅ Component documentation via prop types/interfaces
   - ✅ Default props for optional values
   - ❌ NO duplicate code, NO hardcoded content

4. **NO Inline Hacks (CLEAN CODE):**
   - ✅ Use Tailwind classes or CSS modules ONLY
   - ✅ Use constants/variables for magic numbers
   - ✅ Use props/config for dynamic values
   - ✅ Remove commented-out code
   - ❌ NO inline styles (style={{...}})
   - ❌ NO magic numbers (use const MAX_WIDTH = 1200)
   - ❌ NO hardcoded values (use props)
   - ❌ NO commented-out code

5. **NO Console.logs (PRODUCTION-READY):**
   - ✅ Remove ALL console.log, console.error, console.warn statements
   - ✅ Use proper error handling (try/catch, error boundaries)
   - ✅ Use proper logging service if needed (not console)
   - ✅ Production-safe code only
   - ❌ NO console.log statements
   - ❌ NO debug code
   - ❌ NO development-only code

6. **Production-Safe Code (ROBUST & RELIABLE):**
   - ✅ Proper error boundaries (catch React errors)
   - ✅ Loading states for async operations (show spinners/skeletons)
   - ✅ Empty states for no data (show helpful messages)
   - ✅ Error states for failures (show error messages, retry options)
   - ✅ Proper TypeScript types (if using TS - define interfaces)
   - ✅ Input validation (forms, user inputs)
   - ✅ Accessibility (ARIA labels, keyboard navigation)
   - ❌ NO unhandled errors
   - ❌ NO missing loading states
   - ❌ NO missing error handling

**LAYOUT REQUIREMENTS (MANDATORY):**

1. **Multi-Page Routing (REACT ROUTER):**
   - ✅ Use React Router (react-router-dom) - BrowserRouter, Routes, Route
   - ✅ Proper route structure: / (home), /about, /contact, /pricing, etc.
   - ✅ Route guards if needed (protected routes)
   - ✅ 404 page for unknown routes (catch-all route)
   - ✅ Link components for navigation (NOT anchor tags)
   - ✅ Active link highlighting (use NavLink or custom logic)
   - ❌ NO single-page without routing (if multi-page requested)
   - ❌ NO anchor tags for internal navigation

2. **Sticky Navigation (FIXED HEADER):**
   - ✅ Navigation bar fixed at top (fixed top-0 z-50)
   - ✅ Smooth scroll behavior (scroll-behavior: smooth)
   - ✅ Active link highlighting (current page highlighted)
   - ✅ Mobile hamburger menu (responsive, animated)
   - ✅ Logo and navigation items properly spaced (px-4 sm:px-6 lg:px-8)
   - ✅ Background blur/opacity on scroll (optional but professional)
   - ✅ Proper z-index layering (nav above content)
   - ❌ NO static navigation (if sticky requested)
   - ❌ NO broken mobile menu

3. **Proper Footer (COMPLETE & PROFESSIONAL):**
   - ✅ Company info (name, tagline, description)
   - ✅ Navigation links (organized columns)
   - ✅ Social media icons (properly linked)
   - ✅ Copyright notice (current year)
   - ✅ Consistent with brand (colors, typography)
   - ✅ Responsive layout (stacked on mobile, columns on desktop)
   - ✅ Proper spacing and padding
   - ❌ NO incomplete footer
   - ❌ NO broken links

4. **Scroll-Safe Sections (NO OVERFLOW ISSUES):**
   - ✅ No horizontal overflow (overflow-x-hidden on body)
   - ✅ Proper overflow handling (overflow-y-auto where needed)
   - ✅ Smooth scroll behavior (scroll-behavior: smooth)
   - ✅ Scroll indicators if needed (progress bar, scroll-to-top button)
   - ✅ Proper container constraints (max-w-7xl mx-auto)
   - ✅ Test scrolling on all pages
   - ❌ NO horizontal scrolling
   - ❌ NO content breaking out

5. **NO Overflow Bugs (TEST THOROUGHLY):**
   - ✅ Test at ALL viewport sizes: 320px, 375px, 768px, 1024px, 1280px, 1920px
   - ✅ Use overflow-hidden where needed (containers, sections)
   - ✅ Proper container max-widths (max-w-7xl, max-w-5xl, etc.)
   - ✅ No content breaking out of containers (use w-full, max-w-full)
   - ✅ Proper flex/grid constraints (min-w-0, flex-shrink)
   - ✅ Test with long content (text overflow handling)
   - ❌ NO horizontal scrolling at ANY breakpoint
   - ❌ NO content overflow
   - ❌ NO broken layouts

**FAILURE CONDITIONS (AUTO-REJECT - IF ANY OF THESE OCCUR, THE OUTPUT IS A FAILURE):**

❌ **Markdown Output (CRITICAL FAILURE):**
   - DO NOT output markdown syntax in code
   - DO NOT use markdown in JSX (no **bold**, no # headings in strings)
   - Use proper HTML/JSX elements (h1, h2, p, strong, em)
   - NO markdown formatting in component code
   - Example FAILURE: \`<p>**Bold text**</p>\` ❌
   - Example SUCCESS: \`<p><strong>Bold text</strong></p>\` ✅

❌ **Chatty Text (UNPROFESSIONAL):**
   - NO explanatory text in the UI ("Click here to...", "This section shows...")
   - NO "Lorem ipsum" or placeholder text
   - NO "Coming soon" or "Under construction"
   - Use real, meaningful content that matches the brand
   - Professional copywriting (concise, clear, action-oriented)
   - Example FAILURE: "This is a placeholder for your content" ❌
   - Example SUCCESS: "Transform your workflow with our powerful tools" ✅

❌ **Missing Files (INCOMPLETE):**
   - ALL components must be created (Hero, Features, Pricing, Contact, etc.)
   - ALL required files must be present (App.jsx, index.js, components)
   - App.jsx must import ALL components and render them
   - index.js must render App component
   - NO missing imports
   - NO broken file paths
   - Example FAILURE: Missing Contact.jsx when contact section requested ❌
   - Example SUCCESS: All components created and imported ✅

❌ **Ugly or Generic UI (QUALITY FAILURE):**
   - NO basic templates or boilerplate designs
   - NO unstyled components (everything must have proper styling)
   - NO amateur designs (looks like a template or tutorial)
   - NO placeholder-looking designs
   - MUST look professional and modern (Stripe/Linear/Vercel quality)
   - Example FAILURE: Plain white background, basic text, no styling ❌
   - Example SUCCESS: Gradients, shadows, proper spacing, modern design ✅

❌ **Incomplete Components (NON-FUNCTIONAL):**
   - ALL components must be fully functional
   - ALL props must be handled (no undefined props)
   - ALL states must be managed (useState, useEffect where needed)
   - ALL interactions must work (buttons click, forms submit, navigation works)
   - NO broken functionality
   - NO console errors
   - Example FAILURE: Button doesn't work, form doesn't submit ❌
   - Example SUCCESS: All interactions work smoothly ✅

❌ **Broken Responsiveness (MOBILE FAILURE):**
   - MUST work perfectly on mobile (320px+)
   - MUST work perfectly on tablet (768px+)
   - MUST work perfectly on desktop (1024px+)
   - NO horizontal scrolling at ANY breakpoint
   - NO broken layouts (text overflow, images breaking, grid issues)
   - NO overlapping elements
   - Touch-friendly targets (44x44px minimum)
   - Example FAILURE: Horizontal scroll on mobile, broken grid ❌
   - Example SUCCESS: Perfect on all devices, no overflow ✅

❌ **Code Quality Issues (ENGINEERING FAILURE):**
   - NO console.log statements
   - NO inline styles (style={{...}})
   - NO magic numbers (use constants)
   - NO hardcoded values (use props)
   - NO commented-out code
   - NO class components (functional only)
   - Example FAILURE: console.log('debug'), style={{width: 500}} ❌
   - Example SUCCESS: Clean code, no debug statements, proper Tailwind classes ✅

**SUCCESS CRITERIA:**

✅ Website looks like Stripe, Linear, Vercel, or Notion
✅ Clean, professional, modern design
✅ Proper spacing and typography
✅ Smooth animations and interactions
✅ Fully responsive
✅ Production-ready code
✅ All components complete and functional
✅ No console.logs or debug code
✅ Proper error handling
✅ Accessible (WCAG AA)

=== INSTRUCTIONS ===
- **CRITICAL**: ${questionnaireData ? 'ALWAYS follow the questionnaire requirements above. They take priority over everything else.' : 'Always consider the full project context when generating code'}
- **CRITICAL**: Create MARKET-GRADE, PROFESSIONAL websites - not basic templates!
- **QUALITY BAR**: Website MUST look like Stripe, Linear, Vercel, or Notion - NO amateur UI, NO placeholder vibes
- **VISUAL QUALITY**: Every pixel must be intentional and polished - clean spacing, typography hierarchy, layout balance
- Use professional design patterns, gradients, shadows, and modern styling
- **DESIGN PRINCIPLES**: Strong visual hierarchy, consistent color system, modern typography, subtle animations
- **ENGINEERING**: Modern React (functional components), clean folder structure, reusable components, NO console.logs, NO inline hacks
- **LAYOUT**: Multi-page routing, sticky navigation, proper footer, scroll-safe sections, NO overflow bugs
- **RESPONSIVE**: Mobile-first (320px+), tablet (768px+), desktop (1024px+), touch-friendly (44x44px min)
- **FAILURE CONDITIONS**: NO markdown output, NO chatty text, NO missing files, NO ugly UI, NO incomplete components, NO broken responsiveness
- Maintain consistency with existing code style and patterns
- When suggesting code changes, specify which file(s) need to be modified
- Provide clear explanations for your code suggestions
- If creating new files, suggest appropriate file paths
- Follow best practices for ${project.framework || project.type} development
- Be concise but thorough in your responses
- IMPORTANT: When creating App.js, make sure it imports and renders ALL components in the project (Home, Contact, Projects, Navigation, etc.)
- App.js should be the main component that combines all other components into a complete application
- **TYPOGRAPHY**: Use proper font scale (12px-64px), weights (400-700), line heights (1.5-1.75 body, 1.2-1.3 headings)
- **SPACING**: Use consistent spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px)
- **ANIMATIONS**: Smooth transitions (150ms-300ms), use transform/opacity for performance, NO jarring animations
- **COLORS**: Use CSS variables or Tailwind config, proper contrast ratios (WCAG AA), consistent color system
- **COMPONENTS**: Align to design system - consistent buttons, cards, inputs with proper states
${questionnaireData ? `
- **REMEMBER**: The user filled out a detailed questionnaire. Build the app EXACTLY as they specified!
- **REMEMBER**: Create a PROFESSIONAL, MARKET-GRADE website - use gradients, shadows, modern styling, professional colors!
- **REMEMBER**: Quality must match Stripe/Linear/Vercel/Notion - NO amateur designs!
` : ''}

=== IMAGE HANDLING GUIDELINES ===
When adding images to components:
1. **Use appropriate image sources:**
   - For hero images: Use Unsplash URLs (https://images.unsplash.com/photo-...)
   - For placeholders: Use placeholder.com (https://via.placeholder.com/WIDTHxHEIGHT)
   - For icons: Use inline SVG code
   - For logos: Use SVG or small PNG/WebP images

2. **Always include alt text** for accessibility:
   \`\`\`jsx
   <img src="image.jpg" alt="Descriptive text about the image" />
   \`\`\`

3. **Make images responsive:**
   \`\`\`jsx
   <img 
     src="image.jpg" 
     alt="Description"
     className="w-full h-auto max-w-full"
   />
   \`\`\`

4. **Use proper CSS classes** for styling:
   - \`object-cover\` for background images
   - \`object-contain\` to preserve aspect ratio
   - \`rounded-lg\` for rounded corners
   - \`shadow-lg\` for shadows

5. **For image galleries**, create responsive grid layouts:
   \`\`\`jsx
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
     {images.map((img, idx) => (
       <img key={idx} src={img} alt={\`Image \${idx + 1}\`} className="w-full h-64 object-cover rounded-lg" />
     ))}
   </div>
   \`\`\`

6. **For SVG icons**, use inline SVG for scalability:
   \`\`\`jsx
   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
   </svg>
   \`\`\`

7. **Popular free image sources:**
   - Unsplash: https://images.unsplash.com/photo-[ID]
   - Pexels: https://images.pexels.com/photos/[ID]
   - Placeholder: https://via.placeholder.com/[WIDTH]x[HEIGHT]

8. **When user asks for images**, suggest using Unsplash or placeholder images unless they specify otherwise

=== ERROR DETECTION & AUTO-FIX ===
- If you detect errors in the code or user reports issues, automatically analyze and fix them
- Common issues to detect and fix:
  * Missing imports
  * Incorrect component exports
  * React Router issues (convert to simple component rendering for preview)
  * Missing App component
  * Component not rendering
- When fixing errors, provide the corrected code immediately
- Explain what was wrong and how you fixed it
- Always verify the fix will work before suggesting it

=== PROFESSIONAL WEBSITE PATTERNS (LOVABLE-STYLE) ===

**When creating websites, ALWAYS use these professional patterns:**

1. **Hero Section Pattern:**
\`\`\`jsx
// Professional hero with gradient background
<section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
  <div className="absolute inset-0 bg-black/20"></div>
  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
      Your Brand Name
    </h1>
    <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
      Your compelling tagline that explains your value proposition
    </p>
    <button className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:scale-105 transition-transform shadow-xl">
      Get Started
    </button>
  </div>
</section>
\`\`\`

2. **Feature Cards Pattern:**
\`\`\`jsx
// Professional feature cards with hover effects
<div className="grid md:grid-cols-3 gap-8">
  {features.map((feature, idx) => (
    <div key={idx} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow border border-gray-100">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mb-4"></div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
      <p className="text-gray-600">{feature.description}</p>
    </div>
  ))}
</div>
\`\`\`

3. **Professional Button Styles:**
\`\`\`jsx
// Primary button
<button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform shadow-lg">
  Get Started
</button>

// Secondary button
<button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors">
  Learn More
</button>
\`\`\`

4. **Professional Typography:**
\`\`\`jsx
// Headings
<h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-4">Main Heading</h1>
<h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Section Heading</h2>
<h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-3">Subsection</h3>

// Body text
<p className="text-lg text-gray-600 leading-relaxed mb-4">Body text with proper line height</p>
\`\`\`

5. **Professional Section Spacing:**
\`\`\`jsx
// Use consistent section padding
<section className="py-16 md:py-24 lg:py-32">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</section>
\`\`\`

6. **Professional Color Usage:**
- Use gradients: bg-gradient-to-r from-color1 to-color2
- Use opacity: text-white/90, bg-black/10
- Use proper contrast: text-gray-900 on white, text-white on dark
- Use accent colors sparingly for CTAs and highlights

7. **Professional Shadows & Effects:**
- Cards: shadow-lg hover:shadow-2xl
- Buttons: shadow-lg hover:shadow-xl
- Text: Use text-shadow for headings on images if needed
- Backdrop: backdrop-blur-sm bg-white/80 for glass effects

8. **Professional Animations:**
- Hover: hover:scale-105 transition-transform
- Fade: opacity-0 animate-fade-in
- Smooth: transition-all duration-300 ease-in-out

**CRITICAL: Always create professional, polished designs - not basic templates!**

=== EXAMPLE: PROFESSIONAL HERO SECTION ===
\`\`\`jsx
// Professional hero with gradient background and modern styling
<section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
  {/* Background overlay */}
  <div className="absolute inset-0 bg-black/20"></div>
  
  {/* Animated background elements */}
  <div className="absolute inset-0">
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"></div>
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"></div>
  </div>
  
  {/* Content */}
  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in">
      Your Brand Name
    </h1>
    <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
      Your compelling tagline that explains your value proposition clearly and professionally
    </p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:scale-105 transition-transform shadow-xl hover:shadow-2xl">
        Get Started
      </button>
      <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors">
        Learn More
      </button>
    </div>
  </div>
</section>
\`\`\`

=== EXAMPLE: PROFESSIONAL FEATURE CARDS ===
\`\`\`jsx
// Professional feature section with cards
<section className="py-24 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        Why Choose Us
      </h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        Discover what makes us different
      </p>
    </div>
    
    <div className="grid md:grid-cols-3 gap-8">
      {features.map((feature, idx) => (
        <div 
          key={idx} 
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200 group"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
            {/* Icon SVG here */}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
          <p className="text-gray-600 leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
\`\`\`

=== EXAMPLE: PROFESSIONAL TESTIMONIALS ===
\`\`\`jsx
// Professional testimonial cards
<section className="py-24 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
      What Our Customers Say
    </h2>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {testimonials.map((testimonial, idx) => (
        <div 
          key={idx}
          className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-100"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mr-4"></div>
            <div>
              <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
              <p className="text-sm text-gray-600">{testimonial.role}</p>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">"{testimonial.text}"</p>
        </div>
      ))}
    </div>
  </div>
</section>
\`\`\`

=== RESPONSE FORMAT ===
When suggesting code changes, structure your response as:
1. Explanation of what you're doing
2. Code blocks with file paths using this EXACT format:
   \`\`\`file:path/to/file.js
   // Your code here
   \`\`\`
   
   **CRITICAL: ALWAYS use \`\`\`file:path/to/file.js\` format (with "file:" prefix) so files are automatically created.**
   
   **DO NOT use formats like:**
   - ❌ \`\`\`javascript (without file path)
   - ❌ \`\`\`jsx (without file path)
   - ❌ \`\`\`src/App.jsx (missing "file:" prefix)
   
   **ALWAYS use:**
   - ✅ \`\`\`file:src/App.jsx
   - ✅ \`\`\`file:src/index.js
   - ✅ \`\`\`file:src/App.css
   - ✅ \`\`\`file:src/components/Home.jsx
   
   **Examples of correct format:**
   \`\`\`file:src/App.jsx
   import React from 'react';
   function App() {
     return <div>Hello</div>;
   }
   export default App;
   \`\`\`
   
   \`\`\`file:src/index.js
   import React from 'react';
   import ReactDOM from 'react-dom';
   import App from './App';
   ReactDOM.render(<App />, document.getElementById('root'));
   \`\`\`
   
3. Any additional notes or considerations

=== CRITICAL: App.js Structure ===
- App.js MUST import and render ALL components in the project
- If you see components like Home, Contact, Projects, Navigation - App.js should import and use ALL of them
- Create a complete portfolio layout that shows all sections, not just one component
- Example structure:
  \`\`\`file:src/App.js
  import React from 'react';
  import Navigation from './Navigation';
  import Home from './Home';
  import Projects from './Projects';
  import Contact from './Contact';
  
  function App() {
    return (
      <div>
        <Navigation />
        <Home />
        <Projects />
        <Contact />
      </div>
    );
  }
  
  export default App;
  \`\`\`

Current file being edited: ${currentFile || 'none'}`;

    // Helper function to parse and create files from response
    const parseAndCreateFiles = async (responseText: string): Promise<Array<{ path: string; success: boolean; error?: string }>> => {
      const codeBlockRegex = /```(?:file:)?([^\n`]+)\n([\s\S]*?)```/g;
      const createdFiles: Array<{ path: string; success: boolean; error?: string }> = [];
      let match;
      
      console.log('📝 Parsing response for file creation...');
      console.log('Response length:', responseText.length);
      console.log('Response preview:', responseText.substring(0, 500));

      while ((match = codeBlockRegex.exec(responseText)) !== null) {
        let filePath = match[1].trim();
        const fileContent = match[2].trim();
        
        // Remove "file:" prefix if present
        if (filePath.startsWith('file:')) {
          filePath = filePath.substring(5).trim();
        }
        
        // Skip if it's not a file path (e.g., just language identifier like "javascript")
        // Check if it looks like a file path (has extension or contains path separators)
        const hasExtension = filePath.includes('.');
        const hasPathSeparator = filePath.includes('/') || filePath.includes('\\');
        
        // Log what we found
        console.log('🔍 Found code block:', {
          filePath,
          hasExtension,
          hasPathSeparator,
          contentLength: fileContent.length
        });
        
        if (!hasExtension && !hasPathSeparator) {
          console.log('⏭️ Skipping - not a file path:', filePath);
          continue;
        }

        // Determine language from file extension
        const extension = filePath.split('.').pop()?.toLowerCase() || '';
        const languageMap: Record<string, string> = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'css': 'css',
          'html': 'html',
          'json': 'json',
          'md': 'markdown',
          'py': 'python',
          'java': 'java',
          'cpp': 'cpp',
          'c': 'c',
        };
        const language = languageMap[extension] || extension;

        // Extract filename from path
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;

        try {
          // Validate and normalize path
          const normalizedPath = filePath.replace(/\.\./g, '').replace(/^\//, '');
          if (normalizedPath !== filePath) {
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: 'Invalid file path' 
            });
            continue;
          }

          const isMain = filePath.includes('index') || filePath.includes('App') || filePath.includes('main');

          // If setting as main, unset other main files
          if (isMain) {
            await prisma.appFile.updateMany({
              where: { projectId: id, isMain: true },
              data: { isMain: false },
            });
          }

          // Create or update file using Prisma
          await prisma.appFile.upsert({
            where: {
              projectId_path: {
                projectId: id,
                path: normalizedPath,
              },
            },
            update: {
              content: fileContent,
              language: language,
              isMain: isMain,
              name: fileName,
            },
            create: {
              projectId: id,
              path: normalizedPath,
              name: fileName,
              content: fileContent,
              language: language,
              isMain: isMain,
            },
          });

          createdFiles.push({ path: filePath, success: true });
          console.log('✅ Created/updated file:', filePath);
        } catch (fileError: any) {
          console.error(`❌ Error creating file ${filePath}:`, fileError);
          createdFiles.push({ 
            path: filePath, 
            success: false, 
            error: fileError.message || 'Unknown error' 
          });
        }
      }
      
      console.log('📊 File creation summary:', {
        totalFound: createdFiles.length,
        successful: createdFiles.filter(f => f.success).length,
        failed: createdFiles.filter(f => !f.success).length,
        files: createdFiles.map(f => ({ path: f.path, success: f.success }))
      });
      
      return createdFiles;
    };

    // Call AI API (works with OpenAI-compatible providers)
    let response: string;
    let requestSuccess = false;
    let finalProvider = provider;
    
    console.log('🚀 Making AI request:', {
      provider: provider,
      model: model,
      normalizedModel: model, // Already normalized in createClient
      baseURL: PROVIDER_CONFIGS[provider].baseURL,
      hasApiKey: !!finalApiKey && finalApiKey !== 'ollama',
      messageLength: message.length,
      userProvider: userProvider || 'not provided',
      userModel: userModel || 'not provided'
    });
    
    try {
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 4000, // Increased to ensure full file content is included
      });
      
      console.log('✅ AI response received:', {
        provider: provider,
        model: model,
        responseLength: completion.choices[0]?.message?.content?.length || 0
      });

      response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
      requestSuccess = true;
      
      // Record successful request
      loadBalancer.recordRequest(provider, true);
    } catch (error: any) {
      // Record failed request
      loadBalancer.recordRequest(provider, false);
      
      // Handle invalid model (400/404) - fallback to safe model
      // Groq returns 404 for model_not_found, OpenRouter returns 400
      if (error?.status === 400 || error?.status === 404 || 
          error?.message?.includes('Invalid model') || 
          error?.message?.includes('model not found') ||
          error?.code === 'model_not_found') {
        console.warn(`⚠️ Invalid model "${model}" for ${provider}, attempting fallback`);
        
        // For Groq, fallback to default Groq model
        if (provider === 'groq') {
          try {
            const fallbackModel = PROVIDER_CONFIGS.groq.defaultModel; // llama-3.3-70b-versatile
            console.log(`🔄 Retrying Groq with fallback model: ${fallbackModel}`);
            
            const fallbackClient = new OpenAI({
              apiKey: finalApiKey || process.env.GROQ_API_KEY,
              baseURL: 'https://api.groq.com/openai/v1',
            });
            
            const fallbackCompletion = await fallbackClient.chat.completions.create({
              model: fallbackModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.7,
              max_tokens: 4000,
            });
            
            response = fallbackCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            requestSuccess = true;
            loadBalancer.recordRequest(provider, true);
            
            // Parse and create files from fallback response
            const fallbackFiles = await parseAndCreateFiles(response);
            
            return NextResponse.json({
              response,
              suggestions: [],
              filesCreated: fallbackFiles,
              provider: finalProvider,
              model: fallbackModel,
              usedFallback: true,
              fallbackReason: `Invalid model "${model}" - using ${fallbackModel} instead`,
            });
          } catch (fallbackError: any) {
            console.error('Groq fallback model also failed:', fallbackError);
            // Continue to throw original error
            throw error;
          }
        }
        
        // For OpenRouter, fallback to deepseek/deepseek-chat (reliable model)
        if (provider === 'openrouter') {
          try {
            const fallbackModel = 'deepseek/deepseek-chat';
            console.log(`🔄 Retrying with fallback model: ${fallbackModel}`);
            
            const fallbackClient = new OpenAI({
              apiKey: finalApiKey || process.env.OPENROUTER_API_KEY,
              baseURL: 'https://openrouter.ai/api/v1',
              defaultHeaders: {
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
                  ? `https://${process.env.VERCEL_URL}` 
                  : 'http://localhost:3000',
                'X-Title': 'Open Idea - AI App Builder',
              },
            });
            
            const fallbackCompletion = await fallbackClient.chat.completions.create({
              model: fallbackModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.7,
              max_tokens: 4000, // Increased to ensure full file content
            });
            
            response = fallbackCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            requestSuccess = true;
            loadBalancer.recordRequest(provider, true);
            
            // Parse and create files from fallback response
            const fallbackFiles = await parseAndCreateFiles(response);
            
            return NextResponse.json({
              response,
              suggestions: [],
              filesCreated: fallbackFiles,
              provider: finalProvider,
              model: fallbackModel,
              usedFallback: true,
              fallbackReason: `Invalid model "${model}" - using ${fallbackModel} instead`,
            });
          } catch (fallbackError: any) {
            console.error('Fallback model also failed:', fallbackError);
            // Continue to throw original error
            throw error;
          }
        } else {
          // For other providers, try their default model
          try {
            const fallbackModel = PROVIDER_CONFIGS[provider].defaultModel;
            console.log(`🔄 Retrying with provider default model: ${fallbackModel}`);
            
            const { client: fallbackClient } = createClient(finalApiKey || '', provider, fallbackModel);
            const fallbackCompletion = await fallbackClient.chat.completions.create({
              model: fallbackModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.7,
              max_tokens: 4000, // Increased to ensure full file content
            });
            
            response = fallbackCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            requestSuccess = true;
            loadBalancer.recordRequest(provider, true);
            
            return NextResponse.json({
              response,
              suggestions: [],
              filesCreated: [],
              provider: finalProvider,
              model: fallbackModel,
              usedFallback: true,
              fallbackReason: `Invalid model "${model}" - using ${fallbackModel} instead`,
            });
          } catch (fallbackError) {
            throw error;
          }
        }
      }
      
      // Handle insufficient balance (402) - try fallback provider
      if (error?.status === 402 || error?.message?.includes('Insufficient Balance') || error?.message?.includes('insufficient balance')) {
        const fallbackProvider = loadBalancer.getBestProvider();
        if (fallbackProvider && fallbackProvider !== provider) {
          try {
            console.log(`⚠️ DeepSeek balance insufficient, trying fallback: ${fallbackProvider}`);
            // Retry with fallback provider
            const fallbackConfig = PROVIDER_CONFIGS[fallbackProvider];
            const fallbackApiKey = userApiKey || apiKey || '';
            const fallbackClient = new OpenAI({
              apiKey: fallbackApiKey,
              baseURL: fallbackConfig.baseURL,
            });
            
            const fallbackCompletion = await fallbackClient.chat.completions.create({
              model: fallbackConfig.defaultModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.7,
              max_tokens: 4000, // Increased to ensure full file content
            });
            
            response = fallbackCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            requestSuccess = true;
            loadBalancer.recordRequest(fallbackProvider, true);
            
            // Update provider for this request
            finalProvider = fallbackProvider;
          } catch (fallbackError) {
            // Fallback also failed, throw original error
            throw error;
          }
        } else {
          throw error;
        }
      }
      // If rate limit error, try fallback provider
      else if (error?.status === 429 || error?.message?.includes('rate limit')) {
        const fallbackProvider = loadBalancer.getBestProvider();
        if (fallbackProvider && fallbackProvider !== provider) {
          try {
            // Retry with fallback provider
            const fallbackConfig = PROVIDER_CONFIGS[fallbackProvider];
            const fallbackApiKey = userApiKey || apiKey || '';
            const fallbackClient = new OpenAI({
              apiKey: fallbackApiKey,
              baseURL: fallbackConfig.baseURL,
            });
            
            const fallbackCompletion = await fallbackClient.chat.completions.create({
              model: fallbackConfig.defaultModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.7,
              max_tokens: 4000, // Increased to ensure full file content
            });
            
            response = fallbackCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            requestSuccess = true;
            loadBalancer.recordRequest(fallbackProvider, true);
            
            // Update provider for this request
            finalProvider = fallbackProvider;
          } catch (fallbackError) {
            // Fallback also failed, throw original error
            throw error;
          }
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Parse code blocks and create/update files
    const createdFiles = await parseAndCreateFiles(response);

    // Save chat message to database
    try {
      const existingChat = await prisma.appChat.findFirst({
        where: { projectId: id },
      });

      const messages = existingChat
        ? (existingChat.messages as any[])
        : [];

      messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });
      messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });

      await prisma.appChat.upsert({
        where: { id: existingChat?.id || 'temp' },
        update: {
          messages: messages as any,
          updatedAt: new Date(),
        },
        create: {
          projectId: id,
          messages: messages as any,
        },
      });
    } catch (chatError) {
      console.error('Error saving chat:', chatError);
      // Don't fail the request if chat saving fails
    }

    // Get load balancer stats for this request
    const stats = loadBalancer.getStats().get(finalProvider);
    const statsData = stats ? {
      requestsHandled: stats.requestsHandled,
      requestsFailed: stats.requestsFailed,
      currentUsage: stats.currentUsage,
      successRate: stats.requestsHandled > 0 
        ? (stats.requestsHandled / (stats.requestsHandled + stats.requestsFailed)) * 100 
        : 100,
    } : null;

    // Ensure filesCreated is always an array
    const filesCreatedResult = Array.isArray(createdFiles) ? createdFiles : [];
    
    console.log('📤 Sending response:', {
      responseLength: response.length,
      filesCreated: filesCreatedResult.length,
      successfulFiles: filesCreatedResult.filter(f => f.success).length,
      provider: finalProvider,
    });
    
    return NextResponse.json({
      response,
      suggestions: [],
      filesCreated: filesCreatedResult,
      provider: finalProvider,
      model: model, // Include model information
      loadBalancerStats: statsData,
      usedFallback: finalProvider !== provider,
    });
  } catch (error: any) {
    // Get the model that was attempted (might be undefined if error occurred before client creation)
    // Use requestedModel (from userModel) if model is not in scope
    // Note: 'model' variable is defined inside try block, so we use requestedModel here
    const attemptedModel = requestedModel || PROVIDER_CONFIGS[provider]?.defaultModel || 'unknown';
    
    console.error('Code chat API error:', {
      error,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      provider,
      model: attemptedModel,
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
    });
    
    // Handle connection errors
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.message?.includes('fetch failed') || error?.message?.includes('network') || error?.message?.includes('connection')) {
      return NextResponse.json(
        { 
          error: 'Connection error',
          message: `Unable to connect to ${provider} API. Please check your internet connection and API key settings.`,
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
          suggestion: provider === 'deepseek' 
            ? 'Verify your DeepSeek API key is correct at https://platform.deepseek.com/api_keys'
            : 'Check your API key settings in chat settings (⚙️ icon)',
          provider: provider,
          model: attemptedModel
        },
        { status: 503 }
      );
    }

    // Handle insufficient balance (402)
    if (error?.status === 402 || error?.message?.includes('Insufficient Balance') || error?.message?.includes('insufficient balance')) {
      return NextResponse.json(
        { 
          error: 'Insufficient Balance',
          message: `Your ${provider} account has insufficient balance. Please add credits to continue.`,
          suggestion: provider === 'deepseek' 
            ? 'Add credits at https://platform.deepseek.com/account or try using a different provider (Groq, OpenRouter)'
            : `Add credits to your ${provider} account or switch to a different provider in chat settings (⚙️ icon)`,
          provider: provider,
          model: attemptedModel,
          canRetry: true
        },
        { status: 402 }
      );
    }

    // Handle invalid model (400/404) - return clean error, don't return 500
    if (error?.status === 400 || error?.status === 404 || 
        error?.message?.includes('Invalid model') || 
        error?.message?.includes('model not found') ||
        error?.code === 'model_not_found') {
      // Extract model name from error message or use attempted model
      const requestedModel = error?.message?.match(/model[:\s"']+([^\s"']+)/i)?.[1] || attemptedModel;
      return NextResponse.json(
        { 
          error: 'Invalid model',
          message: `The model "${requestedModel}" is not available for ${provider}. Please try a different model.`,
          suggestion: provider === 'groq'
            ? 'Try using: llama, llama3.3, mixtral, or gemma2. Click ⚙️ in chat settings to change model.'
            : provider === 'openrouter'
            ? 'Try using: llama, deepseek, grok, mixtral, or gpt-4. Click ⚙️ in chat settings to change model.'
            : `Try using the default model for ${provider} or switch providers in chat settings (⚙️ icon)`,
          provider: provider,
          model: requestedModel,
          canRetry: true
        },
        { status: error?.status || 400 }
      );
    }

    if (error?.status === 401 || error?.message?.includes('Invalid API key') || error?.message?.includes('authentication')) {
      return NextResponse.json(
        { 
          error: 'Invalid API key',
          message: `Invalid API key for ${provider}. Please check your API key in chat settings.`,
          suggestion: provider === 'deepseek' 
            ? 'Get your API key at https://platform.deepseek.com/api_keys'
            : provider === 'openrouter'
            ? 'Get your API key at https://openrouter.ai/keys'
            : 'Click ⚙️ in chat settings to configure your API key',
          provider: provider,
          model: attemptedModel
        },
        { status: 401 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          details: `You've hit the rate limit for ${provider}. Try switching to Groq (free & fast) or wait a few minutes.`,
          provider: provider,
          model: attemptedModel
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: error?.message || 'Failed to process chat message',
        message: `An error occurred while processing your request. ${error?.message || 'Please try again.'}`,
        provider: provider,
        model: attemptedModel,
        canRetry: true
      },
      { status: 500 }
    );
  }
}

