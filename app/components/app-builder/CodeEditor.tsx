'use client';

import { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface File {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
}

interface CodeEditorProps {
  file: File | null;
  projectId: string;
  onChange: (content: string) => void;
}

export default function CodeEditor({ file, projectId, onChange }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (file) {
      setContent(file.content);
    } else {
      setContent('');
    }
  }, [file]);

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    onChange(newContent);

    // Auto-save after 1 second of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveFile(newContent);
    }, 1000) as NodeJS.Timeout;
  };

  const saveFile = async (contentToSave: string) => {
    if (!file || !projectId) {
      console.warn('Cannot save: missing file or projectId', { file: !!file, projectId });
      return;
    }

    if (!file.id) {
      console.error('Cannot save: file.id is missing', { file });
      return;
    }

    setSaving(true);
    try {
      const url = `/api/app-projects/${projectId}/files/${file.id}`;
      console.log('Saving file:', {
        url,
        fileId: file.id,
        fileName: file.name,
        contentLength: contentToSave.length,
        projectId
      });
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: Include cookies for authentication
        body: JSON.stringify({ content: contentToSave }),
      });

      if (!res.ok) {
        let errorData: any = {};
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await res.json();
          } else {
            const textError = await res.text().catch(() => '');
            errorData = { error: textError || `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${res.status}: ${res.statusText || 'Unknown error'}` };
        }
        
        console.error('Save failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData.error || errorData.message || 'Unknown error',
          url
        });
        throw new Error(errorData.error || errorData.message || `Failed to save file (${res.status})`);
      }
      
      console.log('File saved successfully');
    } catch (error: any) {
      console.error('Failed to save file:', {
        error: error,
        message: error?.message,
        name: error?.name,
        file: file?.name,
        projectId,
        url: `/api/app-projects/${projectId}/files/${file?.id}`
      });
      
      // Check if it's a network error
      if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
        console.error('Network error - possible causes:', {
          serverDown: 'Check if server is running',
          cors: 'Check CORS configuration',
          auth: 'Check authentication cookies',
          url: `/api/app-projects/${projectId}/files/${file?.id}`
        });
      }
      
      // Don't show error to user for auto-save failures, just log
      // But log more details for debugging
      if (error.message && !error.message.includes('Failed to fetch')) {
        console.warn('Save error:', error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const getLanguage = () => {
    if (!file) return 'plaintext';
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
    };

    return file.language || langMap[ext || ''] || 'plaintext';
  };

  // Configure Monaco Editor when it mounts - enable validation and diagnostics
  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    // Enable validation and diagnostics for JavaScript/TypeScript
    const language = getLanguage();
    
    if (language === 'javascript' || language === 'typescript') {
      // Configure TypeScript/JavaScript compiler options
      monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        checkJs: true, // Enable type checking for JavaScript
        jsx: language === 'javascript' ? monacoInstance.languages.typescript.JsxEmit.React : undefined,
      });

      // Set diagnostics options - show errors and warnings
      monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false, // Enable semantic validation
        noSyntaxValidation: false,   // Enable syntax validation
        noSuggestionDiagnostics: false, // Show suggestion diagnostics
      });

      // Add extra library definitions if needed (React, etc.)
      // monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(...)
    }

    // For other languages, Monaco provides basic syntax validation automatically
    console.log('Monaco Editor mounted with validation enabled for:', language);
  };

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Select a file to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{file.name}</span>
          {saving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
        <div className="text-xs text-gray-500">{file.path}</div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage()}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            // Enable validation and error markers
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'allDocuments',
            // Show errors and warnings
            renderValidationDecorations: 'on',
            // Enable semantic highlighting
            'semanticHighlighting.enabled': true,
          }}
        />
      </div>
    </div>
  );
}

