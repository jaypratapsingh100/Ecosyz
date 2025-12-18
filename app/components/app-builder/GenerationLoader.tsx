'use client';

import { useState, useEffect } from 'react';

interface GenerationLoaderProps {
  isActive: boolean;
  message?: string;
  onComplete?: () => void;
}

export default function GenerationLoader({ isActive, message = 'Generating your app...', onComplete }: GenerationLoaderProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isActive) {
      setElapsedTime(0);
      setDots('');
      return;
    }

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    // Update elapsed time
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 0.1);
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(timeInterval);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive && elapsedTime > 0 && onComplete) {
      // Small delay before calling onComplete to show final time
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  }, [isActive, elapsedTime, onComplete]);

  if (!isActive && elapsedTime === 0) return null;

  const formatTime = (seconds: number): string => {
    if (seconds < 1) {
      return `${Math.round(seconds * 10) / 10}s`;
    } else if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Animated spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-purple-600/20 rounded-full"></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-white mb-2">
            {message}{dots}
          </h3>
          <p className="text-sm text-gray-400">
            Creating files and generating preview...
          </p>
        </div>

        {/* Time counter */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-purple-300 font-mono font-semibold text-sm">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>

        {/* Progress steps */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${elapsedTime > 0 ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            <span className={`${elapsedTime > 0 ? 'text-green-400' : 'text-gray-500'}`}>
              AI generating code...
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${elapsedTime > 2 ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            <span className={`${elapsedTime > 2 ? 'text-green-400' : 'text-gray-500'}`}>
              Creating files...
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${elapsedTime > 4 ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            <span className={`${elapsedTime > 4 ? 'text-green-400' : 'text-gray-500'}`}>
              Generating preview...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
