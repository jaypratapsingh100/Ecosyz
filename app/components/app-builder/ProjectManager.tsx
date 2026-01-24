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

interface ProjectManagerProps {
  onSelectProject: (projectId: string) => void;
  selectedProjectId?: string;
  onOpenWizard?: () => void;
  showActionButtons?: boolean;
}

export default function ProjectManager({ onSelectProject, selectedProjectId, onOpenWizard, showActionButtons = true }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSample, setCreatingSample] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
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
    if (!confirm('Create a sample portfolio project?')) return;
    
    setCreatingSample(true);
    try {
      const res = await fetch('/api/app-projects/create-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create sample project');
      }

      const data = await res.json();
      console.log('Sample project created:', data);

      // Refresh projects list
      await fetchProjects();
      
      // Select the new project
      onSelectProject(data.id);
      
      console.log('✅ Sample project created and selected');
    } catch (error: any) {
      console.error('Failed to create sample project:', error);
      alert(error?.message || 'Failed to create sample project. Please try again.');
    } finally {
      setCreatingSample(false);
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
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] border-r border-white/5 overflow-hidden">
      <div className="p-5 border-b border-white/5 flex-shrink-0 bg-gradient-to-r from-[#0a0a0a]/50 to-[#0d0d0d]/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-xl mb-1 bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent">
              Projects
            </h2>
            <p className="text-gray-400 text-xs font-medium">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </div>
        
        {/* Quick Actions - Only show when showActionButtons is true */}
        {showActionButtons && (
          <div className="flex gap-2">
            <button
              onClick={onOpenWizard}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
            <button
              onClick={handleCreateSampleProject}
              disabled={creatingSample}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingSample ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Sample
                </>
              )}
            </button>
          </div>
        )}
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
            {projects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              return (
                <div
                  key={project.id}
                  className={`group relative rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedProjectId === project.id
                      ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-gradient-to-br from-[#1a1a1a]/80 to-[#0d0d0d]/80 border border-white/5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5'
                  }`}
                >
                  {/* Project Header - Always Visible */}
                  <div 
                    className="flex items-center justify-between gap-2 p-3"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
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
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProjectId(isExpanded ? null : project.id);
                        }}
                        className="p-1 text-gray-400 hover:text-emerald-400 rounded transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {project.description && (
                        <p className="text-gray-400 text-xs mt-2 mb-3">
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
                      <div className="mt-2 text-xs text-gray-500">
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

