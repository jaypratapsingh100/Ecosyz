import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Provider configuration
type Provider = 'openai' | 'groq' | 'together' | 'huggingface' | 'openrouter';

interface ProviderConfig {
  baseURL: string;
  defaultModel: string;
  models: string[];
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
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat', // More reliable than deepseek-coder
    models: [
      'meta-llama/llama-3.2-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-coder',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3-haiku',
    ],
  },
};

// Model normalization map for OpenRouter
const OPENROUTER_MODEL_MAP: Record<string, string> = {
  'deepseek': 'deepseek/deepseek-chat',
  'deepseek-chat': 'deepseek/deepseek-chat',
  'deepseek-coder': 'deepseek/deepseek-chat', // Migrate to chat (coder not available)
  'deepseekcoder': 'deepseek/deepseek-chat', // Migrate to chat
  'deepseek/deepseek-coder': 'deepseek/deepseek-chat', // Migrate to chat (coder not available)
  'deepseek/deepseek-chat': 'deepseek/deepseek-chat',
};

// Normalize model name for OpenRouter
function normalizeModelName(modelName: string | undefined, provider: Provider): string {
  if (!modelName) {
    return PROVIDER_CONFIGS[provider].defaultModel;
  }
  
  // For OpenRouter, normalize through MODEL_MAP
  if (provider === 'openrouter') {
    const modelKey = modelName.toLowerCase();
    const normalized = OPENROUTER_MODEL_MAP[modelKey];
    if (normalized) {
      return normalized;
    }
    
    // If model already looks like a valid OpenRouter ID (contains /), check if it's the deprecated coder model
    if (modelName.includes('/')) {
      // Migrate deprecated deepseek-coder to deepseek-chat
      if (modelName.toLowerCase().includes('deepseek-coder')) {
        return 'deepseek/deepseek-chat';
      }
      return modelName;
    }
    
    // Unknown model name - default to safe fallback
    console.warn(`⚠️ Unknown model name "${modelName}" for OpenRouter, using default: ${PROVIDER_CONFIGS[provider].defaultModel}`);
    return PROVIDER_CONFIGS[provider].defaultModel;
  }
  
  // For other providers, return as-is or use default
  return modelName || PROVIDER_CONFIGS[provider].defaultModel;
}

// Detect provider from API key format or explicit provider
function detectProvider(apiKey: string, explicitProvider?: string): Provider {
  if (explicitProvider && ['openai', 'groq', 'together', 'huggingface', 'openrouter'].includes(explicitProvider)) {
    return explicitProvider as Provider;
  }
  
  // Detect by API key prefix
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('hf_')) return 'huggingface';
  if (apiKey.startsWith('sk-or-')) return 'openrouter'; // OpenRouter uses sk-or- prefix
  if (apiKey.length > 50 && !apiKey.startsWith('sk-')) return 'together';
  
  // Default to OpenAI
  return 'openai';
}

// Get provider config and create client
function createClient(apiKey: string, provider: Provider, model?: string) {
  const config = PROVIDER_CONFIGS[provider];
  // Normalize model name (especially important for OpenRouter)
  const selectedModel = normalizeModelName(model, provider);
  
  const clientConfig: any = {
    apiKey: apiKey || (provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : undefined),
    baseURL: config.baseURL,
  };
  
  // OpenRouter requires special headers
  if (provider === 'openrouter') {
    clientConfig.defaultHeaders = {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000',
      'X-Title': 'Ecosyz Search - Open Resources',
    };
  }
  
  return {
    client: new OpenAI(clientConfig),
    model: selectedModel,
  };
}

