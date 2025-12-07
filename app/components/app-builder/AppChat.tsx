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
      content: "Hello! I'm your AI Code Assistant. I can help you generate, modify, and explain code. What would you like to build?\n\n🆓 **FREE OPTIONS AVAILABLE:**\n- **Groq** (Recommended - Fast & Free)\n- **Together AI** (Free tier)\n- **Hugging Face** (Free tier)\n\n💡 Click ⚙️ in chat settings to configure your free API key!\n\n✅ Or use OPENAI_API_KEY/GROQ_API_KEY from .env file automatically.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

      // Only send API key if user has one set (otherwise backend will use .env)
      const requestBody: any = {
        message: currentInput,
        currentFile: currentFile?.path,
      };

      // Only include API key, model, and provider if user has set them
      // Otherwise, backend will use OPENAI_API_KEY/GROQ_API_KEY from .env
      if (userApiKey) {
        requestBody.apiKey = userApiKey;
        requestBody.provider = userProvider;
      }
      if (userModel) {
        requestBody.model = userModel;
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
        errorMessage = `⚠️ Rate Limit Exceeded\n\nYou've hit OpenAI's rate limit. Here are quick fixes:\n\n1. Wait 1-3 minutes and try again\n2. Switch to a faster model in .env:\n   OPENAI_MODEL=gpt-4o-mini\n   (Higher rate limits, faster responses)\n3. Upgrade your OpenAI plan for higher limits\n\nYou can continue editing code manually while waiting.`;
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
    <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
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

      {/* Messages */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6" 
        style={{ 
          scrollBehavior: 'smooth', 
          maxHeight: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent'
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

      {/* Input */}
      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a]/80 backdrop-blur-sm">
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

