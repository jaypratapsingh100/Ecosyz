'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BetaAccessForm from "./BetaAccessForm";
import { useState, useEffect, useRef } from "react";

export default function Hero() {
  const [open, setOpen] = useState(false);
  const [buildQuery, setBuildQuery] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'discover' | 'build' | 'projects' | 'network' | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    if (showActionMenu) {
      // Use setTimeout to avoid immediate closure
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionMenu]);

  const placeholderTexts = [
    'Explore open source resources',
    'Search millions of research papers',
    'Find connections among resources',
    'Build app and innovate',
    'Discover open datasets',
    'Collaborate with innovators',
    'Explore cutting-edge projects',
    'Find solutions to complex problems'
  ];

  useEffect(() => {
    if (buildQuery || isFocused || selectedAction) {
      setAnimatedPlaceholder('');
      return;
    }

    let currentTextIndex = 0;
    let currentIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;
    let cursorInterval: NodeJS.Timeout;

    const animate = () => {
      // Check if we should stop animating
      if (buildQuery || isFocused || selectedAction) {
        setAnimatedPlaceholder('');
        return;
      }

      const currentText = placeholderTexts[currentTextIndex];

      if (!isDeleting && currentIndex < currentText.length) {
        // Typing
        setAnimatedPlaceholder(currentText.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(animate, 100);
      } else if (!isDeleting && currentIndex === currentText.length) {
        // Finished typing, wait then start deleting
        timeoutId = setTimeout(() => {
          if (!buildQuery && !isFocused && !selectedAction) {
            isDeleting = true;
            animate();
          }
        }, 2500);
      } else if (isDeleting && currentIndex > 0) {
        // Deleting
        currentIndex--;
        setAnimatedPlaceholder(currentText.slice(0, currentIndex));
        timeoutId = setTimeout(animate, 50);
      } else {
        // Finished deleting, move to next text
        isDeleting = false;
        currentIndex = 0;
        currentTextIndex = (currentTextIndex + 1) % placeholderTexts.length;
        timeoutId = setTimeout(animate, 300);
      }
    };

    // Cursor blink animation
    cursorInterval = setInterval(() => {
      if (!buildQuery && !isFocused && !selectedAction) {
        setShowCursor((prev) => !prev);
      }
    }, 530);

    // Start animation after a small delay
    timeoutId = setTimeout(animate, 300);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (cursorInterval) clearInterval(cursorInterval);
    };
  }, [buildQuery, isFocused, selectedAction]);

  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) {
      return;
    }
    if (buildQuery.trim()) {
      if (selectedAction === 'discover') {
        router.push(`/openresources?q=${encodeURIComponent(buildQuery.trim())}`);
      } else if (selectedAction === 'build') {
        router.push(`/openresources?q=${encodeURIComponent(buildQuery.trim())}`);
      } else if (selectedAction === 'projects') {
        router.push(`/projects`);
      } else if (selectedAction === 'network') {
        router.push(`/coming-soon`);
      }
    } else {
      // Navigate even without query for projects and network
      if (selectedAction === 'projects') {
        router.push(`/projects`);
      } else if (selectedAction === 'network') {
        router.push(`/coming-soon`);
      } else if (selectedAction === 'discover') {
        router.push(`/openresources`);
      }
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
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
            {/* Main Heading */}
            <div className="text-center mb-6 sm:mb-8 px-2">
              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-4 tracking-tight flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 whitespace-nowrap overflow-x-auto cursor-default select-none" style={{
                fontFamily: 'var(--font-space-grotesk), "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 900,
                letterSpacing: '-0.04em',
              }}>
                <span className="inline-block bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent" style={{ fontWeight: 900 }}>Research</span>
                <span className="text-emerald-400 text-lg sm:text-2xl md:text-3xl lg:text-4xl animate-pulse font-light inline-block" style={{ fontFamily: 'var(--font-space-grotesk)', lineHeight: '1' }}>*</span>
                <span className="inline-block bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent" style={{ fontWeight: 900 }}>Build</span>
                <span className="text-cyan-400 text-lg sm:text-2xl md:text-3xl lg:text-4xl animate-pulse font-light inline-block" style={{ fontFamily: 'var(--font-space-grotesk)', lineHeight: '1' }}>*</span>
                <span className="inline-block bg-gradient-to-r from-white via-indigo-100 via-purple-100 to-pink-200 bg-clip-text text-transparent" style={{ fontWeight: 900 }}>Collaborate</span>
                </h1>
              <p className="text-base sm:text-lg md:text-xl text-teal-100/90 max-w-2xl mx-auto px-4">
                Where imagination shapes value-driven solutions
              </p>
            </div>

            {/* Main Input Field */}
            <div className="mb-8 relative" style={{ zIndex: 1 }}>
              <form onSubmit={handleBuild} className="relative">
              <div className="relative backdrop-blur-sm border border-gray-700/50 rounded-2xl focus-within:border-gray-600 transition-all duration-300 shadow-2xl" style={{ backgroundColor: '#141618', overflow: 'visible' }}>
                {/* Input Field - Top - Spacious */}
                <div className="px-3 sm:px-4 py-4 sm:py-6 min-h-[80px] sm:min-h-[100px] flex items-center relative overflow-hidden">
                  {/* Selected Action Badge */}
                  {selectedAction && (
                    <div className="mr-3 flex-shrink-0">
                      <span className="px-3 py-1.5 bg-emerald-400/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-400/30">
                        {selectedAction === 'discover' ? 'Discover' : 
                         selectedAction === 'build' ? 'Build' :
                         selectedAction === 'projects' ? 'Projects' :
                         selectedAction === 'network' ? 'Network' : ''}
                      </span>
                    </div>
                  )}
                  
                  <textarea
                    value={buildQuery}
                    onChange={(e) => setBuildQuery(e.target.value)}
                    onFocus={() => {
                      setIsFocused(true);
                      setAnimatedPlaceholder('');
                    }}
                    onBlur={() => setIsFocused(false)}
                    className="flex-1 bg-transparent text-white text-base sm:text-lg md:text-xl focus:outline-none resize-none overflow-hidden rounded-lg"
                    style={{ minHeight: 'auto', height: 'auto' }}
                    rows={1}
                    placeholder={selectedAction ? (
                      selectedAction === 'discover' ? 'What would you like to discover?' : 
                      selectedAction === 'build' ? 'What would you like to build?' :
                      selectedAction === 'projects' ? 'Explore projects...' :
                      selectedAction === 'network' ? 'Connect with network...' : ''
                    ) : ''}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                  {!buildQuery && !isFocused && !selectedAction && (
                    <div className="absolute top-4 left-3 sm:left-4 pointer-events-none text-gray-400 select-none text-base sm:text-lg md:text-xl">
                      {animatedPlaceholder}
                      <span className={`inline-block w-0.5 h-5 sm:h-6 md:h-7 bg-emerald-400/60 ml-1 align-middle ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>|</span>
                    </div>
                  )}
                </div>

                {/* Control Bar - Bottom */}
                <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 overflow-visible rounded-b-2xl" style={{ backgroundColor: '#141618' }}>
                  {/* Left side buttons */}
                  <div className="flex items-center gap-2 sm:gap-3 relative overflow-visible" ref={menuRef}>
                    {/* Plus Icon Button with Dropdown */}
                    <button
                      ref={buttonRef}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowActionMenu(!showActionMenu);
                      }}
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors flex-shrink-0 relative z-10 cursor-pointer"
                      aria-label="Select action"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    
                    {/* Action Menu Dropdown */}
                    {showActionMenu && (
                      <div 
                        className="absolute top-full left-0 mt-1 bg-[#1f1f1f] border border-gray-700/50 rounded-lg shadow-2xl z-[9999] min-w-[180px] py-1"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          position: 'absolute',
                          zIndex: 9999
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAction('discover');
                            setShowActionMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/50 transition-colors flex items-center gap-3 text-xs font-normal"
                        >
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Discover
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAction('build');
                            setShowActionMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/50 transition-colors flex items-center gap-3 text-xs font-normal"
                        >
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Build
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAction('projects');
                            setShowActionMenu(false);
                            router.push('/projects');
                          }}
                          className="w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/50 transition-colors flex items-center gap-3 text-xs font-normal"
                        >
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Projects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAction('network');
                            setShowActionMenu(false);
                            router.push('/coming-soon');
                          }}
                          className="w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/50 transition-colors flex items-center gap-3 text-xs font-normal"
                        >
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Network
                        </button>
                      </div>
                    )}
                  </div>

                    {/* Right side buttons */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Microphone Icon - Hide on mobile */}
                  <button
                    type="button"
                        className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors"
                        aria-label="Voice input"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>

                      {/* Send Button */}
                      <button
                        type="submit"
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-700/50 hover:bg-gray-600 rounded-full transition-colors flex-shrink-0"
                        aria-label="Submit"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                  </button>
                    </div>
                  </div>
                </div>
              </form>
              </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4">
                  <Link
                    href="/openresources?type=paper"
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-full shadow-lg transition hover:scale-105 text-sm sm:text-base w-full sm:w-auto text-center"
                  >
                    Discover
                  </Link>
              <Link
                href="/projects"
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-black/40 backdrop-blur-sm border border-emerald-400/50 text-emerald-400 font-semibold rounded-full text-center transition hover:scale-105 hover:bg-emerald-400/10 hover:border-emerald-400 text-sm sm:text-base w-full sm:w-auto"
              >
                Explore Projects
              </Link>
              <Link
                href="/projects"
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-black/40 backdrop-blur-sm border border-cyan-400/50 text-cyan-400 font-semibold rounded-full text-center transition hover:scale-105 hover:bg-cyan-400/10 hover:border-cyan-400 text-sm sm:text-base w-full sm:w-auto"
              >
                Build App
              </Link>
              <Link
                href="/coming-soon"
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-black/40 backdrop-blur-sm border border-purple-400/50 text-purple-400 font-semibold rounded-full text-center transition hover:scale-105 hover:bg-purple-400/10 hover:border-purple-400 text-sm sm:text-base w-full sm:w-auto"
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


        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
      </section>
    </div>
  );
}
