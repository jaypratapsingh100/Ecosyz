'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Send, Loader2 } from 'lucide-react';
import type { SearchResult } from '../types/search';
import SaveToWorkspace from './workspace/SaveToWorkspace';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'results';
  content: string;
  results?: SearchResult[];
  timestamp: Date;
}

export default function ChatSearch() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "👋 Welcome to Open Idea! I'm your AI search assistant. Ask me anything about research papers, code repositories, datasets, models, or any open innovation resources.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentQuery(query);

    // Add thinking message
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '🔍 Searching across multiple sources...',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const params = new URLSearchParams({
        q: query,
        type: 'all',
        sort: 'relevance',
        limit: '12',
      });

      const res = await fetch(`/api/search?${params}`);
      if (res.status === 429) {
        const errData = await res.json();
        if (errData.code === 'AUTH_REQUIRED') {
          setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessage.id));
          const authMsg: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            content: `You've used your 5 free searches. [Sign in](/auth?redirect=%2Fchat) to get unlimited access to our global research search.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, authMsg]);
          setIsLoading(false);
          return;
        }
      }
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      // Remove thinking message
      setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessage.id));

      if (data.results && data.results.length > 0) {
        const resultsMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'results',
          content: `Found ${data.total || data.results.length} results for "${query}"`,
          results: data.results,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, resultsMessage]);

        // Add assistant follow-up
        const followUp: Message = {
          id: (Date.now() + 3).toString(),
          type: 'assistant',
          content: `I found ${data.results.length} relevant resources. You can click on any result to open it, or save it to your workspace. Try asking me something else!`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, followUp]);
      } else {
        const noResultsMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: `I couldn't find any results for "${query}". Try rephrasing your search or being more specific. For example: "climate change research papers" or "machine learning datasets".`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, noResultsMessage]);
      }
    } catch (error) {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== thinkingMessage.id);
        return [
          ...filtered,
          {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            content: 'Sorry, I encountered an error while searching. Please try again.',
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const suggestions = [
    'Find research papers on climate change',
    'Search for machine learning datasets',
    'Show me open source code repositories',
    'Find AI models on Hugging Face',
    'Search for hardware projects',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5 text-gray-900" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
                  message.type === 'user'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-4 py-3 text-white'
                    : message.type === 'results'
                    ? 'bg-transparent'
                    : 'bg-gray-800/50 border border-gray-700/50 rounded-2xl px-4 py-3 text-gray-200'
                }`}
              >
                {message.type === 'results' && message.results ? (
                  <div className="space-y-4">
                    <p className="text-emerald-400 font-semibold mb-4">
                      {message.content}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {message.results.map((result, idx) => (
                        <div
                          key={result.id || idx}
                          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                              {result.source}
                            </span>
                            {result.type && (
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  result.type === 'paper'
                                    ? 'bg-blue-900/30 text-blue-200'
                                    : result.type === 'dataset'
                                    ? 'bg-yellow-900/30 text-yellow-200'
                                    : result.type === 'code'
                                    ? 'bg-purple-900/30 text-purple-200'
                                    : 'bg-gray-700 text-gray-300'
                                }`}
                              >
                                {result.type}
                              </span>
                            )}
                          </div>
                          <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                            {result.title}
                          </h3>
                          {result.description && (
                            <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition"
                            >
                              Open
                            </a>
                            <SaveToWorkspace result={result} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <span className="text-gray-900 font-bold text-sm">U</span>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-gray-900 animate-spin" />
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          {messages.length === 1 && (
            <div className="mt-8">
              <p className="text-gray-400 text-sm mb-4">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-300 hover:border-emerald-500/50 hover:text-emerald-400 transition"
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search for papers, code, datasets, models..."
                className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                disabled={isLoading}
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-xl hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Search across ArXiv, GitHub, Zenodo, OpenAlex, Hugging Face, and more
          </p>
        </div>
      </div>
    </div>
  );
}

