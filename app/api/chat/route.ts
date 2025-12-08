import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Provider configuration
type Provider = 'openai' | 'groq' | 'together' | 'huggingface';

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
};

// Detect provider from API key format or explicit provider
function detectProvider(apiKey: string, explicitProvider?: string): Provider {
  if (explicitProvider && ['openai', 'groq', 'together', 'huggingface'].includes(explicitProvider)) {
    return explicitProvider as Provider;
  }
  
  // Detect by API key prefix
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('hf_')) return 'huggingface';
  if (apiKey.length > 50 && !apiKey.startsWith('sk-')) return 'together';
  
  // Default to OpenAI
  return 'openai';
}

// Get provider config and create client
function createClient(apiKey: string, provider: Provider, model?: string) {
  const config = PROVIDER_CONFIGS[provider];
  const selectedModel = model || config.defaultModel;
  
  return {
    client: new OpenAI({
      apiKey,
      baseURL: config.baseURL,
    }),
    model: selectedModel,
  };
}

export async function POST(request: NextRequest) {
  let provider: Provider = 'openai'; // Declare outside try block for error handling
  
  try {
    const body = await request.json();
    const { message, context, apiKey: userApiKey, model: userModel, provider: userProvider } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use user-provided API key or fall back to environment variable
    // Priority: user-provided key > .env.local GROQ_API_KEY > .env GROQ_API_KEY > .env.local OPENAI_API_KEY > .env OPENAI_API_KEY
    const apiKey = userApiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    
    // Detect provider: explicit > from API key format > default to groq if GROQ_API_KEY exists, else openai
    let detectedProvider: Provider;
    if (userProvider) {
      detectedProvider = detectProvider('', userProvider);
    } else if (userApiKey) {
      detectedProvider = detectProvider(userApiKey);
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
        response: `I'm your Open Resources Assistant! To enable AI-powered responses, please configure your API key in the chat settings (click the settings icon in the chat header). This is an open-source project, so you'll need to provide your own API key.\n\n**FREE OPTIONS:**\n\n1. **Groq (Recommended - FREE & Fast)**\n   - Get API key: https://console.groq.com/keys\n   - Free tier with high limits\n   - Very fast responses\n\n2. **Together AI (FREE)**\n   - Get API key: https://api.together.xyz/\n   - Free tier available\n\n3. **Hugging Face (FREE)**\n   - Get API key: https://huggingface.co/settings/tokens\n   - Free tier available\n\n4. **OpenAI (Paid)**\n   - Get API key: https://platform.openai.com/api-keys\n\n**Setup:**\n- Add API key in chat settings (⚙️ icon)\n- Or add GROQ_API_KEY to your .env file\n\n**Recommended:** Start with Groq - it's free and fast!`
      });
    }

    const { client, model } = createClient(apiKey, provider, userModel);

    // Build system prompt with context
    let systemPrompt = `You are ChatGPT, an expert AI assistant specializing in open resources (research papers, datasets, code repositories, AI models, hardware designs, etc.). 
You work like ChatGPT - have natural conversations, answer questions, provide insights, and help users learn.

You have access to search results from open resources that the user has searched for. Use this context to provide informed, accurate answers.

Your role:
- Have natural, conversational interactions like ChatGPT
- Answer questions using the context from search results
- Provide summaries, explanations, and insights about the resources
- Suggest learning paths and next steps when relevant
- Be helpful, clear, and educational

Always use the search results context when answering questions. If asked about concepts, methodologies, or topics related to the resources, reference specific resources from the context.`;

    // Always include search context if available
    if (context?.hasContext && context?.resultsCount > 0 && context?.results?.length > 0) {
      systemPrompt += `\n\n=== AVAILABLE RESOURCES CONTEXT ===\n`;
      systemPrompt += `The user has searched for "${context.searchQuery || 'open resources'}" and found ${context.resultsCount} resources. Here are the detailed results you can reference:\n\n`;
      
      context.results.forEach((r: any, idx: number) => {
        systemPrompt += `[Resource ${idx + 1}]\n`;
        systemPrompt += `Title: ${r.title}\n`;
        systemPrompt += `Type: ${r.type || 'unknown'}\n`;
        systemPrompt += `Source: ${r.source || 'unknown'}\n`;
        if (r.description) {
          // Include full description for better context
          systemPrompt += `Description: ${r.description}\n`;
        }
        if (r.authors && r.authors.length > 0) {
          systemPrompt += `Authors: ${r.authors.join(', ')}\n`;
        }
        if (r.tags && r.tags.length > 0) {
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
        systemPrompt += `\n`;
      });

      systemPrompt += `\n=== INSTRUCTIONS ===\n`;
      systemPrompt += `- Use these resources as context for all conversations\n`;
      systemPrompt += `- Reference specific resources when relevant (e.g., "According to Resource 1...")\n`;
      systemPrompt += `- Provide summaries, explanations, and insights based on these resources\n`;
      systemPrompt += `- Answer questions naturally like ChatGPT, but use the resource context\n`;
      systemPrompt += `- If asked to summarize or provide a roadmap, use the resources above\n`;
      systemPrompt += `- Be conversational and helpful - work like ChatGPT with resource context\n`;
    } else {
      systemPrompt += `\n\nNote: No search results are currently available. You can still help with general questions about open resources, but you won't have specific resource context.`;
    }

    // Call AI API (works with OpenAI-compatible providers)
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1500, // Increased for detailed summaries and roadmaps
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Handle API errors gracefully
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your API key in chat settings.' },
        { status: 401 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          details: `You've hit the rate limit for ${provider}. Try switching to Groq (free & fast) or wait a few minutes.`
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