export async function POST(request: NextRequest) {
  let provider: Provider = 'openai'; // Declare outside try block for error handling
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: jsonError?.message },
        { status: 400 }
      );
    }
    const { message, context, apiKey: userApiKey, model: userModel, provider: userProvider } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use user-provided API key or fall back to environment variable
    // Priority: user-provided key > provider-specific env var > .env.local GROQ_API_KEY > .env GROQ_API_KEY > .env.local OPENAI_API_KEY > .env OPENAI_API_KEY
    const apiKey = userApiKey || 
      (userProvider === 'openrouter' ? process.env.OPENROUTER_API_KEY : undefined) ||
      process.env.GROQ_API_KEY || 
      process.env.OPENAI_API_KEY;
    
    // Detect provider: explicit > from API key format > default to openrouter if OPENROUTER_API_KEY exists, else groq, else openai
    let detectedProvider: Provider;
    if (userProvider) {
      detectedProvider = detectProvider('', userProvider);
    } else if (userApiKey) {
      detectedProvider = detectProvider(userApiKey);
    } else if (process.env.OPENROUTER_API_KEY) {
      detectedProvider = 'openrouter'; // Default to OpenRouter + DeepSeek Coder
    } else if (process.env.GROQ_API_KEY) {
      detectedProvider = 'groq';
    } else {
      detectedProvider = 'openai';
    }
    
    provider = detectedProvider;

    // Check if any API key is configured
    if (!apiKey) {
      console.warn('No API key found (neither user-provided nor environment variable)');
      return NextResponse.json({
        response: `I'm your Open Resources Assistant! To enable AI-powered responses, please configure your API key in the chat settings (click the settings icon in the chat header). This is an open-source project, so you'll need to provide your own API key.\n\n**FREE OPTIONS:**\n\n1. **OpenRouter (Recommended - FREE & Best Analysis Quality)**\n   - Get API key: https://openrouter.ai/keys\n   - Free tier available\n   - Uses DeepSeek Chat for comprehensive resource analysis\n   - Add OPENROUTER_API_KEY to your .env file\n\n2. **Groq (FREE & Fast)**\n   - Get API key: https://console.groq.com/keys\n   - Free tier with high limits\n   - Very fast responses\n\n3. **Together AI (FREE)**\n   - Get API key: https://api.together.xyz/\n   - Free tier available\n\n4. **Hugging Face (FREE)**\n   - Get API key: https://huggingface.co/settings/tokens\n   - Free tier available\n\n5. **OpenAI (Paid)**\n   - Get API key: https://platform.openai.com/api-keys\n\n**Setup:**\n- Add API key in chat settings (⚙️ icon)\n- Or add OPENROUTER_API_KEY or GROQ_API_KEY to your .env file\n\n**Recommended:** Start with OpenRouter + DeepSeek Chat for best analysis quality!`
      });
    }

    let client, model;
    try {
      const clientResult = createClient(apiKey, provider, userModel);
      client = clientResult.client;
      model = clientResult.model;
    } catch (clientError: any) {
      console.error('Client creation error:', clientError);
      return NextResponse.json(
        { 
          error: 'Failed to create API client',
          details: clientError?.message || 'Unknown error',
          provider
        },
        { status: 500 }
      );
    }
    
    if (!client) {
      console.error('Client is null or undefined');
      return NextResponse.json(
        { 
          error: 'API client not initialized',
          provider
        },
        { status: 500 }
      );
    }
    
    if (!model) {
      console.error('Model is null or undefined');
      return NextResponse.json(
        { 
          error: 'Model not initialized',
          provider
        },
        { status: 500 }
      );
    }

    // Build system prompt with context
    let systemPrompt = `You are an expert AI assistant powered by DeepSeek Chat, specializing in analyzing and understanding open resources (research papers, datasets, code repositories, AI models, hardware designs, etc.).

Your primary role is to deeply analyze ALL provided resources and answer questions with specific, detailed references to them.

CRITICAL INSTRUCTIONS:
- You have access to ${context?.resultsCount || 0} resources that the user has searched for
- You MUST analyze ALL resources thoroughly before answering
- When answering questions, ALWAYS reference specific resources by their number (e.g., "Resource 1", "Resource #5")
- Provide comprehensive analysis, comparisons, and insights across all resources
- Identify patterns, commonalities, and differences between resources
- Suggest which resources are most relevant for specific use cases
- Be specific and detailed - cite exact resource information when possible

FORMATTING REQUIREMENTS:
- When mentioning code examples, ALWAYS format them in markdown code blocks with language tags: \`\`\`language
- Use proper code formatting: \`\`\`javascript, \`\`\`python, \`\`\`typescript, etc.
- Extract and format actual code snippets from resource descriptions when available
- When referencing resources, use format: "Resource 1", "Resource #2", etc. (numbering starts at 1)
- Use markdown formatting for better readability: **bold**, *italic*, lists, etc.

TABLE FORMATTING:
- When comparing multiple resources or presenting structured data, ALWAYS use markdown tables
- Format: | Column 1 | Column 2 | Column 3 |
          |----------|----------|----------|
          | Data 1   | Data 2   | Data 3   |
- Use tables for: comparisons, feature lists, resource summaries, learning paths, etc.
- Make tables clear and well-formatted with proper headers
- For comparisons, include columns: Resource, Title, Type, Key Features, Best For, Year, License
- For learning paths, include columns: Step, Resource, Description, Prerequisites, Estimated Time

COMPARISON REQUESTS:
- When user asks to "compare" resources, ALWAYS create a detailed comparison table
- Include: Resource number, Title, Type, Key Features, Strengths, Best Use Case, Year, License
- Highlight differences and similarities
- Recommend which resource is best for specific needs

LEARNING PATH REQUESTS:
- When user asks for "learning path", "roadmap", or "how to learn", create a step-by-step path
- Format as a numbered table with: Step, Resource(s), Description, Prerequisites, Time Estimate
- Order resources from beginner to advanced
- Include prerequisites and dependencies
- Estimate time for each step

MULTI-RESOURCE SUMMARIZATION:
- When user asks to "summarize all resources" or "give me an overview", provide:
  1. Executive summary of all resources (2-3 sentences)
  2. Key themes and patterns across resources
  3. Resource type breakdown
  4. Top resources by relevance
  5. Common tags and topics
- Use bullet points and clear sections
- Reference specific resource numbers

Your capabilities:
- Deep analysis of all provided resources
- Comparison and synthesis across multiple resources
- Identification of best resources for specific needs
- Detailed explanations with resource citations
- Learning path recommendations based on resource analysis
- Technical insights and code analysis (for code repositories)
- Code extraction and formatting from resource descriptions`;

    // Always include search context if available - SEND ALL RESOURCES
    if (context?.hasContext && context?.resultsCount > 0 && context?.results?.length > 0) {
      systemPrompt += `\n\n=== ALL AVAILABLE RESOURCES (${context.results.length} resources) ===\n`;
      systemPrompt += `The user searched for "${context.searchQuery || 'open resources'}" and found ${context.resultsCount} total resources.\n`;
      systemPrompt += `You have access to ALL ${context.results.length} resources below. Analyze them comprehensively and reference them specifically in your answers.\n\n`;
      
      // Send ALL resources, not just 20
      context.results.forEach((r: any, idx: number) => {
        systemPrompt += `\n--- Resource ${idx + 1} of ${context.results.length} ---\n`;
        systemPrompt += `Title: ${r.title || 'Untitled'}\n`;
        systemPrompt += `Type: ${r.type || 'unknown'}\n`;
        systemPrompt += `Source: ${r.source || 'unknown'}\n`;
        if (r.description) {
          systemPrompt += `Description: ${r.description}\n`;
        }
        if (r.authors && Array.isArray(r.authors) && r.authors.length > 0) {
          systemPrompt += `Authors: ${r.authors.join(', ')}\n`;
        }
        if (r.tags && Array.isArray(r.tags) && r.tags.length > 0) {
          systemPrompt += `Tags: ${r.tags.join(', ')}\n`;
        }
        if (r.year) {
          systemPrompt += `Year: ${r.year}\n`;
        }
        if (r.license) {
          systemPrompt += `License: ${r.license}\n`;
        }
        if (r.url) {
          systemPrompt += `URL: ${r.url}\n`;
        }
      });

      systemPrompt += `\n\n=== YOUR TASK ===\n`;
      systemPrompt += `1. Analyze ALL ${context.results.length} resources above comprehensively\n`;
      systemPrompt += `2. When answering questions, reference specific resources by their number (e.g., "Resource 5", "Resources 2-7")\n`;
      systemPrompt += `3. Compare and contrast resources when relevant\n`;
      systemPrompt += `4. Identify the best resources for specific use cases\n`;
      systemPrompt += `5. Provide detailed insights based on ALL resources, not just a few\n`;
      systemPrompt += `6. If asked about a topic, search through ALL resources to find relevant information\n`;
      systemPrompt += `7. Be thorough - you have access to ${context.results.length} resources, use them all!\n`;
    } else {
      systemPrompt += `\n\nNote: No search results are currently available. You can still help with general questions about open resources, but you won't have specific resource context.`;
    }

    // Call AI API (works with OpenAI-compatible providers)
    // Use DeepSeek Coder for best analysis quality
    let response: string = '';
    let finalModel = model;
    
    try {
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2000, // Reduced to avoid credit limit issues (can be increased for paid accounts)
      });

      response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
    } catch (modelError: any) {
      const errorMessage = modelError?.message || modelError?.error?.message || '';
      
      // Handle credit limit errors (402) - reduce max_tokens and retry
      if (modelError?.status === 402 || errorMessage.includes('requires more credits') || errorMessage.includes('can only afford')) {
        const tokenMatch = errorMessage.match(/can only afford (\d+)/);
        const maxAffordableTokens = tokenMatch ? parseInt(tokenMatch[1]) - 100 : 1500; // Leave buffer
        
        console.warn(`⚠️ Credit limit reached. Reducing max_tokens to ${maxAffordableTokens} and retrying...`);
        
        try {
          const retryCompletion = await client.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: maxAffordableTokens,
          });
          
          response = retryCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
          finalModel = model;
        } catch (retryError: any) {
          console.error('Retry with reduced tokens also failed:', retryError);
          throw new Error(`Credit limit exceeded. You can only afford ${maxAffordableTokens} tokens. Please upgrade your OpenRouter account at https://openrouter.ai/settings/credits or reduce the request size.`);
        }
      }
      // Handle invalid model (400/404) - fallback to deepseek-chat
      else if (provider === 'openrouter') {
        const isInvalidModel = (
          modelError?.status === 400 || 
          modelError?.status === 404 || 
          errorMessage.includes('Invalid model') || 
          errorMessage.includes('not a valid model') ||
          errorMessage.includes('model not found') ||
          errorMessage.includes('is not a valid model ID') ||
          modelError?.code === 'model_not_found'
        );
        
        if (isInvalidModel) {
          console.warn(`⚠️ Invalid model "${model}" for OpenRouter, attempting fallback to deepseek-chat`);
          
          try {
            const fallbackModel = 'deepseek/deepseek-chat';
            const fallbackClient = new OpenAI({
              apiKey: apiKey || process.env.OPENROUTER_API_KEY,
              baseURL: 'https://openrouter.ai/api/v1',
              defaultHeaders: {
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
                  ? `https://${process.env.VERCEL_URL}` 
                  : 'http://localhost:3000',
                'X-Title': 'Ecosyz Search - Open Resources',
              },
            });
            
            const fallbackCompletion = await fallbackClient.chat.completions.create({
              model: fallbackModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
              ],
              temperature: 0.7,
              max_tokens: 2000, // Reduced to avoid credit limit issues
            });
            
            response = fallbackCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            finalModel = fallbackModel;
          } catch (fallbackError: any) {
            console.error('Fallback model also failed:', fallbackError);
            throw modelError; // Throw original error
          }
        } else {
          throw modelError;
        }
      } else {
        throw modelError;
      }
    }

    return NextResponse.json({ response, model: finalModel });
  } catch (error: any) {
    console.error('=== CHAT API ERROR ===');
    console.error('Error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      error: error?.error,
      response: error?.response,
      responseData: error?.response?.data,
      responseHeaders: error?.response?.headers,
      provider: provider || 'unknown'
    });
    
    // Log OpenRouter specific rate limit headers if available
    if (provider === 'openrouter' && error?.response?.headers) {
      const headers = error?.response?.headers;
      console.error('OpenRouter Rate Limit Info:', {
        'x-ratelimit-limit': headers['x-ratelimit-limit'],
        'x-ratelimit-remaining': headers['x-ratelimit-remaining'],
        'x-ratelimit-reset': headers['x-ratelimit-reset'],
        'x-ratelimit-used': headers['x-ratelimit-used'],
      });
    }
    
    // Extract error message from various possible locations
    const errorMessage = error?.message || 
                        error?.error?.message || 
                        error?.error?.error?.message ||
                        error?.response?.data?.error?.message ||
                        'Unknown error occurred';
    const errorStatus = error?.status || 
                       error?.statusCode || 
                       error?.response?.status || 
                       500;
    
    // Handle API errors gracefully
    if (errorStatus === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your API key settings. Make sure OPENROUTER_API_KEY is configured.' },
        { status: 401 }
      );
    }
    
    if (errorStatus === 402) {
      // Enhanced credit limit error message
      let creditErrorMessage = errorMessage || 'Credit limit exceeded.';
      
      // Check if it's a negative balance issue
      if (errorMessage.includes('negative') || errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        creditErrorMessage = '⚠️ **Insufficient Credits**: Your OpenRouter account has insufficient credits or a negative balance.\n\n';
        creditErrorMessage += '**To fix this:**\n';
        creditErrorMessage += '1. Go to: https://openrouter.ai/settings/credits\n';
        creditErrorMessage += '2. Click "Add Credits" button\n';
        creditErrorMessage += '3. Add credits to your account\n';
        creditErrorMessage += '4. Try your request again\n\n';
        creditErrorMessage += '💡 **Free tier users:** You may need to add credits even on free tier for some models.';
      } else {
        creditErrorMessage += '\n\n**To add credits:**\n';
        creditErrorMessage += '1. Visit: https://openrouter.ai/settings/credits\n';
        creditErrorMessage += '2. Click "Add Credits" button\n';
        creditErrorMessage += '3. Add credits to continue\n\n';
        creditErrorMessage += '💡 **Current balance:** Check your balance at https://openrouter.ai/settings/credits';
      }
      
      return NextResponse.json(
        { 
          error: creditErrorMessage,
          type: 'insufficient_credits',
          actionUrl: 'https://openrouter.ai/settings/credits'
        },
        { status: 402 }
      );
    }
    
    if (errorStatus === 429) {
      // Check for rate limit reset time
      const headers = error?.response?.headers || {};
      const resetTime = headers['x-ratelimit-reset'] || 
                       headers['retry-after'] ||
                       headers['X-RateLimit-Reset'];
      
      let rateLimitMessage = 'Rate limit exceeded. Please try again later.';
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime) * 1000);
        rateLimitMessage += ` Rate limit resets at ${resetDate.toLocaleTimeString()}.`;
      }
      
      if (provider === 'openrouter') {
        rateLimitMessage += '\n\n💡 Check your OpenRouter rate limits at: https://openrouter.ai/settings/credits';
        rateLimitMessage += '\n💡 Free tier limits: ~10 requests/minute';
        rateLimitMessage += '\n💡 Upgrade for higher limits: https://openrouter.ai/settings/credits';
      }
      
      return NextResponse.json(
        { 
          error: rateLimitMessage,
          details: `You've hit the rate limit for ${provider || 'the provider'}. Try switching to Groq (free & fast) or wait a few minutes.`,
          resetTime: resetTime || null,
          rateLimitInfo: {
            limit: headers['x-ratelimit-limit'],
            remaining: headers['x-ratelimit-remaining'],
            reset: headers['x-ratelimit-reset'],
            used: headers['x-ratelimit-used']
          }
        },
        { status: 429 }
      );
    }

    // Return detailed error message for debugging
    return NextResponse.json(
      { 
        error: errorMessage || 'Failed to process chat request',
        details: error?.error || error?.response?.data || error?.cause || null,
        provider: provider || 'unknown',
        type: error?.name || 'Error'
      },
      { status: errorStatus }
    );
  }
}

