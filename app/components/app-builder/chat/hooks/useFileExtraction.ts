interface UseFileExtractionProps {
  projectId?: string;
  onFilesCreated?: () => void;
}

export function useFileExtraction({ projectId, onFilesCreated }: UseFileExtractionProps) {
  return {
    handleExtractFiles: async (content: string): Promise<{ ok: boolean; message: string; createdCount: number }> => {
      if (!projectId || !content?.trim()) {
        return { ok: false, message: 'Project and content are required', createdCount: 0 };
      }
      try {
        const res = await fetch(`/api/app-projects/${projectId}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: content.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            message: data?.message || data?.error || 'Extract failed',
            createdCount: 0,
          };
        }
        const createdCount = data.createdCount ?? 0;
        if (createdCount > 0) {
          onFilesCreated?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId } }));
          }
        }
        return {
          ok: true,
          message: data.message || `Extracted ${createdCount} file(s)`,
          createdCount,
        };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Network error',
          createdCount: 0,
        };
      }
    },
  };
}
