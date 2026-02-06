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
        (typeof data?.preview === 'string' && data.preview);

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
      setError(err?.message || 'Failed to generate preview');
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

  // Debounced refresh events
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const DEBOUNCE_DELAY = 800;

    const triggerRefresh = () => {
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
  }, [generatePreview]);

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
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">Preview unavailable</p>
              <p className="text-gray-400 text-xs">{error}</p>
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
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              Preview will generate automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
