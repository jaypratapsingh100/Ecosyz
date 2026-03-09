'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import ChatQuestionnaire from './ChatQuestionnaire';
import { SUGGESTED_PROMPTS } from '@/lib/app-builder/businessWebsitePrompts';
import { extractAgentResponse, parseCodeBlocksToFiles } from '@/lib/app-builder/agentSchema';
import type { QuestionnaireData } from '@/app/types/app-builder';
import { useFileExtraction } from './chat/hooks/useFileExtraction';

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

interface ProviderEntry {
  provider: string;
  label: string;
  models: AIOption[];
  available: boolean;
  backend: string; // actual backend: 'groq' | 'openrouter' | 'openai' | 'anthropic'
  free?: boolean;
}

interface AIOptionsState {
  providers: ProviderEntry[];
  anyAvailable: boolean;
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
  const [selectedProvider, setSelectedProvider] = useState<string>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const [extractingMessageId, setExtractingMessageId] = useState<string | null>(null);
  const [extractingFileKey, setExtractingFileKey] = useState<string | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);

  const hasNoFiles = projectFiles.length === 0;
  const canGenerate = projectId && message.trim() && !loading;

  // Track whether we already auto-sent a fix for the current preview cycle
  const autoFixSentRef = useRef(false);
  // Reset auto-fix flag when files are updated (new generation)
  useEffect(() => {
    const reset = () => { autoFixSentRef.current = false; };
    window.addEventListener('files-updated', reset);
    return () => window.removeEventListener('files-updated', reset);
  }, []);

  const { handleExtractFiles } = useFileExtraction({ projectId, onFilesCreated });

  // Load available AI providers/models
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/app-projects/ai-options', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const providers: ProviderEntry[] = data.providers ?? [];
        setAiOptions({ providers, anyAvailable: !!data.anyAvailable });
        // Default to first available provider (Groq free is first)
        const firstAvailable = providers.find((p) => p.available);
        if (firstAvailable) {
          setSelectedProvider(firstAvailable.provider);
          setSelectedModel((m) => m || firstAvailable.models[0]?.id || '');
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Sync model when provider changes
  useEffect(() => {
    if (!aiOptions) return;
    const entry = aiOptions.providers.find((p) => p.provider === selectedProvider);
    if (entry?.models?.length && !entry.models.some((m) => m.id === selectedModel)) {
      setSelectedModel(entry.models[0].id);
    }
  }, [aiOptions, selectedProvider, selectedModel]);

  // Resolve the backend provider for the selected UI provider
  const getBackendProvider = (): string => {
    if (!aiOptions) return 'groq';
    const entry = aiOptions.providers.find((p) => p.provider === selectedProvider);
    return entry?.backend || 'groq';
  };

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
          cache: 'no-store',
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

  // Auto-fix: when preview iframe reports a runtime error, automatically ask the AI to fix it
  // We use a ref to queue the message so it can be picked up by handleSubmit
  const pendingAutoFixRef = useRef<string | null>(null);

  useEffect(() => {
    const handlePreviewError = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string; errors: string[] }>).detail;
      // Only handle errors for our project, and only once per generation cycle
      if (!projectId || detail.projectId !== projectId) return;
      if (autoFixSentRef.current || loading) return;
      const errors = detail.errors;
      if (!errors || errors.length === 0) return;

      autoFixSentRef.current = true;
      const errorText = errors.join('\n');
      const fixMessage = `The preview has a runtime error:\n\`\`\`\n${errorText}\n\`\`\`\nPlease fix this error in the code.`;

      // Store in ref and set in state, then trigger submit
      pendingAutoFixRef.current = fixMessage;
      setMessage(fixMessage);
      // Small delay so React flushes the state, then trigger submit
      setTimeout(() => {
        const form = document.querySelector('[data-chat-form]') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }, 150);
    };

    window.addEventListener('preview-runtime-error', handlePreviewError);
    return () => window.removeEventListener('preview-runtime-error', handlePreviewError);
  }, [projectId, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // For auto-fix: use pending ref if message state hasn't flushed yet
    const autoFixMsg = pendingAutoFixRef.current;
    pendingAutoFixRef.current = null;
    const effectiveMessage = message.trim() || (autoFixMsg || '').trim();
    if (!projectId || !effectiveMessage || loading) return;
    const description = effectiveMessage;
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
          userProvider: getBackendProvider(),
          userModel: selectedModel || undefined,
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = data?.error || 'Failed to send message';
        if (res.status === 401) errorMessage = 'Please sign in to use the chat feature';
        else if (res.status === 403 && data?.code === 'PROVIDER_RESTRICTED') {
          errorMessage = `${data.provider} is not available on your plan. Allowed providers: ${(data.allowedProviders || []).join(', ')}`;
          toast.error('Provider Restricted', {
            description: errorMessage,
            action: { label: 'Upgrade', onClick: () => window.open(data.upgradeUrl || '/pricing', '_blank') },
            duration: 8000,
          });
        } else if (res.status === 403) {
          errorMessage = 'You don\'t have permission to chat in this project';
        } else if (res.status === 429 && data?.code === 'GENERATION_LIMIT') {
          errorMessage = `Monthly generation limit reached (${data.used}/${data.limit}). Upgrade your plan for more.`;
          toast.error('Generation Limit Reached', {
            description: errorMessage,
            action: { label: 'Upgrade', onClick: () => window.open(data.upgradeUrl || '/pricing', '_blank') },
            duration: 8000,
          });
          setError(errorMessage);
          setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          return;
        } else if (res.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again';
        } else if (res.status === 404) {
          errorMessage = 'Project not found. Please select a valid project';
        } else if (res.status >= 500) {
          errorMessage = 'Server error. Please try again in a few moments';
        }
        setError(errorMessage);
        if (data?.code !== 'PROVIDER_RESTRICTED') {
          toast.error('Chat Error', { description: errorMessage, duration: 5000 });
        }
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        return;
      }

      // Check if response is SSE stream or JSON fallback
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        // --- SSE Streaming Mode ---
        const assistantId = `assistant-${Date.now()}`;
        let streamedContent = '';
        const streamedFiles: string[] = [];
        let streamProvider = '';
        let streamModel = '';

        // Add placeholder assistant message
        setMessages((prev) => [...prev, {
          id: assistantId,
          role: 'assistant' as const,
          content: '_Generating..._',
          timestamp: new Date(),
        }]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'status') {
                const statusLabels: Record<string, string> = {
                  planning: 'Planning app structure...',
                  architecting: 'Designing architecture...',
                  coding: 'Writing code...',
                  'creating-files': 'Saving files...',
                  parsing: 'Parsing response...',
                  filtering: 'Filtering files...',
                  sanitizing: 'Sanitizing imports...',
                  validating: 'Validating code...',
                  fixing: 'Auto-fixing issues...',
                  saving: 'Saving files...',
                };
                const label = statusLabels[event.data] || event.data;
                setStreamingStatus(label);
                // Also update message if no content streamed yet
                if (!streamedContent) {
                  setMessages((prev) => prev.map((m) =>
                    m.id === assistantId ? { ...m, content: `_${label}_` } : m
                  ));
                }
              } else if (event.type === 'token') {
                streamedContent += event.data;
                // Update message with streamed content (throttled)
                const content = streamedContent;
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantId ? { ...m, content } : m
                ));
              } else if (event.type === 'file-created') {
                if (event.data?.success) {
                  streamedFiles.push(event.data.path);
                  toast.success(`Created: ${event.data.path}`, { duration: 2000 });
                }
              } else if (event.type === 'done') {
                setStreamingStatus(null);
                streamProvider = event.data?.summary?.provider || '';
                streamModel = event.data?.summary?.model || '';
                const finalContent = event.data?.response || streamedContent;
                const fileSummary = streamedFiles.length > 0
                  ? `\n\n**Added ${streamedFiles.length} file(s):** ${streamedFiles.join(', ')}`
                  : '';
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: finalContent + fileSummary, provider: streamProvider, model: streamModel }
                    : m
                ));
              } else if (event.type === 'error') {
                setStreamingStatus(null);
                setError(event.data?.message || 'Generation failed');
                toast.error('Generation Error', { description: event.data?.message, duration: 5000 });
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Notify parent and trigger preview refresh
        if (streamedFiles.length > 0) {
          onFilesCreated?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId } }));
            }, 400);
          }
          toast.success('Files extracted', {
            description: `Created ${streamedFiles.length} files: ${streamedFiles.join(', ')}`,
            duration: 4000,
          });
        }
      } else {
        // --- JSON Fallback Mode (non-streaming) ---
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
      setStreamingStatus(null);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    const parsedAgent = !isUser ? extractAgentResponse(msg.content) : null;
    // Fallback: parse code blocks when JSON extraction fails (so Extract button still works)
    const structuredFiles =
      (parsedAgent?.files?.length ? parsedAgent.files : parseCodeBlocksToFiles(msg.content)) ?? [];
    const hasFiles = !isUser && structuredFiles.length > 0;

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
            {!isUser && loading && streamingStatus && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 animate-pulse">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {streamingStatus}
              </span>
            )}
          </div>
          <div className={`rounded-2xl px-4 py-3 shadow-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
              : 'bg-[#1a1a1a] border border-white/10'
          }`}>
            {hasFiles ? (
              <div className="space-y-3">
                {parsedAgent?.summary && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {parsedAgent.summary}
                  </p>
                )}
                {projectId && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <button
                      type="button"
                      disabled={!!extractingMessageId || !projectId}
                      onClick={async () => {
                        if (!projectId || structuredFiles.length === 0) return;
                        setExtractingMessageId(msg.id);
                        try {
                          const result = await handleExtractFiles(msg.content, structuredFiles);
                          if (result.ok) {
                            toast.success('Files extracted', {
                              description: result.message,
                              duration: 4000,
                            });
                          } else {
                            toast.error('Extract failed', {
                              description: result.message,
                              duration: 4000,
                            });
                          }
                        } finally {
                          setExtractingMessageId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {extractingMessageId === msg.id ? (
                        <span className="inline-block w-3 h-3 border-2 border-emerald-300/40 border-t-emerald-300 rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M4 4h16v4H4zM4 16h16v4H4zM4 8h2v8H4zM18 8h2v8h-2z"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span>Extract all</span>
                    </button>
                    <span>
                      {structuredFiles.length} file{structuredFiles.length === 1 ? '' : 's'} ready to
                      extract.
                    </span>
                  </div>
                )}
                <div className="space-y-3">
                  {structuredFiles.map((file) => {
                    const fileKey = `${msg.id}:${file.path}`;
                    const isExtractingThisFile = extractingFileKey === fileKey;
                    return (
                      <div
                        key={file.path}
                        className="rounded-xl border border-white/10 bg-black/40 overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (
                                    typeof navigator !== 'undefined' &&
                                    navigator.clipboard &&
                                    navigator.clipboard.writeText
                                  ) {
                                    await navigator.clipboard.writeText(file.content || '');
                                    toast.success('Copied file to clipboard', {
                                      description: file.path,
                                      duration: 2000,
                                    });
                                  } else {
                                    throw new Error('Clipboard API not available');
                                  }
                                } catch (err) {
                                  toast.error('Failed to copy', {
                                    description:
                                      err instanceof Error ? err.message : 'Please copy manually.',
                                    duration: 3000,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-medium text-gray-200 hover:bg-emerald-500/20 hover:border-emerald-400/40"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <rect
                                  x="9"
                                  y="9"
                                  width="13"
                                  height="13"
                                  rx="2"
                                  ry="2"
                                  strokeWidth="2"
                                />
                                <path
                                  d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>Copy</span>
                            </button>
                            {projectId && (
                              <button
                                type="button"
                                disabled={isExtractingThisFile || !!extractingMessageId}
                                onClick={async () => {
                                  if (!projectId) return;
                                  setExtractingFileKey(fileKey);
                                  try {
                                    const result = await handleExtractFiles(msg.content, [file]);
                                    if (result.ok) {
                                      toast.success('File extracted', {
                                        description: result.message,
                                        duration: 4000,
                                      });
                                    } else {
                                      toast.error('Extract failed', {
                                        description: result.message,
                                        duration: 4000,
                                      });
                                    }
                                  } finally {
                                    setExtractingFileKey(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isExtractingThisFile ? (
                                  <span className="inline-block w-3 h-3 border-2 border-emerald-300/40 border-t-emerald-300 rounded-full animate-spin" />
                                ) : (
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                                <span>Extract</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-emerald-300 truncate">
                              {file.path}
                            </span>
                            {file.language && (
                              <span className="text-[10px] uppercase text-gray-400 flex-shrink-0">
                                {file.language}
                              </span>
                            )}
                          </div>
                        </div>
                        <pre className="max-h-64 overflow-auto text-xs text-gray-100 px-3 py-2 whitespace-pre">
                          {file.content}
                        </pre>
                      </div>
                    );
                  })}
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
                {(error.includes('generation limit') || error.includes('Generation limit') || error.includes('not available on your plan')) && (
                  <a
                    href="/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 transition-colors"
                  >
                    Upgrade Plan
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a] z-10">
        {aiOptions ? (
          aiOptions.anyAvailable ? (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Model:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                aria-label="AI Provider"
              >
                {aiOptions.providers.filter((p) => p.available).map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 min-w-[180px]"
                aria-label="AI Model"
              >
                {(aiOptions.providers.find((p) => p.provider === selectedProvider)?.models || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs text-amber-300">No AI providers configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in your environment variables.</span>
            </div>
          )
        ) : null}
        <form onSubmit={handleSubmit} data-chat-form className="relative">
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
