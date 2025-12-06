'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  status: 'pending' | 'completed';
}

interface OpenResourcesSidebarProps {
  searchResults?: any[];
  searchQuery?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function OpenResourcesSidebar({ searchResults = [], searchQuery = '', isOpen, onToggle }: OpenResourcesSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchChats, setSearchChats] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get active chat
  const activeChat = chats.find(chat => chat.id === activeChatId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat is active
  useEffect(() => {
    if (activeChatId && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeChatId]);

  // Initialize with empty chat if no chats exist
  useEffect(() => {
    if (chats.length === 0) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        status: 'pending',
      };
      setChats([newChat]);
      setActiveChatId(newChat.id);
      setMessages([]);
    }
  }, []);

  // Update messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      setMessages(activeChat.messages);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      status: 'pending',
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setMessages([]);
    setInputValue('');
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !activeChatId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const currentInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Update chat title if it's the first user message
    const currentChat = chats.find(c => c.id === activeChatId);
    if (currentChat && currentChat.messages.length === 0) {
      const newTitle = currentInput.length > 30 ? currentInput.substring(0, 30) + '...' : currentInput;
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId ? { ...chat, title: newTitle } : chat
      ));
    }

    // Add user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChats(prev => prev.map(chat => 
      chat.id === activeChatId ? { ...chat, messages: updatedMessages } : chat
    ));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          context: {
            searchQuery,
            resultsCount: searchResults.length,
            results: searchResults.slice(0, 5).map(r => ({
              title: r.title,
              type: r.type,
              source: r.source,
            })),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || `I understand you're asking about "${currentInput}". I can help you explore open resources, understand research papers, datasets, code repositories, and more. How can I assist you?`,
          timestamp: new Date(),
        };
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        setChats(prev => prev.map(chat => 
          chat.id === activeChatId ? { ...chat, messages: finalMessages } : chat
        ));
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about "${currentInput}". I'm here to help you explore open resources! ${searchResults.length > 0 ? `I can see you've found ${searchResults.length} resources. ` : ''}Would you like help understanding any specific resource, finding similar ones, or exploring related topics?`,
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId ? { ...chat, messages: finalMessages } : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchChats.toLowerCase())
  );

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full z-50 bg-[#171717] border-r border-gray-800 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-[260px]' : 'w-0'
        } overflow-hidden flex flex-col`}
      >
        {isOpen && (
          <>
            {/* Top Section */}
            <div className="p-3 border-b border-gray-800">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800/50 text-white text-sm font-medium transition-colors mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New chat</span>
              </button>
              
              <div className="relative">
                <input
                  type="text"
                  value={searchChats}
                  onChange={(e) => setSearchChats(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-gray-800/50 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
                />
                <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredChats.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  {searchChats ? 'No chats found' : 'No chats yet'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        activeChatId === chat.id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="truncate flex-1">{chat.title}</span>
                      {chat.status === 'completed' && <span className="text-xs text-green-500">Completed</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Section - User Info */}
            <div className="p-3 border-t border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-900 text-xs font-medium">U</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">User</div>
                  <div className="text-gray-400 text-xs truncate">Open Resources</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chat Panel - Shows when sidebar is open and chat is active */}
      {isOpen && activeChatId && (
        <div className="relative flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#1a1a1a]">
            <div className="flex items-center gap-3">
              <button
                onClick={onToggle}
                className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h3 className="text-white font-medium text-sm">
                {activeChat?.title || 'New Chat'}
              </h3>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="New chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto bg-[#212121]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="mb-4">
                  <svg
                    className="w-12 h-12 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h4 className="text-white font-medium mb-1 text-base">
                  How can I help you explore open resources?
                </h4>
                <p className="text-sm text-gray-400 mt-2">
                  Ask me about papers, datasets, code repositories, or any open resources you're looking for.
                </p>
              </div>
            ) : (
              <div className="px-4 py-6 space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-gray-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`flex-1 max-w-[85%] ${
                        message.role === 'user' ? 'order-2' : ''
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-[#10a37f] text-white ml-auto'
                            : 'bg-[#2f2f2f] text-gray-100'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 order-3">
                        <span className="text-white text-xs font-medium">U</span>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-gray-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <div className="bg-[#2f2f2f] rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.15s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.3s' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-800 bg-[#1a1a1a] p-4">
            <form onSubmit={handleSend} className="relative">
              <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-2xl border border-gray-700 focus-within:border-gray-600 transition-colors">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about open resources..."
                  className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 text-sm"
                  rows={1}
                  style={{
                    minHeight: '24px',
                    height: 'auto',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="mb-2 mr-2 p-2 rounded-lg bg-[#10a37f] hover:bg-[#0d8f6e] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  aria-label="Send message"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

