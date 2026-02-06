'use client';

import Image from 'next/image';

interface WelcomeScreenProps {
  onCreateNew?: () => void;
  isCreatingNew?: boolean;
  isAuthenticated?: boolean;
}

export default function WelcomeScreen({
  onCreateNew,
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
          Get started by creating a new project from scratch.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              disabled={isCreatingNew || !isAuthenticated}
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
      </div>
    </div>
  );
}
