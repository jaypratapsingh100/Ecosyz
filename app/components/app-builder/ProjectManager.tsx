'use client';

import { useState, useEffect } from 'react';

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

export default function ProjectManager({ onSelectProject, selectedProjectId }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('react');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchWorkspaces();
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

  /*
   * Legacy questionnaire-based creation flow.
   *
   * This flow has been superseded by the Questionnaire step inside `WizardFlow`.
   * We keep this block commented out temporarily to avoid accidental usage while
   * cleaning up the codebase. It can be safely deleted once confirmed unused.
   *
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
      
      // Select project first
      onSelectProject(project.id);
      
      // Step 1: Wait for scaffold files to be created and verify preview renders
      console.log('🔍 Step 1: Verifying scaffold files render...');
      
      // Wait a bit for scaffold files to be saved to database
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify preview can be generated (this ensures scaffold files are working)
      try {
        const previewRes = await fetch(`/api/app-projects/${project.id}/preview`, {
          method: 'POST',
        });
        
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          if (previewData.output && previewData.output.length > 0) {
            console.log('✅ Scaffold files verified - preview renders successfully');
            console.log('📊 Preview HTML length:', previewData.output.length);
          } else {
            console.warn('⚠️ Preview API returned empty output');
          }
        } else {
          console.warn('⚠️ Preview verification failed:', previewRes.status);
          const errorData = await previewRes.json().catch(() => ({ error: 'Unknown error' }));
          console.warn('Preview error:', errorData);
        }
      } catch (previewError: any) {
        console.error('❌ Error verifying preview:', previewError);
        // Continue anyway - scaffold files should still work
      }
      
      // Step 2: Wait for project to be selected and chat component to initialize
      // Increased timeout to ensure AppChat useEffect runs and can detect the prompt
      setTimeout(() => {
        // Generate comprehensive prompt from questionnaire data
        const buildPrompt = generateBuildPrompt(questionnaireData, project.title);
        console.log('📝 Step 2: Generated build prompt from questionnaire:', buildPrompt);
        
        // Store prompt in sessionStorage so AppChat can pick it up
        sessionStorage.setItem(`auto-prompt-${project.id}`, buildPrompt);
        sessionStorage.setItem(`auto-prompt-timestamp-${project.id}`, Date.now().toString());
        
        // Trigger a custom event to notify AppChat that prompt is ready
        // This ensures AppChat picks up the prompt even if useEffect hasn't run yet
        window.dispatchEvent(new CustomEvent('auto-prompt-ready', { 
          detail: { projectId: project.id } 
        }));
        
        // Step 3: Automatically send prompt to AI chat to generate files
        // AI will build on top of the working scaffold files
        console.log('🤖 Step 3: Triggering AI generation to build on scaffold...');
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
        
        // Use Azure DeepSeek (self-hosted)
        const provider = 'azure-deepseek';
        const model = 'deepseek-coder';
        
        const requestBody: any = {
          message: buildPrompt,
          // Provider and model are handled by backend using environment variables
          // No need to send them - backend defaults to Azure DeepSeek
        };
        
        console.log('🤖 Using Azure DeepSeek (self-hosted)');
        
        // Azure DeepSeek is self-hosted - no API key needed
        console.log('ℹ️ Using self-hosted Azure DeepSeek - no API key required');
        
        // Store generation start time and trigger loading overlay
        const generationStartTime = Date.now();
        sessionStorage.setItem(`generation-start-${project.id}`, generationStartTime.toString());
        window.dispatchEvent(new CustomEvent('generation-started', { detail: { projectId: project.id } }));
        
        let requestCompleted = false;
        console.log('🚀 Starting AI request for project:', project.id);
        console.log('📋 Request details:', {
          projectId: project.id,
          provider: provider,
          model: model,
          hasApiKey: !!userApiKey,
          requestBodyKeys: Object.keys(requestBody)
        });
        fetch(`/api/app-projects/${project.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for authentication
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
              successfulFiles: chatData.filesCreated?.filter((f: any) => f.success).length || 0,
              provider: chatData.provider,
              model: chatData.model,
              keys: Object.keys(chatData)
            });
            
            // Log file creation details
            if (chatData.filesCreated && chatData.filesCreated.length > 0) {
              console.log('📁 Files created:', chatData.filesCreated.map((f: any) => ({
                path: f.path,
                success: f.success,
                error: f.error
              })));
            } else {
              console.warn('⚠️ No files were created in the response');
            }
            
            // Store response in sessionStorage for chat UI
            sessionStorage.setItem(`auto-response-${project.id}`, JSON.stringify(chatData));
            
            // Calculate generation time
            const generationEndTime = Date.now();
            const generationDuration = ((generationEndTime - generationStartTime) / 1000).toFixed(1);
            sessionStorage.setItem(`generation-duration-${project.id}`, generationDuration);
            
            // Trigger files refresh multiple times to ensure files appear
            // Files might take a moment to be saved to database
            setTimeout(() => {
              console.log('🔄 Triggering files-updated event (1st)');
              window.dispatchEvent(new CustomEvent('files-updated'));
            }, 500);
            setTimeout(() => {
              console.log('🔄 Triggering files-updated event (2nd)');
              window.dispatchEvent(new CustomEvent('files-updated'));
            }, 1500);
            setTimeout(() => {
              console.log('🔄 Triggering files-updated event (3rd)');
              window.dispatchEvent(new CustomEvent('files-updated'));
            }, 3000);
            
            // Also trigger preview refresh after files are created
            setTimeout(() => {
              console.log('🔄 Triggering preview-updated event');
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
              // Create error log with guaranteed values - capture variables from outer scope
              // Ensure all values are properly captured and never undefined
              const errorLog: Record<string, any> = {
                status: chatResponse.status || 'unknown',
                statusText: chatResponse.statusText || 'Unknown',
                error: errorMessage || 'Unknown error',
                errorData: finalErrorData,
                provider: provider || 'unknown',
                model: model || 'unknown',
                projectId: project?.id || 'unknown',
                timestamp: new Date().toISOString(),
                responsePreview: responseText?.substring(0, 200) || 'no response',
                url: `/api/app-projects/${project?.id}/chat`,
                requestBody: {
                  hasMessage: !!requestBody.message,
                  messageLength: requestBody.message?.length || 0,
                  provider: requestBody.provider,
                  model: requestBody.model,
                  hasApiKey: !!requestBody.apiKey
                }
              };

              // Ensure errorLog is never empty
              if (Object.keys(errorLog).length === 0) {
                errorLog.fallback = 'Error log was empty - this should not happen';
                errorLog.status = chatResponse.status || 500;
                errorLog.error = 'Unknown error occurred';
              }

              console.error('❌ AI chat request failed:', errorLog);
              
              // Also log individual fields for easier debugging
              console.error('❌ Error details:', {
                status: chatResponse.status,
                statusText: chatResponse.statusText,
                errorMessage,
                provider,
                model,
                projectId: project?.id,
                responseText: responseText?.substring(0, 200)
              });
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
          
          console.error('❌ Fetch error caught:', {
            error: chatError,
            errorType: typeof chatError,
            isError: chatError instanceof Error,
            message: chatError instanceof Error ? chatError.message : String(chatError),
            stack: chatError instanceof Error ? chatError.stack : undefined,
            provider,
            model,
            projectId: project?.id
          });
          
          // Safely extract error information
          if (chatError instanceof Error) {
            errorMessage = chatError.message || 'Unknown error';
            errorDetails = chatError.stack || '';
            errorType = 'Error';
            
            // Provide more specific error messages
            if (chatError.message && (chatError.message.includes('fetch failed') || chatError.message.includes('network'))) {
              errorMessage = 'Connection error: Unable to reach the AI service. Please check your internet connection and API key settings.';
            } else if (chatError.message && chatError.message.includes('Failed to fetch')) {
              errorMessage = 'Connection error: The AI service is not reachable. Please verify your API key is correct.';
            }
          } else if (chatError && typeof chatError === 'object') {
            // Try to extract meaningful information from error object
            errorMessage = (chatError as any).message || (chatError as any).error || 'Network error: Unable to connect to AI service';
            try {
              errorDetails = JSON.stringify(chatError, null, 2);
            } catch {
              errorDetails = String(chatError);
            }
            errorType = 'Object';
          } else {
            errorMessage = 'Network error: Unable to connect to AI service';
            errorDetails = String(chatError || 'Unknown error');
            errorType = chatError === null ? 'null' : chatError === undefined ? 'undefined' : typeof chatError;
          }
          
          // Ensure we always log meaningful information - all values must be serializable strings
          const errorInfo: Record<string, any> = {
            errorType: String(errorType || 'unknown'),
            errorMessage: String(errorMessage || 'Unknown error'),
            errorDetails: String(errorDetails || 'No additional details'),
            projectId: String(project?.id || 'unknown'),
            provider: String(provider || 'unknown'),
            model: String(model || 'unknown'),
            hasApiKey: String(Boolean(userApiKey)),
            timestamp: String(new Date().toISOString()),
            url: `/api/app-projects/${project?.id}/chat`,
            originalError: chatError instanceof Error ? {
              name: chatError.name,
              message: chatError.message,
              stack: chatError.stack?.substring(0, 500) // Limit stack trace length
            } : String(chatError)
          };
          
          // Ensure errorInfo is never empty
          if (Object.keys(errorInfo).length === 0) {
            errorInfo.fallback = 'Error info was empty - this should not happen';
            errorInfo.errorMessage = 'Unknown error occurred';
          }
          
          // Safely add error object details if available
          if (chatError instanceof Error) {
            errorInfo.errorName = String(chatError.name || 'Error');
            errorInfo.errorMessage = String(chatError.message || errorMessage);
            errorInfo.errorStack = String(chatError.stack || 'No stack trace');
          } else if (chatError && typeof chatError === 'object') {
            try {
              const errorStr = JSON.stringify(chatError, (key, value) => {
                // Handle circular references and non-serializable values
                if (value === undefined) return 'undefined';
                if (value === null) return 'null';
                if (typeof value === 'function') return '[Function]';
                if (typeof value === 'symbol') return '[Symbol]';
                return value;
              });
              errorInfo.errorObject = errorStr.substring(0, 500); // Limit length
            } catch (serializeError) {
              errorInfo.errorObject = String('Error object could not be serialized: ' + String(serializeError));
            }
          } else if (chatError !== null && chatError !== undefined) {
            errorInfo.errorValue = String(chatError);
          }
          
          // Final validation - ensure errorInfo is not empty
          if (Object.keys(errorInfo).length === 0) {
            errorInfo.error = 'Error logging failed - no data available';
            errorInfo.errorMessage = String(errorMessage || 'Unknown error');
          }
          
          // Log with explicit string conversion to ensure it's visible
          console.error('❌ Error calling AI chat:', JSON.stringify(errorInfo, null, 2));
          console.error('❌ Raw error object:', chatError);
          
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

  */

  const handleCreateProject = async () => {
    // ProjectManager creates template projects only; the wizard lives outside.
    await handleCreateProjectWithoutQuestionnaire();
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
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] border-r border-white/5 overflow-hidden">
      <div className="p-5 border-b border-white/5 flex-shrink-0 bg-gradient-to-r from-[#0a0a0a]/50 to-[#0d0d0d]/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-xl mb-1 bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent">
              Projects
            </h2>
            <p className="text-gray-400 text-xs font-medium">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-full blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-8 rounded-2xl border border-white/10 shadow-2xl">
                <svg className="w-16 h-16 mx-auto text-emerald-400/60 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              No projects yet
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              Get started by creating your first project using the Create Project button in the center
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  selectedProjectId === project.id
                    ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-gradient-to-br from-[#1a1a1a]/80 to-[#0d0d0d]/80 border border-white/5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5'
                }`}
                onClick={() => onSelectProject(project.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedProjectId === project.id 
                          ? 'bg-emerald-400' 
                          : 'bg-gray-500 group-hover:bg-emerald-400'
                      } transition-colors`}></div>
                      <h3 className={`font-semibold text-sm truncate ${
                        selectedProjectId === project.id 
                          ? 'text-white' 
                          : 'text-gray-200 group-hover:text-white'
                      } transition-colors`}>
                        {project.title}
                      </h3>
                    </div>
                    {project.description && (
                      <p className="text-gray-400 text-xs mt-1.5 mb-2 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-md border border-white/5">
                        {project.type}
                      </span>
                      {project.framework && (
                        <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-md border border-white/5">
                          {project.framework}
                        </span>
                      )}
                      {project._count && (
                        <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-md border border-white/5">
                          {project._count.files} {project._count.files === 1 ? 'file' : 'files'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="ml-2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
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

