'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import ProjectManager from '../components/app-builder/ProjectManager';
import FileExplorer from '../components/app-builder/FileExplorer';
import CodeEditor from '../components/app-builder/CodeEditor';
import AppChat from '../components/app-builder/AppChat';
import PreviewPanel from '../components/app-builder/PreviewPanel';

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
  const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'preview'>('chat');

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

  useEffect(() => {
    if (selectedProjectId) {
      fetchProject();
      fetchFiles();
    } else {
      setProject(null);
      setFiles([]);
      setSelectedFile(null);
    }
  }, [selectedProjectId]);

  const fetchProject = async () => {
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
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchFiles = async () => {
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
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
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
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <svg className="w-24 h-24 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-gray-400 mb-6">Please sign in to use the App Builder</p>
            <button
              onClick={() => router.push('/auth')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-semibold rounded-lg transition-all shadow-lg"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Project Manager */}
        <div className="w-64 flex-shrink-0">
          <ProjectManager
            onSelectProject={setSelectedProjectId}
            selectedProjectId={selectedProjectId}
          />
        </div>

        {selectedProjectId ? (
          <>
            {/* File Explorer */}
            <div className="w-64 flex-shrink-0 border-r border-white/10">
              <FileExplorer
                projectId={selectedProjectId}
                onSelectFile={handleFileSelect}
                selectedFileId={selectedFile?.id}
                onFileChange={handleFileChange}
              />
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <CodeEditor
                file={selectedFile}
                projectId={selectedProjectId}
                onChange={handleEditorChange}
              />
            </div>

            {/* Right Panel - Chat or Preview */}
            <div className={`${rightPanelMode === 'preview' ? 'w-[50%]' : 'w-96'} flex-shrink-0 flex flex-col transition-all duration-300`}>
              {/* Tabs */}
              <div className="flex border-b border-white/10 bg-[#0a0a0a]">
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
                {(project?.type === 'web' || project?.type === 'fullstack') && (
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
              </div>

              {/* Panel Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {rightPanelMode === 'chat' ? (
                  <AppChat
                    projectId={selectedProjectId}
                    currentFile={selectedFile ? { id: selectedFile.id, path: selectedFile.path, name: selectedFile.name } : undefined}
                    projectFiles={files.map(f => ({ path: f.path, name: f.name }))}
                    onFilesCreated={fetchFiles}
                  />
                ) : (
                  <PreviewPanel
                    projectId={selectedProjectId}
                    projectType={project?.type || 'web'}
                    onRefresh={fetchFiles}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-24 h-24 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to App Builder</h2>
              <p className="text-gray-400 mb-6">Select a project from the sidebar or create a new one to get started</p>
              <p className="text-sm text-gray-500">Build applications with AI-powered code generation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

