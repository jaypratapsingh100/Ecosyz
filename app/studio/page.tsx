'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import ProjectManager, { type ProjectListItem } from '../components/app-builder/ProjectManager';
import CodeEditor from '../components/app-builder/CodeEditor';
import AppChat from '../components/app-builder/AppChat';
import PreviewPanel from '../components/app-builder/PreviewPanel';
import DeploymentPanel from '../components/app-builder/DeploymentPanel';
import GenerationLoader from '../components/app-builder/GenerationLoader';
import WelcomeScreen from '../components/app-builder/WelcomeScreen';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { SAMPLE_PORTFOLIO_PROJECT, SAMPLE_PORTFOLIO_FILES } from './samplePortfolioProject';
import { SAMPLE_REACT_PROJECT, SAMPLE_REACT_FILES } from './sampleReactProject';

function AppBuilderPageContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthCheck();
  
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'projects' | 'code' | 'chat' | 'deploy'>('projects');
  const [sidebarWidth] = useState(320);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const [isCreatingReactSample, setIsCreatingReactSample] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [projectFiles, setProjectFiles] = useState<{ id: string; path: string; name: string; content: string; language?: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ id: string; path: string; name: string; content: string; language?: string } | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/app-projects');
      if (!res.ok) return;
      const data = await res.json();
      setProjects(
        data.map(
          (p: {
            id: string;
            title: string;
            description?: string | null;
            framework?: string | null;
            createdAt?: string;
          }) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? null,
            framework: p.framework ?? null,
            createdAt: p.createdAt,
          }),
        ),
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated === true) fetchProjects();
  }, [isAuthenticated, fetchProjects]);

  const fetchProjectFiles = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/app-projects/${projectId}/files`);
      if (!res.ok) return;
      const data = await res.json();
      setProjectFiles(data);
      setSelectedFile(null);
    } catch {
      setProjectFiles([]);
      setSelectedFile(null);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) fetchProjectFiles(selectedProjectId);
    else {
      setProjectFiles([]);
      setSelectedFile(null);
    }
  }, [selectedProjectId, fetchProjectFiles]);

  const handleCreateNewProject = useCallback(async () => {
    setIsCreatingNew(true);
    try {
      const projectRes = await fetch('/api/app-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Project',
          description: 'Describe your app in the Chat tab to generate it',
          type: 'web',
          framework: 'react',
          appType: 'react',
          previewVersion: 'v2',
        }),
      });
      if (!projectRes.ok) throw new Error('Failed to create project');
      const project = await projectRes.json();
      setSelectedProjectId(project.id);
      setLeftSidebarOpen(true);
      setLeftSidebarTab('chat');
      await fetchProjects();
    } catch (error) {
      console.error('Error creating new project:', error);
      alert('Failed to create new project. Please try again.');
    } finally {
      setIsCreatingNew(false);
    }
  }, [fetchProjects]);

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const confirmed = window.confirm('Delete this project? This cannot be undone.');
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/app-projects?id=${encodeURIComponent(projectId)}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          console.error('Failed to delete project', await res.text());
          alert('Failed to delete project. Please try again.');
          return;
        }

        if (selectedProjectId === projectId) {
          setSelectedProjectId('');
          setProjectFiles([]);
          setSelectedFile(null);
        }

        await fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project. Please try again.');
      }
    },
    [fetchProjects, selectedProjectId],
  );

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
              transition: leftSidebarOpen ? 'none' : 'width 300ms ease-in-out',
              zIndex: 10
            }}
          >
            {leftSidebarOpen && (
              <div className="h-full flex flex-col" style={{ position: 'relative', zIndex: 10 }}>
                {/* Sidebar Tabs */}
                <div className="flex border-b border-white/10 bg-[#0d0d0d] flex-shrink-0 overflow-x-auto" style={{ position: 'relative', zIndex: 10 }}>
                  <button
                    onClick={() => setLeftSidebarTab('projects')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      leftSidebarTab === 'projects'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Projects
                  </button>
                  <button
                    onClick={() => setLeftSidebarTab('code')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      leftSidebarTab === 'code'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setLeftSidebarTab('chat')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      leftSidebarTab === 'chat'
                        ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0a0a0a]'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setLeftSidebarTab('deploy')}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
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
                      projects={projects}
                      onDeleteProject={handleDeleteProject}
                      onCreateNewProject={handleCreateNewProject}
                      isCreatingNewProject={isCreatingNew}
                    />
                  )}
                  {leftSidebarTab === 'code' && (
                    <CodeEditor
                      file={selectedFile}
                      projectId={selectedProjectId}
                      onChange={() => {}}
                      files={projectFiles}
                      onFileSelect={setSelectedFile}
                    />
                  )}
                  {leftSidebarTab === 'chat' && (
                    <AppChat
                      projectId={selectedProjectId || ''}
                      currentFile={undefined}
                      projectFiles={projectFiles}
                      onFilesCreated={() => selectedProjectId && fetchProjectFiles(selectedProjectId)}
                      projectTitle="New Project"
                      projectFramework="react"
                    />
                  )}
                  {leftSidebarTab === 'deploy' && (
                    <DeploymentPanel
                      projectId={selectedProjectId}
                      projectName="Untitled Project"
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Resize Handle */}
            {leftSidebarOpen && (
              <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-400/50 transition-colors group">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-emerald-400/30 group-hover:bg-emerald-400 transition-all rounded-full" />
              </div>
            )}
          </div>

          {/* Main Content Area - Full Width Preview */}
          <div className="flex-1 overflow-hidden relative">
            {/* Sidebar Toggle */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 group/menu"
              onMouseEnter={() => setShowTabMenu(true)}
              onMouseLeave={() => setShowTabMenu(false)}
            >
              {!leftSidebarOpen && showTabMenu && (
                <>
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
                        >
                          {tab.icon}
                        </button>
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

              <div className="relative group/tooltip">
                <button
                  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                  className="bg-[#0d0d0d] border border-white/10 rounded-r-lg p-2.5 hover:bg-[#1a1a1a] transition-all shadow-lg"
                >
                  <img 
                    src="/icon.svg" 
                    alt="OpenIdea" 
                    className={`w-6 h-6 transition-transform duration-300 ${leftSidebarOpen ? 'rotate-90' : ''}`}
                  />
                </button>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-[#0d0d0d] border border-white/10 rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-200">
                      {leftSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
                    </span>
                  </div>
                </div>
              </div>

              {!leftSidebarOpen && showTabMenu && (
                <>
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
                        >
                          {tab.icon}
                        </button>
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
                  projectType="web"
                  onRefresh={() => {}}
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
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <ProjectManager
              onSelectProject={setSelectedProjectId}
              selectedProjectId={selectedProjectId}
              showActionButtons={false}
              projects={projects}
              onDeleteProject={handleDeleteProject}
            />
          </div>
          <WelcomeScreen
            onCreateSample={async () => {
              setIsCreatingSample(true);
              try {
                const projectRes = await fetch('/api/app-projects', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(SAMPLE_PORTFOLIO_PROJECT),
                });

                if (!projectRes.ok) {
                  throw new Error('Failed to create project');
                }

                const project = await projectRes.json();
                const projectId = project.id;

                for (const file of SAMPLE_PORTFOLIO_FILES) {
                  await fetch(`/api/app-projects/${projectId}/files`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(file),
                  });
                }

                setSelectedProjectId(projectId);
                await fetchProjects();
              } catch (error) {
                console.error('Error creating sample project:', error);
                alert('Failed to create sample project. Please try again.');
              } finally {
                setIsCreatingSample(false);
              }
            }}
            onCreateReactSample={async () => {
              setIsCreatingReactSample(true);
              try {
                const projectRes = await fetch('/api/app-projects', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(SAMPLE_REACT_PROJECT),
                });

                if (!projectRes.ok) {
                  throw new Error('Failed to create project');
                }

                const project = await projectRes.json();
                const projectId = project.id;

                for (const file of SAMPLE_REACT_FILES) {
                  await fetch(`/api/app-projects/${projectId}/files`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(file),
                  });
                }

                setSelectedProjectId(projectId);
                await fetchProjects();
              } catch (error) {
                console.error('Error creating React sample project:', error);
                alert('Failed to create React sample project. Please try again.');
              } finally {
                setIsCreatingReactSample(false);
              }
            }}
            onCreateNew={async () => {
              setIsCreatingNew(true);
              try {
                const projectRes = await fetch('/api/app-projects', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: 'New Project',
                    description: 'Describe your app in the Chat tab to generate it',
                    type: 'web',
                    framework: 'react',
                    appType: 'react',
                    previewVersion: 'v2',
                  }),
                });
                if (!projectRes.ok) throw new Error('Failed to create project');
                const project = await projectRes.json();
                setSelectedProjectId(project.id);
                setLeftSidebarOpen(true);
                setLeftSidebarTab('chat');
                await fetchProjects();
              } catch (error) {
                console.error('Error creating new project:', error);
                alert('Failed to create new project. Please try again.');
              } finally {
                setIsCreatingNew(false);
              }
            }}
            isCreatingSample={isCreatingSample}
            isCreatingReactSample={isCreatingReactSample}
            isCreatingNew={isCreatingNew}
            isAuthenticated={isAuthenticated === true}
          />
        </div>
      )}
      </div>

      <GenerationLoader
        isActive={false}
        message=""
        onComplete={() => {}}
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
