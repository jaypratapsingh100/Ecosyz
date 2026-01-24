/**
 * Custom hook for file extraction from messages
 */

import { useState } from 'react';

export interface UseFileExtractionProps {
  projectId?: string;
  onFilesCreated?: () => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useFileExtraction({ projectId = '', onFilesCreated, setMessages }: UseFileExtractionProps) {
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractFiles = async (text: string, messageId: string) => {
    if (!projectId || !text) return;

    setMessages((prev: any[]) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, extractingFiles: true } : msg
      )
    );

    try {
      console.log('📤 Extracting files from message:', messageId);
      const response = await fetch(`/api/app-projects/${projectId}/extract-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract files: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Files extracted:', data);

      if (onFilesCreated) {
        onFilesCreated();
      }

      window.dispatchEvent(new CustomEvent('files-updated', {
        detail: { projectId, filesCreated: data.filesCreated?.map((f: any) => f.path) || [] }
      }));
      window.dispatchEvent(new CustomEvent('preview-updated', { detail: { projectId } }));

      const successfulFiles = data.filesCreated?.filter((f: any) => f.success) || [];
      const failedFiles = data.filesCreated?.filter((f: any) => !f.success) || [];
      
      let successContent = `✅ **Files Extracted Successfully!**\n\n`;
      if (successfulFiles.length > 0) {
        successContent += `Created ${successfulFiles.length} file(s):\n${successfulFiles.map((f: any) => `- \`${f.path}\` ✓`).join('\n')}\n\n`;
      }
      if (failedFiles.length > 0) {
        successContent += `⚠️ Failed to create ${failedFiles.length} file(s):\n${failedFiles.map((f: any) => `- \`${f.path}\`: ${f.error || 'Unknown error'}`).join('\n')}\n\n`;
      }
      successContent += `Files are now available in the Files panel. Click the refresh button (↻) if they don't appear.`;

      const successMessage = {
        id: `extract-${Date.now()}`,
        role: 'assistant' as const,
        content: successContent,
        timestamp: new Date(),
      };
      setMessages((prev: any[]) => [...prev, successMessage]);
    } catch (error: any) {
      console.error('❌ Error extracting files:', error);
      const errorMessage = {
        id: `extract-error-${Date.now()}`,
        role: 'assistant' as const,
        content: `❌ **Failed to extract files**\n\nError: ${error.message}\n\nPlease check the code format and try again.`,
        timestamp: new Date(),
      };
      setMessages((prev: any[]) => [...prev, errorMessage]);
    } finally {
      setMessages((prev: any[]) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, extractingFiles: false } : msg
        )
      );
    }
  };

  return {
    handleExtractFiles,
    isExtracting,
  };
}
