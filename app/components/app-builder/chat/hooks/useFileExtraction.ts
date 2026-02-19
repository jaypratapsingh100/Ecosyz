export type ExtractedFile = {
  path: string;
  name: string;
  content: string;
  language?: string;
  isMain?: boolean;
};

interface UseFileExtractionProps {
  projectId?: string;
  onFilesCreated?: () => void;
}

export function useFileExtraction({ projectId, onFilesCreated }: UseFileExtractionProps) {
  return {
    handleExtractFiles: async (
      content: string,
      preParsedFiles?: ExtractedFile[]
    ): Promise<{ ok: boolean; message: string; createdCount: number }> => {
      if (!projectId || !content?.trim()) {
        return { ok: false, message: 'Project and content are required', createdCount: 0 };
      }
      try {
        const body =
          preParsedFiles && preParsedFiles.length > 0
            ? { content: content.trim(), files: preParsedFiles }
            : { content: content.trim() };
        const res = await fetch(`/api/app-projects/${projectId}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
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
