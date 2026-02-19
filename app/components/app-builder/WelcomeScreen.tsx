'use client';

import Image from 'next/image';

interface WelcomeScreenProps {
  onCreateReactSample?: () => void;
  onCreateNew?: () => void;
  isCreatingReactSample?: boolean;
  isCreatingNew?: boolean;
  isAuthenticated?: boolean;
}

export default function WelcomeScreen({
  onCreateReactSample,
  onCreateNew,
  isCreatingReactSample = false,
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
          Get started with a React sample project or create a new project from scratch.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCreateReactSample && (
            <button
              onClick={onCreateReactSample}
              disabled={isCreatingReactSample || isCreatingNew || !isAuthenticated}
              className="px-8 py-3 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-blue-400/30"
              title={!isAuthenticated ? 'Please sign in to create a React sample' : undefined}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.236-2.235 2.236 2.236 0 0 1 2.235 2.235zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38a2.33 2.33 0 0 0-1.102-.274zm-9.302 10.717c-.525.303-.965.61-1.317.918-.186-.157-.358-.324-.514-.498-.71-.78-1.157-1.762-1.293-2.81.014-.12.022-.242.022-.365 0-.656.1-1.283.285-1.857.386.76.994 1.465 1.793 2.047.442.323.912.586 1.402.782zm6.1 1.274c.354-.308.792-.615 1.317-.918-.49-.196-.96-.459-1.402-.782-.799-.582-1.407-1.287-1.793-2.047-.185.574-.285 1.2-.285 1.857 0 .123.008.245.022.365-.136 1.048-.583 2.03-1.293 2.81-.156.174-.328.34-.514.498.352-.307.792-.614 1.317-.917.49.196.96.459 1.402.782.799.582 1.407 1.287 1.793 2.047.185-.574.285-1.2.285-1.857 0-.123-.008-.245-.022-.365.136-1.048.583-2.03 1.293-2.81.156-.174.328-.34.514-.498z" />
              </svg>
              {isCreatingReactSample ? 'Creating...' : 'React Sample'}
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
      </div>
    </div>
  );
}
