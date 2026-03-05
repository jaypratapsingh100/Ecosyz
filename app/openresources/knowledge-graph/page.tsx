'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import KnowledgeGraph from '../../components/KnowledgeGraph';

function KnowledgeGraphPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    // First try to get results from sessionStorage (faster)
    if (typeof window !== 'undefined') {
      const storedResults = sessionStorage.getItem('kg-results');
      const storedQuery = sessionStorage.getItem('kg-query');
      
      if (storedResults && storedQuery === q) {
        try {
          setResults(JSON.parse(storedResults));
          setLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse stored results:', e);
        }
      }
    }

    // Fallback to fetching if no stored results
    if (q) {
      fetch(`/api/search?q=${encodeURIComponent(q)}&type=all&limit=100`)
        .then(res => {
          if (res.status === 429) {
            return res.json().then(errData => {
              if (errData.code === 'AUTH_REQUIRED') { setAuthRequired(true); setLoading(false); }
              return { results: [] };
            });
          }
          return res.json();
        })
        .then(data => {
          const fetchedResults = Array.isArray(data.results) ? data.results : [];
          setResults(fetchedResults);
          // Store in sessionStorage for future use
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('kg-results', JSON.stringify(fetchedResults));
            sessionStorage.setItem('kg-query', q);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load results:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [q]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                Explore connections
              </h1>
              <p className="text-gray-400 text-sm md:text-base mb-1">
                A map of how your search results connect by topic, author, and source so you can spot clusters and key people fast.
              </p>
              {q && (
                <p className="text-gray-500 text-sm">
                  Search: <span className="text-white font-medium">{q}</span>
                </p>
              )}
            </div>
            <div className="flex sm:justify-end">
              <button
                onClick={() => router.back()}
                className="px-3 py-2 sm:px-4 rounded-lg bg-white/10 text-white text-sm sm:text-base hover:bg-white/15 transition-colors w-full sm:w-auto"
              >
                ← Back
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-[60vh] min-h-[320px]">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-emerald-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400">Loading connection map...</p>
                <p className="text-gray-500 text-sm mt-2">You&apos;ll see papers, topics, authors, and sources as nodes; lines show how they connect.</p>
              </div>
            </div>
          ) : authRequired ? (
            <div className="flex items-center justify-center h-[60vh] min-h-[320px]">
              <div className="p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#121f22] via-[#0c2321] to-[#0a1016] text-center space-y-4 max-w-md">
                <div className="text-4xl mb-2">&#128270;</div>
                <h3 className="text-2xl font-bold text-white">Free searches used up</h3>
                <p className="text-gray-300">
                  You&apos;ve used your 5 free searches. Sign in to get unlimited access.
                </p>
                <a
                  href="/auth?redirect=%2Fopenresources"
                  className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 text-gray-900 font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                >
                  Sign in to continue
                </a>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="h-[60vh] sm:h-[70vh] md:h-[calc(100vh-260px)] min-h-[360px] sm:min-h-[480px] md:min-h-[560px] rounded-xl overflow-y-auto md:overflow-hidden bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 border border-purple-500/30 shadow-2xl shadow-purple-500/20 backdrop-blur-xl">
              <KnowledgeGraph
                resources={results.map((r) => ({
                  id: r.id,
                  title: r.title,
                  type: (r.type as 'paper' | 'dataset' | 'code' | 'model' | 'hardware' | 'video') || 'paper',
                  source: (r.source || r.provider || 'unknown') as any,
                  url: r.url || '',
                  authors: r.authors || [],
                  tags: r.tags || [],
                  description: r.description,
                  year: r.year,
                  license: r.license,
                  meta: r.meta || {},
                }))}
                onSelect={(id, type) => {
                  const resource = results.find(r => r.id === id);
                  if (resource?.url) {
                    window.open(resource.url, '_blank');
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <p className="text-gray-400 text-lg mb-4">No results found</p>
                <button
                  onClick={() => router.push('/openresources')}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg transition-all"
                >
                  Go to Search
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function KnowledgeGraphPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-cyan-200">Loading...</div>
        </main>
      </div>
    }>
      <KnowledgeGraphPage />
    </Suspense>
  );
}
