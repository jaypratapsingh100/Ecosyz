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
  const [activeToolTab, setActiveToolTab] = useState<'files' | 'chat' | 'code' | 'deploy'>('chat');
  // 3-panel widths as percentages of available space (after activity bar)
  const [panelSizes, setPanelSizes] = useState<[number, number, number]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('panelSizes');
      if (saved) try { const p = JSON.parse(saved); if (Array.isArray(p) && p.length === 3) return p as [number, number, number]; } catch {}
    }
    return [25, 50, 25]; // Chat 25%, Preview 50%, Code/Files 25%
  });
  const [resizingHandle, setResizingHandle] = useState<0 | 1 | null>(null); // 0 = left handle, 1 = right handle
  const mainRowRef = useRef<HTMLDivElement>(null);
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
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<{ id: string; path: string; name: string; content: string; language?: string; isMain?: boolean } | null>(null);
  const [recentlyChangedFiles, setRecentlyChangedFiles] = useState<Set<string>>(new Set());

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

  // Refresh file list in real-time when files are created/updated (e.g. during generation)
  useEffect(() => {
    const prevPaths = new Set(projectFiles.map(f => f.path));
    const handleFilesUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectId === selectedProjectId && selectedProjectId) {
        fetchProjectFiles(selectedProjectId, selectedFile?.path).then(() => {
          // After fetch, mark new/changed files
          setProjectFiles(current => {
            const changedPaths = new Set<string>();
            for (const f of current) {
              if (!prevPaths.has(f.path)) changedPaths.add(f.path);
            }
            if (changedPaths.size > 0) {
              setRecentlyChangedFiles(prev => new Set([...prev, ...changedPaths]));
              // Clear highlight after 4 seconds
              setTimeout(() => {
                setRecentlyChangedFiles(prev => {
                  const next = new Set(prev);
                  changedPaths.forEach(p => next.delete(p));
                  return next;
                });
              }, 4000);
            }
            return current;
          });
        });
      }
    };
    window.addEventListener('files-updated', handleFilesUpdated);
    return () => window.removeEventListener('files-updated', handleFilesUpdated);
  }, [selectedProjectId, selectedFile?.path, fetchProjectFiles, projectFiles]);

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
        setActiveToolTab('chat');
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

  // 3-panel resize handlers — two draggable dividers
  const ACTIVITY_BAR_WIDTH = 48;
  const MIN_PANEL_PCT = 15; // minimum 15% for any panel

  useEffect(() => {
    if (resizingHandle === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = mainRowRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width;
      if (availableWidth <= 0) return;

      const mouseX = e.clientX - rect.left;
      const mousePct = (mouseX / availableWidth) * 100;

      setPanelSizes(prev => {
        const next: [number, number, number] = [...prev] as [number, number, number];
        if (resizingHandle === 0) {
          // Dragging left handle — adjusts panel[0] (Chat) and panel[1] (Preview)
          const newLeft = Math.max(MIN_PANEL_PCT, Math.min(mousePct, 100 - prev[2] - MIN_PANEL_PCT));
          next[0] = newLeft;
          next[1] = 100 - newLeft - prev[2];
        } else {
          // Dragging right handle — adjusts panel[1] (Preview) and panel[2] (Code)
          const newRight = Math.max(MIN_PANEL_PCT, Math.min(100 - mousePct, 100 - prev[0] - MIN_PANEL_PCT));
          next[2] = newRight;
          next[1] = 100 - prev[0] - newRight;
        }
        // Enforce minimums
        if (next[0] < MIN_PANEL_PCT || next[1] < MIN_PANEL_PCT || next[2] < MIN_PANEL_PCT) return prev;
        return next;
      });
    };

    const handleMouseUp = () => {
      setResizingHandle(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('panelSizes', JSON.stringify(panelSizes));
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
  }, [resizingHandle, panelSizes]);

  // Persist panel sizes
  useEffect(() => {
    if (typeof window !== 'undefined' && resizingHandle === null) {
      localStorage.setItem('panelSizes', JSON.stringify(panelSizes));
    }
  }, [panelSizes, resizingHandle]);

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
        <div className="flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>

          {/* ═══ Desktop: 3-Panel Layout with Activity Bar ═══ */}
          {!isMobile ? (
            <div className="flex flex-1 min-h-0">

              {/* ── Activity Bar (48px) ── */}
              <div className="w-12 flex-shrink-0 bg-[#080808] border-r border-white/10 flex flex-col items-center py-2 gap-1">
                {([
                  { id: 'chat' as const, label: 'Chat',
                    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.25v-3.527a8.25 8.25 0 1113.091-2.382L21 20.25l-4.659-1.553a8.232 8.232 0 01-4.341.303H3.75z" /></svg> },
                  { id: 'deploy' as const, label: 'Deploy',
                    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg> },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveToolTab(tab.id)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all relative group/ab ${
                      activeToolTab === tab.id ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                    title={tab.label}
                  >
                    {tab.icon}
                    {activeToolTab === tab.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r" />}
                    <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/ab:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-200">{tab.label}</span>
                      </div>
                    </div>
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => setSelectedProjectId('')}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all relative group/ab"
                  title="All Projects"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/ab:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-200">All Projects</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* ── 3 Panels + 2 Resize Handles ── */}
              <div ref={mainRowRef} className="flex-1 flex min-w-0 h-full">

                {/* Panel 1: Chat (or Deploy) */}
                <div className="h-full overflow-hidden bg-[#0a0a0a] flex flex-col relative" style={{ width: `${panelSizes[0]}%`, minWidth: 200 }}>
                  {resizingHandle !== null && (
                    <div className="absolute inset-0 z-10" style={{ cursor: 'col-resize' }} />
                  )}
                  <div className="flex-shrink-0 px-3 py-1.5 border-b border-white/10 bg-[#0d0d0d] flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {activeToolTab === 'deploy' ? 'Deploy' : 'Chat'}
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {activeToolTab === 'deploy' ? (
                      <ErrorBoundary componentName="Deployment Panel">
                        <DeploymentPanel projectId={selectedProjectId} projectName="Untitled Project" />
                      </ErrorBoundary>
                    ) : (
                      <ErrorBoundary componentName="App Chat">
                        <AppChat
                          projectId={selectedProjectId || ''}
                          currentFile={undefined}
                          projectFiles={projectFiles}
                          onFilesCreated={() => {
                            if (!selectedProjectId) return;
                            const pathToPreserve = selectedFile?.path;
                            setTimeout(() => fetchProjectFiles(selectedProjectId, pathToPreserve), 200);
                            setPreviewRefreshKey(k => k + 1);
                          }}
                          projectTitle="New Project"
                          projectFramework="react"
                        />
                      </ErrorBoundary>
                    )}
                  </div>
                </div>

                {/* Resize Handle 1 (between Chat and Preview) */}
                <div
                  className="w-1 flex-shrink-0 cursor-col-resize hover:bg-emerald-400/50 bg-white/5 transition-colors relative group z-10"
                  onMouseDown={(e) => { e.preventDefault(); setResizingHandle(0); }}
                  style={{ touchAction: 'none' }}
                >
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-full transition-all ${
                    resizingHandle === 0 ? 'bg-emerald-400' : 'bg-transparent group-hover:bg-emerald-400/60'
                  }`} />
                </div>

                {/* Panel 2: Preview (center, always visible) */}
                <div className="h-full overflow-hidden relative" style={{ width: `${panelSizes[1]}%`, minWidth: 200 }}>
                  {/* Transparent overlay while resizing — prevents iframe from stealing mouse events */}
                  {resizingHandle !== null && (
                    <div className="absolute inset-0 z-10" style={{ cursor: 'col-resize' }} />
                  )}
                  <ErrorBoundary componentName="Preview Panel">
                    <PreviewPanel
                      projectId={selectedProjectId}
                      projectType="web"
                      onRefresh={() => {}}
                      refreshKey={previewRefreshKey}
                    />
                  </ErrorBoundary>
                </div>

                {/* Resize Handle 2 (between Preview and Code/Files) */}
                <div
                  className="w-1 flex-shrink-0 cursor-col-resize hover:bg-emerald-400/50 bg-white/5 transition-colors relative group z-10"
                  onMouseDown={(e) => { e.preventDefault(); setResizingHandle(1); }}
                  style={{ touchAction: 'none' }}
                >
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-full transition-all ${
                    resizingHandle === 1 ? 'bg-emerald-400' : 'bg-transparent group-hover:bg-emerald-400/60'
                  }`} />
                </div>

                {/* Panel 3: Code Editor + File Explorer */}
                <div className="h-full overflow-hidden bg-[#0a0a0a] flex flex-col relative" style={{ width: `${panelSizes[2]}%`, minWidth: 200 }}>
                  {resizingHandle !== null && (
                    <div className="absolute inset-0 z-10" style={{ cursor: 'col-resize' }} />
                  )}
                  {/* Tab bar for panel 3 */}
                  <div className="flex-shrink-0 border-b border-white/10 bg-[#0d0d0d] flex">
                    <button
                      onClick={() => setActiveToolTab('code')}
                      className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                        activeToolTab !== 'files' ? 'text-emerald-400 border-b border-emerald-400' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      Editor
                    </button>
                    <button
                      onClick={() => setActiveToolTab('files')}
                      className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                        activeToolTab === 'files' ? 'text-emerald-400 border-b border-emerald-400' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      Files <span className="text-[9px] text-gray-600 font-normal ml-1">{projectFiles.filter(f => /\.(jsx?|tsx?|css)$/.test(f.path)).length}</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {activeToolTab === 'files' ? (
                      <div className="h-full overflow-y-auto py-1">
                        {projectFiles.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-2">
                            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            <p className="text-xs text-gray-500">No files yet</p>
                          </div>
                        ) : (
                          projectFiles
                            .filter(f => !['package.json', 'vite.config.js', 'vite.config.ts', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js', 'README.md'].includes(f.name))
                            .sort((a, b) => {
                              const order = (p: string) => p.includes('App.') ? 0 : p.includes('/pages/') ? 1 : p.includes('/components/') ? 2 : 3;
                              return order(a.path) - order(b.path) || a.path.localeCompare(b.path);
                            })
                            .map(file => {
                              const isCSS = file.path.endsWith('.css');
                              const isMainFile = file.path.includes('App.') || file.path.includes('main.');
                              return (
                                <button
                                  key={file.id}
                                  onClick={() => { setSelectedFile(file); setActiveToolTab('code'); }}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all group ${
                                    recentlyChangedFiles.has(file.path)
                                      ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                                      : selectedFile?.id === file.id ? 'bg-white/5 border-l-2 border-emerald-400/50' : 'hover:bg-white/5 border-l-2 border-transparent'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    recentlyChangedFiles.has(file.path) ? 'bg-emerald-400 animate-pulse'
                                    : isMainFile ? 'bg-blue-400' : isCSS ? 'bg-purple-400' : 'bg-emerald-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs truncate transition-colors ${
                                      recentlyChangedFiles.has(file.path) ? 'text-emerald-300 font-medium' : 'text-gray-300 group-hover:text-white'
                                    }`}>
                                      {file.name}
                                      {recentlyChangedFiles.has(file.path) && <span className="ml-1.5 text-[9px] text-emerald-400 font-normal">NEW</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-600 truncate">{file.path}</div>
                                  </div>
                                </button>
                              );
                            })
                        )}
                      </div>
                    ) : (
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
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ═══ Mobile: Tab-based stacked layout ═══ */
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex border-b border-white/10 bg-[#0d0d0d] flex-shrink-0 overflow-x-auto">
                {(['chat', 'preview', 'code', 'deploy'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveToolTab(tab === 'preview' ? 'files' : tab)}
                    className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap capitalize ${
                      (tab === 'preview' ? activeToolTab === 'files' : activeToolTab === tab) ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden">
                {activeToolTab === 'chat' ? (
                  <ErrorBoundary componentName="App Chat">
                    <AppChat projectId={selectedProjectId || ''} currentFile={undefined} projectFiles={projectFiles}
                      onFilesCreated={() => { if (!selectedProjectId) return; setTimeout(() => fetchProjectFiles(selectedProjectId, selectedFile?.path), 200); setPreviewRefreshKey(k => k + 1); }}
                      projectTitle="New Project" projectFramework="react" />
                  </ErrorBoundary>
                ) : activeToolTab === 'code' ? (
                  <ErrorBoundary componentName="Code Editor">
                    <CodeEditor file={selectedFile} projectId={selectedProjectId} onChange={handleEditorChange} files={projectFiles} onFileSelect={setSelectedFile} />
                  </ErrorBoundary>
                ) : activeToolTab === 'deploy' ? (
                  <ErrorBoundary componentName="Deployment Panel">
                    <DeploymentPanel projectId={selectedProjectId} projectName="Untitled Project" />
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary componentName="Preview Panel">
                    <PreviewPanel projectId={selectedProjectId} projectType="web" onRefresh={() => {}} refreshKey={previewRefreshKey} />
                  </ErrorBoundary>
                )}
              </div>
            </div>
          )}

          {/* ═══ Status Bar (36px) ═══ */}
          {!isMobile && (
            <div className="h-9 flex-shrink-0 bg-[#080808] border-t border-white/10 flex items-center px-3 gap-4 text-[11px] select-none">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                <span className="text-gray-300 font-medium truncate max-w-[180px]">{projects.find(p => p.id === selectedProjectId)?.title || 'Untitled'}</span>
              </div>
              <span className="text-white/10">|</span>
              <span className="text-gray-500">{projectFiles.filter(f => /\.(jsx?|tsx?|css)$/.test(f.path)).length} files</span>
              <div className="flex-1" />
              <button onClick={() => setPreviewRefreshKey(k => k + 1)} className="flex items-center gap-1.5 px-2 py-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-white/5" title="Refresh Preview">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                <span>Refresh</span>
              </button>
              <button onClick={() => setActiveToolTab('deploy')} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded text-[11px] font-medium transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
                Deploy
              </button>
            </div>
          )}
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
              width: isMobile ? '100%' : '320px',
              minWidth: isMobile ? undefined : 240,
              maxWidth: isMobile ? undefined : '50%',
              transition: resizingHandle === null ? 'width 300ms ease-in-out' : 'none',
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
                setResizingHandle(0);
              }}
              style={{ touchAction: 'none' }}
            >
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 transition-all rounded-full ${
                resizingHandle !== null ? 'bg-emerald-400' : 'bg-emerald-400/30 group-hover:bg-emerald-400'
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
