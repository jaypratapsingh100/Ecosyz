'use client';

import { useState, useEffect, useRef } from 'react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (projectName: string) => Promise<void>;
  isLoading?: boolean;
  initialProjectName?: string;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  initialProjectName = '',
}: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes; use initialProjectName when provided
  useEffect(() => {
    if (isOpen) {
      setProjectName(initialProjectName);
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialProjectName]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = projectName.trim();
    if (trimmedName && !isLoading) {
      await onCreate(trimmedName);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-emerald-500/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"></div>
            <div className="relative w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-white text-center mb-2">
          Create New Project
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-400 text-center mb-6">
          Give your project a name to get started
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-300 mb-2">
              Project Name
            </label>
            <input
              ref={inputRef}
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., My Awesome App"
              disabled={isLoading}
              maxLength={100}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
            {projectName.trim().length > 0 && (
              <p className="mt-1.5 text-xs text-gray-500">
                {projectName.trim().length} / 100 characters
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-gray-300 hover:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !projectName.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
