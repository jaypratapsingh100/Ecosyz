'use client';

import { useState, useEffect } from 'react';
import QuestionnaireWizard from './QuestionnaireWizard';

interface Project {
  id: string;
  title: string;
  description?: string;
  type: string;
  framework?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
  };
}

interface Workspace {
  id: string;
  title: string;
}

interface ProjectManagerProps {
  onSelectProject: (projectId: string) => void;
  selectedProjectId?: string;
}

const PROJECT_TEMPLATES = [
  {
    id: 'react',
    name: 'React App',
    type: 'web',
    framework: 'react',
    description: 'Create a React application',
    files: [
      {
        path: 'src/App.jsx',
        name: 'App.jsx',
        content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello, React!</h1>
      <p>Start building your React app here.</p>
    </div>
  );
}

export default App;`,
        language: 'jsx',
        isMain: true,
      },
      {
        path: 'src/index.js',
        name: 'index.js',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        language: 'javascript',
        isMain: false,
      },
      {
        path: 'index.html',
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
        language: 'html',
        isMain: false,
      },
    ],
  },
  {
    id: 'nextjs',
    name: 'Next.js App',
    type: 'web',
    framework: 'nextjs',
    description: 'Create a Next.js application',
    files: [
      {
        path: 'pages/index.js',
        name: 'index.js',
        content: `export default function Home() {
  return (
    <div>
      <h1>Welcome to Next.js!</h1>
      <p>Start building your Next.js app here.</p>
    </div>
  );
}`,
        language: 'javascript',
        isMain: true,
      },
    ],
  },
  {
    id: 'python',
    name: 'Python Script',
    type: 'other',
    framework: 'python',
    description: 'Create a Python script',
    files: [
      {
        path: 'main.py',
        name: 'main.py',
        content: `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

def main():
    print("Hello, Python!")
    print("Start building your Python application here.")

if __name__ == "__main__":
    main()`,
        language: 'python',
        isMain: true,
      },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Project',
    type: 'web',
    framework: undefined,
    description: 'Start with an empty project',
    files: [],
  },
];

// Generate comprehensive build prompt from questionnaire data
function generateBuildPrompt(questionnaireData: any, projectTitle: string): string {
  const sections = questionnaireData.requiredSections || [];
  const features = questionnaireData.specialFeatures || [];
  const designStyle = questionnaireData.designStyle || 'modern-minimal';
  const colorScheme = questionnaireData.colorScheme || 'auto';
  const layoutStyle = questionnaireData.layoutStyle || 'single-page';
  const brandName = questionnaireData.brandName || projectTitle;
  const tagline = questionnaireData.tagline || '';
  const keyPoints = questionnaireData.keyPoints || '';
  const appType = questionnaireData.appType || 'web app';
  const targetAudience = questionnaireData.targetAudience || 'general';
  
  let prompt = `Create a complete, production-ready ${appType} application with the following specifications:\n\n`;
  
  // Branding
  prompt += `**Brand & Content:**\n`;
  prompt += `- Brand Name: ${brandName}\n`;
  if (tagline) prompt += `- Tagline: ${tagline}\n`;
  if (keyPoints) prompt += `- Key Points to Highlight: ${keyPoints}\n`;
  prompt += `- Target Audience: ${targetAudience}\n\n`;
  
  // Design Requirements
  prompt += `**Design Requirements:**\n`;
  prompt += `- Design Style: ${designStyle}\n`;
  prompt += `- Color Scheme: ${colorScheme}\n`;
  prompt += `- Layout Style: ${layoutStyle}\n\n`;
  
  // Required Sections
  if (sections.length > 0) {
    prompt += `**Required Sections (create components for ALL of these):**\n`;
    sections.forEach((section: string) => {
      prompt += `- ${section}\n`;
    });
    prompt += `\n`;
  }
  
  // Special Features
  if (features.length > 0) {
    prompt += `**Special Features (implement ALL of these):**\n`;
    features.forEach((feature: string) => {
      prompt += `- ${feature}\n`;
    });
    prompt += `\n`;
  }
  
  // Instructions
  prompt += `**CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:**\n`;
  prompt += `1. Create ALL required sections as separate React component files\n`;
  prompt += `2. Use the EXACT design style "${designStyle}" throughout\n`;
  prompt += `3. Use the EXACT color scheme "${colorScheme}" - apply these colors in CSS\n`;
  prompt += `4. Implement the "${layoutStyle}" layout style\n`;
  prompt += `5. Implement ALL special features listed above\n`;
  prompt += `6. Make it fully responsive and mobile-friendly\n`;
  prompt += `7. Use modern, professional code with proper structure\n`;
  prompt += `8. Include proper styling (create CSS files or use inline styles)\n`;
  prompt += `9. Create a complete App.jsx that imports and renders ALL components\n`;
  prompt += `10. Create index.js that renders the App component\n`;
  prompt += `11. Make it production-ready and polished\n\n`;
  
  prompt += `**FILE GENERATION REQUIREMENTS - CRITICAL:**\n`;
  prompt += `- Generate ALL files in ONE response - do not split across multiple messages\n`;
  prompt += `- Use the \`\`\`file:path/to/file.jsx\` format for EACH file\n`;
  prompt += `- Create separate component files for: ${sections.length > 0 ? sections.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('.jsx, ') + '.jsx' : 'Hero, About, Services, Contact, etc.'}\n`;
  prompt += `- MUST include: App.jsx (imports ALL components), index.js (renders App), App.css (or component CSS files)\n`;
  prompt += `- Each component should be a complete, functional React component\n`;
  prompt += `- DO NOT ask questions - generate ALL files immediately in this response\n`;
  prompt += `- Use the exact file format: \`\`\`file:src/ComponentName.jsx\`\n\n`;
  
  prompt += `🚨 START GENERATING NOW - Create the complete application with ALL files in ONE response! 🚨\n`;
  prompt += `Remember: Generate ALL components, App.jsx, index.js, and CSS files NOW.`;
  
  return prompt;
}

export default function ProjectManager({ onSelectProject, selectedProjectId }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('react');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [creatingSample, setCreatingSample] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
    fetchWorkspaces();
  }, []);

  // Listen for trigger-new-project event from welcome screen
  useEffect(() => {
    const handleTriggerNewProject = () => {
      setShowQuestionnaire(true); // Show questionnaire directly
    };
    
    window.addEventListener('trigger-new-project', handleTriggerNewProject);
    return () => {
      window.removeEventListener('trigger-new-project', handleTriggerNewProject);
    };
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/app-projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleProject = async () => {
    setCreatingSample(true);
    try {
      const response = await fetch('/api/app-projects/create-sample', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create sample project (${response.status})`);
      }

      const data = await response.json();
      await fetchProjects();
      
      // Auto-select the created project
      if (data.project?.id) {
        onSelectProject(data.project.id);
      }
      
      alert(`✅ Sample project created successfully!\n\nCreated ${data.filesCreated} files.\n\nThis is a beautiful, modern portfolio website with:\n- Smooth animations\n- Professional design\n- Responsive layout\n- Modern UI/UX`);
    } catch (error: any) {
      console.error('Failed to create sample project:', error);
      alert(`Failed to create sample project: ${error.message}`);
    } finally {
      setCreatingSample(false);
    }
  };

  const handleQuestionnaireComplete = async (questionnaireData: any) => {
    setQuestionnaireData(questionnaireData);
    setShowQuestionnaire(false);
    
    // Determine framework from questionnaire
    const framework = questionnaireData.frameworkPreference === 'auto' 
      ? undefined 
      : questionnaireData.frameworkPreference === 'nextjs' 
        ? 'nextjs' 
        : questionnaireData.frameworkPreference || 'react';
    
    // Project type must be "web", "fullstack", or "other" (not the questionnaire appType)
    // Questionnaire appType (portfolio, business, etc.) is stored separately as metadata
    const projectType = 'web'; // Always "web" for web apps, questionnaire appType is separate
    
    // Create project with questionnaire data
    await createProjectWithQuestionnaire(questionnaireData, framework, projectType);
  };

  const createProjectWithQuestionnaire = async (
    questionnaireData: any,
    framework: string | undefined,
    projectType: string
  ) => {
    if (!newProjectTitle.trim()) {
      setNewProjectTitle(questionnaireData.brandName || 'My App');
    }

    setCreating(true);
    try {
      // Create project with questionnaire data
      // Note: type must be "web" | "fullstack" | "other"
      // questionnaireData.appType (portfolio, business, etc.) is stored separately
      const projectRes = await fetch('/api/app-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProjectTitle || questionnaireData.brandName || 'My App',
          type: projectType, // Must be "web", "fullstack", or "other"
          framework: framework,
          description: questionnaireData.tagline || `A ${questionnaireData.appType || 'web'} application`,
          workspaceId: selectedWorkspaceId || undefined,
          // Questionnaire data (appType here is portfolio/business/etc., stored as metadata)
          questionnaireData: questionnaireData,
          appType: questionnaireData.appType, // This is portfolio/business/ecommerce/etc.
          targetAudience: questionnaireData.targetAudience,
          designStyle: questionnaireData.designStyle,
          colorScheme: questionnaireData.colorScheme,
          layoutStyle: questionnaireData.layoutStyle,
          requiredFeatures: questionnaireData.specialFeatures || [],
          brandName: questionnaireData.brandName,
          tagline: questionnaireData.tagline,
          keyPoints: questionnaireData.keyPoints,
        }),
      });

      if (!projectRes.ok) {
        const errorData = await projectRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create project (${projectRes.status})`);
      }

      const project = await projectRes.json();

      setShowCreateModal(false);
      setNewProjectTitle('');
      setSelectedWorkspaceId('');
      setQuestionnaireData(null);
      await fetchProjects();
      
      // Select project first, then trigger AI generation
      onSelectProject(project.id);
      
      // Wait a bit for project to be selected and chat to initialize
      setTimeout(() => {
        // Generate comprehensive prompt from questionnaire data
        const buildPrompt = generateBuildPrompt(questionnaireData, project.title);
        console.log('📝 Generated build prompt from questionnaire:', buildPrompt);
        
        // Store prompt in sessionStorage so AppChat can pick it up
        sessionStorage.setItem(`auto-prompt-${project.id}`, buildPrompt);
        sessionStorage.setItem(`auto-prompt-timestamp-${project.id}`, Date.now().toString());
        
        // Automatically send prompt to AI chat to generate files
        // Use DeepSeek by default (best for code generation)
        const userProvider = typeof window !== 'undefined' 
          ? localStorage.getItem('ai_provider')
          : null;
        const userApiKey = typeof window !== 'undefined'
          ? localStorage.getItem('ai_api_key')
          : null;
        const userModel = typeof window !== 'undefined'
          ? localStorage.getItem('ai_model')
          : null;
        
        // Default to Groq (fastest, free tier available)
        // If user has set a provider, use it; otherwise default to Groq for speed
        const provider = userProvider || 'groq';
        const model = userModel || (provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'openrouter' ? 'meta-llama/llama-3.2-3b-instruct:free' : undefined);
        
        const requestBody: any = {
          message: buildPrompt,
          provider: provider,
        };
        
        // Always include API key if available (required for DeepSeek)
        if (userApiKey) {
          requestBody.apiKey = userApiKey;
        }
        if (model) {
          requestBody.model = model;
        }
        
        console.log('🤖 Using AI provider:', provider, 'with model:', model);
        console.log('🔑 API Key present:', !!userApiKey, '| Provider:', provider);
        
        // Check if API key is needed but missing (except for Ollama which uses localhost)
        if (!userApiKey && provider !== 'ollama') {
          console.warn('⚠️ No API key provided for provider:', provider);
          const errorMsg = `No API key configured for ${provider}. Please add your API key in chat settings (⚙️ icon).`;
          sessionStorage.setItem(`auto-error-${project.id}`, JSON.stringify({
            error: errorMsg,
            type: 'missing_api_key',
            suggestion: `Get your ${provider} API key and add it in chat settings (⚙️ icon)`
          }));
          window.dispatchEvent(new CustomEvent('generation-complete', { 
            detail: { 
              projectId: project.id,
              duration: '0',
              filesCreated: 0,
              error: true
            } 
          }));
          return;
        }
        
        // Store generation start time and trigger loading overlay
        const generationStartTime = Date.now();
        sessionStorage.setItem(`generation-start-${project.id}`, generationStartTime.toString());
        window.dispatchEvent(new CustomEvent('generation-started', { detail: { projectId: project.id } }));
        
        let requestCompleted = false;
        console.log('🚀 Starting AI request for project:', project.id);
        fetch(`/api/app-projects/${project.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }).then(async (chatResponse) => {
          console.log('📡 Chat API response received:', {
            status: chatResponse.status,
            statusText: chatResponse.statusText,
            ok: chatResponse.ok,
            url: chatResponse.url
          });

          // Safety check: ensure chatResponse exists
          if (!chatResponse) {
            throw new Error('No response received from server');
          }

          // Clone response for error handling (response body can only be read once)
          const responseClone = chatResponse.clone();

          if (chatResponse.ok) {
            console.log('✅ Request successful, processing response...');
            requestCompleted = true; // Mark as successful before parsing
            const chatData = await chatResponse.json();
            console.log('✅ AI response data:', {
              hasResponse: !!chatData.response,
              responseLength: chatData.response?.length || 0,
              hasFilesCreated: !!chatData.filesCreated,
              filesCreatedCount: chatData.filesCreated?.length || 0,
              provider: chatData.provider,
              model: chatData.model,
              keys: Object.keys(chatData)
            });
            
            // Store response in sessionStorage for chat UI
            sessionStorage.setItem(`auto-response-${project.id}`, JSON.stringify(chatData));
            
            // Calculate generation time
            const generationEndTime = Date.now();
            const generationDuration = ((generationEndTime - generationStartTime) / 1000).toFixed(1);
            sessionStorage.setItem(`generation-duration-${project.id}`, generationDuration);
            
            // Trigger files refresh multiple times to ensure files appear
            // Files might take a moment to be saved to database
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('files-updated'));
            }, 500);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('files-updated'));
            }, 1500);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('files-updated'));
            }, 3000);
            
            // Also trigger preview refresh after files are created
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('preview-updated'));
            }, 2000);
            
            // Stop generation loader after preview is triggered
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('generation-complete', { 
                detail: { 
                  projectId: project.id,
                  duration: generationDuration,
                  filesCreated: chatData.filesCreated?.length || 0
                } 
              }));
            }, 3500);
          } else {
            console.log('❌ Request failed with status:', chatResponse.status, chatResponse.statusText);
            // Only process error if request hasn't already completed successfully
            if (requestCompleted) {
              console.warn('⚠️ Error block reached but request was already marked as successful - skipping error handling');
              return;
            }
            
            // Stop loader on error
            const errorDuration = ((Date.now() - generationStartTime) / 1000).toFixed(1);
            window.dispatchEvent(new CustomEvent('generation-complete', { 
              detail: { 
                projectId: project.id,
                duration: errorDuration,
                filesCreated: 0,
                error: true
              } 
            }));
            
            // Handle error response with better error parsing
            // Use cloned response to avoid consuming the original response body
            let errorData: any = null;
            let errorMessage = `Server error (${chatResponse.status})`;
            let responseText = '';
            
            try {
              // Try to read response as text first (use clone to avoid consuming original)
              responseText = await responseClone.text();
              
              if (responseText && responseText.trim()) {
                // Try to parse as JSON
                try {
                  errorData = JSON.parse(responseText);
                  errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
                } catch (jsonError) {
                  // Not JSON, treat as plain text
                  errorMessage = responseText.substring(0, 200); // Limit length
                  errorData = { 
                    error: responseText.substring(0, 200),
                    raw: responseText,
                    status: chatResponse.status 
                  };
                }
              }
            } catch (readError: any) {
              console.error('Failed to read error response:', readError);
              responseText = '';
            }
            
            // Build error data object - ensure it's never empty
            if (!errorData || typeof errorData !== 'object' || Object.keys(errorData).length === 0) {
              errorData = {
                error: errorMessage,
                status: chatResponse.status,
                statusText: chatResponse.statusText || 'Unknown',
                httpStatus: chatResponse.status,
                responseBody: responseText || '(empty)',
                note: responseText ? 'Response received but could not parse' : 'No response body received'
              };
            } else {
              // Ensure errorData has at least basic fields
              if (!errorData.status) errorData.status = chatResponse.status;
              if (!errorData.statusText) errorData.statusText = chatResponse.statusText || 'Unknown';
              if (!errorData.error && !errorData.message) {
                errorData.error = errorMessage;
              }
            }
            
            // Final check - ensure errorData is never empty before logging
            const finalErrorData = (errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0) 
              ? errorData 
              : {
                  error: errorMessage,
                  status: chatResponse.status,
                  statusText: chatResponse.statusText || 'Unknown',
                  httpStatus: chatResponse.status,
                  responseBody: responseText || '(empty)',
                  note: 'Error data was empty, using fallback values'
                };
            
            // Only log errors for actual HTTP errors (4xx, 5xx) and when request hasn't completed
            if (chatResponse.status >= 400 && !requestCompleted) {
              // Create minimal error log - avoid complex serialization that might fail
              const errorLog = {
                status: chatResponse.status,
                statusText: chatResponse.statusText,
                error: errorMessage || 'Unknown error',
                provider: provider || 'unknown',
                model: model || 'unknown',
                projectId: project.id,
                timestamp: new Date().toISOString()
              };

              console.error('❌ AI chat request failed:', errorLog);
            }
            
            sessionStorage.setItem(`auto-error-${project.id}`, JSON.stringify({
              error: errorMessage,
              status: chatResponse.status,
              statusText: chatResponse.statusText,
              details: finalErrorData
            }));
          }
        }).catch((chatError) => {
          // Handle network errors or other fetch failures
          let errorMessage = 'Connection error';
          let errorDetails = '';
          let errorType = 'unknown';
          
          // Safely extract error information
          if (chatError instanceof Error) {
            errorMessage = chatError.message || 'Unknown error';
            errorDetails = chatError.stack || '';
            errorType = 'Error';
            
            // Provide more specific error messages
            if (chatError.message.includes('fetch failed') || chatError.message.includes('network')) {
              errorMessage = 'Connection error: Unable to reach the AI service. Please check your internet connection and API key settings.';
            } else if (chatError.message.includes('Failed to fetch')) {
              errorMessage = 'Connection error: The AI service is not reachable. Please verify your API key is correct.';
            }
          } else if (chatError && typeof chatError === 'object') {
            // Try to extract meaningful information from error object
            errorMessage = (chatError as any).message || (chatError as any).error || 'Network error: Unable to connect to AI service';
            errorDetails = JSON.stringify(chatError, null, 2);
            errorType = 'Object';
          } else {
            errorMessage = 'Network error: Unable to connect to AI service';
            errorDetails = String(chatError || 'Unknown error');
            errorType = typeof chatError;
          }
          
          // Ensure we always log meaningful information - all values must be serializable
          const errorInfo: Record<string, any> = {
            errorType: String(errorType || 'unknown'),
            errorMessage: String(errorMessage || 'Unknown error'),
            errorDetails: String(errorDetails || 'No additional details'),
            projectId: String(project.id || 'unknown'),
            provider: String(provider || 'unknown'),
            model: String(model || 'unknown'),
            hasApiKey: Boolean(userApiKey),
            timestamp: String(new Date().toISOString()),
          };
          
          // Safely add error object details if available
          if (chatError instanceof Error) {
            errorInfo.errorName = String(chatError.name || 'Error');
            errorInfo.errorMessage = String(chatError.message || errorMessage);
            errorInfo.errorStack = String(chatError.stack || 'No stack trace');
          } else if (chatError && typeof chatError === 'object') {
            try {
              const errorStr = JSON.stringify(chatError);
              errorInfo.errorObject = JSON.parse(errorStr);
            } catch (serializeError) {
              errorInfo.errorObject = { note: 'Error object could not be serialized' };
            }
          }
          
          // Final validation - ensure errorInfo is not empty
          if (Object.keys(errorInfo).length === 0) {
            errorInfo.error = 'Error logging failed - no data available';
            errorInfo.errorMessage = String(errorMessage || 'Unknown error');
          }
          
          console.error('❌ Error calling AI chat:', errorInfo);
          
          // Stop loader on network error
          const generationStartTimeStr = sessionStorage.getItem(`generation-start-${project.id}`);
          if (generationStartTimeStr) {
            const generationStartTime = parseInt(generationStartTimeStr);
            const generationDuration = ((Date.now() - generationStartTime) / 1000).toFixed(1);
            window.dispatchEvent(new CustomEvent('generation-complete', { 
              detail: { 
                projectId: project.id,
                duration: generationDuration,
                filesCreated: 0,
                error: true
              } 
            }));
          }
          
          sessionStorage.setItem(`auto-error-${project.id}`, JSON.stringify({ 
            error: errorMessage,
            type: 'network_error',
            details: errorDetails,
            suggestion: 'Please check your API key settings (⚙️ icon) and ensure your internet connection is working.'
          }));
        });
      }, 1500);
      
      // Show success message
      alert(`✅ Project created successfully!\n\n🤖 AI is now generating your ${questionnaireData.appType} app with ${questionnaireData.designStyle} design based on your questionnaire!\n\nCheck the Chat tab to see the prompt and progress.`);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      const errorMessage = error?.message || 'Failed to create project. Please try again.';
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateProject = () => {
    // Show questionnaire first (title can be set in questionnaire)
    setShowQuestionnaire(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const res = await fetch(`/api/app-projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchProjects();
        if (selectedProjectId === projectId) {
          onSelectProject('');
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-400">Loading projects...</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Projects</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCreateSampleProject}
              disabled={creatingSample}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Create a beautiful sample portfolio website"
            >
              {creatingSample ? 'Creating...' : '✨ Sample'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p>No projects yet</p>
            <p className="mt-2">Create your first project to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedProjectId === project.id
                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                    : 'bg-[#1a1a1a] border border-white/5 hover:border-white/10'
                }`}
                onClick={() => onSelectProject(project.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="text-gray-400 text-xs mt-1 truncate">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {project.type}
                      </span>
                      {project.framework && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-500">
                            {project.framework}
                          </span>
                        </>
                      )}
                      {project._count && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-500">
                            {project._count.files} files
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="ml-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4">Create New Project</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="My Awesome App"
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-white text-sm font-medium">{template.name}</div>
                      <div className="text-gray-400 text-xs mt-1">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {workspaces.length > 0 && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Workspace (Optional)
                  </label>
                  <select
                    value={selectedWorkspaceId}
                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400/50"
                  >
                    <option value="">No workspace</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-500 text-xs mt-1">
                    Link this project to a workspace for better organization
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectTitle.trim() || creating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questionnaire Wizard */}
      {showQuestionnaire && (
        <QuestionnaireWizard
          onComplete={handleQuestionnaireComplete}
          onSkip={() => {
            setShowQuestionnaire(false);
            // Create project without questionnaire
            handleCreateProjectWithoutQuestionnaire();
          }}
          initialData={questionnaireData}
        />
      )}
    </div>
  );

  async function handleCreateProjectWithoutQuestionnaire() {
    if (!newProjectTitle.trim()) return;

    setCreating(true);
    try {
      const template = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate);
      if (!template) return;

      const projectRes = await fetch('/api/app-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProjectTitle,
          type: template.type,
          framework: template.framework,
          description: template.description,
          workspaceId: selectedWorkspaceId || undefined,
        }),
      });

      if (!projectRes.ok) {
        const errorData = await projectRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create project (${projectRes.status})`);
      }

      const project = await projectRes.json();

      if (template.files.length > 0) {
        for (const file of template.files) {
          await fetch(`/api/app-projects/${project.id}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(file),
          });
        }
      }

      setShowCreateModal(false);
      setNewProjectTitle('');
      setSelectedWorkspaceId('');
      await fetchProjects();
      onSelectProject(project.id);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      alert(error?.message || 'Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  }
}

