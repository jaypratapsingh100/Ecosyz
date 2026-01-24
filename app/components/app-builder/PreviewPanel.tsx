'use client';

import { useState, useEffect, useCallback } from 'react';

interface PreviewPanelProps {
  projectId: string;
  projectType: string;
  onRefresh?: () => void;
}

export default function PreviewPanel({ projectId, projectType, onRefresh }: PreviewPanelProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useCallback(async () => {
    if (!projectId) {
      console.warn('⚠️ PreviewPanel: No projectId provided');
      return;
    }

    console.log('🔍 PreviewPanel: Generating preview for project:', projectId);
    setLoading(true);
    setError(null);

    try {
      console.log('📡 PreviewPanel: Calling preview API...');
      const res = await fetch(`/api/app-projects/${projectId}/preview`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include cookies for authentication
      });
      
      console.log('📡 PreviewPanel: API response status:', res.status, res.statusText);

      if (res.ok) {
        const data = await res.json().catch((parseError) => {
          console.error('Failed to parse preview response:', parseError);
          return { status: 'error', error: 'Invalid response from preview API' };
        });
        
        console.log('📥 PreviewPanel: API response received:', {
          status: data.status,
          hasOutput: !!data.output,
          outputLength: data.output?.length || 0,
          error: data.error,
          type: data.type
        });
        
        if (data.output && data.output.length > 0) {
          // Accept any output, even if status is not 'success'
          console.log('✅ PreviewPanel: Setting preview HTML, length:', data.output.length);
          setPreviewHtml(data.output);
          setError(null);
          console.log('✅ PreviewPanel: Preview HTML set successfully');
        } else if (data.status === 'error') {
          const errorMsg = data.error || 'Failed to generate preview';
          const errorDetails = data.errorDetails || {};
          
          // Log detailed error information
          console.error('❌ PreviewPanel: Preview API error:', {
            error: errorMsg,
            errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
            status: data.status,
            type: data.type,
            responseData: data
          });
          
          setError(errorMsg);
          setPreviewHtml(null);
        } else {
          console.error('⚠️ PreviewPanel: No preview output in response:', {
            status: data.status,
            error: data.error,
            hasOutput: !!data.output,
            outputLength: data.output?.length || 0,
            responseKeys: Object.keys(data),
            fullResponse: data
          });
          setError(data.error || 'No preview output received. Please check console for details.');
          setPreviewHtml(null);
        }
      } else {
        // Try to parse error response, but handle cases where it's not JSON
        let errorData: any = {};
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await res.json();
          } catch (parseError) {
            console.error('Failed to parse error response as JSON:', parseError);
            // Try to get text instead
            try {
              const textError = await res.text();
              errorData = { error: textError || `HTTP ${res.status}` };
            } catch (textError) {
              errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
            }
          }
        } else {
          // Not JSON, try to get text
          try {
            const textError = await res.text();
            errorData = { error: textError || `HTTP ${res.status}: ${res.statusText}` };
          } catch (textError) {
            errorData = { error: `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
          }
        }
        
        const errorMessage = errorData.error || errorData.message || `Failed to generate preview (HTTP ${res.status})`;
        
        // Ensure errorData is properly serialized (handle empty objects)
        const serializedErrorData = Object.keys(errorData).length > 0 
          ? errorData 
          : { error: `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
        
        console.error('Preview API error:', {
          status: res.status,
          statusText: res.statusText,
          errorData: serializedErrorData,
          errorMessage,
          hasErrorData: Object.keys(errorData).length > 0
        });
        
        setError(errorMessage);
        setPreviewHtml(null);
      }
    } catch (err: any) {
      console.error('Preview generation exception:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to generate preview';
      setError(errorMessage);
      setPreviewHtml(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // Auto-generate preview when project changes
    if (projectId) {
      console.log('🔄 PreviewPanel: Project ID changed, generating preview:', projectId);
      // Small delay to ensure component is mounted and files are loaded
      const timer = setTimeout(() => {
        generatePreview();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      console.warn('⚠️ PreviewPanel: No projectId in useEffect');
    }
  }, [projectId, generatePreview]);

  // Listen for files-updated event to auto-refresh preview
  useEffect(() => {
    const handleFilesUpdated = () => {
      if (projectId) {
        // Wait a bit for files to be saved, then generate preview
        setTimeout(() => {
          console.log('🔄 PreviewPanel: Auto-refreshing preview after files updated');
          generatePreview();
        }, 1000);
      }
    };

    const handleAutoRefresh = (event: CustomEvent) => {
      if (projectId && event.detail?.projectId === projectId) {
        console.log('🔄 PreviewPanel: Auto-refresh triggered', event.detail);
        setTimeout(() => {
          generatePreview();
        }, 500);
      }
    };

    window.addEventListener('files-updated', handleFilesUpdated);
    window.addEventListener('preview-updated', handleFilesUpdated);
    window.addEventListener('auto-refresh-preview', handleAutoRefresh as EventListener);
    return () => {
      window.removeEventListener('files-updated', handleFilesUpdated);
      window.removeEventListener('preview-updated', handleFilesUpdated);
      window.removeEventListener('auto-refresh-preview', handleAutoRefresh as EventListener);
    };
  }, [projectId, generatePreview]);

  // Show preview for all project types, but warn if not web/fullstack
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">

      {/* Preview Content - Full Height */}
      <div className="w-full h-full relative">
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
          <iframe
            key={previewHtml.substring(0, 100)} // Force re-render on content change
            srcDoc={previewHtml}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            style={{ backgroundColor: '#fff', display: 'block' }}
            scrolling="yes"
            onLoad={() => {
              console.log('✅ PreviewPanel: Preview iframe loaded successfully');
              console.log('📊 PreviewPanel: Preview HTML length:', previewHtml.length);
            }}
            onError={(e) => {
              console.error('❌ PreviewPanel: Preview iframe error:', e);
              setError('Failed to load preview content. Check browser console for details.');
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-gray-400 text-sm">Preview will generate automatically</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

