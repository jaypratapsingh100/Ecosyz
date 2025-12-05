'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BetaAccessForm from "./BetaAccessForm";
import { useState } from "react";

export default function Hero() {
  const [open, setOpen] = useState(false);
  const [buildQuery, setBuildQuery] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const router = useRouter();

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (buildQuery.trim()) {
      router.push(`/openresources?q=${encodeURIComponent(buildQuery.trim())}`);
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            {/* Main Heading */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 whitespace-nowrap tracking-tight flex items-center justify-center gap-3" style={{
                fontFamily: 'var(--font-space-grotesk), "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                textShadow: '0 0 40px rgba(16, 185, 129, 0.4), 0 0 80px rgba(6, 182, 212, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.3)',
              }}>
                <span className="inline-block transform hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent" style={{ fontWeight: 900 }}>Research</span>
                <span className="text-emerald-400 text-3xl sm:text-4xl md:text-5xl animate-pulse font-light flex items-center justify-center" style={{ fontFamily: 'var(--font-space-grotesk)', lineHeight: '1', verticalAlign: 'middle' }}>*</span>
                <span className="inline-block transform hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent" style={{ fontWeight: 900 }}>Build</span>
                <span className="text-cyan-400 text-3xl sm:text-4xl md:text-5xl animate-pulse font-light flex items-center justify-center" style={{ fontFamily: 'var(--font-space-grotesk)', lineHeight: '1', verticalAlign: 'middle' }}>*</span>
                <span className="inline-block transform hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-white via-indigo-100 via-purple-100 to-pink-200 bg-clip-text text-transparent" style={{ fontWeight: 900 }}>Collaborate</span>
                </h1>
              <p className="text-lg sm:text-xl text-teal-100/90 max-w-2xl mx-auto">
                Where imagination shapes value-driven solutions
              </p>
            </div>

            {/* Main Input Field */}
            <div className="mb-8">
              <form onSubmit={handleBuild} className="relative">
                <div className="relative backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden focus-within:border-gray-600 transition-all duration-300 shadow-2xl" style={{ backgroundColor: '#141618' }}>
                  {/* Input Field - Top - Spacious */}
                  <div className="px-4 py-6 min-h-[100px] flex items-center">
                    <textarea
                      value={buildQuery}
                      onChange={(e) => setBuildQuery(e.target.value)}
                      placeholder="Explore open innovation, research, and solutions"
                      className="w-full bg-transparent text-white text-xl placeholder-gray-400 focus:outline-none resize-none overflow-hidden rounded-lg"
                      style={{ minHeight: 'auto', height: 'auto' }}
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>

                  {/* Control Bar - Bottom */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#141618' }}>
                    {/* Plus Icon Button */}
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
                      aria-label="Add attachment"
                    >
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>

                    {/* Model Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                      >
                        <span className="text-orange-400 text-base">✦</span>
                        <span>Claude 4.5 Sonnet</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showModelDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                          <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded-t-lg">
                            Claude 4.5 Sonnet
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-700">
                            GPT-4
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-b-lg">
                            Gemini Pro
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Public Button */}
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span>Public</span>
                    </button>

                    {/* Settings/Toggle Icon */}
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors ml-auto"
                      aria-label="Settings"
                    >
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {/* Microphone Icon - Second */}
                    <button
                      type="button"
                      className="w-10 h-10 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
                      aria-label="Voice input"
                    >
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      className="w-10 h-10 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
                      aria-label="Submit"
                    >
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
                  <Link
                    href="/openresources?type=paper"
                className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-full shadow-lg transition hover:scale-105"
                  >
                    Discover
                  </Link>
              <Link
                href="/projects"
                className="px-8 py-3 bg-black/40 backdrop-blur-sm border border-emerald-400/50 text-emerald-400 font-semibold rounded-full text-center transition hover:scale-105 hover:bg-emerald-400/10 hover:border-emerald-400"
              >
                Explore Projects
              </Link>
              <Link
                href="/projects"
                className="px-8 py-3 bg-black/40 backdrop-blur-sm border border-cyan-400/50 text-cyan-400 font-semibold rounded-full text-center transition hover:scale-105 hover:bg-cyan-400/10 hover:border-cyan-400"
              >
                Build App
              </Link>
              <Link
                href="/coming-soon"
                className="px-8 py-3 bg-black/40 backdrop-blur-sm border border-purple-400/50 text-purple-400 font-semibold rounded-full text-center transition hover:scale-105 hover:bg-purple-400/10 hover:border-purple-400"
              >
                Smart Network
              </Link>
            </div>

          </div>
        </div>

        {/* Modal for form */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <div 
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <BetaAccessForm onClose={() => setOpen(false)} />
            </div>
          </div>
        )}

        {/* Click outside to close dropdown */}
        {showModelDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowModelDropdown(false)}
          />
        )}

        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
      </section>
    </div>
  );
}
