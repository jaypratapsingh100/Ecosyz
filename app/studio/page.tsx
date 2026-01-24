'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import ProjectManager from '../components/app-builder/ProjectManager';
import CodeEditor from '../components/app-builder/CodeEditor';
import AppChat from '../components/app-builder/AppChat';
import PreviewPanel from '../components/app-builder/PreviewPanel';
import DeploymentPanel from '../components/app-builder/DeploymentPanel';
import GenerationLoader from '../components/app-builder/GenerationLoader';
import WelcomeScreen from '../components/app-builder/WelcomeScreen';
import WizardFlow from '../components/app-builder/WizardFlow';
import { useAuthCheck } from '../hooks/useAuthCheck';
import type { Project, ProjectFile } from '../types/app-builder';

function AppBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuthCheck();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'preview' | 'deploy'>('chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProjectId, setGenerationProjectId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [creatingSample, setCreatingSample] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'projects' | 'code' | 'chat' | 'deploy'>('projects');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState(false);

  // Auto-create project when description is provided (from home page)
  useEffect(() => {
    const descriptionParam = searchParams.get('description');
    const wizardParam = searchParams.get('wizard');
    
    // Only show wizard if explicitly requested
    if (wizardParam === 'true') {
      setShowWizard(true);
      // Clean URL by removing query params
      if (typeof window !== 'undefined' && window.location.search) {
        router.replace('/studio', { scroll: false });
      }
      return;
    }
    
    // If description is provided, auto-create project and go to editor
    if (descriptionParam && isAuthenticated === true && !selectedProjectId) {
      const description = decodeURIComponent(descriptionParam);
      autoCreateProjectFromDescription(description);
      // Clean URL by removing query params after processing
      if (typeof window !== 'undefined' && window.location.search) {
        router.replace('/studio', { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, isAuthenticated, selectedProjectId]);
  
  // Fetch files when authentication completes and project is selected
  useEffect(() => {
    if (isAuthenticated === true && selectedProjectId) {
      fetchFiles();
    }
  }, [isAuthenticated, selectedProjectId]);

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      // Constrain width between 200px and 800px
      if (newWidth >= 200 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Listen for generation events
  useEffect(() => {
    const handleGenerationStarted = (event: CustomEvent) => {
      const { projectId } = event.detail;
      setIsGenerating(true);
      setGenerationProjectId(projectId);
    };

    const handleGenerationComplete = (event: CustomEvent) => {
      const { projectId, duration, filesCreated } = event.detail;
      console.log(`✅ Generation complete in ${duration}s, ${filesCreated} files created`);
      // Small delay before hiding loader to show completion
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProjectId(null);
        // Switch to preview panel automatically after generation
        if (selectedProjectId === projectId) {
          setRightPanelMode('preview');
        }
      }, 1000);
    };

    window.addEventListener('generation-started', handleGenerationStarted as EventListener);
    window.addEventListener('generation-complete', handleGenerationComplete as EventListener);

    return () => {
      window.removeEventListener('generation-started', handleGenerationStarted as EventListener);
      window.removeEventListener('generation-complete', handleGenerationComplete as EventListener);
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProject();
      // Only fetch files if authenticated (or authentication check is complete)
      if (isAuthenticated === true) {
        fetchFiles();
      } else if (isAuthenticated === false) {
        console.warn('⚠️ Skipping file fetch: User is not authenticated');
      }
      // If isAuthenticated is null, wait for auth check to complete
    } else {
      setProject(null);
      setFiles([]);
      setSelectedFile(null);
    }
  }, [selectedProjectId, isAuthenticated]);

  const fetchProject = async () => {
    if (!selectedProjectId) return;
    
    try {
      const res = await fetch(`/api/app-projects/${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject({
          id: data.id,
          title: data.title,
          type: data.type,
          framework: data.framework,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      } else {
        let errorData: any = {};
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await res.json();
          } else {
            const textError = await res.text().catch(() => '');
            errorData = { error: textError || `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
        }
        
        // Ensure errorData has content
        const errorMessage = errorData.error || errorData.message || `HTTP ${res.status}: ${res.statusText || 'Unknown error'}`;
        
        console.error('Failed to fetch project:', {
          status: res.status,
          statusText: res.statusText,
          error: errorMessage,
          errorData: Object.keys(errorData).length > 0 ? errorData : { error: errorMessage }
        });
        
        // Don't show alert for 401/403 as user might not be logged in
        if (res.status === 401) {
          console.warn('⚠️ Authentication required - user may need to log in');
        } else if (res.status === 403) {
          console.warn('⚠️ Not authorized to access this project');
        } else if (res.status !== 401 && res.status !== 403) {
          console.warn('Project fetch error:', errorMessage);
        }
      }
    } catch (error) {
      console.error('Failed to fetch project (network error):', error);
      // Network error - might be server down or CORS issue
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Check if server is running and API endpoint exists');
      }
    }
  };

  const fetchFiles = async () => {
    if (!selectedProjectId) return;
    
    // Don't fetch files if user is not authenticated
    if (isAuthenticated === false) {
      console.warn('⚠️ Cannot fetch files: User is not authenticated');
      return;
    }
    
    // Wait for authentication check to complete
    if (isAuthenticated === null) {
      console.log('⏳ Waiting for authentication check to complete...');
      return;
    }
    
    try {
      const res = await fetch(`/api/app-projects/${selectedProjectId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        
        // Auto-select first file or main file
        const mainFile = data.find((f: ProjectFile) => f.isMain);
        if (mainFile) {
          setSelectedFile(mainFile);
        } else if (data.length > 0) {
          setSelectedFile(data[0]);
        }
      } else {
        let errorData: any = {};
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await res.json();
          } else {
            const textError = await res.text().catch(() => '');
            errorData = { error: textError || `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
        }
        
        console.error('Failed to fetch files:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData.error || errorData.message || 'Unknown error',
          details: errorData.details,
          errorData: Object.keys(errorData).length > 0 ? errorData : { error: errorData.error || 'Unknown error' }
        });
        
        // Handle authentication errors
        if (res.status === 401) {
          console.warn('⚠️ Authentication required - user may need to log in');
          console.warn('Suggestion:', errorData.details?.suggestion || errorData.message || 'Please sign in to continue');
          // Optionally redirect to login or show a message
          // router.push('/auth');
        } else if (res.status === 403) {
          console.warn('⚠️ Not authorized to access this project');
        } else if (res.status !== 401 && res.status !== 403) {
          console.warn('Files fetch error:', errorData.error || errorData.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Failed to fetch files (network error):', error);
      // Network error - might be server down or CORS issue
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Check if server is running and API endpoint exists');
      }
    }
  };

  const handleFileSelect = (file: { id: string; path: string; name: string; language?: string; isMain: boolean }) => {
    // Fetch full file content asynchronously
    fetch(`/api/app-projects/${selectedProjectId}/files/${file.id}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Failed to fetch file');
      })
      .then((data) => {
        setSelectedFile(data);
      })
      .catch((error) => {
        console.error('Failed to fetch file:', error);
      });
  };

  const handleFileChange = () => {
    fetchFiles();
  };

  const handleEditorChange = (content: string) => {
    if (selectedFile) {
      setSelectedFile({ ...selectedFile, content });
    }
  };

  const handleWizardComplete = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowWizard(false);
    router.replace('/studio', { scroll: false });
  };

  // Auto-create project from description (from home page)
  const autoCreateProjectFromDescription = async (description: string) => {
    if (!description.trim() || isAuthenticated !== true) {
      return;
    }

    try {
      // Step 1: Extract info from description
      const extractResponse = await fetch('/api/app-projects/extract-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      let extractedInfo = {
        features: [] as string[],
        targetAudience: 'general',
        designStyle: 'modern',
      };

      if (extractResponse.ok) {
        extractedInfo = await extractResponse.json();
      }

      // Step 2: Create project with extracted info
      const projectTitle = description.substring(0, 50) || 'My App';
      const projectResponse = await fetch('/api/app-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: projectTitle,
          description: description,
          type: 'web',
          framework: 'react',
          questionnaireData: {
            idea: description,
            features: extractedInfo.features,
            targetAudience: extractedInfo.targetAudience,
            designStyle: extractedInfo.designStyle,
            framework: 'react',
            language: 'javascript',
            styling: 'tailwind',
          },
        }),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({ error: 'Failed to create project' }));
        throw new Error(errorData.error || 'Failed to create project');
      }

      const project = await projectResponse.json();
      const projectId = project.id;

      // Step 3: Select project and fetch files
      setSelectedProjectId(projectId);
      await fetchFiles();

      // Step 4: Auto-trigger AI generation via chat
      const buildPrompt = `Create a complete React application with the following requirements:

**App Description:**
${description}

**Key Features:**
${extractedInfo.features.length > 0 ? extractedInfo.features.map(f => `- ${f}`).join('\n') : '- User interface\n- Navigation\n- Content sections'}

**Target Audience:**
${extractedInfo.targetAudience}

**Technical Stack:**
- Framework: React
- Language: JavaScript
- Styling: Tailwind CSS

**Design Style:** ${extractedInfo.designStyle || 'Modern and clean'}

Please generate a complete, production-ready application with:
1. Proper file structure
2. All necessary dependencies
3. Modern UI/UX design
4. Responsive layout
5. Clean, well-commented code
6. Best practices and patterns

Generate all files needed for a fully functional application.`;

      // Store prompt for AppChat to pick up
      const generationStartTime = Date.now();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`auto-prompt-${projectId}`, buildPrompt);
        sessionStorage.setItem(`auto-prompt-timestamp-${projectId}`, Date.now().toString());
        sessionStorage.setItem(`generation-start-${projectId}`, generationStartTime.toString());
        window.dispatchEvent(new CustomEvent('generation-started', { detail: { projectId } }));
        window.dispatchEvent(new CustomEvent('auto-prompt-ready', { detail: { projectId } }));
      }

      // Send to chat API
      const startTime = generationStartTime; // Capture for closure
      setTimeout(async () => {
        try {
          const chatResponse = await fetch(`/api/app-projects/${projectId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              message: buildPrompt,
            }),
          });

          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            
            // Trigger file refresh events
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('files-updated'));
              }
            }, 500);
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('files-updated'));
              }
            }, 1500);
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('preview-updated'));
              }
            }, 2000);
            
            // Stop generation loader
            setTimeout(() => {
              const generationDuration = ((Date.now() - startTime) / 1000).toFixed(1);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('generation-complete', { 
                  detail: { 
                    projectId,
                    duration: generationDuration,
                    filesCreated: chatData.filesCreated?.length || 0
                  } 
                }));
              }
              setRightPanelMode('preview');
            }, 3000);
          }
        } catch (error) {
          console.error('Error triggering AI generation:', error);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error auto-creating project:', error);
      // Fallback: show wizard instead
      setShowWizard(true);
    }
  };

  const handleCreateSampleProject = async () => {
    // Check authentication first
    if (isAuthenticated === false) {
      alert('Please sign in to create a sample project.');
      router.push('/auth');
      return;
    }

    if (isAuthenticated === null || isLoading) {
      alert('Please wait while we verify your authentication...');
      return;
    }

    setCreatingSample(true);
    try {
      const response = await fetch('/api/app-projects/create-sample', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle authentication errors
        if (response.status === 401) {
          alert('Your session has expired. Please sign in again.');
          router.push('/auth');
          return;
        }
        
        throw new Error(errorData.error || `Failed to create sample project (${response.status})`);
      }

      const data = await response.json();
      const projectId = data.project?.id || '';
      
      if (!projectId) {
        throw new Error('Project ID not returned from server');
      }
      
      // Set project ID first
      setSelectedProjectId(projectId);
      
      // Trigger projects list refresh immediately
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('projects-updated'));
      }, 300);
      
      // Fetch files after project is created
      // Wait a bit for files to be saved to database
      setTimeout(async () => {
        try {
          await fetchFiles();
          
          // Trigger preview refresh events after files are loaded
          setTimeout(() => {
            console.log('🔄 Triggering preview refresh for sample project:', projectId);
            window.dispatchEvent(new CustomEvent('files-updated', { 
              detail: { projectId } 
            }));
            window.dispatchEvent(new CustomEvent('preview-updated', { 
              detail: { projectId } 
            }));
            window.dispatchEvent(new CustomEvent('auto-refresh-preview', {
              detail: { projectId }
            }));
          }, 800);
          
          // Switch to preview panel to show the result
          setTimeout(() => {
            setRightPanelMode('preview');
          }, 1500);
        } catch (error) {
          console.error('Error fetching files after sample creation:', error);
        }
          }, 500);
    } catch (error: any) {
      console.error('Failed to create sample project:', error);
      alert(`Failed to create sample project: ${error.message}`);
    } finally {
      setCreatingSample(false);
    }
  };


  // Show loading state while checking auth
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen flex items-center flex-1">
          {/* Globe background image */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="mb-6">
                <svg className="w-24 h-24 text-emerald-400/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Authentication Required</h2>
              <p className="text-teal-100/90 mb-8 text-lg">Please sign in to use the App Builder</p>
              <p className="text-gray-400 mb-8 text-sm">Build amazing applications with AI-powered code generation</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/auth')}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-lg hover:scale-105"
                >
                  Sign In
                </button>
                <Link
                  href="/"
                  className="px-8 py-3 border border-white/20 hover:border-white/40 text-white font-medium rounded-lg transition-all backdrop-blur-sm"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
        </section>
      </div>
    );
  }

  return (
    <div 
      className="app-builder-page bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]"
      style={{ 
        minHeight: '100vh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Header />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {selectedProjectId ? (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
          {/* Left Sidebar - Collapsible */}
          <div 
            className="border-r border-white/10 bg-[#0a0a0a] overflow-hidden relative"
            style={{ 
              width: leftSidebarOpen ? `${sidebarWidth}px` : '0px',
              flexShrink: 0,
              transition: leftSidebarOpen ? 'none' : 'width 300ms ease-in-out'
            }}
          >
            {leftSidebarOpen && (
              <div className="h-full flex flex-col">
                {/* Sidebar Tabs */}
                <div className="flex border-b border-white/10 bg-[#0d0d0d] flex-shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setLeftSidebarTab('projects')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      leftSidebarTab === 'projects'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Projects
                  </button>
                  <button
                    onClick={() => setLeftSidebarTab('code')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      leftSidebarTab === 'code'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setLeftSidebarTab('chat')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      leftSidebarTab === 'chat'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setLeftSidebarTab('deploy')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      leftSidebarTab === 'deploy'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Deploy
                  </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-hidden">
                  {leftSidebarTab === 'projects' && (
                    <ProjectManager
                      onSelectProject={setSelectedProjectId}
                      selectedProjectId={selectedProjectId}
                      onOpenWizard={() => setShowWizard(true)}
                    />
                  )}
                  {leftSidebarTab === 'code' && (
                    <CodeEditor
                      file={selectedFile}
                      projectId={selectedProjectId}
                      onChange={handleEditorChange}
                      files={files}
                      onFileSelect={handleFileSelect}
                    />
                  )}
                  {leftSidebarTab === 'chat' && (
                    <AppChat
                      projectId={selectedProjectId}
                      currentFile={selectedFile ? { id: selectedFile.id, path: selectedFile.path, name: selectedFile.name } : undefined}
                      projectFiles={files.map(f => ({ path: f.path, name: f.name }))}
                      onFilesCreated={fetchFiles}
                    />
                  )}
                  {leftSidebarTab === 'deploy' && (
                    <DeploymentPanel
                      projectId={selectedProjectId}
                      projectName={project?.title || 'Untitled Project'}
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Resize Handle */}
            {leftSidebarOpen && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-400/50 transition-colors group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-emerald-400/30 group-hover:bg-emerald-400 transition-all rounded-full" />
              </div>
            )}
          </div>

          {/* Main Content Area - Full Width Preview */}
          <div className="flex-1 overflow-hidden relative">
            {/* Sidebar Toggle with Icon Menu */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 group/menu"
              onMouseEnter={() => setShowTabMenu(true)}
              onMouseLeave={() => setShowTabMenu(false)}
            >
              {/* Show tab icons only when sidebar is closed AND hovering */}
              {!leftSidebarOpen && showTabMenu && (
                <>
                  {/* Top Icons - 2 above */}
                  <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                    {[
                      { id: 'projects', label: 'Projects', icon: '📁' },
                      { id: 'code', label: 'Code', icon: '💻' }
                    ].map((tab) => (
                      <div key={tab.id} className="relative group/tooltip">
                        <button
                          onClick={() => {
                            setLeftSidebarTab(tab.id as any);
                            setLeftSidebarOpen(true);
                            setShowTabMenu(false);
                          }}
                          className="bg-[#0d0d0d] border border-white/10 rounded-r-lg p-2.5 text-xl transition-all hover:bg-emerald-500/20 hover:scale-110 shadow-lg"
                          style={{
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                          }}
                        >
                          {tab.icon}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-200">{tab.label}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Main Toggle Button - Always visible */}
              <div className="relative group/tooltip">
                <button
                  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                  className="bg-[#0d0d0d] border border-white/10 rounded-r-lg p-2.5 hover:bg-[#1a1a1a] transition-all shadow-lg"
                  style={{ 
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                >
                  <img 
                    src="/icon.svg" 
                    alt="OpenIdea" 
                    className={`w-6 h-6 transition-transform duration-300 ${leftSidebarOpen ? 'rotate-90' : ''} group-hover/tooltip:scale-110`}
                  />
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-200">
                      {leftSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Show tab icons only when sidebar is closed AND hovering */}
              {!leftSidebarOpen && showTabMenu && (
                <>
                  {/* Bottom Icons - 2 below */}
                  <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
                    {[
                      { id: 'chat', label: 'Chat', icon: '💬' },
                      { id: 'deploy', label: 'Deploy', icon: '🚀' }
                    ].map((tab) => (
                      <div key={tab.id} className="relative group/tooltip">
                        <button
                          onClick={() => {
                            setLeftSidebarTab(tab.id as any);
                            setLeftSidebarOpen(true);
                            setShowTabMenu(false);
                          }}
                          className="bg-[#0d0d0d] border border-white/10 rounded-r-lg p-2.5 text-xl transition-all hover:bg-emerald-500/20 hover:scale-110 shadow-lg"
                          style={{
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                          }}
                        >
                          {tab.icon}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-200">{tab.label}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Preview - Full Width */}
            <div className="h-full overflow-hidden">
              {selectedProjectId ? (
                <PreviewPanel
                  projectId={selectedProjectId}
                  projectType={project?.type || 'web'}
                  onRefresh={fetchFiles}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#0a0a0a] text-gray-400">
                  <div className="text-center">
                    <p className="text-sm">Please select a project to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '256px 1fr', height: '100%', overflow: 'hidden' }}>
          {/* Column 1: Projects */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <ProjectManager
              onSelectProject={setSelectedProjectId}
              selectedProjectId={selectedProjectId}
              onOpenWizard={() => setShowWizard(true)}
            />
          </div>

          {/* Column 2: Welcome Screen */}
          <WelcomeScreen
            onCreateProject={() => setShowWizard(true)}
            onCreateSample={handleCreateSampleProject}
            isCreatingSample={creatingSample}
            isAuthenticated={isAuthenticated === true}
          />
        </div>
      )}
      </div>
      
      {/* Wizard Flow Overlay */}
      {showWizard && (
        <WizardFlow
          onComplete={handleWizardComplete}
          onClose={() => {
            setShowWizard(false);
            router.replace('/studio', { scroll: false });
          }}
          initialDescription={searchParams.get('description') || undefined}
        />
      )}

      {/* Generation Loader Overlay */}
      <GenerationLoader
        isActive={isGenerating}
        message={`Generating ${project?.title || 'your app'}...`}
        onComplete={() => {
          console.log('Generation complete!');
        }}
      />
    </div>
  );
}

export default function AppBuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <AppBuilderPageContent />
    </Suspense>
  );
}

