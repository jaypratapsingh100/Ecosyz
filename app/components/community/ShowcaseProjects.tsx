'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PublicProject {
  id: string;
  title: string;
  description?: string | null;
  framework?: string | null;
  appType?: string | null;
  deploymentUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  upvoteCount?: number;
  userHasUpvoted?: boolean;
  owner?: {
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface ApiResponse {
  projects: PublicProject[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ShowcaseProjects() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public-app-projects?page=${page}&limit=12`);
        if (!res.ok) {
          console.error('Failed to fetch public projects:', await res.text());
          return;
        }
        const data: ApiResponse = await res.json();
        setProjects(data.projects ?? []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        } else {
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Failed to fetch public projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [page]);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-emerald-200">Showcase</h3>
          <p className="text-sm text-teal-100/70">
            Open projects built with Ecosyz. Discover, remix, and connect with the teams behind them.
          </p>
        </div>
        <Link
          href="/projects"
          className="text-sm text-emerald-300 hover:text-emerald-200 underline-offset-4 hover:underline"
        >
          View full gallery
        </Link>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div
                key={idx}
                className="bg-[#192527]/90 p-6 rounded-xl border border-emerald-400/10 shadow-lg animate-pulse"
              >
                <div className="h-6 bg-emerald-400/20 rounded mb-2" />
                <div className="h-4 bg-teal-100/20 rounded mb-1" />
                <div className="h-4 bg-teal-100/20 rounded mb-1 w-3/4" />
                <div className="h-8 bg-emerald-400/30 rounded mt-6 w-24" />
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-[#192527]/90 rounded-xl border border-emerald-400/10 shadow-lg hover:shadow-[0_0_32px_#10b98145] transition flex flex-col justify-between overflow-hidden"
                >
                  <div className="relative w-full h-32 bg-[#0b1618] border-b border-emerald-400/10 overflow-hidden">
                    {project.thumbnailUrl ? (
                      <Image
                        src={project.thumbnailUrl}
                        alt={project.title || 'Project thumbnail'}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-500/15 to-blue-500/25 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                          <span className="text-xl" aria-hidden="true">
                            🚀
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-base font-semibold text-emerald-200 line-clamp-2">
                        {project.title || 'Untitled project'}
                      </h4>
                      {project.framework && (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30">
                          {project.framework}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-teal-100/80 text-xs mb-2 line-clamp-3">{project.description}</p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-teal-100/70 mb-1 mt-1">
                      <span>
                        {new Date(project.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {project.owner?.name && (
                        <span className="truncate max-w-[120px] text-right">
                          by <span className="font-medium">{project.owner.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-0 mt-auto space-y-2">
                    {project.deploymentUrl ? (
                      <Link
                        href={project.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3 py-1.5 w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-md shadow transition hover:scale-[1.02] text-xs"
                      >
                        View Live App
                      </Link>
                    ) : (
                      <div className="text-[11px] text-teal-100/60 italic text-center">
                        Deployment link coming soon
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const method = project.userHasUpvoted ? 'DELETE' : 'POST';
                          const res = await fetch(`/api/app-projects/${project.id}/upvote`, {
                            method,
                          });
                          if (!res.ok) {
                            console.error('Failed to toggle upvote:', await res.text());
                            return;
                          }
                          const data = await res.json();
                          setProjects((prev) =>
                            prev.map((p) =>
                              p.id === project.id
                                ? {
                                    ...p,
                                    upvoteCount:
                                      typeof data.count === 'number'
                                        ? data.count
                                        : (p.upvoteCount || 0) + (data.upvoted ? 1 : -1),
                                    userHasUpvoted: data.upvoted,
                                  }
                                : p,
                            ),
                          );
                        } catch (error) {
                          console.error('Error toggling upvote', error);
                        }
                      }}
                      className={`w-full inline-flex items-center justify-center px-3 py-1.5 text-[11px] rounded-md border transition ${
                        project.userHasUpvoted
                          ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                          : 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10'
                      }`}
                    >
                      ▲ Upvote{typeof project.upvoteCount === 'number' ? ` (${project.upvoteCount})` : ''}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6 text-sm text-teal-100/80">
                <button
                  type="button"
                  onClick={() => canGoPrev && setPage((p) => Math.max(1, p - 1))}
                  disabled={!canGoPrev}
                  className={`px-3 py-1 rounded border ${
                    canGoPrev
                      ? 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10'
                      : 'border-teal-400/20 text-teal-100/40 cursor-not-allowed'
                  }`}
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => canGoNext && setPage((p) => p + 1)}
                  disabled={!canGoNext}
                  className={`px-3 py-1 rounded border ${
                    canGoNext
                      ? 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10'
                      : 'border-teal-400/20 text-teal-100/40 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10">
            <p className="text-teal-100/80 text-base mb-2">No public projects yet.</p>
            <p className="text-teal-100/70 text-sm max-w-md mx-auto">
              Make one of your App Builder projects public to have it featured in the community showcase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

