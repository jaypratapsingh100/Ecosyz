'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AppChatProps {
  projectId?: string;
  currentFile?: { id: string; path: string; name: string };
  projectFiles?: Array<{ path: string; name: string }>;
  onFilesCreated?: () => void;
  projectTitle?: string;
  projectFramework?: string;
}

export default function AppChat({ projectId = '', currentFile, projectFiles = [], onFilesCreated, projectTitle = 'My App', projectFramework = 'react' }: AppChatProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasNoFiles = projectFiles.length === 0;
  const canGenerate = projectId && message.trim() && !loading;

  // Load chat history when projectId changes
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }

    const loadChatHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/app-projects/${projectId}/chat`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            const formattedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              role: msg.role || 'assistant',
              content: msg.content || '',
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            }));
            setMessages(formattedMessages);
          }
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
        // Don't show toast for history loading errors - just log silently
        // The chat will still work, just without previous messages
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [projectId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll to bottom when new reply arrives
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGenerate) return;
    const description = message.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: description,
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/app-projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: description }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        let errorMessage = data?.error || 'Failed to send message';
        
        // Provide more specific error messages based on status code
        if (res.status === 401) {
          errorMessage = 'Please sign in to use the chat feature';
        } else if (res.status === 403) {
          errorMessage = 'You don\'t have permission to chat in this project';
        } else if (res.status === 404) {
          errorMessage = 'Project not found. Please select a valid project';
        } else if (res.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again';
        } else if (res.status >= 500) {
          errorMessage = 'Server error. Please try again in a few moments';
        }
        
        setError(errorMessage);
        toast.error('Chat Error', {
          description: errorMessage,
          duration: 5000,
        });
        // Remove user message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        return;
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.message || 'Response received',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      onFilesCreated?.();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Network error. Please check your connection and try again';
      setError(errorMessage);
      toast.error('Connection Error', {
        description: errorMessage,
        duration: 5000,
      });
      // Remove user message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    return (
      <div key={msg.id} className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
          isUser 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
            : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
        }`}>
          {isUser ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </div>
        <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
          <div className={`text-sm font-semibold mb-1 ${isUser ? 'text-blue-400' : 'text-white'}`}>
            {isUser ? 'You' : 'Assistant'}
          </div>
          <div className={`rounded-2xl px-4 py-3 shadow-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
              : 'bg-[#1a1a1a] border border-white/10'
          }`}>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
              {msg.content}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading chat history...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm mb-1">Assistant</div>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {hasNoFiles
                    ? '👋 **Welcome!** Describe the app you want (e.g. "A todo app with dark mode") and click Send. I\'ll generate the React app.'
                    : '👋 **Welcome!** How would you like to get started?'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            {loading && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm mb-1">Assistant</div>
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
                    <p className="text-sm text-gray-400">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-red-400 font-semibold text-sm mb-1">Error</div>
              <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{error}</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a] z-10">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-0 w-full">
            <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-l-full border border-gray-500/30 focus-within:border-gray-400/50 transition-all px-4 py-3.5">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={hasNoFiles ? 'e.g. A todo app with filters and dark mode' : 'Ask me to generate code...'}
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={!canGenerate}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-r-full border border-l-0 border-gray-500/30 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
