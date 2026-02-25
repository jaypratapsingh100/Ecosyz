'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

export default function Projects() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvoteLoadingId, setUpvoteLoadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/public-app-projects');
        if (!res.ok) {
          console.error('Failed to fetch public projects:', await res.text());
          return;
        }
        const data = await res.json();
        setProjects(data.projects ?? []);
      } catch (error) {
        console.error('Failed to fetch public projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow relative">
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

        <div className="py-16 sm:py-20 text-white relative z-10">
          <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4 text-center uppercase">
              Explore Open Projects
            </h1>
            <p className="text-lg text-teal-100/80 font-medium max-w-2xl mx-auto">
              Discover, remix, and contribute to breakthrough innovations. All projects here are community-powered and open by default.
            </p>
          </div>

          {/* Public Projects Grid */}
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[#192527]/90 rounded-xl border border-emerald-400/10 shadow-lg hover:shadow-[0_0_32px_#10b98145] transition flex flex-col justify-between overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full h-40 bg-[#0b1618] border-b border-emerald-400/10 overflow-hidden">
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
                          <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                            <span className="text-2xl" aria-hidden="true">
                              🚀
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-emerald-200 line-clamp-2">
                          {project.title || 'Untitled project'}
                        </h2>
                        {project.framework && (
                          <span className="text-[11px] uppercase tracking-wide text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30">
                            {project.framework}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-teal-100/80 text-sm mb-3 line-clamp-3">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-teal-100/70 mb-2 mt-1">
                        <span>
                          Created{' '}
                          {new Date(project.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {project.owner?.name && (
                          <span className="truncate max-w-[140px] text-right">
                            by <span className="font-medium">{project.owner.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-0 mt-auto space-y-2">
                      {project.deploymentUrl ? (
                        <Link
                          href={project.deploymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-md shadow transition hover:scale-[1.02] text-sm"
                        >
                          View Live App
                        </Link>
                      ) : (
                        <div className="text-xs text-teal-100/60 italic text-center">
                          Deployment link coming soon
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={upvoteLoadingId === project.id}
                        onClick={async () => {
                          if (upvoteLoadingId === project.id) return;
                          setUpvoteLoadingId(project.id);
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
                                      upvoteCount: typeof data.count === 'number' ? data.count : (p.upvoteCount || 0) + (data.upvoted ? 1 : -1),
                                      userHasUpvoted: data.upvoted,
                                    }
                                  : p,
                              ),
                            );
                          } catch (error) {
                            console.error('Error toggling upvote', error);
                          } finally {
                            setUpvoteLoadingId((current) => (current === project.id ? null : current));
                          }
                        }}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs rounded-md border transition ${
                          project.userHasUpvoted
                            ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                            : 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {upvoteLoadingId === project.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            ▲ Upvote
                            {typeof project.upvoteCount === 'number' ? ` (${project.upvoteCount})` : ''}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-teal-100/80 text-lg mb-3">No public projects yet.</p>
                <p className="text-teal-100/70 text-sm max-w-md mx-auto">
                  Make one of your App Builder projects public to have it featured here.
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
