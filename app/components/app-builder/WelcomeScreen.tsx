'use client';

import Image from 'next/image';
import Link from 'next/link';

interface WelcomeScreenProps {
  onCreateReactSample?: () => void;
  onCreateNew?: () => void;
  onCreateLinkedInPortfolio?: () => void;
  onCreateInstagramStore?: () => void;
  isCreatingReactSample?: boolean;
  isCreatingNew?: boolean;
  isCreatingLinkedInPortfolio?: boolean;
  isCreatingInstagramStore?: boolean;
  isAuthenticated?: boolean;
}

export default function WelcomeScreen({
  onCreateReactSample,
  onCreateNew,
  onCreateLinkedInPortfolio,
  onCreateInstagramStore,
  isCreatingReactSample = false,
  isCreatingNew = false,
  isCreatingLinkedInPortfolio = false,
  isCreatingInstagramStore = false,
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCreateReactSample && (
            <button
              onClick={onCreateReactSample}
              disabled={isCreatingReactSample || isCreatingNew || !isAuthenticated}
              className="px-8 py-3 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-blue-400/30"
              title={!isAuthenticated ? 'Please sign in to create a sample project' : undefined}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.236-2.235 2.236 2.236 0 0 1 2.235 2.235zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38a2.33 2.33 0 0 0-1.102-.274zm-9.302 10.717c-.525.303-.965.61-1.317.918-.186-.157-.358-.324-.514-.498-.71-.78-1.157-1.762-1.293-2.81.014-.12.022-.242.022-.365 0-.656.1-1.283.285-1.857.386.76.994 1.465 1.793 2.047.442.323.912.586 1.402.782zm6.1 1.274c.354-.308.792-.615 1.317-.918-.49-.196-.96-.459-1.402-.782-.799-.582-1.407-1.287-1.793-2.047-.185.574-.285 1.2-.285 1.857 0 .123.008.245.022.365-.136 1.048-.583 2.03-1.293 2.81-.156.174-.328.34-.514.498.352-.307.792-.614 1.317-.917.49.196.96.459 1.402.782.799.582 1.407 1.287 1.793 2.047.185-.574.285-1.2.285-1.857 0-.123-.008-.245-.022-.365.136-1.048.583-2.03 1.293-2.81.156-.174.328-.34.514-.498z" />
              </svg>
              {isCreatingReactSample ? 'Creating...' : 'Sample project'}
            </button>
          )}
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              disabled={isCreatingReactSample || isCreatingNew || !isAuthenticated}
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
        {(onCreateLinkedInPortfolio || onCreateInstagramStore || true) && (
          <div className="mt-6">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
              Or start from your profiles / PDF
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {onCreateLinkedInPortfolio && (
                <button
                  onClick={onCreateLinkedInPortfolio}
                  disabled={
                    isCreatingLinkedInPortfolio ||
                    isCreatingReactSample ||
                    isCreatingNew ||
                    !isAuthenticated
                  }
                  className="px-6 py-2.5 rounded-lg border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-100 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!isAuthenticated ? 'Please sign in to create a portfolio from LinkedIn' : undefined}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.24 8.25h4.52V24H.24V8.25zM8.34 8.25h4.33v2.13h.06c.6-1.14 2.07-2.34 4.26-2.34 4.55 0 5.39 2.99 5.39 6.88V24h-4.52v-7.42c0-1.77-.03-4.05-2.47-4.05-2.47 0-2.85 1.93-2.85 3.92V24H8.34V8.25z" />
                  </svg>
                  {isCreatingLinkedInPortfolio ? 'Creating portfolio…' : 'LinkedIn → Portfolio'}
                </button>
              )}
              {onCreateInstagramStore && (
                <button
                  onClick={onCreateInstagramStore}
                  disabled={
                    isCreatingInstagramStore ||
                    isCreatingReactSample ||
                    isCreatingNew ||
                    !isAuthenticated
                  }
                  className="px-6 py-2.5 rounded-lg border border-pink-400/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-100 text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!isAuthenticated ? 'Please sign in to create an e‑store from Instagram' : undefined}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2A3 3 0 1 0 12 15a3 3 0 0 0 0-6zm5.25-2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z" />
                  </svg>
                  {isCreatingInstagramStore ? 'Creating store…' : 'Instagram → E‑Store'}
                </button>
              )}
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
        )}
      </div>
    </div>
  );
}
