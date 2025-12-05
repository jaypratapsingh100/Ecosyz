'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BetaAccessForm from "./BetaAccessForm";
import { useState } from "react";

export default function Hero() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/openresources?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const providers = [
    { 
      name: 'OpenAlex', 
      logo: 'https://openalex.org/favicon.ico',
      url: 'https://openalex.org'
    },
    { 
      name: 'arXiv', 
      logo: 'https://arxiv.org/favicon.ico',
      url: 'https://arxiv.org'
    },
    { 
      name: 'Zenodo', 
      logo: 'https://zenodo.org/static/img/favicon.png',
      url: 'https://zenodo.org'
    },
    { 
      name: 'GitHub', 
      logo: 'https://github.com/favicon.ico',
      url: 'https://github.com'
    },
    { 
      name: 'HuggingFace', 
      logo: 'https://huggingface.co/favicon.ico',
      url: 'https://huggingface.co'
    },
    { 
      name: 'YouTube', 
      logo: 'https://www.youtube.com/favicon.ico',
      url: 'https://youtube.com'
    },
    { 
      name: 'Software Heritage', 
      logo: 'https://www.softwareheritage.org/static/img/favicon.png',
      url: 'https://www.softwareheritage.org'
    },
    { 
      name: 'OSHWA', 
      logo: 'https://www.oshwa.org/favicon.ico',
      url: 'https://www.oshwa.org'
    },
    { 
      name: 'Wikifactory', 
      logo: 'https://wikifactory.com/favicon.ico',
      url: 'https://wikifactory.com'
    },
  ];

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
            className="object-cover object-right"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-emerald-400/20 to-transparent opacity-80 blur-3xl"></div>
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
                      <div className="absolute left-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-emerald-400/60 group-focus-within:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask anything... Search papers, code, datasets, and more"
                        className="w-full pl-12 pr-32 py-4 bg-black/40 backdrop-blur-sm border-2 border-emerald-400/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 px-6 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition-transform duration-200 shadow-lg"
                      >
                        Search
                      </button>
                    </div>
                  </form>
                </div>

                {/* Sliding Provider Logos */}
                <div className="mt-8 relative overflow-hidden">
                  <div className="flex items-center gap-6 animate-slide">
                    {/* Duplicate set for seamless loop */}
                    {[...providers, ...providers, ...providers].map((provider, idx) => (
                      <a
                        key={`${provider.name}-${idx}`}
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-black/40 backdrop-blur-sm border border-emerald-400/20 rounded-xl hover:border-emerald-400/60 hover:bg-black/60 transition-all duration-300 hover:scale-110 group"
                      >
                        <img
                          src={provider.logo}
                          alt={`${provider.name} logo`}
                          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to a simple icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = document.createElement('span');
                            fallback.className = 'text-xl';
                            fallback.textContent = '🔗';
                            target.parentElement?.prepend(fallback);
                          }}
                        />
                        <span className="text-sm font-semibold text-teal-200 whitespace-nowrap group-hover:text-emerald-300 transition-colors">{provider.name}</span>
                      </a>
                    ))}
                  </div>
                  {/* Gradient overlays for fade effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0c2321] to-transparent pointer-events-none z-10" />
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0c2321] to-transparent pointer-events-none z-10" />
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row sm:justify-start gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg shadow-lg transition hover:scale-105 hover:shadow-neon"
                  >
                    Join the Beta
                  </button>
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
                    Build App
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Modal for form */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div 
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <BetaAccessForm onClose={() => setOpen(false)} />
            </div>
          </div>
        )}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
      </section>
     
    </div>
  );
}
