'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import ProjectManager from '../components/app-builder/ProjectManager';
import FileExplorer from '../components/app-builder/FileExplorer';
import CodeEditor from '../components/app-builder/CodeEditor';
import AppChat from '../components/app-builder/AppChat';
import PreviewPanel from '../components/app-builder/PreviewPanel';
import DeploymentPanel from '../components/app-builder/DeploymentPanel';
import GenerationLoader from '../components/app-builder/GenerationLoader';

interface Project {
  id: string;
  title: string;
  type: string;
  framework?: string;
}

interface File {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
  isMain: boolean;
}

export default function AppBuilderPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'preview' | 'deploy'>('chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProjectId, setGenerationProjectId] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);
  
  // Fetch files when authentication completes and project is selected
  useEffect(() => {
    if (isAuthenticated === true && selectedProjectId) {
      fetchFiles();
    }
  }, [isAuthenticated, selectedProjectId]);

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
        const mainFile = data.find((f: File) => f.isMain);
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
          setIsAuthenticated(false);
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

  // Show loading state while checking auth
  if (isAuthenticated === null) {
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
        height: '100vh', 
        width: '100vw', 
        display: 'grid', 
        gridTemplateRows: 'auto 1fr',
        overflow: 'hidden'
      }}
    >
      <Header />
      {selectedProjectId ? (
        <div 
          style={{ 
            display: 'grid',
            gridTemplateColumns: '256px 256px 1fr 384px',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Column 1: Projects */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
          <ProjectManager
            onSelectProject={setSelectedProjectId}
            selectedProjectId={selectedProjectId}
          />
        </div>

          {/* Column 2: File Explorer */}
          <div style={{ height: '100%', overflow: 'hidden', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <FileExplorer
                projectId={selectedProjectId}
                onSelectFile={handleFileSelect}
                selectedFileId={selectedFile?.id}
                onFileChange={handleFileChange}
              />
            </div>

          {/* Column 3: Editor */}
          <div style={{ height: '100%', overflow: 'hidden' }}>
              <CodeEditor
                file={selectedFile}
                projectId={selectedProjectId}
                onChange={handleEditorChange}
              />
            </div>

          {/* Column 4: Chat Panel - Fixed Width */}
          <div 
            style={{ 
              height: '100%', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
              {/* Tabs */}
            <div className="flex border-b border-white/10 bg-[#0a0a0a] flex-shrink-0">
                <button
                  onClick={() => setRightPanelMode('chat')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    rightPanelMode === 'chat'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Chat
                </button>
                {selectedProjectId && (
                  <button
                    onClick={() => setRightPanelMode('preview')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      rightPanelMode === 'preview'
                        ? 'text-emerald-400 border-b-2 border-emerald-400'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() => setRightPanelMode('deploy')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    rightPanelMode === 'deploy'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Deploy
                </button>
              </div>

              {/* Panel Content - Fixed height container */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {rightPanelMode === 'chat' ? (
                  <AppChat
                    projectId={selectedProjectId}
                    currentFile={selectedFile ? { id: selectedFile.id, path: selectedFile.path, name: selectedFile.name } : undefined}
                    projectFiles={files.map(f => ({ path: f.path, name: f.name }))}
                    onFilesCreated={fetchFiles}
                  />
                ) : rightPanelMode === 'preview' ? (
                  selectedProjectId ? (
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
                  )
                ) : (
                  <DeploymentPanel
                    projectId={selectedProjectId}
                    projectName={project?.title || 'Untitled Project'}
                  />
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
            />
          </div>

          {/* Column 2: Welcome Screen */}
          <div className="flex items-center justify-center relative overflow-hidden">
            {/* Globe background for welcome screen */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <Image
                src="/hero-globe.png"
                alt="Digital Globe Background"
                fill
                className="object-cover object-right opacity-20"
                quality={100}
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-radial from-cyan-400/15 to-transparent opacity-60 blur-3xl"></div>
            </div>
            
            {/* Welcome Content */}
            <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
              <div className="mb-6">
                <svg className="w-24 h-24 text-emerald-400/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Welcome to App Builder</h2>
              <p className="text-teal-100/90 mb-4 text-lg">Select a project from the sidebar or create a new one to get started</p>
              <p className="text-gray-400 text-sm mb-8">Build applications with AI-powered code generation</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    // Trigger the New button in ProjectManager
                    const event = new CustomEvent('trigger-new-project');
                    window.dispatchEvent(event);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:scale-105"
                >
                  Create New Project
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

      {/* Generation Loader Overlay */}
      <GenerationLoader
        isActive={isGenerating}
        message={`Generating ${project?.title || 'your app'}...`}
        onComplete={() => {
          // Optional: Show completion message
          console.log('Generation complete!');
        }}
      />
    </div>
  );
}

