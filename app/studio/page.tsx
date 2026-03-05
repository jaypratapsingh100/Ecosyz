'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import Header from '../components/Header';
import ProjectManager, { type ProjectListItem } from '../components/app-builder/ProjectManager';
import CodeEditor from '../components/app-builder/CodeEditor';
import AppChat from '../components/app-builder/AppChat';
import PreviewPanel from '../components/app-builder/PreviewPanel';
import DeploymentPanel from '../components/app-builder/DeploymentPanel';
import { ErrorBoundary } from '../components/app-builder/ErrorBoundary';
import GenerationLoader from '../components/app-builder/GenerationLoader';
import ProjectLoadingOverlay from '../components/app-builder/ProjectLoadingOverlay';
import DeleteConfirmModal from '../components/app-builder/DeleteConfirmModal';
import CreateProjectModal from '../components/app-builder/CreateProjectModal';
import WelcomeScreen from '../components/app-builder/WelcomeScreen';
import { useAuthCheck } from '../hooks/useAuthCheck';
import FeedbackForm from '../components/FeedbackForm';
import { SAMPLE_ECOMMERCE_PROJECT, SAMPLE_ECOMMERCE_FILES } from './sampleEcommerceProject';

function AppBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, checkAuth } = useAuthCheck();
  
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'projects' | 'code' | 'chat' | 'deploy'>('projects');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 320;
    }
    return 320;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [isCreatingEcommerceSample, setIsCreatingEcommerceSample] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalInitialName, setCreateModalInitialName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<{ ids: string[]; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectFiles, setProjectFiles] = useState<{ id: string; path: string; name: string; content: string; language?: string; isMain?: boolean }[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ id: string; path: string; name: string; content: string; language?: string; isMain?: boolean } | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/app-projects');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.projects ?? []);
      setProjects(
        list.map(
          (p: {
            id: string;
            title: string;
            description?: string | null;
            framework?: string | null;
            createdAt?: string;
            isPublic?: boolean;
          }) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? null,
            framework: p.framework ?? null,
            createdAt: p.createdAt,
            isPublic: p.isPublic ?? false,
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

  const fetchProjectFiles = useCallback(async (projectId: string, preserveSelectedPath?: string) => {
    setIsLoadingProject(true);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/files`);
      if (!res.ok) {
        setProjectFiles([]);
        setSelectedFile(null);
        return;
      }
      const data = await res.json();
      setProjectFiles(data);
      // Keep same file selected with fresh content so code editor matches DB after chat
      if (preserveSelectedPath && Array.isArray(data)) {
        const same = data.find((f: { path: string }) => f.path === preserveSelectedPath);
        setSelectedFile(same ?? null);
      } else {
        setSelectedFile(null);
      }
    } catch {
      setProjectFiles([]);
      setSelectedFile(null);
    } finally {
      setIsLoadingProject(false);
    }
  }, []);

  // Select project from URL (?project=id) when projects load
  const projectFromUrl = searchParams.get('project');
  useEffect(() => {
    if (!projectFromUrl || projects.length === 0) return;
    const exists = projects.some((p) => p.id === projectFromUrl);
    if (exists) {
      setSelectedProjectId(projectFromUrl);
      fetchProjectFiles(projectFromUrl);
      router.replace('/studio', { scroll: false });
    }
  }, [projectFromUrl, projects, fetchProjectFiles, router]);

  // Open Create New Project modal when coming from Hero (?description=... or ?new=1)
  const descriptionFromUrl = searchParams.get('description');
  const newFromUrl = searchParams.get('new');
  useEffect(() => {
    if (descriptionFromUrl || newFromUrl === '1') {
      setCreateModalInitialName(descriptionFromUrl ?? '');
      setCreateModalOpen(true);
      router.replace('/studio', { scroll: false });
    }
  }, [descriptionFromUrl, newFromUrl, router]);

  const saveFileContent = useCallback(
    async (path: string, name: string, content: string, language?: string, isMain?: boolean) => {
      if (!selectedProjectId) return;
      try {
        const res = await fetch(`/api/app-projects/${selectedProjectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ path, name, content, language: language ?? undefined, isMain }),
        });
        if (!res.ok) return;
        const updated = await res.json();
        setProjectFiles((prev) =>
          prev.map((f) => (f.path === path ? { ...f, ...updated, content: updated.content ?? content } : f))
        );
        if (selectedFile?.path === path) {
          setSelectedFile((f) => (f?.path === path ? { ...f, ...updated, content: updated.content ?? content } : f));
        }
        window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId: selectedProjectId } }));
        window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId: selectedProjectId } }));
      } catch {
        // silent fail; user can retry by editing again
      }
    },
    [selectedProjectId, selectedFile?.path]
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSaveRef = useRef((path: string, name: string, content: string, language?: string, isMain?: boolean) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveFileContent(path, name, content, language, isMain);
    }, 600);
  });
  useEffect(() => {
    debouncedSaveRef.current = (path: string, name: string, content: string, language?: string, isMain?: boolean) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        saveFileContent(path, name, content, language, isMain);
      }, 600);
    };
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [saveFileContent]);

  const handleEditorChange = useCallback(
    (newContent: string) => {
      if (!selectedFile) return;
      setProjectFiles((prev) =>
        prev.map((f) => (f.path === selectedFile.path ? { ...f, content: newContent } : f))
      );
      setSelectedFile((f) => (f ? { ...f, content: newContent } : null));
      debouncedSaveRef.current(selectedFile.path, selectedFile.name, newContent, selectedFile.language, selectedFile.isMain);
    },
    [selectedFile]
  );

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectFiles(selectedProjectId);
    } else {
      setProjectFiles([]);
      setSelectedFile(null);
      setIsLoadingProject(false);
    }
  }, [selectedProjectId, fetchProjectFiles]);

  // Refresh code editor file list when files are created (chat auto-extract, Extract button, etc.)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleFilesUpdated = (e?: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string }>)?.detail;
      const updatedProjectId = detail?.projectId;
      if (updatedProjectId && updatedProjectId === selectedProjectId) {
        const pathToPreserve = selectedFile?.path;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          timeoutId = null;
          fetchProjectFiles(selectedProjectId, pathToPreserve);
        }, 300);
      }
    };
    window.addEventListener('files-updated', handleFilesUpdated);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('files-updated', handleFilesUpdated);
    };
  }, [selectedProjectId, selectedFile?.path, fetchProjectFiles]);

  const handleCreateNewProject = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const confirmCreateProject = useCallback(
    async (projectName: string) => {
      setIsCreatingNew(true);
      try {
        const projectRes = await fetch('/api/app-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: projectName || 'New Project',
            description: 'Describe your app in the Chat tab to generate it',
            type: 'web',
            framework: 'react',
            appType: 'react',
            previewVersion: 'v2',
          }),
          credentials: 'include',
        });
        if (!projectRes.ok) {
          const errBody = await projectRes.json().catch(() => ({}));
          const errMsg = (errBody as { error?: string })?.error || projectRes.statusText || 'Failed to create project';
          const details = (errBody as { details?: string })?.details;
          throw new Error(details ? `${errMsg}: ${details}` : errMsg);
        }
        const project = await projectRes.json();
        setCreateModalOpen(false);
        const heroSummary = createModalInitialName;
        setCreateModalInitialName('');

        // Put Hero summary into chat questionnaire (projectGoal) before opening chat
        if (heroSummary?.trim()) {
          try {
            const patchRes = await fetch(`/api/app-projects/${project.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                questionnaireData: { projectGoal: heroSummary.trim() },
              }),
            });
            if (!patchRes.ok) console.warn('Failed to save Hero summary to questionnaire');
          } catch (e) {
            console.warn('Failed to save Hero summary to questionnaire:', e);
          }
        }

        setSelectedProjectId(project.id);
        setLeftSidebarOpen(true);
        setLeftSidebarTab('chat');
        await fetchProjects();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create new project. Please try again.';
        console.error('Error creating new project:', error);
        toast.error('Failed to Create Project', { description: message, duration: 5000 });
      } finally {
        setIsCreatingNew(false);
      }
    },
    [fetchProjects, createModalInitialName],
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setProjectToDelete({ ids: [projectId], title: project.title || 'Untitled project' });
        setDeleteModalOpen(true);
      }
    },
    [projects],
  );

  const handleDeleteMultipleProjects = useCallback(
    (projectIds: string[]) => {
      if (projectIds.length === 0) return;
      const matchedProjects = projects.filter((p) => projectIds.includes(p.id));
      const title =
        projectIds.length === 1 && matchedProjects[0]
          ? matchedProjects[0].title || 'Untitled project'
          : `${projectIds.length} projects`;
      setProjectToDelete({ ids: projectIds, title });
      setDeleteModalOpen(true);
    },
    [projects],
  );

  const confirmDeleteProject = useCallback(
    async () => {
      if (!projectToDelete) return;

      setIsDeleting(true);
      try {
        const ids = projectToDelete.ids;
        let hadError = false;
        for (const id of ids) {
          const res = await fetch(`/api/app-projects?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });

          if (!res.ok) {
            console.error('Failed to delete project', id, await res.text());
            hadError = true;
            continue;
          }

          if (selectedProjectId === id) {
            setSelectedProjectId('');
            setProjectFiles([]);
            setSelectedFile(null);
          }
        }

        setDeleteModalOpen(false);
        setProjectToDelete(null);
        await fetchProjects();
        if (hadError) {
          alert('Some projects could not be deleted. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    },
    [projectToDelete, fetchProjects, selectedProjectId],
  );

  // Sidebar resize handlers
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      const minWidth = 256;
      const maxWidth = 800;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarWidth', sidebarWidth.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth]);

  // Save sidebar width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !isResizing) {
      localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    }
  }, [sidebarWidth, isResizing]);

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
                  onClick={() => router.push('/auth?redirect=%2Fstudio')}
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
        width: '100%',
        maxWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto'
      }}
    >
      <Header />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: selectedProjectId ? 'hidden' : 'auto',
        }}
      >
        {selectedProjectId ? (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
          {/* Left Sidebar - Collapsible */}
          <div 
            className="border-r border-white/10 bg-[#0a0a0a] overflow-hidden relative"
            style={{ 
              width: leftSidebarOpen ? `${sidebarWidth}px` : '0px',
              flexShrink: 0,
              transition: leftSidebarOpen && !isResizing ? 'none' : leftSidebarOpen ? 'none' : 'width 300ms ease-in-out',
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
                      onDeleteMultipleProjects={handleDeleteMultipleProjects}
                      onCreateNewProject={handleCreateNewProject}
                      isCreatingNewProject={isCreatingNew}
                      onProjectUpdated={fetchProjects}
                    />
                  )}
                  {leftSidebarTab === 'code' && (
                    <ErrorBoundary componentName="Code Editor">
                      <CodeEditor
                        file={selectedFile}
                        projectId={selectedProjectId}
                        onChange={handleEditorChange}
                        files={projectFiles}
                        onFileSelect={setSelectedFile}
                      />
                    </ErrorBoundary>
                  )}
                  {leftSidebarTab === 'chat' && (
                    <ErrorBoundary componentName="App Chat">
                      <AppChat
                        projectId={selectedProjectId || ''}
                        currentFile={undefined}
                        projectFiles={projectFiles}
                        onFilesCreated={() => {
                        if (!selectedProjectId) return;
                        const pathToPreserve = selectedFile?.path;
                        setTimeout(() => fetchProjectFiles(selectedProjectId, pathToPreserve), 200);
                      }}
                        projectTitle="New Project"
                        projectFramework="react"
                      />
                    </ErrorBoundary>
                  )}
                  {leftSidebarTab === 'deploy' && (
                    <ErrorBoundary componentName="Deployment Panel">
                      <DeploymentPanel
                        projectId={selectedProjectId}
                        projectName="Untitled Project"
                      />
                    </ErrorBoundary>
                  )}
                </div>
              </div>
            )}
            
            {/* Resize Handle */}
            {leftSidebarOpen && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-400/50 transition-colors group z-20"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsResizing(true);
                }}
                style={{ touchAction: 'none' }}
              >
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 transition-all rounded-full ${
                  isResizing ? 'bg-emerald-400' : 'bg-emerald-400/30 group-hover:bg-emerald-400'
                }`} />
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
                <ErrorBoundary componentName="Preview Panel">
                  <PreviewPanel
                    projectId={selectedProjectId}
                    projectType="web"
                    onRefresh={() => {}}
                  />
                </ErrorBoundary>
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
        <div className="flex flex-col h-auto md:h-full w-full overflow-visible md:overflow-hidden relative min-h-0">
          {/* Beta Ribbon - On top (Welcome Screen only) */}
          <div className="w-full flex-shrink-0 bg-gradient-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 flex flex-wrap items-center justify-center gap-2">
            <span className="px-2 py-0.5 bg-yellow-500/30 text-yellow-300 text-xs font-semibold rounded border border-yellow-500/50">
              BETA
            </span>
            <span className="text-yellow-200/90 text-xs font-medium text-center">
              App Builder is in beta. Your feedback helps us improve!
            </span>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="text-yellow-300 hover:text-yellow-200 text-xs font-medium underline transition-colors"
            >
              Share Feedback
            </button>
          </div>
          <div className="flex flex-col md:flex-row flex-1 min-h-0 w-full overflow-visible md:overflow-hidden">
          {/* Left Sidebar - Full width on mobile (stacked), resizable on desktop */}
          <div 
            className="border-r border-white/10 bg-[#0a0a0a] overflow-y-auto md:overflow-hidden relative flex-shrink-0 w-full max-h-[45vh] md:max-h-none"
            style={{ 
              width: isMobile ? '100%' : `${Math.min(sidebarWidth, Math.max(256, sidebarWidth))}px`,
              minWidth: isMobile ? undefined : 256,
              maxWidth: isMobile ? undefined : '50%',
              transition: !isResizing ? 'width 300ms ease-in-out' : 'none',
              zIndex: 10
            }}
          >
            <div className="h-full min-h-0 flex flex-col" style={{ position: 'relative', zIndex: 10 }}>
              <ProjectManager
                onSelectProject={setSelectedProjectId}
                selectedProjectId={selectedProjectId}
                showActionButtons={false}
                projects={projects}
                onDeleteProject={handleDeleteProject}
                onDeleteMultipleProjects={handleDeleteMultipleProjects}
                onProjectUpdated={fetchProjects}
              />
            </div>
            
            {/* Resize Handle - desktop only */}
            {!isMobile && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-400/50 transition-colors group z-20"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
              }}
              style={{ touchAction: 'none' }}
            >
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 transition-all rounded-full ${
                isResizing ? 'bg-emerald-400' : 'bg-emerald-400/30 group-hover:bg-emerald-400'
              }`} />
            </div>
            )}
          </div>
          
          {/* Main Content Area */}
          <div className="flex-shrink-0 md:flex-1 flex flex-col min-w-0 md:min-h-0 overflow-visible md:overflow-hidden">
            <div className="min-h-0 flex items-start justify-center py-6 md:flex-1 md:items-center md:justify-center md:py-0 overflow-visible">
              <WelcomeScreen
              onCreateEcommerceSample={async () => {
                setIsCreatingEcommerceSample(true);
                try {
                  const projectRes = await fetch('/api/app-projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(SAMPLE_ECOMMERCE_PROJECT),
                    credentials: 'include',
                  });

                  if (!projectRes.ok) {
                    const errBody = await projectRes.json().catch(() => ({}));
                    const errMsg = (errBody as { error?: string; details?: string })?.error
                      || (errBody as { message?: string })?.message
                      || projectRes.statusText
                      || 'Failed to create project';
                    const details = (errBody as { details?: string })?.details;
                    throw new Error(details ? `${errMsg}: ${details}` : errMsg);
                  }

                  const project = await projectRes.json();
                  const projectId = project.id;

                  for (const file of SAMPLE_ECOMMERCE_FILES) {
                    const fileRes = await fetch(`/api/app-projects/${projectId}/files`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(file),
                      credentials: 'include',
                    });
                    if (!fileRes.ok) {
                      console.warn('Failed to add file:', file.path, await fileRes.text());
                    }
                  }

                  setSelectedProjectId(projectId);
                  await fetchProjects();
                  toast.success('E-commerce Marketplace Created', {
                    description: 'Your Amazon/Flipkart-style e-commerce sample has been created!',
                    duration: 3000,
                  });
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Unknown error';
                  console.error('Error creating e-commerce sample project:', error);
                  toast.error('Failed to Create E-commerce Sample', {
                    description: message,
                    duration: 5000,
                  });
                } finally {
                  setIsCreatingEcommerceSample(false);
                }
              }}
              onCreateNew={handleCreateNewProject}
              isCreatingEcommerceSample={isCreatingEcommerceSample}
              isCreatingNew={isCreatingNew}
              isAuthenticated={isAuthenticated === true}
            />
            </div>
          </div>
        </div>
        </div>
      )}
      </div>

      <GenerationLoader
        isActive={false}
        message=""
        onComplete={() => {}}
      />
      
      <ProjectLoadingOverlay
        isVisible={isLoadingProject}
        message="Loading project..."
      />
      
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setProjectToDelete(null);
          }
        }}
        onConfirm={confirmDeleteProject}
        projectTitle={projectToDelete?.title}
        isLoading={isDeleting}
      />
      
      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => {
          if (!isCreatingNew) {
            setCreateModalOpen(false);
            setCreateModalInitialName('');
          }
        }}
        onCreate={confirmCreateProject}
        isLoading={isCreatingNew}
        initialProjectName=""
      />

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowFeedbackModal(false)}
        >
          <div 
            className="relative max-w-2xl w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Share Your Feedback</h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close feedback modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FeedbackForm />
          </div>
        </div>
      )}
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
