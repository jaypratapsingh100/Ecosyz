'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatSettings, { getStoredApiKey, getStoredModel, getStoredProvider } from './ChatSettings';
import ResourceVisualizations from './ResourceVisualizations';

// Helper function to parse resource references from content
function parseResourceReferences(content: string, resources: any[]): { text: string; links: Array<{ index: number; resource: any }> } {
  const links: Array<{ index: number; resource: any }> = [];
  let processedText = content;
  
  // Match patterns like "Resource 1", "Resource #5", "resources 2-7"
  const resourcePattern = /Resource\s*(?:#)?\s*(\d+)/gi;
  const matches = [...content.matchAll(resourcePattern)];
  
  matches.forEach((match) => {
    const resourceIndex = parseInt(match[1]) - 1; // Convert to 0-based index
    if (resourceIndex >= 0 && resourceIndex < resources.length) {
      const resource = resources[resourceIndex];
      links.push({ index: resourceIndex, resource });
    }
  });
  
  return { text: processedText, links };
}

// Helper function to extract code blocks from content
function extractCodeBlocks(content: string): Array<{ code: string; language: string; index: number }> {
  const codeBlocks: Array<{ code: string; language: string; index: number }> = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let index = 0;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2],
      index: index++
    });
  }
  
  return codeBlocks;
}

// Helper function to detect and parse markdown tables
function extractTables(content: string): Array<{ rows: string[][]; index: number }> {
  const tables: Array<{ rows: string[][]; index: number }> = [];
  // Match markdown tables: | col1 | col2 | ... |
  const tableRegex = /(\|.+\|\n\|[-\s|:]+\|\n(?:\|.+\|\n?)+)/g;
  let match;
  let index = 0;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableText = match[1];
    const rows = tableText.split('\n').filter(row => row.trim().startsWith('|'));
    const parsedRows = rows.map(row => {
      // Remove leading/trailing | and split by |
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
      return cells;
    }).filter(row => row.length > 0);
    
    if (parsedRows.length > 1) { // At least header + separator
      tables.push({ rows: parsedRows, index: index++ });
    }
  }
  
  return tables;
}

