/**
 * Custom hook for chat API interactions
 */

import { useState } from 'react';

export interface UseChatAPIProps {
  projectId?: string;
  currentFile?: { id: string; path: string; name: string };
  onFilesCreated?: () => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useChatAPI({ projectId = '', currentFile, onFilesCreated, setMessages }: UseChatAPIProps) {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, conversationHistory: any[]) => {
    if (!projectId || !message.trim()) return;

    setIsLoading(true);

    try {
      const requestBody: any = {
        message,
        currentFile: currentFile?.path,
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      console.log('\n' + '='.repeat(60));
      console.log('📤 CHAT REQUEST - FULL DETAILS');
      console.log('='.repeat(60));
      console.log('Endpoint:', `/api/app-projects/${projectId}/chat`);
      console.log('Message Length:', requestBody.message?.length, 'characters');
      console.log('-'.repeat(40));
      console.log(requestBody.message);
      console.log('-'.repeat(40));
      console.log('='.repeat(60) + '\n');

      let response: Response;
      try {
        response = await fetch(`/api/app-projects/${projectId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });
      } catch (fetchError: any) {
        console.error('❌ Fetch error (network/CORS):', {
          error: fetchError,
          message: fetchError?.message,
        });
        throw new Error(`Network error: ${fetchError?.message || 'Failed to connect to server. Please check your connection.'}`);
      }

      if (response.ok) {
        let data: any;
        try {
          data = await response.json();
          
          console.log('\n' + '='.repeat(60));
          console.log('📥 CHAT API RESPONSE RECEIVED');
          console.log('='.repeat(60));
          console.log('Response keys:', Object.keys(data));
          console.log('Has filesCreated:', !!data.filesCreated);
          console.log('filesCreated length:', data.filesCreated?.length || 0);
          console.log('='.repeat(60) + '\n');
        } catch (jsonError: any) {
          console.error('❌ Failed to parse response JSON:', jsonError);
          throw new Error('Invalid response format from server');
        }
        
        let responseContent = data.response || 'I apologize, but I could not generate a response.';
        
        if (data.provider || data.model) {
          const providerInfo = [];
          if (data.provider) providerInfo.push(`**Provider:** ${data.provider}`);
          if (data.model) providerInfo.push(`**Model:** ${data.model}`);
          if (data.usedFallback) providerInfo.push(`⚠️ *Using fallback model*`);
          if (providerInfo.length > 0) {
            responseContent = `🤖 ${providerInfo.join(' | ')}\n\n---\n\n${responseContent}`;
          }
        }
        
        if (data.filesCreated && data.filesCreated.length > 0) {
          const successfulFiles = data.filesCreated.filter((f: any) => f.success);
          const failedFiles = data.filesCreated.filter((f: any) => !f.success);
          
          if (successfulFiles.length > 0) {
            responseContent += `\n\n✅ **Files Created:**\n`;
            successfulFiles.forEach((file: any) => {
              responseContent += `- \`${file.path}\` ✓\n`;
            });
          }
          
          if (failedFiles.length > 0) {
            responseContent += `\n\n⚠️ **Failed to create:**\n`;
            failedFiles.forEach((file: any) => {
              responseContent += `- \`${file.path}\`: ${file.error || 'Unknown error'}\n`;
            });
          }
          
          // Refresh files
          if (successfulFiles.length > 0 && onFilesCreated) {
            const refreshFiles = () => {
              if (onFilesCreated) {
                onFilesCreated();
              }
              window.dispatchEvent(new CustomEvent('files-updated', {
                detail: { 
                  projectId,
                  filesCreated: successfulFiles.map((f: any) => f.path)
                }
              }));
            };
            
            refreshFiles();
            setTimeout(() => refreshFiles(), 500);
            setTimeout(() => {
              refreshFiles();
              window.dispatchEvent(new CustomEvent('preview-updated', { detail: { projectId } }));
            }, 1500);
            setTimeout(() => refreshFiles(), 3000);
          }
        } else {
          // Still try to refresh - files might have been created but not reported
          if (onFilesCreated) {
            setTimeout(() => {
              onFilesCreated();
              window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            }, 500);
            setTimeout(() => {
              onFilesCreated();
              window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            }, 2000);
            setTimeout(() => {
              onFilesCreated();
              window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            }, 5000);
          }
        }
        
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev: any[]) => [...prev, assistantMessage]);
      } else {
        let errorData: any = {};
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { error: text || `HTTP ${response.status} ${response.statusText}` };
          }
        } catch {
          errorData = { error: `HTTP ${response.status} ${response.statusText}` };
        }
        
        console.error('❌ Chat API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        
        if (response.status === 401) {
          throw new Error('Not authenticated: Please sign in to use the chat.');
        } else if (response.status === 403) {
          throw new Error('Not authorized: You do not have permission to access this project.');
        } else if (response.status === 404) {
          throw new Error('Project not found: The project may have been deleted.');
        } else if (response.status === 500 || response.status === 503) {
          const serverError = errorData.error || errorData.message || 'Server error';
          throw new Error(`Server error: ${serverError}`);
        }
        
        const detailedError = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        throw new Error(detailedError);
      }
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (error?.message) {
          errorMessage = error.message;
        }
      }
      
      console.error('❌ Chat error caught:', {
        errorType: error?.constructor?.name || typeof error,
        errorMessage,
        errorObject: error,
      });
      
      if (error.message?.includes('401') || error.message?.includes('Not authenticated')) {
        errorMessage = `❌ Authentication Error\n\nYou are not logged in or your session has expired.\n\n**Please:**\n1. Sign in to your account\n2. Refresh the page and try again`;
      } else if (error.message?.includes('403') || error.message?.includes('Not authorized')) {
        errorMessage = `❌ Authorization Error\n\nYou don't have permission to access this project.\n\n**Please:**\n1. Ensure you're signed in with the correct account\n2. Check that you own this project`;
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        errorMessage = `❌ Azure DeepSeek endpoint not found\n\nPlease check:\n- AZURE_DEEPSEEK_URL is configured\n- Service is running\n- Check server logs for details`;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        errorMessage = `❌ Network Error\n\nUnable to connect to server. Please check your connection and try again.`;
      } else {
        errorMessage = `❌ Error: ${error.message || 'Unknown error occurred'}\n\nPlease check server logs for details.`;
      }
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev: any[]) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
  };
}
