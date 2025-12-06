'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LogoAnimation from '../components/LogoAnimation';

interface Resource {
  id: string;
  title: string;
  url?: string;
  type: string;
  provider: string;
  description?: string;
  authors?: string[];
  year?: number;
  tags?: string[];
  data?: any;
}

export default function DiscoverPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-cyan-200">Loading...</div>
        </main>
        <Footer />
      </div>
    }>
      <DiscoverPage />
    </Suspense>
  );
}

function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [showAnimation, setShowAnimation] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      performSearch(query);
      setChatMessages([{
        role: 'user',
        content: query
      }]);
    }
  }, [query]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const performSearch = async (searchText: string) => {
    if (!searchText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchText)}&type=all`);
      const data = await response.json();
      
      if (data.results) {
        setResources(data.results);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Found ${data.results.length} resources related to "${searchText}"`
        }]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error searching for resources.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    performSearch(userMessage);
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
  };

  if (showAnimation) {
    return <LogoAnimation onComplete={handleAnimationComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow flex overflow-hidden">
        {/* Left Panel - Chat Interface */}
        <div className="flex-1 flex flex-col border-r border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Chat</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <p>Start a conversation to discover resources</p>
              </div>
            )}
            
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/20 text-white border border-emerald-400/30'
                      : 'bg-gray-800/50 text-gray-200 border border-gray-700'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800/50 text-gray-200 border border-gray-700 rounded-lg p-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about resources..."
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel - Resources */}
        <div className="flex-1 flex flex-col border-l border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">
              Resources {resources.length > 0 && `(${resources.length})`}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {resources.length === 0 && !loading && (
              <div className="text-center text-gray-400 mt-8">
                <p>No resources found. Start a conversation to search.</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-emerald-400/50 transition cursor-pointer"
                  onClick={() => resource.url && window.open(resource.url, '_blank')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-semibold text-lg line-clamp-2">
                      {resource.title}
                    </h3>
                    <span className="ml-2 px-2 py-1 bg-emerald-400/20 text-emerald-400 text-xs rounded">
                      {resource.type}
                    </span>
                  </div>
                  
                  {resource.description && (
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                    {resource.provider && (
                      <span>Provider: {resource.provider}</span>
                    )}
                    {resource.year && (
                      <span>Year: {resource.year}</span>
                    )}
                  </div>
                  
                  {resource.authors && resource.authors.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                      Authors: {resource.authors.slice(0, 3).join(', ')}
                      {resource.authors.length > 3 && '...'}
                    </div>
                  )}
                  
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {resource.tags.slice(0, 5).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
