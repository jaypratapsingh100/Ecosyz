import { notFound } from 'next/navigation';
import { prisma } from '../../../src/lib/db';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SharePageSocialShare from './SharePageSocialShare';
import Image from 'next/image';
import type { Resource, Annotation } from '@prisma/client';

type ResourceWithAnnotations = Resource & {
  annotations: Annotation[];
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      workspace: {
        include: {
          resources: {
            include: {
              annotations: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    }
  });

  if (!share || (share.expiresAt && new Date() > share.expiresAt)) {
    notFound();
  }

  const { workspace } = share;

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

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-2">
              {workspace.title}
            </h1>
            <p className="text-teal-100/80 text-lg">Shared Workspace</p>
            <SharePageSocialShare token={token} workspaceTitle={workspace.title} />
          </div>

          {workspace.resources && workspace.resources.length > 0 ? (
            <div className="space-y-6">
              {workspace.resources.map((resource: ResourceWithAnnotations) => (
                <div
                  key={resource.id}
                  className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-lg hover:shadow-zinc-900/50 transition-all duration-200"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                      {resource.title}
                    </h2>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm break-all flex items-center gap-2"
                      >
                        <span>{resource.url}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>

                  {resource.annotations && resource.annotations.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Annotations ({resource.annotations.length})
                      </h3>
                      <div className="space-y-3">
                        {resource.annotations.map((annotation: Annotation) => (
                          <div
                            key={annotation.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-zinc-200 text-sm"
                          >
                            {annotation.body}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resource.tags && Array.isArray(resource.tags) && resource.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {resource.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded border border-emerald-500/30"
                        >
                          {String(tag)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl">
              <div className="text-zinc-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No resources yet</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                This workspace doesn't have any resources to display.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
