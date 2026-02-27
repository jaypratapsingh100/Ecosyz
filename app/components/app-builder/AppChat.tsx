'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import ChatQuestionnaire from './ChatQuestionnaire';
import { SUGGESTED_PROMPTS } from '@/lib/app-builder/businessWebsitePrompts';
import { extractAgentResponse } from '@/lib/app-builder/agentSchema';
import type { QuestionnaireData } from '@/app/types/app-builder';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
}

interface AIOption {
  id: string;
  label: string;
}

interface AIOptionsState {
  groqAvailable: boolean;
  openRouterAvailable: boolean;
  anthropicAvailable: boolean;
  models: { groq: AIOption[]; openrouter: AIOption[]; anthropic: AIOption[] };
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
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [questionnaireDismissed, setQuestionnaireDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [aiOptions, setAiOptions] = useState<AIOptionsState | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'openrouter' | 'anthropic'>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const hasNoFiles = projectFiles.length === 0;
  const canGenerate = projectId && message.trim() && !loading;

  // Load available AI providers/models (Groq, OpenRouter DeepSeek Coder, etc.)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/app-projects/ai-options', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setAiOptions({
          groqAvailable: !!data.groqAvailable,
          openRouterAvailable: !!data.openRouterAvailable,
          anthropicAvailable: !!data.anthropicAvailable,
          models: data.models ?? { groq: [], openrouter: [], anthropic: [] },
        });
        const groq = data.models?.groq ?? [];
        const openrouter = data.models?.openrouter ?? [];
        const anthropic = data.models?.anthropic ?? [];
        if (data.anthropicAvailable && anthropic.length > 0) {
          setSelectedProvider('anthropic');
          setSelectedModel((m) => m || anthropic[0].id);
        } else if (data.groqAvailable && groq.length > 0) {
          setSelectedProvider('groq');
          setSelectedModel((m) => m || groq[0].id);
        } else if (data.openRouterAvailable && openrouter.length > 0) {
          setSelectedProvider('openrouter');
          setSelectedModel((m) => m || openrouter[0].id);
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!aiOptions) return;
    if (selectedProvider === 'groq' && aiOptions.models.groq?.length && !aiOptions.models.groq.some((m) => m.id === selectedModel)) {
      setSelectedModel(aiOptions.models.groq[0].id);
    }
    if (selectedProvider === 'openrouter' && aiOptions.models.openrouter?.length && !aiOptions.models.openrouter.some((m) => m.id === selectedModel)) {
      setSelectedModel(aiOptions.models.openrouter[0].id);
    }
    if (selectedProvider === 'anthropic' && aiOptions.models.anthropic?.length && !aiOptions.models.anthropic.some((m) => m.id === selectedModel)) {
      setSelectedModel(aiOptions.models.anthropic[0].id);
    }
  }, [aiOptions, selectedProvider, selectedModel]);

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
              provider: msg.provider,
              model: msg.model,
            }));
            setMessages(formattedMessages);
          }
          if (data.questionnaireData) setQuestionnaireData(data.questionnaireData as QuestionnaireData);
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
        body: JSON.stringify({
          message: description,
          currentFile: currentFile || undefined,
          userProvider: selectedProvider,
          userModel: selectedModel || undefined,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = data?.error || 'Failed to send message';
        if (res.status === 401) errorMessage = 'Please sign in to use the chat feature';
        else if (res.status === 403) errorMessage = "You don't have permission to chat in this project";
        else if (res.status === 404) errorMessage = 'Project not found. Please select a valid project';
        else if (res.status === 429) errorMessage = 'Too many requests. Please wait a moment and try again';
        else if (res.status >= 500) errorMessage = 'Server error. Please try again in a few moments';
        setError(errorMessage);
        toast.error('Chat Error', { description: errorMessage, duration: 5000 });
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        return;
      }

      // SSE streaming support (when server sends text/event-stream)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const assistantId = `ai-${Date.now()}`;
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let filesUpdated = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value, { stream: true }).split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'text') {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + evt.content } : m));
              }
              if (evt.type === 'files' && evt.files?.length > 0 && !filesUpdated) {
                filesUpdated = true;
                setTimeout(() => {
                  onFilesCreated?.();
                  window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
                  setTimeout(() => window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId } })), 400);
                }, 400);
              }
            } catch { /* skip malformed SSE lines */ }
          }
        }
        return;
      }

      // Standard JSON response (Groq / OpenRouter)
      const data = await res.json().catch(() => ({}));
      const filesCreated = data.filesCreated ?? [];
      const successfulPaths = Array.isArray(filesCreated)
        ? filesCreated.filter((f: { success?: boolean; path?: string }) => f?.success).map((f: { path?: string }) => f?.path)
        : [];
      let responseContent = data.response || data.message || 'Response received';
      if (successfulPaths.length > 0) {
        toast.success('Files extracted', {
          description:
            successfulPaths.length === 1
              ? `Created file: ${successfulPaths[0]}`
              : `Created ${successfulPaths.length} files: ${successfulPaths.join(', ')}`,
          duration: 4000,
        });
        responseContent += `\n\n**Added ${successfulPaths.length} file(s):** ${successfulPaths.join(', ')}`;
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        provider: data.provider,
        model: data.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onFilesCreated?.();

      if (typeof window !== 'undefined' && successfulPaths.length > 0) {
        window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId } }));
        }, 400);
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
    const parsedAgent = !isUser ? extractAgentResponse(msg.content) : null;
    const structuredFiles = parsedAgent?.files ?? [];
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
          <div className={`text-sm font-semibold mb-1 flex items-center gap-2 ${isUser ? 'text-blue-400' : 'text-white'}`}>
            {isUser ? 'You' : 'Assistant'}
          </div>
          <div className={`rounded-2xl px-4 py-3 shadow-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
              : 'bg-[#1a1a1a] border border-white/10'
          }`}>
            {!isUser && structuredFiles.length > 0 ? (
              <div className="space-y-3">
                {parsedAgent?.summary && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {parsedAgent.summary}
                  </p>
                )}
                <div className="space-y-3">
                  {structuredFiles.map((file) => (
                    <div
                      key={file.path}
                      className="rounded-xl border border-white/10 bg-black/40 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
                        <span className="text-xs font-mono text-emerald-300">
                          {file.path}
                        </span>
                        {file.language && (
                          <span className="text-[10px] uppercase text-gray-400">
                            {file.language}
                          </span>
                        )}
                      </div>
                      <pre className="max-h-64 overflow-auto text-xs text-gray-100 px-3 py-2 whitespace-pre">
                        {file.content}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <p className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              {!isUser && (msg.provider || msg.model) && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium"
                  title={`Provider: ${msg.provider || '—'}, Model: ${msg.model || '—'}`}
                >
                  {msg.provider === 'groq'
                    ? 'Groq'
                    : msg.provider === 'openrouter'
                      ? 'OpenRouter'
                      : String(msg.provider || '').toUpperCase()}
                  {msg.model
                    ? ` · ${msg.model.includes('llama') ? 'Llama 3.3' : msg.model.includes('deepseek') ? 'DeepSeek' : msg.model.split('/').pop() || msg.model}`
                    : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const showQuestionnaire =
    projectId &&
    projectFiles.length <= 2 &&
    !questionnaireDismissed &&
    (questionnaireData === null || Object.keys(questionnaireData || {}).length < 2);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showQuestionnaire && (
          <ChatQuestionnaire
            projectId={projectId}
            initialData={questionnaireData}
            onComplete={(data, generatedPrompt) => {
              setQuestionnaireData(data);
              setQuestionnaireDismissed(true);
              if (generatedPrompt) setMessage(generatedPrompt);
            }}
            onSkip={() => setQuestionnaireDismissed(true)}
          />
        )}
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
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words mb-3">
                  {hasNoFiles
                    ? "👋 Welcome! Describe the app you want or pick a prompt below. I'll generate the React app."
                    : "👋 How would you like to get started? Pick a prompt or describe your changes."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map(({ label, prompt, shortLabel }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setMessage(prompt)}
                      className="text-left px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-emerald-300 transition-colors max-w-full line-clamp-2"
                      title={prompt.length > 80 ? prompt.slice(0, 120) + '…' : prompt}
                    >
                      {shortLabel || label}
                    </button>
                  ))}
                </div>
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
        {aiOptions && (aiOptions.groqAvailable || aiOptions.openRouterAvailable) && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">Model:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as 'groq' | 'openrouter')}
              className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              aria-label="AI Provider"
            >
              {aiOptions.groqAvailable && <option value="groq">Groq (Llama)</option>}
              {aiOptions.openRouterAvailable && <option value="openrouter">OpenRouter (DeepSeek)</option>}
            </select>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 min-w-[180px]"
              aria-label="AI Model"
            >
              {selectedProvider === 'groq' &&
                aiOptions.models.groq?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              {selectedProvider === 'openrouter' &&
                aiOptions.models.openrouter?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </select>
          </div>
        )}
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
                placeholder={hasNoFiles ? 'e.g. Professional business website with Hero, Services, Contact' : 'Ask me to generate code...'}
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
