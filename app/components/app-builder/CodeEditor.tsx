'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

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

    setSaving(true);
    try {
      const url = `/api/app-projects/${projectId}/files/${file.id}`;
      console.log('Saving file:', url);
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToSave }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Save failed:', res.status, errorData);
        throw new Error(errorData.error || `Failed to save file (${res.status})`);
      }
      
      console.log('File saved successfully');
    } catch (error: any) {
      console.error('Failed to save file:', error);
      // Don't show error to user for auto-save failures, just log
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
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{file.name}</span>
          {saving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
        <div className="text-xs text-gray-500">{file.path}</div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage()}
          value={content}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}

