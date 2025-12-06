import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // TODO: Integrate with your AI/LLM service (OpenAI, Anthropic, etc.)
    // For now, return a helpful response based on context
    const lowerMessage = message.toLowerCase();
    let response = '';

    if (context?.searchQuery && context?.resultsCount > 0) {
      // Context-aware responses
      if (lowerMessage.includes('help') || lowerMessage.includes('what') || lowerMessage.includes('how')) {
        response = `I can help you explore the ${context.resultsCount} open resources found for "${context.searchQuery}". You can ask me about:\n\n` +
          `• Specific resources from your search results\n` +
          `• Similar resources or related topics\n` +
          `• Understanding research papers or datasets\n` +
          `• Finding code repositories or models\n` +
          `• Licensing information\n\n` +
          `What would you like to know more about?`;
      } else if (lowerMessage.includes('paper') || lowerMessage.includes('research')) {
        response = `I can help you understand research papers! Based on your search for "${context.searchQuery}", you've found ${context.resultsCount} resources. ` +
          `Would you like me to help you find papers on a specific topic, understand a paper's methodology, or locate related research?`;
      } else if (lowerMessage.includes('dataset') || lowerMessage.includes('data')) {
        response = `I can help you explore datasets! For your search "${context.searchQuery}", there are ${context.resultsCount} resources available. ` +
          `I can help you understand dataset formats, find datasets for specific use cases, or locate related data sources.`;
      } else if (lowerMessage.includes('code') || lowerMessage.includes('repository') || lowerMessage.includes('github')) {
        response = `I can help you find and understand code repositories! Your search "${context.searchQuery}" returned ${context.resultsCount} resources. ` +
          `I can help you find code for specific tasks, understand repository structures, or locate similar projects.`;
      } else if (lowerMessage.includes('model') || lowerMessage.includes('ai') || lowerMessage.includes('ml')) {
        response = `I can help you explore AI/ML models! For "${context.searchQuery}", you've found ${context.resultsCount} resources. ` +
          `I can help you understand model architectures, find models for specific tasks, or locate pre-trained models.`;
      } else {
        response = `I understand you're asking about "${message}". ` +
          `Based on your search for "${context.searchQuery}", I found ${context.resultsCount} open resources. ` +
          `I can help you explore these resources, understand their content, or find similar ones. What specific aspect would you like to know more about?`;
      }
    } else {
      // General responses when no search context
      if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        response = `I'm your Open Resources Assistant! I can help you:\n\n` +
          `• Search and explore open resources (papers, datasets, code, models)\n` +
          `• Understand research papers and their findings\n` +
          `• Find datasets for your projects\n` +
          `• Locate code repositories and examples\n` +
          `• Discover AI/ML models and tools\n` +
          `• Answer questions about licensing and usage\n\n` +
          `Try searching for resources first, then ask me questions about them!`;
      } else {
        response = `I'm here to help you explore open resources! You can search for papers, datasets, code repositories, AI models, and more. ` +
          `Once you have search results, I can help you understand them better or find related resources. ` +
          `What would you like to explore?`;
      }
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
