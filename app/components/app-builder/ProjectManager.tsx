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

  // Listen for projects-updated event to refresh projects list
  useEffect(() => {
    const handleProjectsUpdated = () => {
      console.log('🔄 ProjectManager: Refreshing projects list');
      fetchProjects();
    };

    window.addEventListener('projects-updated', handleProjectsUpdated);
    return () => {
      window.removeEventListener('projects-updated', handleProjectsUpdated);
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

