'use client';

import Image from 'next/image';

interface ProjectLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export default function ProjectLoadingOverlay({ isVisible, message = 'Loading project...' }: ProjectLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-emerald-500/20">
        {/* Animated Open Idea Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            {/* Rotating ring */}
            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-cyan-500/20 rounded-full"></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            
            {/* Logo in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-12 h-12">
                <Image 
                  src="/logo.png" 
                  alt="Open Idea Logo" 
                  width={48} 
                  height={48}
                  className="animate-pulse"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            {message}
          </h3>
          <p className="text-sm text-gray-400">
            Please wait...
          </p>
        </div>
      </div>
    </div>
  );
}
