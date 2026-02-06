'use client';

import { useMemo, useState } from 'react';

export interface ProjectListItem {
  id: string;
  title: string;
  description?: string | null;
  framework?: string | null;
  createdAt?: string;
}

interface ProjectManagerProps {
  onSelectProject: (projectId: string) => void;
  selectedProjectId?: string;
  showActionButtons?: boolean;
  projects?: ProjectListItem[];
  onDeleteProject?: (projectId: string) => void;
  onCreateNewProject?: () => void;
  isCreatingNewProject?: boolean;
}

export default function ProjectManager({
  onSelectProject,
  selectedProjectId,
  showActionButtons = true,
  projects = [],
  onDeleteProject,
  onCreateNewProject,
  isCreatingNewProject = false,
}: ProjectManagerProps) {
  const hasProjects = projects.length > 0;
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const sortedProjects = useMemo(
    () => [...projects],
    [projects],
  );

  const formatCreatedAt = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        {showActionButtons && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Projects</h2>
            <button
              type="button"
              onClick={() => onCreateNewProject && onCreateNewProject()}
              disabled={isCreatingNewProject || !onCreateNewProject}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {hasProjects ? (
          <ul className="space-y-2">
            {sortedProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const isExpanded = expandedProjectId === project.id;

              return (
                <li key={project.id}>
                  <div
                    className={`w-full rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-400/60'
                        : 'bg-[#050505] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(project.id);
                        setExpandedProjectId((prev) => (prev === project.id ? null : project.id));
                      }}
                      className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">
                          {project.title || 'Untitled project'}
                        </p>
                        {(project.framework || project.createdAt) && (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {project.framework && <span className="uppercase">{project.framework}</span>}
                            {project.framework && project.createdAt && <span className="mx-1">•</span>}
                            {project.createdAt && <span>{formatCreatedAt(project.createdAt)}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {/* GitHub button (future save/push) */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Wire up GitHub save/push flow
                            console.log('GitHub clicked for project', project.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              e.preventDefault();
                              // TODO: Wire up GitHub save/push flow
                              console.log('GitHub clicked for project', project.id);
                            }
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          title="GitHub (coming soon)"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.55-3.88-1.55-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.2-3.11-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.19a11.1 11.1 0 0 1 2.9-.39c.99 0 2 .13 2.94.39C17.6 4.2 18.57 4.5 18.57 4.5c.63 1.58.23 2.75.11 3.04.75.81 1.2 1.85 1.2 3.11 0 4.44-2.7 5.4-5.27 5.68.41.35.78 1.04.78 2.1 0 1.52-.01 2.74-.01 3.11 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
                          </svg>
                        </div>

                        {/* Delete button (compact bin icon) */}
                        {onDeleteProject && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(project.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                onDeleteProject(project.id);
                              }
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/50"
                            title="Delete project"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </div>
                        )}

                        {/* Existing chevron / player toggle */}
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          aria-hidden="true"
                        >
                          ▸
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/10 text-xs text-gray-300 space-y-2">
                        {project.description && (
                          <p className="text-[11px] text-gray-400 leading-snug line-clamp-3">
                            {project.description}
                          </p>
                        )}
                        <div className="text-[11px] text-gray-500">
                          <p>
                            <span className="text-gray-400">ID:&nbsp;</span>
                            <span className="font-mono text-[10px] break-all opacity-80">
                              {project.id}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
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
              Get started by creating your first project
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