// Helper function to detect structured comparison data (like Focus, Methodology, etc.)
function detectStructuredData(text: string): Array<{ headers: string[]; rows: string[][] }> | null {
  // Pattern: **Header**: "value1", "value2", "value3" or **Header**: value1, value2
  // This suggests a comparison table where each header is a row and values are columns
  const structuredPattern = /\*\*([^*]+)\*\*:\s*([^\n]+)/g;
  const matches = [...text.matchAll(structuredPattern)];
  
  if (matches.length < 2) return null;
  
  // Check if we have multiple bold headers in sequence (suggests structured comparison)
  const headerCount = matches.length;
  if (headerCount < 3) return null; // Need at least 3 headers to be meaningful
  
  // Extract headers and their values
  const rows: string[][] = [];
  const allValues: string[][] = [];
  let maxColumns = 0;
  
  matches.forEach(match => {
    const header = match[1].trim();
    const valueText = match[2].trim();
    
    // Split values by comma, handling quoted strings
    const values = valueText
      .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((v: string) => v.trim().replace(/^["']|["']$/g, ''))
      .filter(v => v.length > 0);
    
    if (values.length > 0) {
      rows.push([header, ...values]);
      allValues.push(values);
      maxColumns = Math.max(maxColumns, values.length);
    }
  });
  
  // Only create table if we have consistent structure (at least 2 columns)
  if (maxColumns < 2 || rows.length < 2) return null;
  
  // Create headers: first column is the attribute name, rest are Resource 1, Resource 2, etc.
  const headers = ['Attribute', ...Array.from({ length: maxColumns }, (_, i) => `Resource ${i + 1}`)];
  
  // Pad rows to have same number of columns
  const paddedRows = rows.map(row => {
    const padded = [...row];
    while (padded.length < headers.length) {
      padded.push('');
    }
    return padded.slice(0, headers.length);
  });
  
  return [{
    headers,
    rows: paddedRows
  }];
}

// Helper function to format citations in different academic styles
function formatCitation(resource: any, index: number, style: 'simple' | 'apa' | 'mla' | 'chicago' | 'bibtex'): string {
  const title = resource.title || 'Untitled';
  const authors = Array.isArray(resource.authors) ? resource.authors : (resource.author ? [resource.author] : []);
  const year = resource.year || 'n.d.';
  const url = resource.url || '';
  const type = resource.type || 'unknown';
  const source = resource.source || 'Unknown Source';
  
  // Helper to format author names
  const formatAuthorName = (author: string, format: 'apa' | 'mla' | 'chicago' = 'apa'): string => {
    const parts = author.trim().split(/\s+/);
    if (parts.length >= 2) {
      if (format === 'apa') {
        // APA: Last, F. M.
        const last = parts[parts.length - 1];
        const first = parts[0].charAt(0);
        const middle = parts.length > 2 ? parts[1].charAt(0) : '';
        return `${last}, ${first}.${middle ? ` ${middle}.` : ''}`;
      } else {
        // MLA/Chicago: First Last
        return author;
      }
    }
    return author;
  };
  
  switch (style) {
    case 'apa':
      // APA: Author, A. A. (Year). Title. Source. URL
      let apaAuthors: string;
      if (authors.length === 0) {
        apaAuthors = 'Anonymous';
      } else if (authors.length === 1) {
        apaAuthors = formatAuthorName(authors[0], 'apa');
      } else if (authors.length <= 3) {
        apaAuthors = authors.map((a: string) => formatAuthorName(a, 'apa')).join(', ');
      } else {
        apaAuthors = authors.slice(0, 3).map((a: string) => formatAuthorName(a, 'apa')).join(', ') + ' et al.';
      }
      const apaCitation = `${apaAuthors} (${year}). ${title}. ${source}${url ? `. Retrieved from ${url}` : '.'}`;
      return apaCitation;
    
    case 'mla':
      // MLA: Author. "Title." Source, Year, URL.
      let mlaAuthors: string;
      if (authors.length === 0) {
        mlaAuthors = 'Anonymous';
      } else if (authors.length === 1) {
        mlaAuthors = formatAuthorName(authors[0], 'mla');
      } else if (authors.length === 2) {
        mlaAuthors = authors.map((a: string) => formatAuthorName(a, 'mla')).join(' and ');
      } else {
        mlaAuthors = authors.slice(0, 2).map((a: string) => formatAuthorName(a, 'mla')).join(', ') + ', et al.';
      }
      return `${mlaAuthors}. "${title}." ${source}, ${year}${url ? `, ${url}` : '.'}`;
    
    case 'chicago':
      // Chicago: Author. "Title." Source, Year. URL.
      let chicagoAuthors: string;
      if (authors.length === 0) {
        chicagoAuthors = 'Anonymous';
      } else if (authors.length === 1) {
        chicagoAuthors = formatAuthorName(authors[0], 'chicago');
      } else if (authors.length <= 3) {
        chicagoAuthors = authors.map((a: string) => formatAuthorName(a, 'chicago')).join(', ');
      } else {
        chicagoAuthors = authors.slice(0, 3).map((a: string) => formatAuthorName(a, 'chicago')).join(', ') + ', et al.';
      }
      return `${chicagoAuthors}. "${title}." ${source}, ${year}. ${url || ''}`;
    
    case 'bibtex':
      // BibTeX format
      const bibtexType = type === 'paper' ? 'article' : 
                        type === 'code' ? 'misc' : 
                        type === 'dataset' ? 'dataset' : 'misc';
      const bibtexKey = `resource${index + 1}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      const bibtexAuthors = authors.length > 0 ? authors.join(' and ') : 'Anonymous';
      const bibtexTitle = title.replace(/[{}]/g, ''); // Remove braces that break BibTeX
      const bibtexSource = source.replace(/[{}]/g, '');
      return `@${bibtexType}{${bibtexKey},\n  author = {${bibtexAuthors}},\n  title = {${bibtexTitle}},\n  year = {${year}},\n  url = {${url}},\n  source = {${bibtexSource}}\n}`;
    
    case 'simple':
    default:
      return `[${index + 1}] ${title}${url ? ` - ${url}` : ''}`;
  }
}

// Helper function to calculate resource quality score
function calculateQualityScore(resource: any): number {
  let score = 0;
  
  // Base score
  score += 10;
  
  // Description quality (longer = better)
  if (resource.description && resource.description.length > 100) score += 10;
  if (resource.description && resource.description.length > 500) score += 10;
  
  // Authors (more authors = better)
  if (resource.authors && Array.isArray(resource.authors)) {
    score += Math.min(resource.authors.length * 2, 10);
  }
  
  // Tags (more tags = better)
  if (resource.tags && Array.isArray(resource.tags)) {
    score += Math.min(resource.tags.length, 10);
  }
  
  // Year (recent = better, but not too recent)
  if (resource.year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - resource.year;
    if (age >= 0 && age <= 5) score += 10;
    else if (age <= 10) score += 5;
  }
  
  // License (open source = better)
  if (resource.license) {
    const openLicenses = ['mit', 'apache', 'gpl', 'bsd', 'cc', 'open'];
    if (openLicenses.some(lic => resource.license.toLowerCase().includes(lic))) {
      score += 10;
    }
  }
  
  // URL (has URL = better)
  if (resource.url) score += 5;
  
  // Type-specific bonuses
  if (resource.type === 'paper') score += 5;
  if (resource.type === 'code' && resource.url) score += 5;
  
  return Math.min(score, 100); // Cap at 100
}

// Helper function to generate resource recommendations
function generateRecommendations(currentResources: any[], query: string): any[] {
  // Find similar resources based on tags, type, and source
  const recommendations: any[] = [];
  const seenUrls = new Set(currentResources.map((r: any) => r.url).filter(Boolean));
  
  // Group by type
  const byType: Record<string, any[]> = {};
  currentResources.forEach(r => {
    const type = r.type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(r);
  });
  
  // Find most common tags
  const tagCounts: Record<string, number> = {};
  currentResources.forEach(r => {
    if (r.tags && Array.isArray(r.tags)) {
      r.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
  
  // Score and recommend resources
  const scored = currentResources.map((r: any) => ({
    ...r,
    qualityScore: calculateQualityScore(r),
    relevanceScore: 0
  }));
  
  // Calculate relevance based on query and tags
  scored.forEach(r => {
    let relevance = 0;
    const titleLower = (r.title || '').toLowerCase();
    const descLower = (r.description || '').toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Title match
    if (titleLower.includes(queryLower)) relevance += 20;
    
    // Description match
    if (descLower.includes(queryLower)) relevance += 10;
    
    // Tag matches
    if (r.tags && Array.isArray(r.tags)) {
      r.tags.forEach((tag: string) => {
        if (topTags.includes(tag)) relevance += 5;
        if (tag.toLowerCase().includes(queryLower)) relevance += 10;
      });
    }
    
    r.relevanceScore = relevance;
  });
  
  // Sort by combined score
  scored.sort((a, b) => {
    const scoreA = a.qualityScore + a.relevanceScore;
    const scoreB = b.qualityScore + b.relevanceScore;
    return scoreB - scoreA;
  });
  
  return scored.slice(0, 5); // Top 5 recommendations
}

// Helper function to generate follow-up questions
function generateFollowUpQuestions(question: string, response: string, resources: any[]): string[] {
  const followUps: string[] = [];
  
  // Extract resource numbers mentioned in response
  const resourceMatches = response.match(/Resource\s*(?:#)?\s*(\d+)/gi);
  const mentionedResources = resourceMatches 
    ? [...new Set(resourceMatches.map((m: string) => {
        const numMatch = m.match(/\d+/);
        return parseInt(numMatch ? numMatch[0] : '0') - 1;
      }))]
    : [];
  
  if (mentionedResources.length > 0 && mentionedResources[0] < resources.length) {
    const resource = resources[mentionedResources[0]];
    followUps.push(`Tell me more about Resource ${mentionedResources[0] + 1}`);
    followUps.push(`What makes Resource ${mentionedResources[0] + 1} unique?`);
  }
  
  if (mentionedResources.length > 1) {
    followUps.push(`Compare Resource ${mentionedResources[0] + 1} and Resource ${mentionedResources[1] + 1}`);
  }
  
  // Generic follow-ups based on resources
  if (resources.length > 0) {
    if (!followUps.some(f => f.includes('beginner'))) {
      followUps.push(`Which resource is best for beginners?`);
    }
    if (!followUps.some(f => f.includes('code'))) {
      followUps.push(`Show me code examples from these resources`);
    }
  }
  
  return followUps.slice(0, 3); // Return top 3
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  options?: string[];
  followUps?: string[];
  resourceLinks?: Array<{ index: number; resource: any }>;
}

interface OpenResourcesChatProps {
  searchResults?: any[];
  searchQuery?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onChatSearch?: (query: string) => Promise<any[]>; // Return search results
  onFilterResources?: (filters: { type?: string; year?: number; license?: string; source?: string }) => void; // Filter resources
}

export default function OpenResourcesChat({ searchResults = [], searchQuery = '', isCollapsed: externalCollapsed, onToggleCollapse, onChatSearch, onFilterResources }: OpenResourcesChatProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setIsCollapsed = onToggleCollapse || setInternalCollapsed;
  const [previousQuery, setPreviousQuery] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: searchResults.length > 0 
        ? `Hello! I'm your Open Resources Assistant, powered by **DeepSeek Chat**. I have access to **all ${searchResults.length} resources** from your search. I can deeply analyze them, answer specific questions, compare resources, and provide comprehensive insights. Ask me anything about these resources!`
        : "Hello! I'm your Open Resources Assistant, powered by **DeepSeek Chat**. Search for resources on the main page, and I'll analyze all of them to help answer your questions with detailed references. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [citationStyle, setCitationStyle] = useState<'simple' | 'apa' | 'mla' | 'chicago' | 'bibtex'>('simple');
  const [citationMenuOpen, setCitationMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showVisualizations, setShowVisualizations] = useState(false);
  const [quickActions] = useState([
    "Compare top 3 resources",
    "Which is best for beginners?",
    "Show me code examples",
    "Create a learning path",
    "Summarize all resources",
    "Find similar resources",
    "What are the key differences?"
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const citationMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (citationMenuRef.current && !citationMenuRef.current.contains(event.target as Node)) {
        setCitationMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export chat functions
  const exportChatAsMarkdown = () => {
    let markdown = `# Chat Conversation - ${searchQuery || 'Open Resources'}\n\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**Resources:** ${searchResults.length}\n\n`;
    markdown += `---\n\n`;
    
    messages.forEach((msg) => {
      const role = msg.role === 'assistant' ? 'Assistant' : 'You';
      markdown += `## ${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `*${msg.timestamp.toLocaleString()}*\n\n`;
      markdown += `---\n\n`;
    });
    
    return markdown;
  };

  const exportChatAsText = () => {
    let text = `Chat Conversation - ${searchQuery || 'Open Resources'}\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += `Resources: ${searchResults.length}\n\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    messages.forEach((msg) => {
      const role = msg.role === 'assistant' ? 'Assistant' : 'You';
      text += `${role} (${msg.timestamp.toLocaleString()}):\n`;
      text += `${msg.content}\n\n`;
      text += `${'-'.repeat(50)}\n\n`;
    });
    
    return text;
  };

  const saveChatToLocalStorage = () => {
    const chatData = {
      id: Date.now().toString(),
      query: searchQuery,
      resourcesCount: searchResults.length,
      messages: messages,
      timestamp: new Date().toISOString(),
    };
    
    const savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');
    savedChats.push(chatData);
    // Keep only last 10 chats
    const recentChats = savedChats.slice(-10);
    localStorage.setItem('savedChats', JSON.stringify(recentChats));
    
    return chatData.id;
  };

  const downloadChat = (format: 'markdown' | 'text' | 'pdf') => {
    let content = '';
    let filename = '';
    let mimeType = '';
    
    if (format === 'markdown') {
      content = exportChatAsMarkdown();
      filename = `chat-${searchQuery || 'conversation'}-${Date.now()}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'text') {
      content = exportChatAsText();
      filename = `chat-${searchQuery || 'conversation'}-${Date.now()}.txt`;
      mimeType = 'text/plain';
    } else {
      // For PDF, we'll create HTML and let browser handle it
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Chat Export - ${searchQuery || 'Conversation'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #10b981; }
            h2 { color: #06b6d4; margin-top: 30px; }
            .message { margin: 20px 0; padding: 15px; border-left: 4px solid #10b981; background: #f3f4f6; }
            .timestamp { color: #6b7280; font-size: 12px; }
            pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
            code { background: #1f2937; color: #f9fafb; padding: 2px 6px; border-radius: 3px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #10b981; color: white; }
          </style>
        </head>
        <body>
          <h1>Chat Conversation</h1>
          <p><strong>Query:</strong> ${searchQuery || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Resources:</strong> ${searchResults.length}</p>
          <hr>
      `;
      
      messages.forEach((msg) => {
        const role = msg.role === 'assistant' ? 'Assistant' : 'You';
        html += `
          <div class="message">
            <h2>${role}</h2>
            <div>${msg.content.replace(/\n/g, '<br>').replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')}</div>
            <div class="timestamp">${msg.timestamp.toLocaleString()}</div>
          </div>
        `;
      });
      
      html += `</body></html>`;
      content = html;
      filename = `chat-${searchQuery || 'conversation'}-${Date.now()}.html`;
      mimeType = 'text/html';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (format === 'pdf') {
      // Open in new window for printing to PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  // Clear chat and update welcome message when search query changes
  useEffect(() => {
    // Check if this is a new search (query changed)
    if (searchQuery && searchQuery !== previousQuery) {
      // New search detected - clear chat history and reset
      setMessages([{
        id: '1',
        role: 'assistant',
        content: searchResults.length > 0
          ? `Hello! I've updated my context with **${searchResults.length} new resources** from your search for "${searchQuery}". I can deeply analyze them, answer specific questions, compare resources, identify the best ones for your needs, and provide comprehensive insights. Ask me anything about these resources!`
          : `Hello! I'm ready to help with your search for "${searchQuery}". Once results are loaded, I'll analyze them for you.`,
        timestamp: new Date(),
      }]);
      setPreviousQuery(searchQuery);
    } else if (searchQuery && previousQuery === '') {
      // First search - set the query and update message if results are available
      setPreviousQuery(searchQuery);
      if (searchResults.length > 0) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: `Hello! I'm your Open Resources Assistant, powered by **DeepSeek Chat**. I have access to **all ${searchResults.length} resources** from your search for "${searchQuery}". I can deeply analyze them, answer specific questions, compare resources, identify the best ones for your needs, and provide comprehensive insights. Ask me anything about these resources!`,
          timestamp: new Date(),
        }]);
      }
    } else if (searchResults.length > 0 && messages.length === 1 && messages[0].id === '1' && searchQuery === previousQuery) {
      // Same query but results updated - just update the welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your Open Resources Assistant, powered by **DeepSeek Chat**. I have access to **all ${searchResults.length} resources** from your search for "${searchQuery}". I can deeply analyze them, answer specific questions, compare resources, identify the best ones for your needs, and provide comprehensive insights. Ask me anything about these resources!`,
        timestamp: new Date(),
      }]);
    }
  }, [searchResults.length, searchQuery, previousQuery]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

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
      // Detect filter commands
      const filterCommands = [
        { pattern: /show (?:me )?(?:only )?(?:resources? )?(?:with|from|that have|using) (.+)/i, type: 'filter' },
        { pattern: /filter (?:by )?(.+)/i, type: 'filter' },
        { pattern: /(?:only|just) (.+) (?:resources?|papers?|code|datasets?)/i, type: 'filter' },
      ];
      
      let detectedFilter: { type?: string; year?: number; license?: string; source?: string } = {};
      
      // Check for filter commands
      for (const cmd of filterCommands) {
        const match = currentInput.match(cmd.pattern);
        if (match) {
          const filterText = match[1].toLowerCase();
          
          // Detect type filters
          if (filterText.includes('paper') || filterText.includes('research')) {
            detectedFilter = { ...detectedFilter, type: 'paper' };
          } else if (filterText.includes('code') || filterText.includes('repository')) {
            detectedFilter = { ...detectedFilter, type: 'code' };
          } else if (filterText.includes('dataset')) {
            detectedFilter = { ...detectedFilter, type: 'dataset' };
          } else if (filterText.includes('model')) {
            detectedFilter = { ...detectedFilter, type: 'model' };
          }
          
          // Detect year filters
          const yearMatch = filterText.match(/(\d{4})/);
          if (yearMatch) {
            detectedFilter = { ...detectedFilter, year: parseInt(yearMatch[1]) };
          }
          
          // Detect license filters
          if (filterText.includes('open source') || filterText.includes('mit') || filterText.includes('apache')) {
            detectedFilter = { ...detectedFilter, license: 'open' };
          }
          
          // Apply filter if detected
          if (Object.keys(detectedFilter).length > 0 && onFilterResources) {
            onFilterResources(detectedFilter);
          }
        }
      }

      // Get user's API key, model, and provider from localStorage
      const userApiKey = getStoredApiKey();
      const userModel = getStoredModel();
      const userProvider = getStoredProvider();

      // Always use the search results from the main page as context
      // Send ALL resources for comprehensive analysis (not limited to 20)
      const resourcesToAnalyze = searchResults || [];
      
      // Prepare detailed resource information for DeepSeek analysis
      // Send ALL available resources for comprehensive context
      const detailedResults = resourcesToAnalyze.map((r: any) => ({
        title: r.title || r.name || 'Untitled',
        type: r.type || 'unknown',
        source: r.source || 'unknown',
        description: r.description || r.summary || '',
        authors: Array.isArray(r.authors) ? r.authors : (r.author ? [r.author] : []),
        tags: Array.isArray(r.tags) ? r.tags : [],
        url: r.url || r.link || '',
        year: r.year || null,
        license: r.license || null,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          apiKey: userApiKey, // Send user's API key if available
          model: userModel,
          provider: userProvider, // Send user's provider preference
          context: {
            searchQuery: searchQuery || currentInput,
            resultsCount: resourcesToAnalyze.length,
            results: detailedResults,
            hasContext: resourcesToAnalyze.length > 0, // Indicate if we have search context
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Generate follow-up questions based on response and resources
        const followUps = generateFollowUpQuestions(currentInput, data.response, resourcesToAnalyze);
        
        // Parse resource links from response
        const resourceLinks = parseResourceReferences(data.response, resourcesToAnalyze).links;
        
        // Generate recommendations if user asks for suggestions
        let recommendations: any[] = [];
        if (currentInput.toLowerCase().includes('recommend') || 
            currentInput.toLowerCase().includes('suggest') ||
            currentInput.toLowerCase().includes('similar') ||
            currentInput.toLowerCase().includes('best')) {
          recommendations = generateRecommendations(resourcesToAnalyze, searchQuery);
        }
        
        // Add quality scores to resource links
        const enhancedResourceLinks = resourceLinks.map(link => ({
          ...link,
          qualityScore: calculateQualityScore(link.resource)
        }));
        
        let enhancedContent = data.response || `I understand you're asking about "${currentInput}". I can help you explore open resources, understand research papers, datasets, code repositories, and more. How can I assist you?`;
        
        // Add recommendations to content if available
        if (recommendations.length > 0) {
          enhancedContent += `\n\n**💡 Top Recommendations:**\n`;
          recommendations.forEach((rec, idx) => {
            const resourceIndex = resourcesToAnalyze.findIndex(r => r.url === rec.url);
            enhancedContent += `${idx + 1}. **Resource ${resourceIndex + 1}**: ${rec.title} (Quality Score: ${rec.qualityScore}/100)\n`;
          });
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: enhancedContent,
          timestamp: new Date(),
          followUps: followUps.length > 0 ? followUps : undefined,
          resourceLinks: enhancedResourceLinks.length > 0 ? enhancedResourceLinks : undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        let errorMessage = 'Failed to get response';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          
          // Add details if available
          if (errorData.details) {
            errorMessage += `\n\nDetails: ${JSON.stringify(errorData.details)}`;
          }
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = `I apologize, but I encountered an error processing your question about "${currentInput}".`;
      
      // Handle specific error types
      const errorMsg = error?.message || '';
      
      if (errorMsg.includes('Credit limit') || errorMsg.includes('requires more credits') || errorMsg.includes('can only afford') || errorMsg.includes('Insufficient Credits') || errorMsg.includes('negative balance') || errorMsg.includes('insufficient')) {
        errorMessage = `⚠️ **Insufficient Credits**: Your OpenRouter account needs credits to continue.\n\n`;
        errorMessage += `**Current Issue:** ${errorMsg.includes('negative') ? 'Negative balance detected' : 'Credit limit reached'}\n\n`;
        errorMessage += `**To Fix:**\n`;
        errorMessage += `1. Go to: https://openrouter.ai/settings/credits\n`;
        errorMessage += `2. Click "Add Credits" button\n`;
        errorMessage += `3. Add credits to your account\n`;
        errorMessage += `4. Try your request again\n\n`;
        errorMessage += `💡 **Quick Link:** [Add Credits Now](https://openrouter.ai/settings/credits)\n\n`;
        errorMessage += `${searchResults.length > 0 ? `I have access to ${searchResults.length} resources and I'm ready to analyze them once credits are added. ` : ''}`;
      } else if (errorMsg.includes('API key') || errorMsg.includes('authentication') || errorMsg.includes('Invalid API key') || errorMsg.includes('401')) {
        errorMessage = `🔑 **API Key Error**: ${errorMsg || 'Please check your API key settings (⚙️ icon). Make sure OPENROUTER_API_KEY is configured for DeepSeek Chat.'}`;
      } else if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
        errorMessage = `⏱️ **Rate Limit Exceeded**: ${errorMsg || 'Too many requests. Please try again in a few moments.'}\n\n💡 **Check your OpenRouter limits:** https://openrouter.ai/settings/credits\n💡 **Free tier:** ~10 requests/minute\n💡 **Upgrade for higher limits:** https://openrouter.ai/settings/credits`;
      } else if (errorMsg.includes('HTTP 500') || errorMsg.includes('Internal Server Error')) {
        errorMessage = `🔧 **Server Error**: ${errorMsg || 'An internal error occurred. Please try again later.'}`;
      } else {
        errorMessage = `❌ **Error**: ${errorMsg || 'An unexpected error occurred.'}\n\n${searchResults.length > 0 ? `I have access to ${searchResults.length} resources and I'm ready to analyze them. ` : ''}Please try again, or check your API key settings (⚙️ icon). Make sure OPENROUTER_API_KEY is configured for DeepSeek Chat.`;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: option,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Great choice! I can help you find ${option.toLowerCase()} resources. What specific ${option.toLowerCase()} are you looking for?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  return (
    <div className="relative h-full w-full bg-[#0a0a0a] md:bg-transparent">
      <div className={`h-full w-full flex flex-col transition-all duration-300 ${isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
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
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm">Open Resources Assistant</h3>
              <p className="text-xs text-gray-400">Always here to help</p>
            </div>
            <div className="flex items-center gap-1">
              {/* Export Chat Button */}
              {messages.length > 1 && (
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Export chat"
                    title="Export Chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  
                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          saveChatToLocalStorage();
                          setExportMenuOpen(false);
                          // Show toast notification
                          alert('Chat saved to local storage!');
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors text-gray-300"
                      >
                        💾 Save Chat
                      </button>
                      <button
                        onClick={() => {
                          downloadChat('markdown');
                          setExportMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors text-gray-300"
                      >
                        📄 Export as Markdown
                      </button>
                      <button
                        onClick={() => {
                          downloadChat('text');
                          setExportMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors text-gray-300"
                      >
                        📝 Export as Text
                      </button>
                      <button
                        onClick={() => {
                          downloadChat('pdf');
                          setExportMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors text-gray-300"
                      >
                        📑 Export as PDF
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Export All Citations Button */}
              {messages.some(m => m.resourceLinks && m.resourceLinks.length > 0) && (
                <button
                  onClick={() => {
                    // Collect all citations from all messages
                    const allCitations: Array<{ index: number; resource: any }> = [];
                    messages.forEach(msg => {
                      if (msg.resourceLinks) {
                        msg.resourceLinks.forEach(link => {
                          // Avoid duplicates
                          if (!allCitations.find(c => c.resource.url === link.resource.url)) {
                            allCitations.push(link);
                          }
                        });
                      }
                    });
                    
                    if (allCitations.length > 0) {
                      const citations = allCitations
                        .map(({ index, resource }, i) => formatCitation(resource, i, citationStyle))
                        .join(citationStyle === 'bibtex' ? '\n\n' : '\n');
                      
                      const blob = new Blob([citations], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `all-citations-${citationStyle}-${Date.now()}.${citationStyle === 'bibtex' ? 'bib' : 'txt'}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Export all citations"
                  title="Export All Citations"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
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
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Collapse chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      {/* Visualizations Toggle */}
      {searchResults.length > 0 && (
        <div className="px-4 py-2 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setShowVisualizations(!showVisualizations)}
            className="w-full px-3 py-2 text-xs bg-gray-800/60 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors border border-gray-700/50 hover:border-emerald-500/50 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Resource Statistics & Visualizations
            </span>
            <svg className={`w-4 h-4 transition-transform ${showVisualizations ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Visualizations Panel */}
      {showVisualizations && searchResults.length > 0 && (
        <div className="px-4 py-4 border-b border-white/10 max-h-64 overflow-y-auto">
          <ResourceVisualizations resources={searchResults} />
        </div>
      )}

      {/* Messages Container - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6 hide-scrollbar">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' ? (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
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
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm mb-1">Assistant</div>
                  
                  {/* Render content with resource links, code blocks, and tables */}
                  <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {(() => {
                      let content = message.content;
                      const codeBlocks = extractCodeBlocks(content);
                      const tables = extractTables(content);
                      const structuredData = detectStructuredData(content);
                      
                      // Replace code blocks with placeholders
                      codeBlocks.forEach((block, idx) => {
                        content = content.replace(
                          `\`\`\`${block.language}\n${block.code}\`\`\``,
                          `__CODE_BLOCK_${idx}__`
                        );
                      });
                      
                      // Replace markdown tables with placeholders
                      tables.forEach((table, idx) => {
                        const tableText = table.rows.map(row => `|${row.join('|')}|`).join('\n');
                        content = content.replace(tableText, `__TABLE_${idx}__`);
                      });
                      
                      // Replace structured data with placeholders
                      if (structuredData && structuredData.length > 0) {
                        structuredData.forEach((data, idx) => {
                          // Find the section that matches our structured pattern
                          // Look for the first **Header**: pattern
                          const firstMatch = content.match(/\*\*([^*]+)\*\*:\s*[^\n]+/);
                          if (firstMatch && firstMatch.index !== undefined) {
                            const placeholder = `__STRUCTURED_TABLE_${idx}__`;
                            // Find a section that contains multiple **Header**: patterns
                            let sectionStart = firstMatch.index;
                            let sectionEnd = content.length;
                            
                            // Look for the end of the structured section (double newline or end of multiple patterns)
                            const structuredSectionRegex = /(\*\*[^*]+\*\*:\s*[^\n]+\n?)+/g;
                            const sectionMatch = structuredSectionRegex.exec(content.substring(sectionStart));
                            if (sectionMatch) {
                              sectionEnd = sectionStart + sectionMatch[0].length;
                              content = content.substring(0, sectionStart) + placeholder + content.substring(sectionEnd);
                            }
                          }
                        });
                      }
                      
                      // Split by code block and table placeholders
                      const parts = content.split(/(__CODE_BLOCK_\d+__|__TABLE_\d+__|__STRUCTURED_TABLE_\d+__)/);
                      
                      return (
                        <>
                          {parts.map((part, idx) => {
                            const codeMatch = part.match(/__CODE_BLOCK_(\d+)__/);
                            if (codeMatch) {
                              const blockIdx = parseInt(codeMatch[1]);
                              const block = codeBlocks[blockIdx];
                              return (
                                <div key={idx} className="my-3 relative group">
                                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto border border-gray-700">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-gray-400 font-mono">{block.language}</span>
                                      <button
                                        onClick={(e) => {
                                          navigator.clipboard.writeText(block.code);
                                          // Visual feedback
                                          const btn = e.currentTarget;
                                          const originalText = btn.textContent;
                                          btn.textContent = '✓ Copied';
                                          setTimeout(() => {
                                            btn.textContent = originalText;
                                          }, 2000);
                                        }}
                                        className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                      >
                                        📋 Copy
                                      </button>
                                    </div>
                                    <pre className="text-sm text-gray-200 overflow-x-auto">
                                      <code>{block.code}</code>
                                    </pre>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Check for markdown table
                            const tableMatch = part.match(/__TABLE_(\d+)__/);
                            if (tableMatch) {
                              const tableIdx = parseInt(tableMatch[1]);
                              const table = tables[tableIdx];
                              if (table && table.rows.length > 1) {
                                const headers = table.rows[0];
                                const dataRows = table.rows.slice(1);
                                // Skip separator row if it exists
                                const actualDataRows = dataRows.filter(row => 
                                  !row.every(cell => cell.match(/^[-:|\s]+$/))
                                );
                                
                                return (
                                  <div key={idx} className="my-4 overflow-x-auto">
                                    <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                                      <table className="w-full border-collapse">
                                        <thead>
                                          <tr className="bg-gray-800/50">
                                            {headers.map((header, hIdx) => (
                                              <th
                                                key={hIdx}
                                                className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wider border-b border-gray-700"
                                              >
                                                {header}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {actualDataRows.map((row, rIdx) => (
                                            <tr
                                              key={rIdx}
                                              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                                            >
                                              {row.map((cell, cIdx) => (
                                                <td
                                                  key={cIdx}
                                                  className="px-4 py-3 text-sm text-gray-200"
                                                >
                                                  {cell}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              }
                            }
                            
                            // Check for structured data table
                            const structuredMatch = part.match(/__STRUCTURED_TABLE_(\d+)__/);
                            if (structuredMatch && structuredData) {
                              const structIdx = parseInt(structuredMatch[1]);
                              const data = structuredData[structIdx];
                              if (data && data.rows.length > 0) {
                                return (
                                  <div key={idx} className="my-4 overflow-x-auto">
                                    <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                                      <table className="w-full border-collapse">
                                        <thead>
                                          <tr className="bg-gray-800/50">
                                            {data.headers.map((header, hIdx) => (
                                              <th
                                                key={hIdx}
                                                className="px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wider border-b border-gray-700"
                                              >
                                                {header}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {data.rows.map((row, rIdx) => (
                                            <tr
                                              key={rIdx}
                                              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                                            >
                                              {row.map((cell, cIdx) => (
                                                <td
                                                  key={cIdx}
                                                  className="px-4 py-3 text-sm text-gray-200"
                                                >
                                                  {cell}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              }
                            }
                            
                            // Render text with resource links
                            const resourcePattern = /Resource\s*(?:#)?\s*(\d+)/gi;
                            const textParts: (string | React.ReactElement)[] = [];
                            let lastIndex = 0;
                            let match;
                            let linkCounter = 0; // Counter to ensure unique keys
                            
                            while ((match = resourcePattern.exec(part)) !== null) {
                              // Add text before match
                              if (match.index > lastIndex) {
                                textParts.push(part.substring(lastIndex, match.index));
                              }
                              
                              // Add clickable resource link
                              const resourceIndex = parseInt(match[1]) - 1;
                              if (resourceIndex >= 0 && resourceIndex < searchResults.length) {
                                const uniqueKey = `resource-${resourceIndex}-${idx}-${linkCounter++}`;
                                textParts.push(
                                  <button
                                    key={uniqueKey}
                                    onClick={() => {
                                      // Scroll to resource card
                                      const resourceCard = document.getElementById(`resource-card-${resourceIndex}`);
                                      if (resourceCard) {
                                        resourceCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Highlight briefly
                                        resourceCard.classList.add('ring-2', 'ring-emerald-500', 'ring-opacity-75');
                                        setTimeout(() => {
                                          resourceCard.classList.remove('ring-2', 'ring-emerald-500', 'ring-opacity-75');
                                        }, 2000);
                                      }
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer font-semibold transition-colors"
                                    title={`View Resource ${resourceIndex + 1}: ${searchResults[resourceIndex]?.title || 'Untitled'}`}
                                  >
                                    {match[0]}
                                  </button>
                                );
                              } else {
                                textParts.push(match[0]);
                              }
                              
                              lastIndex = match.index + match[0].length;
                            }
                            
                            // Add remaining text
                            if (lastIndex < part.length) {
                              textParts.push(part.substring(lastIndex));
                            }
                            
                            return <span key={idx}>{textParts.length > 0 ? textParts : part}</span>;
                          })}
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Quality Scores */}
                  {message.resourceLinks && message.resourceLinks.length > 0 && message.resourceLinks.some(link => (link as any).qualityScore) && (
                    <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                      <div className="text-xs text-gray-400 font-medium mb-2">⭐ Quality Scores:</div>
                      <div className="space-y-1">
                        {message.resourceLinks.slice(0, 3).map((link, idx) => {
                          const qualityScore = (link as any).qualityScore;
                          if (!qualityScore) return null;
                          return (
                            <div key={`quality-${link.index}-${idx}`} className="flex items-center justify-between text-xs">
                              <span className="text-gray-300">Resource {link.index + 1}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ${
                                      qualityScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                      qualityScore >= 60 ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' :
                                      'bg-gradient-to-r from-yellow-500 to-yellow-400'
                                    }`}
                                    style={{ width: `${qualityScore}%` }}
                                  />
                                </div>
                                <span className="text-gray-400 w-8 text-right">{qualityScore}/100</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Citations Section */}
                  {message.resourceLinks && message.resourceLinks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          📚 {message.resourceLinks.length} {message.resourceLinks.length === 1 ? 'Citation' : 'Citations'}
                        </span>
                        <div className="relative" ref={citationMenuRef}>
                          <button
                            onClick={() => setCitationMenuOpen(!citationMenuOpen)}
                            className="text-xs px-2 py-1 bg-gray-800/60 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors border border-gray-700/50 hover:border-emerald-500/50 flex items-center gap-1"
                          >
                            {citationStyle.toUpperCase()}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {citationMenuOpen && (
                            <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                              {(['simple', 'apa', 'mla', 'chicago', 'bibtex'] as const).map((style) => (
                                <button
                                  key={style}
                                  onClick={() => {
                                    setCitationStyle(style);
                                    setCitationMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors ${
                                    citationStyle === style ? 'bg-emerald-900/30 text-emerald-300' : 'text-gray-300'
                                  }`}
                                >
                                  {style.charAt(0).toUpperCase() + style.slice(1)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            const citations = message.resourceLinks!
                              .map(({ index, resource }) => formatCitation(resource, index, citationStyle))
                              .join(citationStyle === 'bibtex' ? '\n\n' : '\n');
                            navigator.clipboard.writeText(citations);
                            // Visual feedback
                            const btn = e.currentTarget;
                            const originalText = btn.textContent;
                            btn.textContent = '✓ Copied!';
                            setTimeout(() => {
                              btn.textContent = originalText;
                            }, 2000);
                          }}
                          className="px-3 py-1.5 text-xs bg-emerald-900/30 hover:bg-emerald-900/50 rounded-lg text-emerald-300 hover:text-emerald-200 transition-colors border border-emerald-700/50 hover:border-emerald-500/50 flex items-center gap-1"
                        >
                          📋 Copy {citationStyle === 'bibtex' ? 'BibTeX' : 'Citations'}
                        </button>
                        
                        <button
                          onClick={() => {
                            const citations = message.resourceLinks!
                              .map(({ index, resource }) => formatCitation(resource, index, citationStyle))
                              .join(citationStyle === 'bibtex' ? '\n\n' : '\n');
                            
                            // Create downloadable file
                            const blob = new Blob([citations], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `citations-${citationStyle}-${Date.now()}.${citationStyle === 'bibtex' ? 'bib' : 'txt'}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-800/60 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700/50 hover:border-emerald-500/50 flex items-center gap-1"
                        >
                          💾 Download
                        </button>
                      </div>
                      
                      {/* Preview citations */}
                      <div className="mt-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 max-h-32 overflow-y-auto">
                        <div className="text-xs text-gray-400 space-y-1">
                          {message.resourceLinks.slice(0, 2).map(({ index, resource }, previewIdx) => (
                            <div key={`${message.id}-citation-${index}-${previewIdx}`} className="text-gray-300 font-mono text-[10px] leading-relaxed">
                              {formatCitation(resource, index, citationStyle).substring(0, 100)}
                              {formatCitation(resource, index, citationStyle).length > 100 ? '...' : ''}
                            </div>
                          ))}
                          {message.resourceLinks.length > 2 && (
                            <div key={`${message.id}-more-citations`} className="text-gray-500 text-[10px]">
                              +{message.resourceLinks.length - 2} more citations
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Follow-up Questions */}
                  {message.followUps && message.followUps.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-gray-400 mb-2 font-medium">💡 Follow-up questions:</p>
                      {message.followUps.map((followUp, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInputValue(followUp);
                            inputRef.current?.focus();
                            // Auto-scroll to input
                            setTimeout(() => {
                              inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }, 100);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg border border-gray-700 hover:border-emerald-500/50 cursor-pointer transition-colors bg-gray-800/30 hover:bg-gray-800/60 text-sm text-gray-300 hover:text-white"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {message.options && (
                    <div className="mt-3 space-y-2">
                      {message.options.map((option, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-emerald-500/50 cursor-pointer transition-colors bg-gray-800/50"
                        >
                          <input
                            type="radio"
                            name="option"
                            value={option}
                            checked={selectedOption === option}
                            onChange={() => handleOptionSelect(option)}
                            className="w-4 h-4 text-emerald-400 border-gray-600 focus:ring-emerald-400 focus:ring-2"
                          />
                          <span className={`text-sm ${selectedOption === option ? 'text-white' : 'text-gray-300'}`}>
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {message.timestamp.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
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
            <div className="flex-1">
              <div className="text-white font-semibold text-sm mb-1">Assistant</div>
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

      {/* Quick Actions */}
      {searchResults.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2 border-b border-white/10">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => {
                setInputValue(action);
                inputRef.current?.focus();
              }}
              className="px-3 py-1.5 text-xs bg-gray-800/60 hover:bg-gray-700/80 rounded-full text-gray-300 hover:text-white transition-colors border border-gray-700/50 hover:border-emerald-500/50 whitespace-nowrap"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <form onSubmit={handleSend} className="relative">
          <div className="flex items-center gap-0 w-full">
            {/* Input Field */}
            <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-l-full border border-gray-500/30 focus-within:border-gray-400/50 transition-all px-4 py-3.5">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
            {/* Search Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 rounded-r-full border border-l-0 border-gray-500/30 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              aria-label="Send message"
            >
              <span>Search</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
      </div>

      {/* Settings Modal */}
      <ChatSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

