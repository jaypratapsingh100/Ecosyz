'use client';

import Image from 'next/image';
import Link from 'next/link';

interface WelcomeScreenProps {
  onCreateEcommerceSample?: () => void;
  onCreateNew?: () => void;
  isCreatingEcommerceSample?: boolean;
  isCreatingNew?: boolean;
  isAuthenticated?: boolean;
}

export default function WelcomeScreen({
  onCreateEcommerceSample,
  onCreateNew,
  isCreatingEcommerceSample = false,
  isCreatingNew = false,
  isAuthenticated = true,
}: WelcomeScreenProps) {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Globe background for welcome screen */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/hero-globe.png"
          alt="Digital Globe Background"
          fill
          className="object-cover object-right opacity-20"
          quality={100}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-radial from-cyan-400/15 to-transparent opacity-60 blur-3xl"></div>
      </div>

      {/* Welcome Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <svg
            className="w-24 h-24 text-emerald-400/50 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Welcome to Studio</h2>
        <p className="text-teal-100/90 mb-4 text-lg">
          Build applications with AI-powered code generation
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Get started with a sample project or create a new project from scratch.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          {onCreateEcommerceSample && (
            <button
              onClick={onCreateEcommerceSample}
              disabled={isCreatingEcommerceSample || isCreatingNew || !isAuthenticated}
              className="px-8 py-3 bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-lg rounded-lg transition-all shadow-lg shadow-amber-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-amber-400/30"
              title={!isAuthenticated ? 'Please sign in to create an e-commerce sample' : undefined}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
              {isCreatingEcommerceSample ? 'Creating...' : 'E-commerce Marketplace'}
            </button>
          )}
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              disabled={isCreatingEcommerceSample || isCreatingNew || !isAuthenticated}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-lg rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-400/30"
              title={!isAuthenticated ? 'Please sign in to create a new project' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isCreatingNew ? 'Creating...' : 'New Project'}
            </button>
          )}
        </div>
        <div className="mt-6">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
            Or start from your profiles / PDF
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://openidea.world/pdf-website"
              className="px-6 py-2.5 rounded-lg border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-100 text-sm font-medium flex items-center justify-center gap-2 transition-all"
              title="Upload a PDF, fill questionnaire, get an animated portfolio website"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.24 8.25h4.52V24H.24V8.25zM8.34 8.25h4.33v2.13h.06c.6-1.14 2.07-2.34 4.26-2.34 4.55 0 5.39 2.99 5.39 6.88V24h-4.52v-7.42c0-1.77-.03-4.05-2.47-4.05-2.47 0-2.85 1.93-2.85 3.92V24H8.34V8.25z" />
              </svg>
              LinkedIn → Portfolio
            </Link>
              <Link
                href="/instagram-store"
                className="px-6 py-2.5 rounded-lg border border-pink-400/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-100 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                title="Paste Instagram URL, get a deployable e‑store template"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2A3 3 0 1 0 12 15a3 3 0 0 0 0-6zm5.25-2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z" />
                </svg>
                Instagram → E‑Store
              </Link>
              <Link
                href="/pdf-website"
                className="px-6 py-2.5 rounded-lg border border-violet-400/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-100 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                title="Upload a PDF, fill questionnaire, get an animated vibrant website"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
                PDF → Animated Website
              </Link>
            </div>
          </div>
      </div>
    </div>
  );
}
