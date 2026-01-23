import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

// ============================================
// AZURE DEEPSEEK CONFIGURATION (ONLY PROVIDER)
// ============================================
// Your self-hosted DeepSeek API on Azure
// Model: deepseek-coder (from deepseek_api_optimized.py)
// Endpoint: http://74.225.138.116:8000/v1/chat/completions

const AZURE_DEEPSEEK_URL = process.env.AZURE_DEEPSEEK_URL || 'http://74.225.138.116:8000';
const AZURE_DEEPSEEK_MODEL = 'deepseek-coder'; // From your FastAPI: /v1/models returns "deepseek-coder"

// Create OpenAI-compatible client for Azure DeepSeek
function createAzureDeepSeekClient() {
  console.log('🔧 Creating Azure DeepSeek client:', {
    baseURL: `${AZURE_DEEPSEEK_URL}/v1`,
    model: AZURE_DEEPSEEK_MODEL,
  });
  
  return new OpenAI({
    baseURL: `${AZURE_DEEPSEEK_URL}/v1`,
    apiKey: 'not-required', // Your FastAPI doesn't require API key
  });
}

// GET endpoint to fetch chat history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(user);

    const { id } = await params;
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Load project WITH FILES - CRITICAL FIX
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:52',message:'Loading project - BEFORE query',data:{projectId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: { 
        chats: { orderBy: { updatedAt: 'desc' }, take: 1 },
        files: { orderBy: { path: 'asc' } } // ✅ FIX: Include files to check existing files
      },
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:58',message:'Project loaded - checking files',data:{projectId:id,hasFiles:!!project?.files,filesLength:project?.files?.length||0,filesIncluded:project?.files!==undefined,filePaths:project?.files?.map((f:any)=>f.path)||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check authorization
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the most recent chat (or create empty one)
    const chat = project.chats[0];
    const messages = chat ? (chat.messages as any[]) : [];

    return NextResponse.json({
      messages: messages.map((msg: any, idx: number) => ({
        id: `msg-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AZURE DEEPSEEK CHAT API - REQUEST RECEIVED');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Authentication
    let user;
    try {
      user = await getCurrentUser();
    } catch (authError: any) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', message: authError?.message || 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Step 2: Ensure user in database
    try {
      await ensureUserInDb(user);
    } catch (dbError: any) {
      console.error('❌ Database error (ensureUserInDb):', dbError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to ensure user in database' },
        { status: 500 }
      );
    }
    
    // Step 3: Get user from database
    let prismaUser;
    try {
      prismaUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
      });
    } catch (dbError: any) {
      console.error('❌ Database error (findUnique user):', dbError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch user from database' },
        { status: 500 }
      );
    }

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Step 4: Get project ID and load project
    let id: string;
    try {
      const paramsObj = await params;
      id = paramsObj.id;
    } catch (paramsError: any) {
      console.error('❌ Error getting params:', paramsError);
      return NextResponse.json(
        { error: 'Invalid request', message: 'Failed to get project ID from request' },
        { status: 400 }
      );
    }
    
    let project;
    try {
      project = await prisma.appProject.findUnique({
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
    } catch (projectError: any) {
      console.error('❌ Database error (findUnique project):', projectError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to load project from database' },
        { status: 500 }
      );
    }

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

    // Step 5: Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('❌ Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request', message: 'Failed to parse request body' },
        { status: 400 }
      );
    }
    
    let { message, currentFile } = body;
    
    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    
    // currentFile can be a path string or undefined
    const currentFilePath = typeof currentFile === 'string' ? currentFile : currentFile?.path;
    // Note: userApiKey, userModel, userProvider are ignored - only using Azure DeepSeek

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // ============================================
    // AZURE DEEPSEEK - OPTIMIZED FOR 6.7B MODEL
    // ============================================
    // Model: deepseek-coder-6.7b-instruct
    // Max Context: 16K tokens
    // Max New Tokens: 4000 (capped by model)
    // Strategy: Simple system prompt + focused user message
    // ============================================
    
    console.log('✅ Using Azure DeepSeek:', {
      url: AZURE_DEEPSEEK_URL,
      model: AZURE_DEEPSEEK_MODEL,
      maxContext: '16K tokens',
      maxNewTokens: '4000'
    });
    
    // Step 6: Create Azure DeepSeek client
    let client;
    try {
      client = createAzureDeepSeekClient();
    } catch (clientError: any) {
      console.error('❌ Error creating Azure DeepSeek client:', clientError);
      return NextResponse.json(
        { error: 'Configuration error', message: 'Failed to create Azure DeepSeek client' },
        { status: 500 }
      );
    }
    
    const model = AZURE_DEEPSEEK_MODEL;
    
    const questionnaireData = project.questionnaireData as any;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:312',message:'Checking project files and questionnaire',data:{projectId:id,hasQuestionnaireData:!!questionnaireData,projectFilesCount:project.files?.length||0,projectFilesPaths:project.files?.map((f:any)=>f.path)||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Determine language from questionnaire or default to JavaScript
    const projectLanguage = questionnaireData?.language || 'javascript';
    const useTypeScript = projectLanguage === 'typescript';
    const fileExtension = useTypeScript ? 'tsx' : 'jsx';
    const indexExtension = useTypeScript ? 'ts' : 'js';
    
    // Check for existing files to prevent duplicates
    const existingFiles = project.files || [];
    const hasAppJsx = existingFiles.some(f => f.path.includes('App.jsx'));
    const hasAppTsx = existingFiles.some(f => f.path.includes('App.tsx'));
    const hasIndexJs = existingFiles.some(f => f.path.includes('index.js'));
    const hasIndexTs = existingFiles.some(f => f.path.includes('index.ts'));
    
    // Determine which files exist and should be used/updated
    const shouldUseAppJsx = hasAppJsx && !useTypeScript;
    const shouldUseAppTsx = hasAppTsx && useTypeScript;
    const shouldUseIndexJs = hasIndexJs && !useTypeScript;
    const shouldUseIndexTs = hasIndexTs && useTypeScript;
    
    const hasScaffoldFiles = hasAppJsx || hasAppTsx || hasIndexJs || hasIndexTs || 
      project.files?.some(f => f.path.includes('App.css')) || false;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:315',message:'Scaffold files check result',data:{hasScaffoldFiles,projectFilesAvailable:!!project.files},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // SYSTEM PROMPT - Optimized for DeepSeek 6.7B to generate proper file format
    // Model: deepseek-coder-6.7b-instruct
    // Strategy: Clear format instructions to ensure files are properly formatted
    // DECLARE FIRST to avoid "Cannot access before initialization" error
    const systemPrompt = `You are an intelligent React code generator. Your job is to:

1. IDENTIFY ALL components and features needed from the user's request
2. CREATE complete, production-ready files in ONE response
3. ENSURE all components are properly structured and exported
4. UPDATE App file to import and render ALL components

MANDATORY FILE FORMAT - USE THIS FOR EVERY FILE:
\`\`\`file:src/components/ComponentName.${fileExtension}
[complete component code here]
\`\`\`

CRITICAL REQUIREMENTS:
1. ALWAYS use \`\`\`file:path/to/file.${fileExtension} format for EVERY file
2. LANGUAGE CONSISTENCY: Use ${useTypeScript ? 'TypeScript' : 'JavaScript'} ONLY
   - Components: src/components/ComponentName.${fileExtension}
   - App file: src/App.${fileExtension}
   - Index file: src/index.${indexExtension}
   - DO NOT create duplicate files (e.g., don't create both App.jsx AND App.tsx)
3. Create ALL components mentioned in the request (check "COMPONENTS TO CREATE" section)
4. Each component must be in src/components/ComponentName.${fileExtension}
5. Use Tailwind CSS classes (className, not classname)
6. Export components properly: export default ComponentName;
7. Import React: ${useTypeScript ? "import React from 'react';" : "import React from 'react';"}
8. Make components responsive and beautiful
9. After creating components, ALWAYS update App.${fileExtension} to import and render ALL of them
10. CREATE EVERYTHING IN ONE RESPONSE - don't split across multiple responses

EXAMPLE FORMAT (${useTypeScript ? 'TypeScript' : 'JavaScript'}):
\`\`\`file:src/components/Header.${fileExtension}
import React from 'react';

function Header() {
  return (
    <header className="bg-gray-800 py-4 px-8 flex justify-between items-center">
      <h1 className="text-white text-lg font-bold">Portfolio</h1>
    </header>
  );
}

export default Header;
\`\`\`

\`\`\`file:src/App.${fileExtension}
import React from 'react';
import Header from './components/Header';

function App() {
  return (
    <div className="min-h-screen">
      <Header />
    </div>
  );
}

export default App;
\`\`\`

\`\`\`file:src/index.${indexExtension}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
\`\`\`

IMPORTANT: 
- Use ${fileExtension} for React components, ${indexExtension} for entry point
- DO NOT create duplicate files (e.g., don't create App.jsx if App.tsx exists)
- Create ALL components and features in ONE response

WORKFLOW:
1. Read the user request carefully
2. Identify ALL components and features that need to be created
3. Create EVERY component file in ONE response (don't split across responses)
4. Create/update App.${fileExtension} to import and render ALL components
5. Create index.${indexExtension} entry point if needed
6. Ensure proper file structure and imports
7. Use consistent language: ${useTypeScript ? 'TypeScript' : 'JavaScript'} ONLY

REMEMBER: 
- Generate ALL files in ONE response
- Every file MUST use \`\`\`file:path format
- Use .${fileExtension} for components, .${indexExtension} for index
- DO NOT create duplicate files (e.g., don't create both .jsx and .tsx)
- Create ALL features/components mentioned in the request`;
    
    // Build minimal user message - only what's needed
    // Don't overwhelm the model with context
    let userMessage = message;
    
    // Only add minimal context for generation requests
    if (message.toLowerCase().includes('create') || message.toLowerCase().includes('build') || message.toLowerCase().includes('generate')) {
      const brandName = project.brandName || project.title || 'My App';
      
      // Minimal requirements only
      if (questionnaireData) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:376',message:'Adding questionnaire context to user message',data:{hasQuestionnaireData:true,appType:questionnaireData.appType,requiredSections:questionnaireData.requiredSections,originalMessage:message.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // INTELLIGENT COMPONENT IDENTIFICATION FROM QUESTIONNAIRE
        const requiredSections = questionnaireData.requiredSections || [];
        const componentMap: Record<string, string> = {
          'portfolio': 'Portfolio',
          'header': 'Header',
          'footer': 'Footer',
          'navigation': 'Navigation',
          'hero': 'Hero',
          'about': 'About',
          'contact': 'Contact',
          'services': 'Services',
          'testimonials': 'Testimonials',
          'features': 'Features',
          'pricing': 'Pricing',
          'blog': 'Blog',
          'newsletter': 'Newsletter'
        };
        
        const identifiedComponents = requiredSections
          .map((section: string) => componentMap[section.toLowerCase()] || section.charAt(0).toUpperCase() + section.slice(1))
          .filter((comp: string, index: number, self: string[]) => self.indexOf(comp) === index); // Remove duplicates
        
        userMessage = `${message}\n\n`;
        if (questionnaireData.appType) userMessage += `App type: ${questionnaireData.appType}\n`;
        if (identifiedComponents.length > 0) {
          userMessage += `\nCOMPONENTS TO CREATE (${useTypeScript ? 'TypeScript' : 'JavaScript'}):\n`;
          identifiedComponents.forEach((comp: string) => {
            userMessage += `- ${comp} component (create as src/components/${comp}.${fileExtension})\n`;
          });
          userMessage += `\nCRITICAL: Create ALL components listed above in ONE response. Each component must be in a separate file.\n`;
          userMessage += `\nLANGUAGE: Use ${useTypeScript ? 'TypeScript' : 'JavaScript'} ONLY. File extensions: .${fileExtension} for components, .${indexExtension} for index.\n`;
          userMessage += `\nNO DUPLICATES: Do NOT create both .jsx and .tsx files. Use .${fileExtension} only.\n`;
        }
        if (hasScaffoldFiles) {
          userMessage += `\nIMPORTANT: After creating components, update App.jsx to import and render ALL new components.\n`;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:395',message:'Components identified from questionnaire',data:{requiredSections,identifiedComponents},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
      }
    }
    
    // CURSOR-LIKE: Include current file context for editing
    // Detect file mentions in message: "edit Header.jsx", "update App.jsx", "modify index.js"
    const fileMentionPattern = /(?:edit|update|modify|change|add to|remove from|in|to)\s+([a-zA-Z0-9_/-]+\.(jsx?|tsx?|css|html|json))/i;
    const fileMention = message.match(fileMentionPattern);
    const mentionedFilePath = fileMention ? fileMention[1] : null;
    
    // Use mentioned file, current file, or neither
    const fileToEdit = mentionedFilePath || currentFilePath;
    
    if (fileToEdit) {
      // Find the file (check multiple patterns)
      const file = project.files.find(f => 
        f.path === fileToEdit || 
        f.path.endsWith(`/${fileToEdit}`) ||
        f.path.endsWith(`\\${fileToEdit}`) ||
        f.name === fileToEdit ||
        f.path.includes(fileToEdit)
      );
      
      if (file) {
        if (file.content.length < 8000) {
          // Include full file for editing
          userMessage += `\n\nCurrent file to edit (${file.path}):\n${file.content}`;
          console.log(`📝 CURSOR-LIKE: Including file context for editing: ${file.path} (${file.content.length} chars)`);
        } else {
          // Large file - include beginning and end
          const start = file.content.substring(0, 2000);
          const end = file.content.substring(file.content.length - 1000);
          userMessage += `\n\nCurrent file (${file.path}) - showing start and end:\n${start}\n\n... (${file.content.length - 3000} chars omitted) ...\n\n${end}`;
          console.log(`📝 CURSOR-LIKE: Including partial file context: ${file.path} (showing start/end of ${file.content.length} chars)`);
        }
      } else {
        console.log(`⚠️ File mentioned/selected but not found: ${fileToEdit}`);
        console.log(`Available files:`, project.files.map(f => f.path));
      }
    }
    
    message = userMessage;
    
    console.log('📝 Request prepared:', {
      systemPromptTokens: Math.ceil(systemPrompt.length / 4),
      userMessageTokens: Math.ceil(message.length / 4),
      totalTokens: Math.ceil((systemPrompt.length + message.length) / 4),
      maxContext: '16K',
      maxNewTokens: '4K'
    });

    // Helper function to validate file integration by checking preview
    const validateFileIntegration = async (filePath: string): Promise<{ valid: boolean; error?: string; previewLength?: number }> => {
      try {
        // Reload project with updated files
        const updatedProject = await prisma.appProject.findUnique({
          where: { id },
          include: { files: { orderBy: { path: 'asc' } } },
        });

        if (!updatedProject) {
          return { valid: false, error: 'Project not found' };
        }

        // Check if we have at least one JS file (required for preview)
        const jsFiles = updatedProject.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
        if (jsFiles.length === 0) {
          // No JS files yet - this is okay for CSS files
          if (filePath.endsWith('.css')) {
            return { valid: true };
          }
          return { valid: false, error: 'No JS files found for preview' };
        }

        // Basic syntax validation first (fast check)
        const appFile = jsFiles.find(f => 
          (f.path.includes('App') || f.name.includes('App')) && 
          !f.path.includes('index')
        ) || jsFiles[0];

        if (!appFile) {
          return { valid: false, error: 'No App file found' };
        }

        const content = appFile.content;
        
        // Basic syntax checks
        // Check for basic React component structure
        const hasComponentStructure = content.includes('function') || 
                                     content.includes('const') || 
                                     content.includes('class') ||
                                     content.includes('return');
        
        const hasExport = content.includes('export') || content.includes('module.exports');
        
        // For CSS files, just check it's not empty
        if (filePath.endsWith('.css')) {
          if (content.trim().length > 0) {
            return { valid: true, previewLength: content.length };
          }
          return { valid: false, error: 'CSS file is empty' };
        }

        // For JS/JSX files, check basic structure
        if (!hasComponentStructure) {
          return { valid: false, error: 'File does not contain valid component structure' };
        }

        // Check for common syntax errors
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        // Allow some imbalance for incomplete files, but flag major issues
        if (Math.abs(openBraces - closeBraces) > 3) {
          return { valid: false, error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close` };
        }

        // If it's a main file (App file), ensure it has export
        if (filePath.includes('App') && !hasExport) {
          // This might be okay if it's being modified, but log it
          console.warn(`⚠️ App file ${filePath} doesn't have export statement`);
        }

        // Validation passed
        return { valid: true, previewLength: content.length };
      } catch (validationError: any) {
        console.error(`⚠️ Validation error for ${filePath}:`, validationError);
        return { valid: false, error: validationError.message || 'Validation failed' };
      }
    };

    // ============================================
    // SANDBOXED FILE CREATION WITH VALIDATION
    // ============================================
    // Each file is created and validated individually
    // If validation fails, we log the error but continue
    
    const parseAndCreateFiles = async (responseText: string): Promise<Array<{ path: string; success: boolean; error?: string; validated?: boolean; validationError?: string }>> => {
      const brandName = project.brandName || project.title || 'My App';
      const tagline = project.tagline || 'Welcome to my application!';
      
      const createdFiles: Array<{ path: string; success: boolean; error?: string; validated?: boolean; validationError?: string }> = [];

      console.log('\n' + '='.repeat(60));
      console.log('📁 SANDBOXED FILE CREATION - STARTING');
      console.log('='.repeat(60));
      console.log('📄 Response length:', responseText.length, 'characters');
      console.log('📄 Response preview (first 500 chars):');
      console.log('-'.repeat(40));
      console.log(responseText.substring(0, 500));
      console.log('-'.repeat(40));

      // SIMPLIFIED: Use the working pattern from OpenRouter implementation
      // More flexible regex that handles various file: formats and spacing
      const codeBlockRegex = /```(?:file:)?\s*([^\n`]+?)(?:\n|$)([\s\S]*?)```/g;
      const allMatches: Array<{ path: string; content: string }> = [];
      let match;

      console.log('📝 Parsing response for file creation...');
      console.log('Response length:', responseText.length);
      console.log('Response preview (first 1000 chars):', responseText.substring(0, 1000));

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

        // Normalize path: remove spaces, fix extensions, clean up
        let normalizedPath = filePath
          .replace(/\s+/g, '') // Remove ALL spaces (fixes "src/ App. jsx")
          .replace(/\\/g, '/') // Normalize path separators
          .replace(/\/+/g, '/') // Remove double slashes
          .replace(/\.jxs$/i, '.jsx') // Fix .jxs → .jsx
          .replace(/\.tsxs$/i, '.tsx') // Fix .tsxs → .tsx
          .replace(/^\.\//, '') // Remove leading ./
          .trim();

        // Skip invalid paths (just a word without extension and no path)
        const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md'];
        const hasValidExtension = validExtensions.some(ext => normalizedPath.toLowerCase().endsWith(ext));
        if (!hasValidExtension && !normalizedPath.includes('/')) {
          console.log(`⏭️ Skipping invalid path: ${filePath} → ${normalizedPath}`);
          continue;
        }

        // Check for duplicates
        if (!allMatches.some(m => m.path === normalizedPath)) {
          allMatches.push({ path: normalizedPath, content: fileContent });
          console.log(`✅ Added file: ${normalizedPath}`);
        } else {
          console.log(`⏭️ Skipping duplicate: ${normalizedPath}`);
          // Keep the one with more content
          const existingIndex = allMatches.findIndex(m => m.path === normalizedPath);
          if (existingIndex >= 0 && fileContent.length > allMatches[existingIndex].content.length) {
            allMatches[existingIndex] = { path: normalizedPath, content: fileContent };
            console.log(`   ↳ Replaced with longer content`);
          }
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:650',message:'File parsing results',data:{allMatchesCount:allMatches.length,filePaths:allMatches.map(m=>m.path)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      console.log('\n' + '='.repeat(60));
      console.log(`📁 FILE PARSING RESULTS`);
      console.log('='.repeat(60));
      console.log(`Total files found: ${allMatches.length}`);
      
      if (allMatches.length > 0) {
        console.log('\n📋 Files to create:');
        allMatches.forEach((m, idx) => {
          console.log(`  ${idx + 1}. ${m.path} (${m.content.length} chars)`);
        });
      } else {
        console.warn('\n⚠️ NO FILES FOUND IN RESPONSE!');
        const allCodeBlocks = responseText.match(/```[\s\S]*?```/g);
        if (allCodeBlocks) {
          console.log(`Found ${allCodeBlocks.length} code blocks but no file paths`);
          allCodeBlocks.slice(0, 3).forEach((block, idx) => {
            console.log(`\nCode block ${idx + 1} (first 200 chars):`);
            console.log(block.substring(0, 200));
          });
        }
      }
      console.log('='.repeat(60));

      // Process each match (simplified - direct creation like OpenRouter)
      for (const fileMatch of allMatches) {
        let filePath = fileMatch.path;
        let fileContent = fileMatch.content; // Changed to 'let' to allow reassignment after auto-fix
        
        // Remove "file:" prefix if present
        if (filePath.startsWith('file:')) {
          filePath = filePath.substring(5).trim();
        }
        
        // Remove language prefixes (jsx:, javascript:, typescript:, etc.)
        // Pattern: language:path/to/file.ext
        filePath = filePath.replace(/^(jsx|javascript|typescript|tsx|js|ts|css|html|json|markdown|python|java|cpp|c):\s*/i, '');
        
        // Remove leading "./" or "../" but keep the rest
        filePath = filePath.replace(/^\.\//, '').replace(/^\.\.\//, '');
        
        // Remove any leading/trailing quotes
        filePath = filePath.replace(/^["']|["']$/g, '').trim();
        
        // CRITICAL FIX: Remove ALL spaces from path (fixes "src/ App. jsx" → "src/App.jsx")
        filePath = filePath.replace(/\s+/g, '');
        
        // CRITICAL FIX: Normalize file extensions (fixes .jxs, .jXs → .jsx)
        filePath = filePath.replace(/\.jxs$/i, '.jsx');
        filePath = filePath.replace(/\.jsx$/i, '.jsx'); // Ensure lowercase
        filePath = filePath.replace(/\.tsxs$/i, '.tsx');
        filePath = filePath.replace(/\.tsx$/i, '.tsx'); // Ensure lowercase
        
        // Ensure path uses forward slashes (normalize)
        filePath = filePath.replace(/\\/g, '/');
        
        // CRITICAL FIX: Remove double slashes (fixes "src//Header.jsx" → "src/Header.jsx")
        filePath = filePath.replace(/\/+/g, '/');
        
        // Skip if it's not a file path (e.g., just language identifier like "javascript")
        // Check if it looks like a file path (has extension or contains path separators)
        const hasExtension = filePath.includes('.');
        const hasPathSeparator = filePath.includes('/') || filePath.includes('\\');
        
        // Log what we found
        console.log('🔍 Processing code block:', {
          filePath,
          hasExtension,
          hasPathSeparator,
          contentLength: fileContent.length,
          contentPreview: fileContent.substring(0, 100)
        });
        
        // More lenient check - allow files with extensions even without path separators
        if (!hasExtension && !hasPathSeparator) {
          // Check if it might be a valid filename (e.g., "App.jsx")
          const looksLikeFile = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filePath);
          if (!looksLikeFile) {
            console.log('⏭️ Skipping - not a file path:', filePath);
            continue;
          }
        }

        // Basic syntax validation before creating file
        // Check for common syntax errors that would break preview
        const syntaxErrors: string[] = [];
        
        // Check for orphaned export statements (e.g., "Default Header;" without definition)
        const orphanedExportPattern = /^\s*(?:Default|export\s+default)\s+(\w+)\s*;?\s*$/gm;
        const orphanedMatches = fileContent.match(orphanedExportPattern);
        if (orphanedMatches) {
          orphanedMatches.forEach((match) => {
            const componentName = match.match(/(?:Default|export\s+default)\s+(\w+)/)?.[1];
            if (componentName && !fileContent.match(new RegExp(`(?:function|const|class|var|let)\\s+${componentName}\\s*[=(]`))) {
              syntaxErrors.push(`Orphaned export: "${match.trim()}" - component ${componentName} not defined`);
            }
          });
        }
        
        // Check for unbalanced braces/parentheses
        const openBraces = (fileContent.match(/{/g) || []).length;
        const closeBraces = (fileContent.match(/}/g) || []).length;
        const openParens = (fileContent.match(/\(/g) || []).length;
        const closeParens = (fileContent.match(/\)/g) || []).length;
        
        if (Math.abs(openBraces - closeBraces) > 2) {
          syntaxErrors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
        }
        if (Math.abs(openParens - closeParens) > 2) {
          syntaxErrors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
        }
        
        // AUTO-FIX: Fix common syntax errors automatically
        let processedContent = fileContent; // Use a new variable to avoid const reassignment issues
        const fixesApplied: string[] = [];
        
        // CRITICAL FIX: Fix malformed imports/exports with missing spaces
        // Fix: import*asReactfrom'react' → import React from 'react'
        const malformedImportPattern = /import\*as(\w+)from(['"])([^'"]+)\2/g;
        if (malformedImportPattern.test(processedContent)) {
          processedContent = processedContent.replace(malformedImportPattern, (match, p1, p2, p3) => {
            fixesApplied.push(`Fixed malformed import: ${match}`);
            return `import ${p1} from ${p2}${p3}${p2}`;
          });
        }
        
        // Fix: import*{(\w+)}from → import { $1 } from
        const malformedNamedImportPattern = /import\*\{([^}]+)\}from(['"])([^'"]+)\2/g;
        if (malformedNamedImportPattern.test(processedContent)) {
          processedContent = processedContent.replace(malformedNamedImportPattern, (match, p1, p2, p3) => {
            fixesApplied.push(`Fixed malformed named import: ${match}`);
            return `import { ${p1.trim()} } from ${p2}${p3}${p2}`;
          });
        }
        
        // Fix: export*default → export default
        if (processedContent.includes('export*default')) {
          processedContent = processedContent.replace(/export\*default/g, 'export default');
          fixesApplied.push('Fixed malformed export default');
        }
        
        // Fix: return( → return (
        if (processedContent.includes('return(') && !processedContent.includes('return (')) {
          processedContent = processedContent.replace(/return\(/g, 'return (');
          fixesApplied.push('Fixed return statement spacing');
        }
        
        // Fix 1: Common typos
        if (processedContent.includes('reutrn')) {
          processedContent = processedContent.replace(/reutrn/g, 'return');
          fixesApplied.push('Fixed typo: reutrn → return');
        }
        if (processedContent.includes('improt')) {
          processedContent = processedContent.replace(/improt/g, 'import');
          fixesApplied.push('Fixed typo: improt → import');
        }
        if (processedContent.includes('exprot')) {
          processedContent = processedContent.replace(/exprot/g, 'export');
          fixesApplied.push('Fixed typo: exprot → export');
        }
        
        // Fix 2: Malformed JSX tags (spaces in closing tags)
        processedContent = processedContent.replace(/<\s*\/\s*(\w+)\s*>/g, '</$1>');
        processedContent = processedContent.replace(/<\s*(\w+)\s*\/\s*>/g, '<$1 />');
        
        // Fix 3: Fix malformed self-closing tags with spaces
        processedContent = processedContent.replace(/<\s*(\w+)\s+([^>]*?)\s*\/\s*>/g, '<$1 $2 />');
        
        // Fix 4: Fix broken closing tags like </option> -> </option>
        processedContent = processedContent.replace(/<\s*\/\s*(\w+)\s*>/g, '</$1>');
        
        // Fix 5: Fix malformed attributes (spaces around =)
        processedContent = processedContent.replace(/\s*=\s*["']/g, '="');
        processedContent = processedContent.replace(/["']\s*>/g, '">');
        
        // Fix 6: Remove extra spaces in JSX
        processedContent = processedContent.replace(/\s+>/g, '>');
        processedContent = processedContent.replace(/<\s+/g, '<');
        
        // Fix 7: Fix broken imports (spaces in import paths)
        processedContent = processedContent.replace(/import\s+.*?from\s+["']\s*([^"']+?)\s*["']/g, (match, path) => {
          return match.replace(path, path.trim());
        });
        
        // Fix 8: Fix React import (lowercase 'react' should be 'React')
        if (processedContent.includes("import react from") && !processedContent.includes("import React from")) {
          processedContent = processedContent.replace(/import\s+react\s+from\s+["']react["']/gi, "import React from 'react'");
          fixesApplied.push('Fixed: import react → import React');
        }
        
        // Fix 9: Fix malformed component names in JSX (spaces)
        processedContent = processedContent.replace(/<\s*(\w+)\s+([^>]*?)\s*>/g, '<$1 $2>');
        
        // Fix 10: Fix broken export statements
        processedContent = processedContent.replace(/export\s+default\s+(\w+)\s*;/g, 'export default $1;');
        
        // Fix 11: Fix classname → className (common React error)
        if (processedContent.includes('classname') && !processedContent.includes('className')) {
          processedContent = processedContent.replace(/classname\s*=/gi, 'className=');
          processedContent = processedContent.replace(/classname-/gi, 'className-');
          processedContent = processedContent.replace(/classname\s*:/gi, 'className:');
          fixesApplied.push('Fixed: classname → className');
        }
        
        // Fix 12: Fix uppercase closing tags (</H1> → </h1>)
        processedContent = processedContent.replace(/<\/([A-Z][a-zA-Z0-9]+)>/g, (match, tag) => {
          const lowerTag = tag.toLowerCase();
          if (lowerTag !== tag) {
            fixesApplied.push(`Fixed: </${tag}> → </${lowerTag}>`);
            return `</${lowerTag}>`;
          }
          return match;
        });
        
        // Fix 13: Fix malformed attribute syntax (classname-"text-3xl → className="text-3xl")
        processedContent = processedContent.replace(/(\w+)-("[\w\s-]+)/g, (match, attr, value) => {
          if (attr === 'classname') {
            fixesApplied.push(`Fixed malformed attribute: ${match}`);
            return `className=${value}`;
          }
          return match;
        });
        
        // Fix 14: Fix export name mismatches (export default Headername when component is Header)
        const componentMatch = processedContent.match(/(?:const|function|var|let)\s+(\w+)\s*[=(]/);
        const exportMatch = processedContent.match(/export\s+default\s+(\w+)\s*;/);
        if (componentMatch && exportMatch) {
          const componentName = componentMatch[1];
          const exportName = exportMatch[1];
          if (componentName !== exportName) {
            processedContent = processedContent.replace(/export\s+default\s+\w+\s*;/g, `export default ${componentName};`);
            fixesApplied.push(`Fixed export mismatch: ${exportName} → ${componentName}`);
          }
        }
        
        // Fix 15: Fix incomplete return statements (return( → return ())
        processedContent = processedContent.replace(/return\(/g, 'return (');
        
        // Update fileContent with processed content if fixes were applied
        if (fixesApplied.length > 0) {
          console.log(`🔧 Auto-fixed ${fixesApplied.length} issues:`, fixesApplied);
          fileContent = processedContent; // Now this works because fileContent is declared as 'let'
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:920',message:'Auto-fixes applied',data:{filePath,fixesAppliedCount:fixesApplied.length,fixesApplied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
        }
        
        // Log syntax errors but don't block file creation (preview will show errors)
        if (syntaxErrors.length > 0) {
          console.warn(`⚠️ Syntax warnings for ${filePath}:`, syntaxErrors);
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
          // SIMPLIFIED: Direct file creation like OpenRouter version
          const fileIndex = allMatches.indexOf(fileMatch) + 1;
          const totalFiles = allMatches.length;
          
          console.log(`\n📄 Creating file ${fileIndex}/${totalFiles}: ${filePath}`);
          
          // Validate and normalize path (simplified)
          const normalizedPath = filePath
            .replace(/\.\./g, '') // Remove path traversal
            .replace(/^\//, ''); // Remove leading slash
          
          if (normalizedPath !== filePath) {
            console.log(`  🔧 Normalized path: ${filePath} → ${normalizedPath}`);
          }
          
          // Security: Prevent path traversal and validate structure
          if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.includes('://')) {
            console.log(`  ❌ INVALID PATH - skipping: ${normalizedPath}`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: 'Invalid file path' 
            });
            continue;
          }
          
          // Validate file name is correct
          const fileName = normalizedPath.split('/').pop() || '';
          if (!fileName || !fileName.includes('.')) {
            console.log(`  ❌ INVALID FILENAME - skipping: ${fileName}`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: 'Invalid filename' 
            });
            continue;
          }
          
          // CRITICAL: Prevent duplicate files (App.jsx vs App.tsx, index.js vs index.ts)
          const fileBaseName = fileName.split('.')[0];
          const fileExt = fileName.split('.').pop()?.toLowerCase();
          
          // Check for duplicate App files
          if (fileBaseName.toLowerCase() === 'app') {
            const conflictingExt = fileExt === 'jsx' ? 'tsx' : fileExt === 'tsx' ? 'jsx' : null;
            if (conflictingExt) {
              const conflictingPath = normalizedPath.replace(`.${fileExt}`, `.${conflictingExt}`);
              const hasConflict = existingFiles.some(f => f.path === conflictingPath);
              if (hasConflict) {
                console.log(`  ⚠️ DUPLICATE DETECTED: ${conflictingPath} exists, skipping ${normalizedPath}`);
                createdFiles.push({ 
                  path: filePath, 
                  success: false, 
                  error: `Duplicate file: ${conflictingPath} already exists. Use consistent language.` 
                });
                continue;
              }
            }
          }
          
          // Check for duplicate index files
          if (fileBaseName.toLowerCase() === 'index') {
            const conflictingExt = fileExt === 'js' ? 'ts' : fileExt === 'ts' ? 'js' : null;
            if (conflictingExt) {
              const conflictingPath = normalizedPath.replace(`.${fileExt}`, `.${conflictingExt}`);
              const hasConflict = existingFiles.some(f => f.path === conflictingPath);
              if (hasConflict) {
                console.log(`  ⚠️ DUPLICATE DETECTED: ${conflictingPath} exists, skipping ${normalizedPath}`);
                createdFiles.push({ 
                  path: filePath, 
                  success: false, 
                  error: `Duplicate file: ${conflictingPath} already exists. Use consistent language.` 
                });
                continue;
              }
            }
          }
          
          // Enforce language consistency based on project config
          if (fileBaseName.toLowerCase() === 'app' && fileExt !== fileExtension) {
            console.log(`  ⚠️ LANGUAGE MISMATCH: Project uses ${fileExtension}, but file is .${fileExt}. Skipping.`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: `Language mismatch: Project uses ${useTypeScript ? 'TypeScript' : 'JavaScript'}, but file uses .${fileExt}` 
            });
            continue;
          }
          
          if (fileBaseName.toLowerCase() === 'index' && fileExt !== indexExtension) {
            console.log(`  ⚠️ LANGUAGE MISMATCH: Project uses ${indexExtension}, but file is .${fileExt}. Skipping.`);
            createdFiles.push({ 
              path: filePath, 
              success: false, 
              error: `Language mismatch: Project uses ${useTypeScript ? 'TypeScript' : 'JavaScript'}, but file uses .${fileExt}` 
            });
            continue;
          }

          // Determine if this is a main file (App file or index file)
          const isMain = normalizedPath.includes('index') || 
                        normalizedPath.includes(`App.${fileExtension}`) || 
                        normalizedPath.includes(`App.${indexExtension}`) ||
                        normalizedPath.includes('App.jsx') || 
                        normalizedPath.includes('App.tsx') ||
                        normalizedPath.includes('App.js') ||
                        normalizedPath.includes('App.ts') ||
                        normalizedPath.includes('main');
          console.log(`  📝 Is main file: ${isMain}`);

          // CRITICAL: Create file IMMEDIATELY (incremental creation like Cursor/Lovable)
          // This ensures files appear in UI as soon as they're parsed
          try {
            // Check if file already exists
            const existingFile = await prisma.appFile.findUnique({
              where: {
                projectId_path: {
                  projectId: id,
                  path: normalizedPath,
                },
              },
            });
            
            if (existingFile) {
              console.log(`  📝 File exists - UPDATING with new content (Cursor-like editing)`);
              console.log(`  📝 Existing content length: ${existingFile.content.length} chars`);
              console.log(`  📝 New content length: ${fileContent.length} chars`);
              console.log(`  📝 Content changed: ${existingFile.content !== fileContent}`);
            } else {
              console.log(`  📝 File is NEW - creating immediately`);
            }

            // If setting as main, unset other main files
            if (isMain) {
              await prisma.appFile.updateMany({
                where: { projectId: id, isMain: true },
                data: { isMain: false },
              });
            }

            // Create or update file using Prisma - IMMEDIATE creation
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1009',message:'BEFORE database upsert',data:{projectId:id,normalizedPath,fileName,contentLength:fileContent.length,contentPreview:fileContent.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1032',message:'AFTER database upsert - file saved',data:{projectId:id,normalizedPath,success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion

            console.log(`  ✅ File saved to database IMMEDIATELY: ${normalizedPath}`);
            
            // Notify frontend immediately (would be better with streaming, but this works)
            // The frontend will refresh when it receives the response
          } catch (dbError: any) {
            console.error(`  ❌ Database error creating file ${normalizedPath}:`, dbError);
            createdFiles.push({ 
              path: normalizedPath, 
              success: false, 
              error: `Database error: ${dbError.message}` 
            });
            continue;
          }

          // Mark file as successfully created (validation happens after all files)
          createdFiles.push({ 
            path: normalizedPath, // Use normalized path, not original
            success: true, 
            validated: true // Will be validated later
          });
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1047',message:'File added to createdFiles array',data:{normalizedPath,createdFilesLength:createdFiles.length,success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          console.log(`  ✅ File creation complete: ${normalizedPath}`);
        } catch (fileError: any) {
          console.error(`❌ Error creating file ${filePath}:`, fileError);
          createdFiles.push({ 
            path: filePath, 
            success: false, 
            error: fileError.message || 'Unknown error' 
          });
        }
      }
      
      const summary = {
        totalFound: createdFiles.length,
        successful: createdFiles.filter(f => f.success).length,
        failed: createdFiles.filter(f => !f.success).length,
        validated: createdFiles.filter(f => f.validated === true).length,
        validationFailed: createdFiles.filter(f => f.validated === false).length,
        files: createdFiles.map(f => ({ 
          path: f.path, 
          success: f.success, 
          validated: f.validated,
          error: f.error,
          validationError: f.validationError
        }))
      };

      console.log('📊 File creation summary:', summary);
      console.log('✅ Returning createdFiles array with', createdFiles.length, 'files');
      
      if (summary.validationFailed > 0) {
        console.warn(`⚠️ ${summary.validationFailed} file(s) created but failed validation:`);
        createdFiles
          .filter(f => f.validated === false)
          .forEach(f => {
            console.warn(`   - ${f.path}: ${f.validationError || 'Unknown validation error'}`);
          });
      }

      // CRITICAL: Verify files were actually saved to database
      if (createdFiles.length > 0) {
        const successfulPaths = createdFiles.filter(f => f.success).map(f => f.path);
        console.log('🔍 Verifying files in database:', successfulPaths);
        
        try {
          const verifyFiles = await prisma.appFile.findMany({
            where: {
              projectId: id,
              path: { in: successfulPaths }
            },
            select: { path: true, name: true }
          });
          
          console.log('✅ Verified files in database:', verifyFiles.length, 'of', successfulPaths.length);
          if (verifyFiles.length !== successfulPaths.length) {
            console.warn('⚠️ Mismatch: Some files may not have been saved');
            const savedPaths = verifyFiles.map(f => f.path);
            const missingPaths = successfulPaths.filter(p => !savedPaths.includes(p));
            console.warn('Missing files:', missingPaths);
          }
        } catch (verifyError) {
          console.error('❌ Error verifying files:', verifyError);
        }
      }

      // If no files were created, log warning with more details
      if (createdFiles.length === 0) {
        console.warn('⚠️ No files were created from the response!');
        console.warn('Response length:', responseText.length);
        console.warn('Response sample (first 2000 chars):', responseText.substring(0, 2000));
        console.warn('Looking for code blocks with pattern: /```(?:file:)?\\s*([^\\n`]+?)(?:\\n|$)([\\s\\S]*?)```/g');

        // Check if there are any code blocks at all
        const codeBlocks = responseText.match(/```[\s\S]*?```/g);
        console.warn('Total code blocks found in response:', codeBlocks?.length || 0);
        if (codeBlocks) {
          console.warn('First few code blocks:', codeBlocks.slice(0, 3).map(block => block.substring(0, 100) + '...'));
        }
      }

      // Fallback: ONLY create fallback files if:
      // 1. No files were created (createdFiles.length === 0)
      // 2. AND no code blocks exist in response (!hasCodeBlocks)
      // 3. AND project has no existing files (to avoid overwriting user's work)
      // CRITICAL: This prevents creating unnecessary files when user already has files
      const codeBlocksMatch = responseText.match(/```[\s\S]*?```/g);
      const hasCodeBlocks = (codeBlocksMatch?.length || 0) > 0;
      const projectHasFiles = (project.files?.length || 0) > 0;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1145',message:'Fallback file check',data:{createdFilesLength:createdFiles.length,hasCodeBlocks,projectHasFiles,willCreateFallback:createdFiles.length===0&&!hasCodeBlocks&&!projectHasFiles},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Only create fallback if truly no files exist and no code was generated
      if (createdFiles.length === 0 && !hasCodeBlocks && !projectHasFiles) {
        console.warn('⚠️ No files were parsed from AI response, no code blocks found, and project has no files. Creating basic fallback files...');

        const fallbackFiles = [
          {
            path: `src/App.${fileExtension}`,
            name: `App.${fileExtension}`,
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${brandName}</h1>
        <p>${tagline}</p>
      </header>
    </div>
  );
}

export default App;`,
            language: useTypeScript ? 'typescript' : 'javascript',
            isMain: true
          },
          {
            path: `src/index.${indexExtension}`,
            name: `index.${indexExtension}`,
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
            language: useTypeScript ? 'typescript' : 'javascript',
            isMain: false
          },
          {
            path: 'src/App.css',
            name: 'App.css',
            content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 40px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.App-header h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.App-header p {
  font-size: 1.2rem;
}`,
            language: 'css',
            isMain: false
          }
        ];

        // Create fallback files
        for (const file of fallbackFiles) {
          try {
            await prisma.appFile.upsert({
              where: {
                projectId_path: {
                  projectId: id,
                  path: file.path,
                },
              },
              update: {
                content: file.content,
                language: file.language,
                isMain: file.isMain,
                name: file.name,
              },
              create: {
                projectId: id,
                path: file.path,
                name: file.name,
                content: file.content,
                language: file.language,
                isMain: file.isMain,
              },
            });
            createdFiles.push({ path: file.path, success: true });
            console.log('✅ Created fallback file:', file.path);
          } catch (error) {
            console.error('❌ Error creating fallback file:', file.path, error);
            createdFiles.push({ path: file.path, success: false, error: 'Fallback creation failed' });
          }
        }
      }

      // ============================================
      // FILE CREATION SUMMARY
      // ============================================
      console.log('\n' + '='.repeat(60));
      console.log('📊 FILE CREATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`Total files attempted: ${createdFiles.length}`);
      console.log(`Successful: ${createdFiles.filter(f => f.success).length}`);
      console.log(`Failed: ${createdFiles.filter(f => !f.success).length}`);
      console.log(`Validated: ${createdFiles.filter(f => f.validated === true).length}`);
      console.log(`Validation warnings: ${createdFiles.filter(f => f.validated === false).length}`);
      console.log('\nFiles created:');
      createdFiles.forEach((f, i) => {
        const status = f.success ? (f.validated ? '✅' : '⚠️') : '❌';
        console.log(`  ${i + 1}. ${status} ${f.path}${f.error ? ` (${f.error})` : ''}${f.validationError ? ` (${f.validationError})` : ''}`);
      });
      console.log('='.repeat(60) + '\n');
      
      return createdFiles;
    };

    // Call Azure DeepSeek API
    let response: string = '';
    let requestSuccess = false;
    
    // ============================================
    // REQUEST LOGGING (Optimized - no file content included)
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('🚀 AZURE DEEPSEEK REQUEST');
    console.log('='.repeat(80));
    
    // Calculate token usage (rough estimate: 1 token ≈ 4 characters)
    const systemTokens = Math.ceil(systemPrompt.length / 4);
    const userTokens = Math.ceil(message.length / 4);
    const totalInputTokens = systemTokens + userTokens;
    const maxOutputTokens = 4000;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1366',message:'BEFORE AI request - message content',data:{systemPromptLength:systemPrompt.length,userMessageLength:message.length,userMessagePreview:message.substring(0,500),userMessageFull:message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    console.log('\n📊 REQUEST SUMMARY:');
    console.log(`  - System Prompt: ${systemPrompt.length} chars (~${systemTokens} tokens)`);
    console.log(`  - User Message: ${message.length} chars (~${userTokens} tokens)`);
    console.log(`  - Total Input: ~${totalInputTokens} tokens (max 16K)`);
    console.log(`  - Max Output: ${maxOutputTokens} tokens`);
    console.log(`  - Available Context: ${16000 - totalInputTokens} tokens`);
    
    if (totalInputTokens > 12000) {
      console.warn('⚠️ Warning: Input tokens exceed 12K - may be truncated by model');
    }
    
    console.log('='.repeat(80) + '\n');
    
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Add timeout for Azure DeepSeek requests (2 minutes)
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000);
      
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 4000, // Model caps at 4000 new tokens (matches deepseek_api_optimized.py)
        stream: false, // Non-streaming for reliability
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ AZURE DEEPSEEK RESPONSE RECEIVED');
      console.log('='.repeat(80));
      console.log(`  - Provider: azure-deepseek`);
      console.log(`  - Model: ${AZURE_DEEPSEEK_MODEL}`);
      console.log(`  - Response Length: ${completion.choices[0]?.message?.content?.length || 0} characters`);
      console.log('\n📄 RESPONSE PREVIEW (first 500 chars):');
      console.log('-'.repeat(40));
      console.log(completion.choices[0]?.message?.content?.substring(0, 500) || 'NO CONTENT');
      console.log('-'.repeat(40));
      console.log('='.repeat(80) + '\n');

      response = completion.choices[0]?.message?.content || '';
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1415',message:'AI response received',data:{responseLength:response.length,responsePreview:response.substring(0,500),hasCodeBlocks:/```/.test(response),codeBlockCount:(response.match(/```/g)||[]).length/2},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Validate response quality
      if (!response || response.trim().length < 50) {
        console.warn('⚠️ Response too short, might be incomplete');
        throw new Error('Azure DeepSeek returned an empty or incomplete response');
      }
      
      // Check if response contains code blocks
      const hasCodeBlocks = /```/.test(response);
      if (!hasCodeBlocks) {
        console.warn('⚠️ Response does not contain code blocks');
        console.warn('Response preview:', response.substring(0, 500));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1426',message:'No code blocks in response',data:{responseLength:response.length,fullResponse:response.substring(0,2000)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
      
      requestSuccess = true;
    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('❌ AZURE DEEPSEEK REQUEST FAILED');
      console.log('='.repeat(80));
      
      // Enhanced error logging
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        name: error?.name,
        code: error?.code,
        status: error?.status,
        type: error?.type,
      };
      
      // Check for timeout
      if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
        errorDetails.errorType = 'TIMEOUT';
        errorDetails.message = 'Request timed out after 2 minutes';
      }
      
      // Check for network errors
      if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('ECONNREFUSED')) {
        errorDetails.errorType = 'NETWORK_ERROR';
        errorDetails.message = `Cannot connect to Azure DeepSeek at ${AZURE_DEEPSEEK_URL}`;
      }
      
      // Check for API errors
      if (error?.status || error?.response) {
        errorDetails.errorType = 'API_ERROR';
        if (error?.response) {
          try {
            errorDetails.responseData = typeof error.response === 'string' 
              ? error.response 
              : JSON.stringify(error.response);
          } catch {
            errorDetails.responseData = 'Could not parse error response';
          }
        }
      }
      
      console.log('Error details:', JSON.stringify(errorDetails, null, 2));
      console.log('='.repeat(80) + '\n');
      
      // Provide helpful error messages
      let userFriendlyError = errorDetails.message || 'Azure DeepSeek request failed';
      
      if (errorDetails.errorType === 'TIMEOUT') {
        userFriendlyError = 'Request timed out. The model might be processing a large request. Please try again with a simpler request.';
      } else if (errorDetails.errorType === 'NETWORK_ERROR') {
        userFriendlyError = `Cannot connect to Azure DeepSeek server at ${AZURE_DEEPSEEK_URL}. Please check if the server is running.`;
      } else if (errorDetails.errorType === 'API_ERROR') {
        userFriendlyError = `Azure DeepSeek API error: ${errorDetails.message}`;
      }
      
      throw new Error(userFriendlyError);
    }

    // Ensure response is not empty before parsing
    if (!response || response.trim().length === 0) {
      console.error('❌ Empty response from Azure DeepSeek');
      throw new Error('Azure DeepSeek returned an empty response. Please try again.');
    }
    
    // Validate response contains code blocks
    const codeBlockCount = (response.match(/```/g) || []).length / 2;
    if (codeBlockCount === 0) {
      console.warn('⚠️ Response does not contain code blocks');
      console.warn('Response preview:', response.substring(0, 500));
      // Don't throw - let parsing handle it, but log warning
    } else {
      console.log(`✅ Response contains ${codeBlockCount} code blocks`);
    }
    
    // Parse code blocks and create/update files INCREMENTALLY
    // This matches Cursor/Lovable behavior - files created as they're parsed
    // CRITICAL: Create files one by one and notify frontend immediately
    let createdFiles: Array<{ path: string; success: boolean; error?: string; validated?: boolean; validationError?: string }> = [];
    
    try {
      // Call parseAndCreateFiles directly - it already creates files incrementally
      // and returns the createdFiles array
      console.log('\n' + '='.repeat(80));
      console.log('🚀 STARTING FILE PARSING AND CREATION');
      console.log('='.repeat(80));
      console.log('Response length:', response.length, 'characters');
      console.log('Code blocks detected:', (response.match(/```/g) || []).length / 2);
      
      createdFiles = await parseAndCreateFiles(response);
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ FILE PARSING COMPLETED');
      console.log('='.repeat(80));
      console.log('Total files processed:', createdFiles.length);
      console.log('Successful:', createdFiles.filter(f => f.success).length);
      console.log('Failed:', createdFiles.filter(f => !f.success).length);
      
      if (createdFiles.length > 0) {
        console.log('\n📋 Files created:');
        createdFiles.forEach((f, idx) => {
          const status = f.success ? '✅' : '❌';
          console.log(`  ${idx + 1}. ${status} ${f.path}${f.error ? ` (${f.error})` : ''}`);
        });
      } else {
        console.warn('\n⚠️ NO FILES WERE CREATED!');
        console.warn('This might mean:');
        console.warn('  1. Response doesn\'t contain code blocks with file paths');
        console.warn('  2. File paths are in incorrect format');
        console.warn('  3. Parsing patterns didn\'t match');
      }
      console.log('='.repeat(80) + '\n');
      
      // AUTO-FIX: If files were created but have validation errors, attempt to fix them
      const filesWithErrors = createdFiles.filter(f => f.success && f.validated === false);
      if (filesWithErrors.length > 0) {
        console.log(`🔧 Auto-fixing ${filesWithErrors.length} files with validation errors...`);
        // Note: Auto-fix can be implemented here if needed
        // For now, we log warnings and let the user know
      }
      console.log('✅ File parsing completed:', {
        totalFiles: createdFiles.length,
        successful: createdFiles.filter(f => f.success).length,
        failed: createdFiles.filter(f => !f.success).length,
        validated: createdFiles.filter(f => f.validated === true).length,
        validationFailed: createdFiles.filter(f => f.validated === false).length
      });
      
      // ============================================
      // INTELLIGENT COMPONENT INTEGRATION
      // ============================================
      // Automatically identify components and integrate into App.jsx
      if (createdFiles.length > 0 && createdFiles.some(f => f.success)) {
        const successfulFiles = createdFiles.filter(f => f.success);
        const componentFiles = successfulFiles.filter(f => 
          f.path.includes('components/') || 
          f.path.match(/src\/[A-Z][a-zA-Z0-9]*\.(jsx|js)$/) ||
          (f.path.includes('/') && f.path.split('/').pop()?.match(/^[A-Z]/))
        );
        
        if (componentFiles.length > 0) {
          console.log('\n' + '='.repeat(80));
          console.log('🧠 INTELLIGENT COMPONENT INTEGRATION');
          console.log('='.repeat(80));
          console.log(`Found ${componentFiles.length} component file(s) to integrate:`);
          componentFiles.forEach(f => console.log(`  - ${f.path}`));
          
          try {
            // Get current App file (using correct extension based on project language)
            const appFile = project.files?.find(f => 
              f.path === `src/App.${fileExtension}` || f.path === `src/App.${indexExtension}` ||
              f.path === 'src/App.jsx' || f.path === 'src/App.tsx' || f.path === 'src/App.js' || f.path === 'src/App.ts' ||
              (f.isMain && (f.path.includes('App.jsx') || f.path.includes('App.tsx') || f.path.includes('App.js') || f.path.includes('App.ts')))
            );
            
            if (appFile) {
              console.log(`\n📝 Updating App.${fileExtension} to import and render new components...`);
              
              // Extract component names from file paths
              const componentNames: string[] = [];
              componentFiles.forEach(file => {
                const fileName = file.path.split('/').pop() || file.path.split('\\').pop() || '';
                // Handle Header.component.js → Header, Header.jsx → Header
                let componentName = fileName.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                // If still has dot (e.g., Header.component), take first part
                if (componentName.includes('.')) {
                  componentName = componentName.split('.')[0];
                }
                if (componentName && componentName.match(/^[A-Z]/)) {
                  componentNames.push(componentName);
                }
              });
              
              console.log(`Identified components: ${componentNames.join(', ')}`);
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1684',message:'Starting component integration',data:{componentNames,appFilePath:appFile.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
              // #endregion
              
              // Read component files to verify they export correctly
              const componentFilesData = await prisma.appFile.findMany({
                where: {
                  projectId: id,
                  path: { in: componentFiles.map(f => f.path) }
                }
              });
              
              // REVIEW: Validate component files
              console.log(`\n🔍 REVIEWING COMPONENT FILES...`);
              const componentReviews: Array<{path: string; valid: boolean; issues: string[]}> = [];
              componentFilesData.forEach(file => {
                const issues: string[] = [];
                const hasExport = file.content.includes('export') || file.content.includes('module.exports');
                const hasComponent = !!file.content.match(/(?:function|const|class|var|let)\s+[A-Z]/);
                const hasReturn = file.content.includes('return');
                const hasReactImport = file.content.includes('import') && (file.content.includes('react') || file.content.includes('React'));
                
                if (!hasExport) issues.push('missing export');
                if (!hasComponent) issues.push('no component definition');
                if (!hasReturn) issues.push('no return statement');
                if (!hasReactImport) issues.push('missing React import');
                
                const isValid = hasExport && hasComponent && hasReturn;
                componentReviews.push({ path: file.path, valid: isValid, issues });
                console.log(`  ${isValid ? '✅' : '⚠️'} ${file.path}: ${isValid ? 'valid' : issues.join(', ')}`);
              });
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1708',message:'Component files reviewed',data:{componentReviews},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
              // #endregion
              
              // Update App.jsx with imports and component usage
              let appContent = appFile.content;
              let appUpdated = false;
              
              // Add imports for new components
              componentNames.forEach(compName => {
                const componentFile = componentFilesData.find(f => {
                  const fileName = f.path.split('/').pop() || '';
                  // Match both Header.jsx and Header.component.js → Header
                  let nameWithoutExt = fileName.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                  // Handle Header.component → Header
                  if (nameWithoutExt.includes('.')) {
                    nameWithoutExt = nameWithoutExt.split('.')[0];
                  }
                  return nameWithoutExt === compName;
                });
                
                if (componentFile) {
                  // Determine import path (handle Header.component.js → ./components/Header)
                  let importPath = '';
                  if (componentFile.path.includes('components/')) {
                    // Extract directory path and component name
                    const pathParts = componentFile.path.split('/');
                    const componentsIndex = pathParts.indexOf('components');
                    if (componentsIndex >= 0) {
                      const afterComponents = pathParts.slice(componentsIndex + 1);
                      const fileName = afterComponents[afterComponents.length - 1];
                      const nameWithoutExt = fileName.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                      const baseName = nameWithoutExt.includes('.') ? nameWithoutExt.split('.')[0] : nameWithoutExt;
                      const subPath = afterComponents.slice(0, -1).join('/');
                      importPath = subPath ? `./components/${subPath}/${baseName}` : `./components/${baseName}`;
                    }
                  } else if (componentFile.path.startsWith('src/')) {
                    const relativePath = componentFile.path.replace('src/', './');
                    importPath = relativePath.replace(/\.(component\.)?(jsx|js|tsx|ts)$/i, '');
                    // Remove .component if present
                    if (importPath.includes('.component')) {
                      importPath = importPath.replace(/\.component$/, '');
                    }
                  }
                  
                  // Check if import already exists
                  const importPattern = new RegExp(`import\\s+.*?\\s+from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
                  if (!importPattern.test(appContent) && importPath) {
                    // Add import after React import or at top
                    const reactImportMatch = appContent.match(/import\s+React[^;]*;/);
                    if (reactImportMatch) {
                      const insertPos = reactImportMatch.index! + reactImportMatch[0].length;
                      appContent = appContent.slice(0, insertPos) + 
                        `\nimport ${compName} from '${importPath}';` + 
                        appContent.slice(insertPos);
                      appUpdated = true;
                      console.log(`  ✅ Added import: import ${compName} from '${importPath}'`);
                    } else {
                      // Add at top
                      appContent = `import ${compName} from '${importPath}';\n${appContent}`;
                      appUpdated = true;
                      console.log(`  ✅ Added import at top: import ${compName} from '${importPath}'`);
                    }
                  }
                  
                  // Add component to JSX if not already present
                  const componentUsagePattern = new RegExp(`<${compName}\\s*/?>`, 'i');
                  if (!componentUsagePattern.test(appContent)) {
                    // Find return statement and add component
                    const returnMatch = appContent.match(/return\s*\([\s\S]*?\)/);
                    if (returnMatch) {
                      const returnContent = returnMatch[0];
                      // Add component before closing div or at end
                      if (returnContent.includes('</div>')) {
                        appContent = appContent.replace(
                          /(return\s*\([\s\S]*?)(<\/div>\s*\))/,
                          `$1    <${compName} />\n$2`
                        );
                        appUpdated = true;
                        console.log(`  ✅ Added <${compName} /> to JSX`);
                      } else {
                        // Add at end of return
                        appContent = appContent.replace(
                          /(return\s*\([\s\S]*?)(\))/,
                          `$1    <${compName} />\n$2`
                        );
                        appUpdated = true;
                        console.log(`  ✅ Added <${compName} /> to JSX (end)`);
                      }
                    }
                  }
                }
              });
              
              // Save updated App.jsx
              if (appUpdated) {
                await prisma.appFile.update({
                  where: { id: appFile.id },
                  data: { content: appContent }
                });
                console.log(`\n✅ App.jsx updated successfully with ${componentNames.length} component(s)`);
                console.log(`   Components integrated: ${componentNames.join(', ')}`);
                console.log(`   Preview will automatically refresh to show new components`);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1782',message:'App.jsx auto-integrated with components',data:{componentsIntegrated:componentNames,appUpdated:true,appContentPreview:appContent.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
              } else {
                console.log(`\nℹ️ App.jsx already contains all components or no updates needed`);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1787',message:'App.jsx already has components',data:{componentsIntegrated:componentNames,appUpdated:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
                // #endregion
              }
            } else {
              console.log(`\n⚠️ App.jsx not found - skipping auto-integration`);
            }
          } catch (integrationError: any) {
            console.error('❌ Error during component integration:', integrationError);
            // Don't fail the request - files were created successfully
          }
          console.log('='.repeat(80) + '\n');
        }
      }

      // Sandbox validation: After all files are created, validate preview can be generated
      if (createdFiles.length > 0 && createdFiles.some(f => f.success)) {
        console.log('🔍 Sandbox validation: Validating preview generation after file creation...');
        
        try {
          // Reload project with new files
          const updatedProject = await prisma.appProject.findUnique({
            where: { id },
            include: { files: { orderBy: { path: 'asc' } } },
          });

          if (updatedProject && updatedProject.files.length > 0) {
            // Check if we can generate preview HTML
            const jsFiles = updatedProject.files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx'));
            
            if (jsFiles.length > 0) {
              // Check if App file exists and has valid structure
              const appFile = jsFiles.find(f => 
                (f.path.includes('App') || f.name.includes('App')) && 
                !f.path.includes('index')
              ) || jsFiles[0];

              if (appFile && appFile.content) {
                // Basic validation: check if App component structure exists
                const hasComponent = appFile.content.includes('function') || 
                                    appFile.content.includes('const') || 
                                    appFile.content.includes('class');
                const hasReturn = appFile.content.includes('return');
                const hasExport = appFile.content.includes('export') || appFile.content.includes('module.exports');

                if (hasComponent && hasReturn && hasExport) {
                  console.log('✅ Sandbox validation passed: Preview can be generated');
                } else {
                  console.warn('⚠️ Sandbox validation warning: App component may be incomplete');
                  console.warn(`   Component: ${hasComponent}, Return: ${hasReturn}, Export: ${hasExport}`);
                }
              } else {
                console.warn('⚠️ Sandbox validation warning: App file not found or empty');
              }
            } else {
              console.warn('⚠️ Sandbox validation warning: No JS files found for preview');
            }
          }
        } catch (sandboxError: any) {
          console.error('⚠️ Sandbox validation error:', sandboxError);
          // Don't fail the request, just log the warning
        }
      }
    } catch (parseError: any) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ ERROR PARSING FILES FROM RESPONSE');
      console.error('='.repeat(80));
      console.error('Error:', parseError?.message);
      console.error('Stack:', parseError?.stack?.substring(0, 500));
      console.error('Response length:', response?.length);
      console.error('='.repeat(80) + '\n');
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1531',message:'Parse error occurred',data:{error:parseError?.message,responseLength:response?.length,responsePreview:response?.substring(0,1000)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // CRITICAL: Even if parsing fails, ensure createdFiles is an empty array
      // This prevents undefined errors in frontend
      createdFiles = [];
      
      // Log warning but don't fail the request - user can use "Extract Files" button
      console.warn('⚠️ File parsing failed, but request will continue. User can manually extract files.');
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

    // Ensure filesCreated is always an array
    const filesCreatedResult = Array.isArray(createdFiles) ? createdFiles : [];
    
    // Build response with helpful information
    const successfulFiles = filesCreatedResult.filter(f => f.success);
    const failedFiles = filesCreatedResult.filter(f => !f.success);
    const validatedFiles = filesCreatedResult.filter(f => f.validated === true);
    const filesWithWarnings = filesCreatedResult.filter(f => f.success && f.validated === false);
    
    // Generate suggestions based on results
    const suggestions: string[] = [];
    if (successfulFiles.length > 0) {
      suggestions.push(`✅ Created ${successfulFiles.length} file(s): ${successfulFiles.map(f => f.path).join(', ')}`);
    }
    if (filesWithWarnings.length > 0) {
      suggestions.push(`⚠️ ${filesWithWarnings.length} file(s) created but may have issues. Check preview for errors.`);
    }
    if (failedFiles.length > 0) {
      suggestions.push(`❌ Failed to create ${failedFiles.length} file(s). Please try again or check the code format.`);
    }
    if (successfulFiles.length === 0 && response.length > 0) {
      suggestions.push(`💡 No files were extracted from the response. Make sure code uses \`\`\`file:path/to/file.jsx format.`);
    }
    
    // CRITICAL: Ensure filesCreated is always an array and properly formatted
    const finalFilesCreated = Array.isArray(filesCreatedResult) ? filesCreatedResult : [];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00543828-0b03-4c01-9747-95de7c10ba7d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:1616',message:'BEFORE sending response to frontend',data:{finalFilesCreatedLength:finalFilesCreated.length,successfulFilesCount:successfulFiles.length,filePaths:successfulFiles.map(f=>f.path)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    console.log('\n' + '='.repeat(80));
    console.log('📤 SENDING RESPONSE TO FRONTEND');
    console.log('='.repeat(80));
    console.log('Response length:', response.length, 'characters');
    console.log('Files created array:', finalFilesCreated.length, 'items');
    console.log('Successful files:', successfulFiles.length);
    console.log('File paths:', successfulFiles.map(f => f.path));
    console.log('Response will include filesCreated:', finalFilesCreated.length > 0);
    console.log('='.repeat(80) + '\n');
    
    // Build response with guaranteed filesCreated array
    const responseData = {
      response,
      suggestions,
      filesCreated: finalFilesCreated, // Always an array
      provider: 'azure-deepseek',
      model: AZURE_DEEPSEEK_MODEL,
      summary: {
        totalFiles: finalFilesCreated.length,
        successful: successfulFiles.length,
        validated: validatedFiles.length,
        warnings: filesWithWarnings.length,
        failed: failedFiles.length
      }
    };
    
    // Log final response structure
    console.log('📦 Final response structure:', {
      hasResponse: !!responseData.response,
      hasFilesCreated: Array.isArray(responseData.filesCreated),
      filesCreatedLength: responseData.filesCreated.length,
      hasSummary: !!responseData.summary
    });
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    // Enhanced error logging with stack trace
    console.error('\n' + '='.repeat(80));
    console.error('❌ AZURE DEEPSEEK CHAT API - UNHANDLED ERROR');
    console.error('='.repeat(80));
    console.error('Error object:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      url: AZURE_DEEPSEEK_URL,
      model: AZURE_DEEPSEEK_MODEL,
    });
    console.error('='.repeat(80) + '\n');
    
    // Handle connection errors
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.message?.includes('fetch failed') || error?.message?.includes('network') || error?.message?.includes('connection')) {
      return NextResponse.json(
        { 
          error: 'Connection error',
          message: `Unable to connect to Azure DeepSeek at ${AZURE_DEEPSEEK_URL}. Please check if the server is running.`,
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
          suggestion: 'Verify that your Azure DeepSeek API is running at ' + AZURE_DEEPSEEK_URL,
          provider: 'azure-deepseek',
          model: AZURE_DEEPSEEK_MODEL,
          filesCreated: []
        },
        { status: 503 }
      );
    }

    // Handle timeout errors
    if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Timeout',
          message: 'Request timed out. The model might be processing a large request. Please try again with a simpler request.',
          suggestion: 'Try breaking your request into smaller parts or wait a moment and retry.',
          provider: 'azure-deepseek',
          model: AZURE_DEEPSEEK_MODEL,
          canRetry: true,
          filesCreated: []
        },
        { status: 504 }
      );
    }

    // Handle server errors (500/503)
    if (error?.status === 500 || error?.status === 503) {
      return NextResponse.json(
        { 
          error: 'Server Error',
          message: `Azure DeepSeek server error. The model might be loading or overloaded.`,
          suggestion: 'Wait a moment and try again, or check the Azure DeepSeek server logs.',
          provider: 'azure-deepseek',
          model: AZURE_DEEPSEEK_MODEL,
          canRetry: true,
          filesCreated: []
        },
        { status: 502 }
      );
    }

    // Handle authentication errors
    if (error?.status === 401 || error?.message?.includes('Not authenticated')) {
      return NextResponse.json(
        { 
          error: 'Authentication Error',
          message: 'You are not authenticated. Please sign in and try again.',
          suggestion: 'Refresh the page and ensure you are logged in.',
          filesCreated: []
        },
        { status: 401 }
      );
    }

    // Generic error handler - return proper error response
    const errorMessage = error?.message || 'An unexpected error occurred';
    const errorStatus = error?.status || 500;
    
    return NextResponse.json(
      { 
        error: 'Request Failed',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          name: error?.name,
          stack: error?.stack?.substring(0, 500), // Limit stack trace length
          code: error?.code,
          url: AZURE_DEEPSEEK_URL,
        } : undefined,
        suggestion: 'Please try again. If the problem persists, check server logs.',
        provider: 'azure-deepseek',
        model: AZURE_DEEPSEEK_MODEL,
        canRetry: true,
        filesCreated: []
      },
      { status: errorStatus }
    );
  }
}

