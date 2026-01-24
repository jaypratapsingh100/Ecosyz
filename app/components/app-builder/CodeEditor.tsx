'use client';

import { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { validateJSXCode } from '../../../src/lib/utils/validateJSX';

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
  files?: File[];
  onFileSelect?: (file: File) => void;
}

export default function CodeEditor({ file, projectId, onChange, files = [], onFileSelect }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [fileErrors, setFileErrors] = useState<Map<string, { errors: string[], details: any[] }>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);
  const fileSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      // Validate on file load
      validateContent(file.content, file.path);
    } else {
      setContent('');
      setValidationErrors([]);
    }
  }, [file]);

  // Close file selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileSelectorRef.current && !fileSelectorRef.current.contains(event.target as Node)) {
        setShowFileSelector(false);
      }
    };

    if (showFileSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileSelector]);

  // Auto-expand all paths when file selector opens
  useEffect(() => {
    if (showFileSelector && files.length > 0) {
      const paths = new Set<string>();
      files.forEach((f) => {
        const parts = f.path.split('/');
        let currentPath = '';
        parts.slice(0, -1).forEach((part) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          paths.add(currentPath);
        });
      });
      setExpandedPaths(paths);
    }
  }, [showFileSelector, files]);

  // Validate all files when files prop changes
  useEffect(() => {
    const errorsMap = new Map<string, { errors: string[], details: any[] }>();
    
    files.forEach((f) => {
      // Only validate JSX/JS files
      if (f.path.match(/\.(jsx?|tsx?)$/)) {
        const result = validateJSXCode(f.content, f.path);
        if (result.errors.length > 0) {
          errorsMap.set(f.id, {
            errors: result.errors.map(e => e.message),
            details: result.errors
          });
        }
      }
    });
    
    setFileErrors(errorsMap);
  }, [files]);

  const validateContent = (code: string, filename: string) => {
    // Only validate JSX/JS files
    if (!filename.match(/\.(jsx?|tsx?)$/)) {
      setValidationErrors([]);
      return;
    }

    const result = validateJSXCode(code, filename);
    const errors = result.errors.map(e => e.message);
    setValidationErrors(errors);

    // Show markers in editor if available - use Warning severity to reduce alarm
    if (editorRef.current && result.errors.length > 0) {
      const monaco = editorRef.current.monaco;
      const model = editorRef.current.getModel();
      if (model && monaco) {
        const markers = result.errors.map(error => ({
          severity: monaco.MarkerSeverity.Warning, // Use Warning instead of Error - less alarming
          startLineNumber: error.line || 1,
          startColumn: 1,
          endLineNumber: error.line || 1,
          endColumn: 1000,
          message: error.message + (error.suggestion ? `\n💡 ${error.suggestion}` : ''),
        }));
        monaco.editor.setModelMarkers(model, 'jsx-validator', markers);
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    onChange(newContent);

    // Validate on change
    if (file) {
      validateContent(newContent, file.path);
    }

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

  const buildFileTree = () => {
    const tree: Record<string, any> = {};

    files.forEach((f) => {
      const parts = f.path.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = f;
        } else {
          // Folder
          if (!current[part]) {
            current[part] = { type: 'folder', children: {} };
          }
          current = current[part].children;
        }
      });
    });

    return tree;
  };

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const res = await fetch(`/api/app-projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        // Trigger refresh event
        window.dispatchEvent(new CustomEvent('files-updated', { 
          detail: { projectId } 
        }));
        setShowFileSelector(false);
      } else {
        alert('Failed to delete file. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const renderTree = (tree: Record<string, any>, path = ''): React.ReactElement[] => {
    const items: React.ReactElement[] = [];

    Object.entries(tree).forEach(([name, item]) => {
      const currentPath = path ? `${path}/${name}` : name;

      if (item.type === 'folder') {
        const isExpanded = expandedPaths.has(currentPath);
        items.push(
          <div key={currentPath}>
            <div
              className="flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:text-white cursor-pointer text-sm rounded hover:bg-white/5"
              onClick={() => toggleFolder(currentPath)}
            >
              <svg
                className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="truncate">{name}</span>
            </div>
            {isExpanded && (
              <div className="ml-4">
                {renderTree(item.children, currentPath)}
              </div>
            )}
          </div>
        );
      } else {
        // File
        const isSelected = file?.id === item.id;
        const fileErrorInfo = fileErrors.get(item.id);
        const hasErrors = fileErrorInfo && fileErrorInfo.errors.length > 0;
        
        items.push(
          <div
            key={item.id}
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm group rounded relative ${
              isSelected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => {
              if (onFileSelect) {
                onFileSelect(item);
                setShowFileSelector(false);
              }
            }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="flex-1 truncate">{name}</span>
            {hasErrors && (
              <div className="relative group/error">
                <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fileErrorInfo!.errors.length}
                </span>
                {/* Error Tooltip */}
                <div className="absolute right-0 top-full mt-1 w-64 bg-[#1e1e1e] border border-red-500/30 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover/error:opacity-100 group-hover/error:visible transition-all pointer-events-none">
                  <div className="p-2">
                    <div className="text-xs font-semibold text-red-400 mb-1">Validation Errors:</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {fileErrorInfo!.errors.map((error, idx) => (
                        <div key={idx} className="text-xs text-gray-300 bg-red-500/5 border border-red-500/20 rounded px-2 py-1">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={(e) => handleDeleteFile(item.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
              title="Delete file"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      }
    });

    return items;
  };

  // Configure Monaco Editor when it mounts - reduce false positives for user-generated code
  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    const language = getLanguage();
    
    if (language === 'javascript' || language === 'typescript') {
      // Configure TypeScript/JavaScript compiler options - less strict for user code
      monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        checkJs: false, // Disable type checking - reduces false positives for user code
        jsx: language === 'javascript' ? monacoInstance.languages.typescript.JsxEmit.React : undefined,
        allowJs: true,
        skipLibCheck: true, // Skip checking declaration files
      });

      // Set diagnostics options - disable semantic validation to reduce noise
      monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true, // Disable semantic validation - reduces "undefined component" errors
        noSyntaxValidation: false,   // Keep syntax validation - catches real syntax errors
        noSuggestionDiagnostics: true, // Disable suggestion diagnostics - reduces noise
      });

      // Add extra library definitions if needed (React, etc.)
      // monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(...)
    }

    // For other languages, Monaco provides basic syntax validation automatically
    console.log('Monaco Editor mounted with relaxed validation for:', language);
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
          {validationErrors.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {validationErrors.length}
            </span>
          )}
          {saving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">{file.path}</div>
          {/* File Selector Button */}
          {files.length > 0 && onFileSelect && (
            <div className="relative" ref={fileSelectorRef}>
              <button
                onClick={() => setShowFileSelector(!showFileSelector)}
                className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                title="Select file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* File Selector Dropdown - Tree Structure */}
              {showFileSelector && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#252526] border border-white/10 rounded-lg shadow-2xl z-50 max-h-[32rem] overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-white/10 flex-shrink-0">
                    <div className="text-xs font-semibold text-gray-400">
                      Files ({files.length})
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {files.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">
                        <p>No files yet</p>
                        <p className="mt-2 text-xs">Use the chat to create files</p>
                      </div>
                    ) : (
                      <div>{renderTree(buildFileTree())}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
            // Show errors and warnings (but Monaco validation is relaxed above)
            renderValidationDecorations: 'on',
            // Disable semantic highlighting - reduces visual noise
            'semanticHighlighting.enabled': false,
            // Reduce overview ruler noise
            overviewRulerLanes: 0,
          }}
        />
      </div>
      
      {/* Validation Errors Panel */}
      {validationErrors.length > 0 && (
        <div className="border-t border-white/10 bg-[#1e1e1e] p-3 max-h-32 overflow-y-auto flex-shrink-0">
          <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Validation Errors
          </div>
          <div className="space-y-1">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-xs text-gray-300 bg-red-500/5 border border-red-500/20 rounded px-2 py-1">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

