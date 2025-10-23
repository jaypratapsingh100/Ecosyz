'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, Loader2 } from 'lucide-react';
import { 
  Card, 
  Button, 
  Input, 
  Badge, 
  LoadingSpinner, 
  EmptyState, 
  Container, 
  PageHeader,
  Grid as GridLayout,
  DesignSystem 
} from '../components/ui/design-system';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  authors?: string[];
  year?: number;
  source: string;
  url: string;
  license?: string;
  tags?: string[];
  score?: number;
}

const RESOURCE_TYPES = [
  { label: 'All', value: 'all', count: 0 },
  { label: 'Papers', value: 'paper', count: 0 },
  { label: 'Code', value: 'code', count: 0 },
  { label: 'Datasets', value: 'dataset', count: 0 },
  { label: 'Models', value: 'model', count: 0 },
  { label: 'Hardware', value: 'hardware', count: 0 },
  { label: 'Videos', value: 'video', count: 0 },
];

export default function MinimalSearchPage() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const searchResources = useCallback(async (searchQuery: string, type: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: type,
        limit: '20'
      });

      const response = await fetch(`/api/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Failed to search resources. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchResources(query, selectedType);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (query.trim()) {
      searchResources(query, type);
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      paper: 'success',
      code: 'default',
      dataset: 'warning',
      model: 'default',
      hardware: 'default',
      video: 'default'
    };
    return colors[type as keyof typeof colors] || 'default';
  };

  const getSourceColor = (source: string) => {
    const colors = {
      github: 'success',
      arxiv: 'warning',
      zenodo: 'default',
      openalex: 'default',
      huggingface: 'default'
    };
    return colors[source as keyof typeof colors] || 'default';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Container className="py-8">
        {/* Header */}
        <PageHeader
          title="Discover Open Resources"
          subtitle="Search across papers, code, datasets, and more"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          }
        />

        {/* Search Form */}
        <Card className="mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search for papers, code, datasets..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="text-lg"
                />
              </div>
              <Button type="submit" disabled={isLoading || !query.trim()}>
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </Button>
            </div>

            {/* Resource Type Filters */}
            <div className="flex flex-wrap gap-2">
              {RESOURCE_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleTypeChange(type.value)}
                >
                  {type.label}
                  {type.count > 0 && (
                    <Badge variant="default" className="ml-2">
                      {type.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </form>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-500/20 bg-red-500/5">
            <p className="text-red-400">{error}</p>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-400 mt-4">Searching resources...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-400">
                Found {results.length} resources
              </p>
            </div>

            {viewMode === 'grid' ? (
              <GridLayout cols={3} gap="md">
                {results.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="h-full hover:bg-white/10 transition-all duration-200">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <Badge variant={getTypeColor(result.type) as any}>
                            {result.type}
                          </Badge>
                          <Badge variant={getSourceColor(result.source) as any}>
                            {result.source}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="font-semibold text-white mb-2 line-clamp-2">
                            {result.title}
                          </h3>
                          {result.description && (
                            <p className="text-gray-400 text-sm line-clamp-3">
                              {result.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            {result.authors && result.authors.length > 0 && (
                              <span>{result.authors[0]}</span>
                            )}
                            {result.year && <span>• {result.year}</span>}
                          </div>
                          {result.license && (
                            <Badge variant="default" className="text-xs">
                              {result.license}
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(result.url, '_blank')}
                            className="flex-1"
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </GridLayout>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <Badge variant={getTypeColor(result.type) as any}>
                            {result.type}
                          </Badge>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white mb-1">
                            {result.title}
                          </h3>
                          {result.description && (
                            <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{result.source}</span>
                            {result.authors && result.authors.length > 0 && (
                              <span>{result.authors[0]}</span>
                            )}
                            {result.year && <span>{result.year}</span>}
                            {result.license && <span>{result.license}</span>}
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(result.url, '_blank')}
                          >
                            View
                          </Button>
                          <Button variant="secondary" size="sm">
                            Save
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && query && (
          <EmptyState
            icon={<Search className="w-16 h-16 text-gray-400" />}
            title="No results found"
            description={`No resources found for "${query}". Try different keywords or browse all resources.`}
            action={
              <Button onClick={() => setQuery('')}>
                Clear Search
              </Button>
            }
          />
        )}

        {/* Initial State */}
        {!isLoading && results.length === 0 && !query && (
          <EmptyState
            icon={<Search className="w-16 h-16 text-gray-400" />}
            title="Start your search"
            description="Search across thousands of open resources including papers, code repositories, datasets, and more."
          />
        )}
      </Container>
    </div>
  );
}
