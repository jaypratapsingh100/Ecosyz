'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Workspace {
  id: string;
  title: string;
  createdAt: string;
}

export default function Projects() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data);
      }
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    } finally {
      setLoading(false);
    }
  };
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

          {/* Project Card */}
          <div className="max-w-2xl mx-auto">
            {loading ? (
              // Loading skeleton
              <div className="bg-[#192527]/90 p-6 rounded-xl border border-emerald-400/10 shadow-lg animate-pulse">
                <div className="h-6 bg-emerald-400/20 rounded mb-2"></div>
                <div className="h-4 bg-teal-100/20 rounded mb-1"></div>
                <div className="h-4 bg-teal-100/20 rounded mb-1 w-3/4"></div>
                <div className="h-8 bg-emerald-400/30 rounded mt-6 w-24"></div>
              </div>
            ) : workspace ? (
              <div className="bg-[#192527]/90 p-6 rounded-xl border border-emerald-400/10 shadow-lg hover:shadow-[0_0_32px_#10b98145] transition flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold text-emerald-200 mb-2">{workspace.title}</h2>
                  <p className="text-teal-100/80 mb-6">
                    Your personal workspace for organizing research, resources, and ideas. Created {new Date(workspace.createdAt).toLocaleDateString()}.
                  </p>
                </div>
                <Link
                  href={`/workspaces/${workspace.id}`}
                  className="inline-block px-6 py-2 mt-auto bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-md shadow transition hover:scale-105 text-sm text-center"
                >
                  Open Workspace
                </Link>
              </div>
            ) : (
              // Empty state
              <div className="text-center py-12">
                <p className="text-teal-100/80 text-lg mb-4">No workspace found.</p>
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
