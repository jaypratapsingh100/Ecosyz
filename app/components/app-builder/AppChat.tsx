'use client';

import { useState, useRef, useEffect } from 'react';
import ChatSettings from '../ChatSettings';
import { getStoredApiKey, getStoredModel, getStoredProvider } from '../chatUtils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AppChatProps {
  projectId: string;
  currentFile?: { id: string; path: string; name: string };
  projectFiles?: Array<{ path: string; name: string }>;
  onFilesCreated?: () => void;
}

export default function AppChat({ projectId, currentFile, projectFiles = [], onFilesCreated }: AppChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI Code Assistant. I can help you generate, modify, and explain code. What would you like to build?\n\n🆓 **TOP 5 FREE OPEN SOURCE LLMs:**\n1. **Ollama** (100% FREE - Runs locally, no API key!)\n2. **OpenRouter** (Multiple free models)\n3. **Groq** (Fastest - Free & Fast)\n4. **DeepSeek** (Best for Code - Free)\n5. **Together AI** (Free tier)\n\n**Also Available:** Hugging Face, Perplexity, Cohere, Anthropic Claude\n\n💡 Click ⚙️ in chat settings to configure!\n\n✅ Or use DEEPSEEK_API_KEY/GROQ_API_KEY/OPENROUTER_API_KEY from .env file automatically.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesContainerRef.current && messagesEndRef.current) {
      // Scroll container to bottom smoothly
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check for auto-generated prompt from questionnaire
  useEffect(() => {
    const autoPrompt = sessionStorage.getItem(`auto-prompt-${projectId}`);
    const autoPromptTimestamp = sessionStorage.getItem(`auto-prompt-timestamp-${projectId}`);
    const autoResponse = sessionStorage.getItem(`auto-response-${projectId}`);
    const autoError = sessionStorage.getItem(`auto-error-${projectId}`);
    
    if (autoPrompt && autoPromptTimestamp) {
      // Check if this is a recent prompt (within last 30 seconds)
      const timestamp = parseInt(autoPromptTimestamp);
      const now = Date.now();
      if (now - timestamp < 30000) {
        // Add user message with prompt
        const userMessage: Message = {
          id: `auto-prompt-${timestamp}`,
          role: 'user',
          content: autoPrompt,
          timestamp: new Date(timestamp),
        };
        
        setMessages((prev) => {
          // Check if already added
          if (prev.some(m => m.id === userMessage.id)) {
            return prev;
          }
          return [...prev, userMessage];
        });
        
        // Add AI response if available
        if (autoResponse) {
          try {
            const responseData = JSON.parse(autoResponse);
            const assistantMessage: Message = {
              id: `auto-response-${timestamp}`,
              role: 'assistant',
              content: responseData.response || 'Files are being generated...',
              timestamp: new Date(),
            };
            
            setMessages((prev) => {
              if (prev.some(m => m.id === assistantMessage.id)) {
                return prev;
              }
              return [...prev, assistantMessage];
            });
            
            // Trigger files refresh
            if (onFilesCreated) {
              setTimeout(() => {
                onFilesCreated();
              }, 2000);
            }
            
            // Clear sessionStorage
            sessionStorage.removeItem(`auto-prompt-${projectId}`);
            sessionStorage.removeItem(`auto-prompt-timestamp-${projectId}`);
            sessionStorage.removeItem(`auto-response-${projectId}`);
          } catch (e) {
            console.error('Error parsing auto-response:', e);
          }
        } else if (autoError) {
          // Show error message
          try {
            const errorData = JSON.parse(autoError);
            const errorMessage: Message = {
              id: `auto-error-${timestamp}`,
              role: 'assistant',
              content: `❌ Error: ${errorData.error || 'Failed to generate files'}\n\nPlease try asking the AI manually to create your app.`,
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
      } else {
        // Old prompt, clear it
        sessionStorage.removeItem(`auto-prompt-${projectId}`);
        sessionStorage.removeItem(`auto-prompt-timestamp-${projectId}`);
      }
    }
  }, [projectId, onFilesCreated]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !projectId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const userApiKey = getStoredApiKey();
      const userModel = getStoredModel();
      const userProvider = getStoredProvider();

      console.log('💬 Chat request:', {
        provider: userProvider,
        model: userModel,
        hasApiKey: !!userApiKey,
        messageLength: currentInput.length
      });

      // Build request body - backend will use .env API key if user key not provided
      const requestBody: any = {
        message: currentInput,
        currentFile: currentFile?.path,
        provider: userProvider, // Always send provider
      };

      // Always include model (backend will use default if not provided)
      if (userModel) {
        requestBody.model = userModel;
      }
      
      // Include API key if user has one set (otherwise backend uses .env)
      // Ollama doesn't need API key
      if (userApiKey && userProvider !== 'ollama') {
        requestBody.apiKey = userApiKey;
      }

      const response = await fetch(`/api/app-projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show load balancer info if available
        if (data.loadBalancerStats) {
          console.log('Load Balancer Stats:', {
            provider: data.provider,
            usage: data.loadBalancerStats.currentUsage,
            handled: data.loadBalancerStats.requestsHandled,
          });
        }
        
        // Handle file creation results
        let responseContent = data.response || 'I apologize, but I could not generate a response.';
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
            
            // Auto-fix: Automatically attempt to fix failed file creations
            responseContent += `\n\n🔧 **Auto-fixing errors...**\n`;
            setTimeout(async () => {
              try {
                const userApiKey = getStoredApiKey();
                const userModel = getStoredModel();
                const userProvider = getStoredProvider();
                
                const fixPrompt = `The following files failed to create. Please analyze and fix the errors:\n\n${failedFiles.map((f: any) => `- ${f.path}: ${f.error || 'Unknown error'}`).join('\n')}\n\nPlease provide corrected code for these files.`;
                
                const fixRequestBody: any = {
                  message: fixPrompt,
                  currentFile: currentFile?.path,
                };
                
                if (userApiKey) {
                  fixRequestBody.apiKey = userApiKey;
                  fixRequestBody.provider = userProvider;
                }
                if (userModel) {
                  fixRequestBody.model = userModel;
                }
                
                const fixResponse = await fetch(`/api/app-projects/${projectId}/chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fixRequestBody),
                });
                
                if (fixResponse.ok) {
                  const fixData = await fixResponse.json();
                  setMessages((prev) => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `🔧 **Auto-fix applied:**\n${fixData.response}`,
                    timestamp: new Date(),
                  }]);
                  
                  // Refresh file list after auto-fix
                  if (onFilesCreated) {
                    setTimeout(() => {
                      onFilesCreated();
                    }, 500);
                  }
                }
              } catch (fixError) {
                console.error('Auto-fix failed:', fixError);
              }
            }, 1500);
          }
          
          // Refresh file list
          if (onFilesCreated && successfulFiles.length > 0) {
            setTimeout(() => {
              onFilesCreated();
            }, 500);
          }
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Unknown error';
      let shouldAutoFix = false;
      
      // Handle rate limit errors with helpful message
      if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
        errorMessage = `⚠️ Rate Limit Exceeded\n\nYou've hit the rate limit. Here are quick fixes:\n\n1. Wait 1-3 minutes and try again\n2. Switch to a different provider (Groq, OpenRouter) in chat settings\n3. Upgrade your plan for higher limits\n\nYou can continue editing code manually while waiting.`;
      } else if (error.message?.includes('Insufficient Balance') || error.message?.includes('402') || error.message?.includes('insufficient balance')) {
        errorMessage = `⚠️ Insufficient Balance\n\nYour DeepSeek account has insufficient balance. Please:\n\n1. Add credits at https://platform.deepseek.com/account\n2. Or switch to a free provider:\n   - Groq (free & fast)\n   - OpenRouter (free models)\n   - Ollama (100% free, local)\n\nClick ⚙️ in chat settings to change provider.`;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        errorMessage = `⚠️ Network Error\n\nConnection failed. Please check your internet connection and try again.`;
      } else if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = `⚠️ Authentication Error\n\nPlease check your API key settings. Click ⚙️ to configure.`;
      } else {
        // For other errors, attempt auto-fix
        shouldAutoFix = true;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${errorMessage}\n\n${error.message?.includes('Rate limit') ? '' : 'Please check your API key settings or try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Auto-fix: If it's a code-related error, try to fix it automatically
      if (shouldAutoFix && currentInput && !error.message?.includes('Rate limit')) {
        setTimeout(async () => {
          try {
            const userApiKey = getStoredApiKey();
            const userModel = getStoredModel();
            const userProvider = getStoredProvider();
            
            const fixPrompt = `I encountered this error: "${errorMessage}". Please analyze what went wrong and provide a fix. The original request was: "${currentInput}"`;
            
            const fixRequestBody: any = {
              message: fixPrompt,
              currentFile: currentFile?.path,
            };
            
            if (userApiKey) {
              fixRequestBody.apiKey = userApiKey;
              fixRequestBody.provider = userProvider;
            }
            if (userModel) {
              fixRequestBody.model = userModel;
            }
            
            const fixResponse = await fetch(`/api/app-projects/${projectId}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fixRequestBody),
            });
            
            if (fixResponse.ok) {
              const fixData = await fixResponse.json();
              setMessages((prev) => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `🔧 **Auto-fix attempt:**\n${fixData.response}`,
                timestamp: new Date(),
              }]);
              
              if (onFilesCreated) {
                setTimeout(() => {
                  onFilesCreated();
                }, 500);
              }
            }
          } catch (fixError) {
            console.error('Auto-fix failed:', fixError);
          }
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="bg-[#0a0a0a] border-l border-white/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm">AI Code Assistant</h3>
            <p className="text-xs text-gray-400">Chat-based code generation</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Open settings"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages - Scrollable area that takes remaining space */}
      <div 
        ref={messagesContainerRef}
        className="px-4 py-6 space-y-6"
        style={{ 
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(156, 163, 175, 0.5) rgba(10, 10, 10, 0.5)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' ? (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm mb-1">Assistant</div>
                  <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="max-w-[80%]">
                  <div className="bg-emerald-500/90 text-white rounded-2xl px-4 py-3 shadow-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm mb-1">Assistant</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a] z-10">
        <form onSubmit={handleSend} className="relative">
          <div className="flex items-center gap-0 w-full">
            <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-l-full border border-gray-500/30 focus-within:border-gray-400/50 transition-all px-4 py-3.5">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me to generate code..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 rounded-r-full border border-l-0 border-gray-500/30 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <span>Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Settings Modal */}
      <ChatSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

