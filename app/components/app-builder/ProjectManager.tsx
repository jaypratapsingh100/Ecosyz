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
  const [creatingSample, setCreatingSample] = useState(false);

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

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;

    setCreating(true);
    try {
      const template = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate);
      if (!template) return;

      // Create project
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

      // Create template files
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
      const errorMessage = error?.message || 'Failed to create project. Please try again.';
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
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
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/10">
      <div className="p-4 border-b border-white/10">
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

      <div className="flex-1 overflow-y-auto p-2">
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
    </div>
  );
}

