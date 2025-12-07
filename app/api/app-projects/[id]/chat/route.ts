import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let provider: Provider = 'openai'; // Declare outside try block for error handling
  
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
      include: {
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

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      message, 
      apiKey: userApiKey, 
      model: userModel, 
      provider: userProvider,
      currentFile 
    } = body;

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

    if (!apiKey) {
      return NextResponse.json({
        response: `I'm your AI Code Assistant! To enable AI-powered code generation, please configure your API key.\n\n**FREE OPTIONS:**\n\n1. **Groq (Recommended - FREE & Fast)**\n   - Get API key: https://console.groq.com/keys\n   - Free tier with high limits\n   - Very fast responses\n\n2. **Together AI (FREE)**\n   - Get API key: https://api.together.xyz/\n   - Free tier available\n\n3. **Hugging Face (FREE)**\n   - Get API key: https://huggingface.co/settings/tokens\n   - Free tier available\n\n4. **OpenAI (Paid)**\n   - Get API key: https://platform.openai.com/api-keys\n\n**Setup:**\n- Add API key in chat settings (⚙️ icon)\n- Or add GROQ_API_KEY to your .env file\n\n**Recommended:** Start with Groq - it's free and fast!`,
        suggestions: [],
      });
    }

    const { client, model } = createClient(apiKey, provider, userModel);

    // Build project context for the AI
    let projectContext = `=== PROJECT CONTEXT ===\n`;
    projectContext += `Project: ${project.title}\n`;
    projectContext += `Type: ${project.type}\n`;
    if (project.framework) {
      projectContext += `Framework: ${project.framework}\n`;
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

    // Build system prompt for code generation
    let systemPrompt = `You are an expert AI code assistant specializing in ${project.framework || project.type} development. Your role is to help users build applications through natural conversation.

${projectContext}

=== YOUR CAPABILITIES ===
- Generate, modify, and explain code
- Create new files or update existing ones
- Provide code suggestions and best practices
- Debug and fix code issues
- Answer questions about the codebase
- Suggest improvements and optimizations

=== INSTRUCTIONS ===
- Always consider the full project context when generating code
- Maintain consistency with existing code style and patterns
- When suggesting code changes, specify which file(s) need to be modified
- Provide clear explanations for your code suggestions
- If creating new files, suggest appropriate file paths
- Follow best practices for ${project.framework || project.type} development
- Be concise but thorough in your responses
- IMPORTANT: When creating App.js, make sure it imports and renders ALL components in the project (Home, Contact, Projects, Navigation, etc.)
- App.js should be the main component that combines all other components into a complete application

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

=== RESPONSE FORMAT ===
When suggesting code changes, structure your response as:
1. Explanation of what you're doing
2. Code blocks with file paths using this EXACT format:
   \`\`\`file:path/to/file.js
   // Your code here
   \`\`\`
   
   IMPORTANT: Use \`\`\`file:path/to/file.js\` format (with "file:" prefix) so files are automatically created.
   Examples:
   - \`\`\`file:src/App.jsx
   - \`\`\`file:src/index.js
   - \`\`\`file:src/App.css
   
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

    // Call AI API (works with OpenAI-compatible providers)
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    // Parse code blocks and create/update files
    // Match both ```file:path and ```path formats
    const codeBlockRegex = /```(?:file:)?([^\n`]+)\n([\s\S]*?)```/g;
    const createdFiles: Array<{ path: string; success: boolean; error?: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
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
      
      if (!hasExtension && !hasPathSeparator) {
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
      } catch (fileError: any) {
        console.error(`Error creating file ${filePath}:`, fileError);
        createdFiles.push({ 
          path: filePath, 
          success: false, 
          error: fileError.message || 'Unknown error' 
        });
      }
    }

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

    return NextResponse.json({
      response,
      suggestions: [],
      filesCreated: createdFiles,
    });
  } catch (error: any) {
    console.error('Code chat API error:', error);

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

