interface UseFileExtractionProps {
  projectId?: string;
  onFilesCreated?: () => void;
  setMessages?: any;
}

export function useFileExtraction({ projectId, onFilesCreated, setMessages }: UseFileExtractionProps) {
  return {
    handleExtractFiles: async () => {
      // Stub - functionality removed
    },
  };
}
