'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseApiResponse } from '../../../lib/parseApiResponse';

interface PreviewPanelProps {
  projectId: string;
  projectType: string;
  onRefresh?: () => void;
}

export default function PreviewPanel({
  projectId,
  projectType,
  onRefresh,
}: PreviewPanelProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent overlapping preview calls
  const inFlightRef = useRef(false);

  const generatePreview = useCallback(async () => {
    if (!projectId) return;
    if (inFlightRef.current) {
      console.log('⏳ PreviewPanel: Preview already in progress, skipping');
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('📡 PreviewPanel: Calling preview API...', projectId);

      const res = await fetch(`/api/app-projects/${projectId}/preview`, {
        method: 'POST',
        credentials: 'include',
      });

      const parsed = await parseApiResponse<Record<string, unknown>>(res);

      const data =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : null;

      // ✅ Accept preview HTML in multiple valid formats
      const html =
        (typeof data?.output === 'string' && data.output) ||
        (typeof data?.html === 'string' && data.html) ||
        (typeof data?.preview === 'string' && data.preview) ||
        (typeof parsed.data === 'string' && parsed.data.startsWith('<!') ? parsed.data : null);

      if (html) {
        console.log('✅ PreviewPanel: Preview HTML received');
        setPreviewHtml(html);
        setError(null);
        return;
      }

      // Soft error — do NOT wipe a valid preview
      const errorMessage =
        (typeof data?.error === 'string' && data.error) ||
        (typeof data?.message === 'string' && data.message) ||
        (!parsed.ok
          ? `Preview failed (HTTP ${parsed.status})`
          : 'Preview not available yet');

      console.warn('⚠️ PreviewPanel: Preview not ready', {
        status: parsed.status,
        data,
      });

      setError(errorMessage);
    } catch (err: any) {
      console.error('❌ PreviewPanel: Preview exception', err);
      let errorMessage = 'Failed to generate preview';
      
      if (err?.message) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Preview generation timed out. Your project may be too large or complex.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [projectId]);

  // Initial preview on project change
  useEffect(() => {
    if (!projectId) return;

    const timer = setTimeout(() => {
      generatePreview();
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId, generatePreview]);

  // Debounced refresh events – only refresh when our project was updated
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_DELAY = 600;

    const triggerRefresh = (e?: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string }>)?.detail;
      const updatedProjectId = detail?.projectId;
      if (updatedProjectId && updatedProjectId !== projectId) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        generatePreview();
        timeoutId = null;
      }, DEBOUNCE_DELAY);
    };

    window.addEventListener('files-updated', triggerRefresh);
    window.addEventListener('preview-updated', triggerRefresh);
    window.addEventListener('auto-refresh-preview', triggerRefresh);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('files-updated', triggerRefresh);
      window.removeEventListener('preview-updated', triggerRefresh);
      window.removeEventListener('auto-refresh-preview', triggerRefresh);
    };
  }, [generatePreview, projectId]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="w-full h-full relative">
        {loading && !previewHtml ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505]">
            <div className="relative flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-[-10px] rounded-full border border-emerald-400/30 animate-pulse" />
                <div className="absolute inset-[-22px] rounded-full border-t-2 border-emerald-400/60 border-transparent animate-spin" />
                <img
                  src="/icon.svg"
                  alt="Open Idea"
                  className="w-14 h-14 drop-shadow-neon"
                />
              </div>
              <p className="text-gray-300 text-sm tracking-wide">Generating your Open Idea preview…</p>
            </div>
          </div>
        ) : error && !previewHtml ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]">
            <div className="text-center max-w-md mx-auto">
              {/* Open Idea Icon */}
              <div className="relative mb-8 flex justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                </div>
                <div className="relative">
                  <img
                    src="/icon.svg"
                    alt="Open Idea"
                    className="w-24 h-24 mx-auto drop-shadow-2xl animate-pulse"
                  />
                </div>
              </div>

              {/* Branding */}
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                Open Idea
              </h2>
              
              {/* Message */}
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {error === 'No HTML file found in project' || error?.includes('No files') 
                  ? 'Start building your app! Use the Chat tab to describe your idea and generate code.'
                  : 'Preview will be available once you generate your app.'}
              </p>

              {/* Features */}
              <div className="mt-8 space-y-3 text-left">
                <div className="flex items-start gap-3 text-gray-400 text-xs">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>AI-powered code generation with Groq</span>
                </div>
                <div className="flex items-start gap-3 text-gray-400 text-xs">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Real-time preview and live editing</span>
                </div>
                <div className="flex items-start gap-3 text-gray-400 text-xs">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>One-click deployment to Vercel</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-gray-500 text-xs mb-4">
                  Ready to build something amazing?
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-emerald-400 text-xs font-medium">Switch to Chat tab to get started</span>
                </div>
              </div>
            </div>
          </div>
        ) : previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            style={{ backgroundColor: '#fff', display: 'block' }}
            onLoad={() => {
              console.log(
                '✅ PreviewPanel: iframe loaded, length:',
                previewHtml.length
              );
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]">
            <div className="text-center max-w-md mx-auto">
              {/* Open Idea Icon */}
              <div className="relative mb-8 flex justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                </div>
                <div className="relative">
                  <img
                    src="/icon.svg"
                    alt="Open Idea"
                    className="w-24 h-24 mx-auto drop-shadow-2xl animate-pulse"
                  />
                </div>
              </div>

              {/* Branding */}
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                Open Idea
              </h2>
              
              {/* Message */}
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Start building your app! Use the Chat tab to describe your idea and generate code.
              </p>

              {/* Features */}
              <div className="mt-8 space-y-3 text-left">
                <div className="flex items-start gap-3 text-gray-400 text-xs">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>AI-powered code generation with Groq</span>
                </div>
                <div className="flex items-start gap-3 text-gray-400 text-xs">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Real-time preview and live editing</span>
                </div>
                <div className="flex items-start gap-3 text-gray-400 text-xs">
                  <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>One-click deployment to Vercel</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-gray-500 text-xs mb-4">
                  Ready to build something amazing?
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-emerald-400 text-xs font-medium">Switch to Chat tab to get started</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
