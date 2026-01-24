'use client';

import Image from 'next/image';

interface WelcomeScreenProps {
  onCreateProject: () => void;
  onCreateSample: () => void;
  isCreatingSample?: boolean;
  isAuthenticated?: boolean;
}

export default function WelcomeScreen({
  onCreateProject,
  onCreateSample,
  isCreatingSample = false,
  isAuthenticated = true,
}: WelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center relative overflow-hidden">
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
      <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
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
        <div className="flex items-center justify-center gap-3 mb-3">
          <h2 className="text-3xl font-bold text-white">Welcome to Studio</h2>
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-md border border-yellow-500/30 animate-pulse">
            BETA
          </span>
        </div>
        <p className="text-teal-100/90 mb-4 text-lg">
          Build applications with AI-powered code generation
        </p>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-200 flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <span className="font-semibold">Beta Notice:</span> Studio is currently in beta. Some features may be unstable or break unexpectedly. Please report any issues you encounter.
            </span>
          </p>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Get started by creating your first project. Our intelligent wizard will guide you through the process.
        </p>
        <div className="bg-white/5 rounded-lg p-4 mb-8 border border-white/10">
          <p className="text-sm text-gray-300">
            <span className="text-emerald-400 font-semibold">💡 Tip:</span> The wizard collects detailed information about your app idea, design preferences, and technical requirements to generate the perfect code for you.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onCreateProject}
            className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-semibold text-lg rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </button>
          <button
            onClick={onCreateSample}
            disabled={isCreatingSample || !isAuthenticated}
            className="px-8 py-3 bg-gradient-to-r from-purple-500/80 to-pink-500/80 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-lg rounded-lg transition-all shadow-lg shadow-purple-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-purple-400/30"
            title={!isAuthenticated ? 'Please sign in to create a sample project' : undefined}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {isCreatingSample ? 'Creating...' : 'Sample Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
