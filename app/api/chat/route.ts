import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, apiKey: userApiKey, model: userModel } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use user-provided API key or fall back to environment variable
    const apiKey = userApiKey || process.env.OPENAI_API_KEY;
    const model = userModel || process.env.OPENAI_MODEL || 'gpt-5.1';

    // Check if any API key is configured
    if (!apiKey) {
      console.warn('No OpenAI API key found (neither user-provided nor environment variable)');
      return NextResponse.json({
        response: `I'm your Open Resources Assistant! To enable AI-powered responses, please configure your OpenAI API key in the chat settings (click the settings icon in the chat header). This is an open-source project, so you'll need to provide your own API key.\n\nYou can get your API key from https://platform.openai.com/api-keys`
      });
    }

    // Create OpenAI client with the provided API key
    const openaiClient = new OpenAI({
      apiKey: apiKey,
    });

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

    // Call OpenAI API with increased token limit for summaries and roadmaps
    const completion = await openaiClient.chat.completions.create({
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
    
    // Handle OpenAI API errors gracefully
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.' },
        { status: 401 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

