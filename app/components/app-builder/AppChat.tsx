'use client';

import { useState } from 'react';

interface AppChatProps {
  projectId?: string;
  currentFile?: { id: string; path: string; name: string };
  projectFiles?: Array<{ path: string; name: string }>;
  onFilesCreated?: () => void;
  projectTitle?: string;
  projectFramework?: string;
}

export default function AppChat({ projectId = '', currentFile, projectFiles = [], onFilesCreated, projectTitle = 'My App', projectFramework = 'react' }: AppChatProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasNoFiles = projectFiles.length === 0;
  const canGenerate = projectId && message.trim() && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGenerate) return;
    const description = message.trim();
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to generate app');
        return;
      }
      setReply(data?.message || `Created ${(data?.filesCreated || []).length} file(s). Check the preview.`);
      setMessage('');
      onFilesCreated?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm mb-1">Assistant</div>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {hasNoFiles
                  ? '👋 **Welcome!** Describe the app you want (e.g. "A todo app with dark mode") and click Send. I\'ll generate the React app.'
                  : '👋 **Welcome!** How would you like to get started?'}
              </p>
            </div>
          </div>
        </div>
        {reply && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm mb-1">Assistant</div>
              <div className="bg-[#1a1a1a] border border-emerald-500/30 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{reply}</p>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-red-400 font-semibold text-sm mb-1">Error</div>
              <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a] z-10">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-0 w-full">
            <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-l-full border border-gray-500/30 focus-within:border-gray-400/50 transition-all px-4 py-3.5">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={hasNoFiles ? 'e.g. A todo app with filters and dark mode' : 'Ask me to generate code...'}
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={!canGenerate}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-r-full border border-l-0 border-gray-500/30 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
