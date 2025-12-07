'use client';

import { useState, useEffect } from 'react';

interface PreviewPanelProps {
  projectId: string;
  projectType: string;
  onRefresh?: () => void;
}

export default function PreviewPanel({ projectId, projectType, onRefresh }: PreviewPanelProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const generatePreview = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/app-projects/${projectId}/preview`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Preview API response:', data);
        console.log('Preview HTML length:', data.output?.length || 0);
        if (data.output) {
          // Accept any output, even if status is not 'success'
          setPreviewHtml(data.output);
          setError(null);
          console.log('Preview HTML set successfully');
        } else if (data.status === 'error') {
          console.error('Preview API error:', data.error);
          setError(data.error || 'Failed to generate preview');
          setPreviewHtml(null);
        } else {
          console.error('No preview output in response:', data);
          setError(data.error || 'No preview output received');
          setPreviewHtml(null);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Preview API error:', errorData);
        setError(errorData.error || `Failed to generate preview (${res.status})`);
        setPreviewHtml(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate preview when project changes
    if (projectId && (projectType === 'web' || projectType === 'fullstack')) {
      generatePreview();
    }
  }, [projectId, projectType]);

  if (projectType !== 'web' && projectType !== 'fullstack') {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a] text-gray-400">
        <div className="text-center">
          <p>Preview not available for {projectType} projects</p>
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Preview - Fullscreen</h3>
          <div className="flex gap-2">
            <button
              onClick={generatePreview}
              disabled={loading}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Refresh'}
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Exit Fullscreen
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Click Refresh to generate preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-white/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={generatePreview}
              disabled={loading}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Refresh'}
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 min-h-0 relative">
        {loading && !previewHtml ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Generating preview...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm mb-2">Error</p>
              <p className="text-gray-400 text-xs">{error}</p>
            </div>
          </div>
        ) : previewHtml ? (
          <div className="w-full h-full relative">
            <iframe
              key={previewHtml.substring(0, 100)} // Force re-render on content change
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
              style={{ backgroundColor: '#fff' }}
              onLoad={() => console.log('Preview iframe loaded successfully')}
              onError={(e) => {
                console.error('Preview iframe error:', e);
                setError('Failed to load preview content');
              }}
            />
            {!loading && (
              <div className="absolute top-2 right-2 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                Preview loaded
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-gray-400 text-sm">Click Refresh to generate preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

