/**
 * Custom hook for chat messages management
 */

import { useState, useRef, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractingFiles?: boolean;
  wizardQuestion?: any;
}

export interface UseChatMessagesProps {
  projectId?: string;
  onFilesCreated?: () => void;
}

export function useChatMessages({ projectId = '', onFilesCreated }: UseChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    if (!projectId) {
      setIsLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/app-projects/${projectId}/chat/stats`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [projectId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check for auto-generated prompt
  useEffect(() => {
    const checkAutoPrompt = () => {
      const autoPrompt = sessionStorage.getItem(`auto-prompt-${projectId}`);
      const autoPromptTimestamp = sessionStorage.getItem(`auto-prompt-timestamp-${projectId}`);
      const autoResponse = sessionStorage.getItem(`auto-response-${projectId}`);
      const autoError = sessionStorage.getItem(`auto-error-${projectId}`);
      
      if (autoPrompt && autoPromptTimestamp) {
        const timestamp = parseInt(autoPromptTimestamp);
        const now = Date.now();
        if (now - timestamp < 30000) {
          const userMessage: Message = {
            id: `auto-prompt-${timestamp}`,
            role: 'user',
            content: autoPrompt,
            timestamp: new Date(timestamp),
          };
          
          setMessages((prev) => {
            if (prev.some(m => m.id === userMessage.id)) {
              return prev;
            }
            return [...prev, userMessage];
          });
          
          if (autoResponse) {
            try {
              const responseData = JSON.parse(autoResponse);
              const responseContent = responseData.response || 'Files are being generated...';
              
              const assistantMessage: Message = {
                id: `auto-response-${timestamp}`,
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
              };
              
              setMessages((prev) => {
                if (prev.some(m => m.id === assistantMessage.id)) {
                  return prev;
                }
                return [...prev, assistantMessage];
              });
              
              if (onFilesCreated) {
                setTimeout(() => {
                  onFilesCreated();
                }, 2000);
              }
              
              sessionStorage.removeItem(`auto-prompt-${projectId}`);
              sessionStorage.removeItem(`auto-prompt-timestamp-${projectId}`);
              sessionStorage.removeItem(`auto-response-${projectId}`);
            } catch (e) {
              console.error('Error parsing auto-response:', e);
            }
          } else if (autoError) {
            try {
              const errorData = JSON.parse(autoError);
              let errorContent = `❌ Error: ${errorData.error || 'Failed to generate files'}`;
              
              if (errorData.details) {
                if (typeof errorData.details === 'string') {
                  errorContent += `\n\nDetails: ${errorData.details}`;
                } else if (errorData.details.error) {
                  errorContent += `\n\nDetails: ${errorData.details.error}`;
                }
              }
              
              if (errorData.suggestion) {
                errorContent += `\n\n💡 ${errorData.suggestion}`;
              } else {
                errorContent += `\n\n💡 Please check your API key settings (⚙️ icon) and try asking the AI manually to create your app.`;
              }
              
              const errorMessage: Message = {
                id: `auto-error-${timestamp}`,
                role: 'assistant',
                content: errorContent,
                timestamp: new Date(),
              };
              
              setMessages((prev) => {
                if (prev.some(m => m.id === errorMessage.id)) {
                  return prev;
                }
                return [...prev, errorMessage];
              });
              
              sessionStorage.removeItem(`auto-error-${projectId}`);
            } catch (e) {
              console.error('Error parsing auto-error:', e);
            }
          }
        }
      } else {
        sessionStorage.removeItem(`auto-prompt-${projectId}`);
        sessionStorage.removeItem(`auto-prompt-timestamp-${projectId}`);
      }
    };
    
    checkAutoPrompt();
    
    const handleAutoPromptReady = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        setTimeout(() => {
          checkAutoPrompt();
        }, 100);
      }
    };
    
    window.addEventListener('auto-prompt-ready', handleAutoPromptReady as EventListener);
    
    return () => {
      window.removeEventListener('auto-prompt-ready', handleAutoPromptReady as EventListener);
    };
  }, [projectId, onFilesCreated]);

  return {
    messages,
    setMessages,
    isLoadingHistory,
    messagesEndRef,
    messagesContainerRef,
  };
}
