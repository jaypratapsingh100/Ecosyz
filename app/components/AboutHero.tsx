'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AboutHero() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/openresources?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen flex items-center">
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
        {/* Contribute and GitHub - Top Right */}
        <div className="absolute top-4 right-4 sm:right-8 z-20 flex items-center gap-4">
          <Link
            href="/contribute"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm border border-emerald-400/30 rounded-lg text-teal-200 hover:text-emerald-300 hover:border-emerald-400/50 transition-all duration-300 hover:scale-105"
          >
            <span className="text-sm font-medium">Contribute to Open Idea</span>
          </Link>
          <a
            href="https://github.com/Sony17/Ecosyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-black/40 backdrop-blur-sm border border-emerald-400/30 rounded-lg text-teal-200 hover:text-emerald-300 hover:border-emerald-400/50 transition-all duration-300 hover:scale-110"
            aria-label="GitHub Repository"
          >
            <i className="fab fa-github text-xl" />
          </a>
        </div>
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="grid lg:grid-cols-12 gap-16 items-center min-h-[70vh]">
              {/* Text */}
              <div className="lg:col-span-6 text-center lg:text-left">
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4">
                  <span className="block mb-1 text-gray-100">The future of</span>
                  <span className="block font-extrabold text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent tracking-tight mb-4">
                    INNOVATION
                  </span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-teal-100/90 font-medium mt-6">
                  The World&apos;s Open Innovation Infrastructure
                </p>
                
                {/* Chat-based Search Box */}
                <div className="mt-8 sm:mt-10">
                  <form onSubmit={handleSearch} className="relative group">
                    <div className="relative flex items-center">
                      <div className="absolute left-4 flex items-center pointer-events-none z-10">
                        <svg className="w-6 h-6 text-emerald-400 group-focus-within:text-emerald-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search problems, ideas, or open-source solutions."
                        className="w-full pl-12 pr-40 py-4 bg-black/40 backdrop-blur-sm border border-emerald-400/15 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400/30 focus:ring-1 focus:ring-emerald-400/10 transition-all duration-300"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 px-6 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition-transform duration-200 shadow-lg"
                      >
                        Discover
                      </button>
                    </div>
                  </form>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row sm:justify-start gap-4 justify-center">
                  <Link
                    href="/projects"
                    className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg shadow-lg transition hover:scale-105 hover:shadow-neon"
                  >
                    Build App
                  </Link>
                  <Link
                    href="/community"
                    className="inline-block px-8 py-3 bg-transparent border-2 border-emerald-400/50 text-emerald-400 font-semibold rounded-lg shadow-lg transition hover:scale-105 hover:bg-emerald-400/10 hover:border-emerald-400"
                  >
                    Join Community
                  </Link>
                  <Link
                    href="/projects"
                    className="inline-block px-8 py-3 bg-transparent border-2 border-cyan-400/50 text-cyan-400 font-semibold rounded-lg shadow-lg transition hover:scale-105 hover:bg-cyan-400/10 hover:border-cyan-400"
                  >
                    View Projects
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
        
        {/* Research Whitepaper Link - Bottom Right */}
        <div className="absolute bottom-20 right-4 sm:right-8 z-20">
          <Link
            href="/researchwhitepaper"
            className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm border border-emerald-400/30 rounded-lg text-teal-200 hover:text-emerald-300 hover:border-emerald-400/50 transition-all duration-300 hover:scale-105"
          >
            <i className="fas fa-file-alt" />
            <span className="text-sm font-medium">Research Whitepaper</span>
          </Link>
        </div>
      </section>
     
    </div>
  );
}

