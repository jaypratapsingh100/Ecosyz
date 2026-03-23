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
  projectFiles?: Array<{ path: string; name: string; content?: string }>;
  onFilesCreated?: () => void;
  /** Called with in-progress files as AI streams them — for real-time editor preview */
  onStreamingFiles?: (files: Array<{ path: string; content: string; complete: boolean }>) => void;
  projectTitle?: string;
  projectFramework?: string;
}

export default function AppChat({ projectId = '', currentFile, projectFiles = [], onFilesCreated, onStreamingFiles, projectTitle = 'My App', projectFramework = 'react' }: AppChatProps) {
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

  // streamingStatus removed — progress tracker handles all display

  // ── Generation progress tracker ──
  interface ProgressStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'done';
    detail?: string;
  }
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [planData, setPlanData] = useState<{ name?: string; features?: string[]; files?: { path: string; purpose: string }[] } | null>(null);
  const [createdFiles, setCreatedFiles] = useState<{ path: string; action: 'created' | 'updated' }[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationTruncated, setGenerationTruncated] = useState(false);
  const generationStartRef = useRef<number>(0);

  const hasNoFiles = projectFiles.length === 0;
  const canGenerate = projectId && message.trim() && !loading;

  // Track auto-fix attempts to prevent infinite loops (max 2 attempts per error)
  const autoFixCountRef = useRef(0);
  const lastAutoFixErrorRef = useRef<string>('');
  // Reset counter only on NEW user-initiated generation (not on fix-loop responses)
  const resetAutoFixOnUserAction = () => { autoFixCountRef.current = 0; lastAutoFixErrorRef.current = ''; };

  // File extraction hook — kept for potential manual extraction needs
  useFileExtraction({ projectId, onFilesCreated });

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
      if (!projectId || detail.projectId !== projectId) return;
      if (loading) return;
      const errors = detail.errors;
      if (!errors || errors.length === 0) return;

      const errorText = errors.join('\n');

      // Prevent infinite loop: max 2 auto-fix attempts per unique error
      if (autoFixCountRef.current >= 2) return;
      // If same error as last time, don't retry — the fix didn't work
      if (lastAutoFixErrorRef.current === errorText) return;

      autoFixCountRef.current += 1;
      lastAutoFixErrorRef.current = errorText;

      // Build a smarter fix prompt that tells the AI exactly what to do
      const isUndefinedError = /is not defined/.test(errorText);
      const undefinedName = errorText.match(/(\w+) is not defined/)?.[1];

      let fixMessage: string;
      if (isUndefinedError && undefinedName) {
        fixMessage = `The preview has a runtime error:\n\`\`\`\n${errorText}\n\`\`\`\nThe component "${undefinedName}" is referenced but its file is missing or not exported correctly. Please create the missing file src/components/${undefinedName}.jsx with "export default ${undefinedName}". Do NOT regenerate existing files — ONLY create the missing file.`;
      } else {
        fixMessage = `The preview has a runtime error:\n\`\`\`\n${errorText}\n\`\`\`\nPlease fix ONLY this error. Do NOT rewrite or regenerate files that are working. Make the minimal change needed.`;
      }

      pendingAutoFixRef.current = fixMessage;
      setMessage(fixMessage);
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
    // Reset auto-fix counter only on user-initiated messages (not auto-fix)
    if (!autoFixMsg) resetAutoFixOnUserAction();
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
        let fileRefreshTimer: ReturnType<typeof setTimeout> | null = null;
        let streamParseTimer: ReturnType<typeof setTimeout> | null = null;

        // Incremental parser: extract files from partial JSON/markdown as AI streams
        const parseStreamingFiles = (text: string) => {
          if (!onStreamingFiles || text.length < 50) return;
          const files: Array<{ path: string; content: string; complete: boolean }> = [];

          // Try JSON format: find "path":"..." , "content":"..." pairs
          // Limit gap between path and content to 500 chars to avoid crossing file boundaries
          const jsonFilePattern = /"path"\s*:\s*"([^"]+)"[^"]{0,500}"content"\s*:\s*"/g;
          let match;
          while ((match = jsonFilePattern.exec(text)) !== null) {
            const path = match[1];
            const contentStart = match.index + match[0].length;
            // Find where content string ends — look for unescaped closing quote
            let end = contentStart;
            let complete = false;
            while (end < text.length) {
              if (text[end] === '\\') { end += 2; continue; }
              if (text[end] === '"') { complete = true; break; }
              end++;
            }
            const rawContent = text.slice(contentStart, end);
            // Unescape JSON string
            try {
              const content = JSON.parse(`"${rawContent.replace(/\n/g, '\\n')}"`);
              files.push({ path, content, complete });
            } catch {
              // Partial content — unescape in correct order (backslash first!)
              const content = rawContent.replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
              files.push({ path, content, complete: false });
            }
          }

          // Try markdown format: ```jsx:path or ```file:path blocks
          if (files.length === 0) {
            const mdPattern = /```(?:jsx|tsx|javascript|typescript|css|file):?\s*(\S+\.(?:jsx?|tsx?|css))\n([\s\S]*?)(?:```|$)/g;
            let mdMatch;
            while ((mdMatch = mdPattern.exec(text)) !== null) {
              const path = mdMatch[1].startsWith('src/') ? mdMatch[1] : `src/${mdMatch[1]}`;
              const content = mdMatch[2];
              const complete = text.indexOf('```', mdMatch.index + mdMatch[0].length - 3) > mdMatch.index;
              files.push({ path, content, complete });
            }
          }

          if (files.length > 0) {
            // Deduplicate by path, keeping the last (most complete) entry
            const deduped = Array.from(
              files.reduce((map, f) => map.set(f.path, f), new Map<string, typeof files[0]>()).values()
            );
            onStreamingFiles(deduped);
          }
        };

        // Reset progress tracker for new generation
        setCreatedFiles([]);
        setValidationErrors([]);
        setPlanData(null);
        setGenerationComplete(false);
        setGenerationTruncated(false);
        generationStartRef.current = Date.now();
        // For first generation (no files yet): show all steps including planning
        // For follow-ups (files exist): skip planning/architecting since server skips them
        const isFirstGeneration = projectFiles.length === 0;
        setProgressSteps(isFirstGeneration ? [
          { id: 'planning', label: 'Planning app structure', status: 'pending' },
          { id: 'architecting', label: 'Designing architecture', status: 'pending' },
          { id: 'coding', label: 'Generating code', status: 'pending' },
          { id: 'validating', label: 'Validating & fixing', status: 'pending' },
          { id: 'saving', label: 'Saving files', status: 'pending' },
        ] : [
          { id: 'coding', label: 'Generating code', status: 'pending' },
          { id: 'validating', label: 'Validating & fixing', status: 'pending' },
          { id: 'saving', label: 'Saving files', status: 'pending' },
        ]);

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
                  'creating-files': 'Processing files...',
                  parsing: 'Parsing generated code...',
                  filtering: 'Filtering files...',
                  sanitizing: 'Sanitizing imports...',
                  validating: 'Validating code...',
                  fixing: 'Auto-fixing issues...',
                  saving: 'Saving to project...',
                  retrying: 'Retrying (missing files)...',
                };
                const label = statusLabels[event.data] || event.data;
                // streamingStatus removed — progress steps handle display

                // Map status events to progress step updates
                const statusToStep: Record<string, string> = {
                  planning: 'planning', architecting: 'architecting',
                  coding: 'coding', 'creating-files': 'coding',
                  parsing: 'validating', filtering: 'validating',
                  sanitizing: 'validating', validating: 'validating',
                  fixing: 'validating', saving: 'saving', retrying: 'coding',
                };
                const activeStepId = statusToStep[event.data];
                if (activeStepId) {
                  setProgressSteps(prev => prev.map(s => ({
                    ...s,
                    status: s.id === activeStepId ? 'active'
                      : prev.findIndex(p => p.id === activeStepId) > prev.findIndex(p => p.id === s.id) ? 'done'
                      : s.status,
                    detail: s.id === activeStepId ? label : s.detail,
                  })));
                }

                // Don't set status labels as message content — the progress tracker component handles display
              } else if (event.type === 'plan') {
                const p = event.data;
                setPlanData(p);
                let planText = `**Plan: ${p.name || 'App'}**\n${p.description || ''}\n`;
                if (p.techstack) planText += `\n**Tech:** ${p.techstack}`;
                if (p.features?.length) planText += `\n**Features:**\n${p.features.map((f: string) => `- ${f}`).join('\n')}`;
                if (p.files?.length) planText += `\n**Files:**\n${p.files.map((f: { path: string; purpose: string }) => `- \`${f.path}\` — ${f.purpose}`).join('\n')}`;
                planText += '\n\n---\n';
                streamedContent = planText;
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantId ? { ...m, content: streamedContent } : m
                ));
              } else if (event.type === 'architecture') {
                const steps = event.data?.implementationSteps || [];
                if (steps.length) {
                  let archText = '\n**Implementation Steps:**\n';
                  archText += steps.map((s: { filepath: string; taskDescription: string; priority: string }, i: number) =>
                    `${i + 1}. \`${s.filepath}\` — ${s.taskDescription} _(${s.priority})_`
                  ).join('\n');
                  archText += '\n\n---\n';
                  streamedContent += archText;
                  setMessages((prev) => prev.map((m) =>
                    m.id === assistantId ? { ...m, content: streamedContent } : m
                  ));
                }
              } else if (event.type === 'token') {
                streamedContent += event.data;
                const content = streamedContent;
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantId ? { ...m, content } : m
                ));
                // Debounced: parse streaming content for real-time file preview in editor
                if (onStreamingFiles && !streamParseTimer) {
                  streamParseTimer = setTimeout(() => {
                    parseStreamingFiles(streamedContent);
                    streamParseTimer = null;
                  }, 300);
                }
              } else if (event.type === 'file-created') {
                if (event.data?.success) {
                  streamedFiles.push(event.data.path);
                  setCreatedFiles(prev => [...prev, { path: event.data.path, action: event.data.action || 'created' }]);

                  // Real-time file list refresh: debounce to avoid flooding DB
                  // Dispatch files-updated so editor/files panel refreshes incrementally
                  if (!fileRefreshTimer) {
                    fileRefreshTimer = setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId, incremental: true } }));
                      fileRefreshTimer = null;
                    }, 800);
                  }
                }
              } else if (event.type === 'done') {
                // streamingStatus cleared
                // Mark all steps as done
                setProgressSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })));
                streamProvider = event.data?.summary?.provider || '';
                streamModel = event.data?.summary?.model || '';
                const finalContent = event.data?.response || streamedContent;
                const elapsedSec = Math.round((Date.now() - generationStartRef.current) / 1000);
                const fileSummary = streamedFiles.length > 0
                  ? `\n\n**${streamedFiles.length} file(s) created** in ${elapsedSec}s: ${streamedFiles.join(', ')}`
                  : '';
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: finalContent + fileSummary, provider: streamProvider, model: streamModel }
                    : m
                ));
                setGenerationComplete(true);

                // Detect truncated response — if AI stopped mid-code block or ended abruptly
                const trimmed = (finalContent || '').trimEnd();
                const openBlocks = (trimmed.match(/```/g) || []).length;
                const isTruncated = openBlocks % 2 !== 0
                  || /[,{(\[]\s*$/.test(trimmed);
                // Don't show truncation for continuation responses that generated at least some files
                const createdCount = event.data?.filesCreated?.length || streamedFiles.length;
                setGenerationTruncated(isTruncated && createdCount === 0);
              } else if (event.type === 'error') {
                // streamingStatus cleared
                setProgressSteps(prev => prev.map(s =>
                  s.status === 'active' ? { ...s, status: 'done' as const, detail: 'Error' } : s
                ));
                setError(event.data?.message || 'Generation failed');
                toast.error('Generation Error', { description: event.data?.message, duration: 5000 });
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Clear pending timers — the final refresh below is authoritative
        if (fileRefreshTimer) { clearTimeout(fileRefreshTimer); fileRefreshTimer = null; }
        if (streamParseTimer) { clearTimeout(streamParseTimer); streamParseTimer = null; }
        // DON'T clear streaming files here — they stay visible until DB files load
        // The parent clears them after fetchProjectFiles completes (see page.tsx files-updated handler)

        // ALWAYS notify parent and refresh — even if streamedFiles is empty
        // (files might have been saved to DB via pipeline even without file-created events)
        onFilesCreated?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId } }));
          }, 400);
        }
        if (streamedFiles.length > 0) {
          toast.success('Files generated', {
            description: `${streamedFiles.length} files: ${streamedFiles.slice(0, 5).join(', ')}${streamedFiles.length > 5 ? '...' : ''}`,
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
      // streamingStatus cleared
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
          </div>
          {/* Generation Progress Tracker — shown during AND after generation */}
          {!isUser && progressSteps.some(s => s.status !== 'pending') && (
            <div className="mb-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 space-y-1.5 text-[12px]">
              {progressSteps.map(step => (
                <div key={step.id} className="flex items-center gap-2">
                  {step.status === 'done' ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : step.status === 'active' ? (
                    <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /></span>
                  ) : (
                    <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-600" /></span>
                  )}
                  <span className={step.status === 'active' ? 'text-blue-300 font-medium' : step.status === 'done' ? 'text-gray-400' : 'text-gray-600'}>
                    {step.label}
                  </span>
                  {step.status === 'active' && step.detail && step.detail !== step.label && (
                    <span className="text-gray-500 truncate">— {step.detail}</span>
                  )}
                </div>
              ))}
              {createdFiles.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-white/5 space-y-0.5">
                  <span className="text-gray-500 font-medium">Files ({createdFiles.length}):</span>
                  {/* Deduplicate by path — keep last action for each path */}
                  {[...new Map(createdFiles.map(f => [f.path, f])).values()].map(f => (
                    <div key={f.path} className={`flex items-center gap-1.5 pl-1 ${f.action === 'created' ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="truncate">{f.path}</span>
                      <span className={`text-[9px] flex-shrink-0 ${f.action === 'created' ? 'text-emerald-500' : 'text-amber-500'}`}>{f.action === 'created' ? 'NEW' : 'MOD'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {(hasFiles || msg.content) && (
          <div className={`rounded-2xl px-4 py-3 shadow-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30'
              : 'bg-[#1a1a1a] border border-white/10'
          }`}>
            {hasFiles ? (
              <div className="space-y-3">
                {/* AI summary text */}
                {parsedAgent?.summary && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {parsedAgent.summary}
                  </p>
                )}
                {/* Website Walkthrough — auto-generated from App.jsx content */}
                {/* Use createdFiles (from SSE events = actually saved) OR structuredFiles (from parsing) */}
                {!loading && (createdFiles.length > 2 || structuredFiles.length > 3) && (() => {
                  // Try to find App.jsx content from structured files first, then from projectFiles (DB)
                  const appFile = structuredFiles.find(f => f.path === 'src/App.jsx' || f.path === 'src/App.tsx')
                    || projectFiles.find(f => f.path === 'src/App.jsx' || f.path === 'src/App.tsx');
                  if (!appFile?.content) return null;
                  const content = appFile.content;

                  // Extract pages from navigateTo/setCurrentPage calls
                  const pageMatches = [...content.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)];
                  const pages = pageMatches.map(m => m[1]).filter(p => p !== 'default');

                  // Extract component imports to understand what exists
                  const importMatches = [...content.matchAll(/import\s+(\w+)\s+from\s+['"]\.\/(components|pages)\/(\w+)/g)];
                  const components = importMatches.map(m => ({ name: m[1], type: m[2], file: m[3] }));

                  // Detect features from code patterns
                  const features: string[] = [];
                  if (content.includes('navigateTo')) features.push('Page navigation (click menu items to browse)');
                  if (content.includes('Modal') || content.includes('modal') || content.includes('isOpen')) features.push('Modal dialogs (login, signup, etc.)');
                  if (content.includes('dark') || content.includes('Dark') || content.includes('theme')) features.push('Dark mode toggle');
                  if (content.includes('search') || content.includes('Search')) features.push('Search functionality');
                  if (content.includes('notification') || content.includes('Notification')) features.push('Notification system');
                  if (content.includes('scrollTo') || content.includes('scrollIntoView')) features.push('Smooth scroll navigation');

                  // Format page names nicely
                  const formatPage = (p: string) => p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                  // Detect which pages have files vs which are missing
                  const savedPaths = new Set(createdFiles.filter(f => f.action === 'created' || f.action === 'updated').map(f => f.path));
                  const importedPaths = [...content.matchAll(/import\s+\w+\s+from\s+['"]\.\/([^'"]+)['"]/g)]
                    .map(m => {
                      let p = `src/${m[1]}`;
                      if (!p.match(/\.(jsx?|tsx?)$/)) p += '.jsx';
                      return p;
                    });
                  const missingFiles = importedPaths.filter(p => !savedPaths.has(p) && !projectFiles.some(pf => pf.path === p || pf.name === p.split('/').pop()));
                  const isTruncated = generationTruncated || missingFiles.length > 0;

                  const savedCount = createdFiles.filter(f => f.action === 'created').length;
                  const modifiedCount = createdFiles.filter(f => f.action === 'updated').length;

                  if (pages.length === 0 && components.length === 0 && savedCount === 0) return null;

                  return (
                    <div className={`border rounded-xl p-4 space-y-3 ${
                      isTruncated
                        ? 'bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20'
                        : 'bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isTruncated ? (
                          <>
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                            <span className="text-sm font-semibold text-amber-300">Partially generated — click Continue below</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm font-semibold text-emerald-300">Your website is ready!</span>
                          </>
                        )}
                      </div>

                      {/* What was saved */}
                      {(savedCount > 0 || modifiedCount > 0) && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                            {isTruncated ? 'Saved so far' : 'Files created'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-400">
                            {savedCount > 0 && <span className="text-emerald-400">{savedCount} new files</span>}
                            {modifiedCount > 0 && <span className="text-amber-400">{modifiedCount} modified</span>}
                          </div>
                        </div>
                      )}

                      {/* Missing files (truncated) */}
                      {missingFiles.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wider mb-1.5">Still needed</p>
                          <div className="flex flex-wrap gap-1.5">
                            {missingFiles.map(p => (
                              <span key={p} className="px-2 py-0.5 text-[11px] rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                {p.split('/').pop()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pages */}
                      {pages.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                            {isTruncated ? 'Pages planned' : 'Pages you can visit'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {pages.map(p => (
                              <span key={p} className="px-2 py-0.5 text-[11px] rounded-md bg-white/5 border border-white/10 text-gray-300">
                                {formatPage(p)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {features.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">What you can do</p>
                          <ul className="space-y-1">
                            {features.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-400">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-600 pt-1 border-t border-white/5">
                        Click the preview to interact with your website. Use the nav menu to browse pages.
                      </p>
                    </div>
                  );
                })()}
                {/* File summary bar — shows all files with NEW/MOD */}
                <details className="group" open>
                  <summary className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none hover:text-gray-300 transition-colors list-none">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    <span>{structuredFiles.length} file{structuredFiles.length === 1 ? '' : 's'} generated</span>
                    <span className="text-[10px] text-gray-600">
                      ({structuredFiles.filter(f => createdFiles.find(cf => cf.path === f.path)?.action === 'created').length} new,{' '}
                      {structuredFiles.filter(f => createdFiles.find(cf => cf.path === f.path)?.action === 'updated').length} modified)
                    </span>
                  </summary>
                  <div className="mt-1.5 space-y-0.5 pl-5">
                    {/* Deduplicate structured files by path */}
                    {[...new Map(structuredFiles.map(f => [f.path, f])).values()].map((file) => {
                      const fileAction = createdFiles.find(cf => cf.path === file.path)?.action;
                      return (
                        <div
                          key={file.path}
                          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors group"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            fileAction === 'created' ? 'bg-emerald-400' : fileAction === 'updated' ? 'bg-amber-400' : 'bg-gray-500'
                          }`} />
                          <span className="text-xs font-mono text-gray-300 truncate flex-1 min-w-0">{file.path}</span>
                          {fileAction && (
                            <span className={`text-[9px] font-medium flex-shrink-0 ${
                              fileAction === 'created' ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                              {fileAction === 'created' ? 'NEW' : 'MOD'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(file.content || '');
                                toast.success('Copied', { description: file.path, duration: 1500 });
                              } catch {
                                toast.error('Copy failed');
                              }
                            }}
                            className="p-1 rounded text-gray-600 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                            title="Copy code"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </details>
                {/* Raw code — only visible AFTER generation, collapsed by default */}
                {!loading && (
                  <details className="group">
                    <summary className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none hover:text-gray-400 transition-colors list-none">
                      <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
                      <span>View raw output</span>
                    </summary>
                    <div className="mt-2 max-h-[400px] overflow-y-auto rounded-lg bg-black/40 border border-white/5">
                      <pre className="text-[11px] text-gray-400 p-3 whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {msg.content}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            ) : msg.content ? (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            ) : null}
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
          )}
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
            {/* Auto-scroll anchor during loading — progress is shown inside the message above */}
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
        {/* ── Generation Complete Banner ── */}
        {generationComplete && !loading && (
          <div className="mx-2 mb-3">
            {/* Truncated response — Continue button */}
            {generationTruncated && (
              <button
                onClick={() => {
                  // Merge project files (from DB) with files created in this session
                  const dbPaths = projectFiles.map(f => f.path || f.name);
                  const sessionPaths = createdFiles.map(f => f.path);
                  const allExistingPaths = [...new Set([...dbPaths, ...sessionPaths])];
                  // Normalize: ensure all paths have src/ prefix for comparison
                  const normalizedExisting = new Set(allExistingPaths.map(p =>
                    p.startsWith('src/') ? p : `src/${p}`
                  ));

                  // Detect missing files from App.jsx imports
                  const appFile = projectFiles.find(f => f.path === 'src/App.jsx' || f.path === 'src/App.tsx' || f.name === 'App.jsx');
                  const appContent = appFile?.content || '';
                  const importedPaths = [...appContent.matchAll(/import\s+\w+\s+from\s+['"]\.\/([^'"]+)['"]/g)]
                    .map(m => {
                      let p = `src/${m[1]}`;
                      if (!p.match(/\.(jsx?|tsx?|css)$/)) p += '.jsx';
                      return p;
                    });
                  const missingFiles = importedPaths.filter(p => !normalizedExisting.has(p));

                  const existingStr = allExistingPaths.filter(p => p.startsWith('src/')).join('\n');
                  const missingStr = missingFiles.length > 0
                    ? `\n\nMISSING FILES (these are imported in App.jsx but don't exist yet — generate these):\n${missingFiles.map(f => `- ${f}`).join('\n')}`
                    : '';

                  const continueMsg = `[CONTINUE] The previous generation was truncated. Generate ONLY the missing files listed below.

EXISTING FILES (already saved — do NOT regenerate or modify ANY of these):
${existingStr}
${missingStr}

RULES FOR CONTINUATION:
- Generate ONLY the missing files listed above. Do NOT output any file that already exists.
- Each file must use "export default ComponentName" matching the filename.
- Match the SAME design system, theme, color scheme, and component patterns as existing files.
- The App.jsx already imports these components — just create the component files.`;

                  setMessage(continueMsg);
                  setGenerationTruncated(false);
                  setTimeout(() => {
                    const form = document.querySelector('[data-chat-form]') as HTMLFormElement;
                    form?.requestSubmit();
                  }, 50);
                }}
                className="w-full mb-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                Response was truncated — Click to continue generating
              </button>
            )}

            {/* Follow-up suggestions */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-2 font-medium">What would you like to do next?</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...(createdFiles.length > 0 ? [
                    { label: 'Add dark mode', prompt: 'Add a dark mode toggle that switches between light and dark themes' },
                    { label: 'Add animations', prompt: 'Add smooth scroll animations and micro-interactions to all sections' },
                    { label: 'Improve mobile', prompt: 'Improve the mobile responsive design for all components' },
                    { label: 'Add more pages', prompt: 'Add About, FAQ, and Terms pages with navigation links' },
                  ] : []),
                  ...(planData?.features?.some(f => /auth|login/i.test(f)) ? [] : [
                    { label: 'Add login page', prompt: 'Add a login and signup page with form validation' },
                  ]),
                ].slice(0, 4).map(suggestion => (
                  <button
                    key={suggestion.label}
                    onClick={() => {
                      setMessage(suggestion.prompt);
                      setGenerationComplete(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300 transition-colors"
                  >
                    {suggestion.label}
                  </button>
                ))}
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
                placeholder={hasNoFiles ? 'e.g. Professional business website with Hero, Services, Contact' : 'e.g. Add dark mode, fix the navbar, add a login page...'}
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
