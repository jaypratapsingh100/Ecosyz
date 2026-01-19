'use client';

import { useState } from 'react';

interface GeneratedProject {
  id: string;
  title: string;
  files: Array<{
    id: string;
    path: string;
    name: string;
    content: string;
    language?: string;
  }>;
}

interface ResultStepProps {
  project: GeneratedProject;
  onBackToStart: () => void;
  onViewInEditor: () => void;
}

export default function ResultStep({ project, onBackToStart, onViewInEditor }: ResultStepProps) {
  const [selectedFile, setSelectedFile] = useState<typeof project.files[0] | null>(
    project.files[0] || null
  );

  const getFileIcon = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return '⚛️';
    if (path.endsWith('.ts') || path.endsWith('.js')) return '📄';
    if (path.endsWith('.css')) return '🎨';
    if (path.endsWith('.html')) return '🌐';
    if (path.endsWith('.json')) return '📦';
    return '📝';
  };

  const getLanguageColor = (language?: string) => {
    const colors: Record<string, string> = {
      javascript: 'bg-yellow-500/20 text-yellow-400',
      typescript: 'bg-blue-500/20 text-blue-400',
      jsx: 'bg-cyan-500/20 text-cyan-400',
      tsx: 'bg-blue-500/20 text-blue-400',
      css: 'bg-purple-500/20 text-purple-400',
      html: 'bg-orange-500/20 text-orange-400',
      json: 'bg-green-500/20 text-green-400',
    };
    return colors[language || ''] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-4xl animate-bounce">
            ✨
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">App Generated Successfully!</h2>
          <p className="text-gray-400 text-lg mb-3">
            Your application has been created with {project.files.length} files
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
            <span className="text-emerald-400">💾</span>
            <span className="text-sm text-emerald-300">
              All files have been saved to your account
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Explorer */}
          <div className="lg:col-span-1">
            <div className="bg-black/30 rounded-lg border border-white/10 p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Generated Files</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {project.files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      selectedFile?.id === file.id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <span>{getFileIcon(file.path)}</span>
                    <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                    {file.language && (
                      <span className={`text-xs px-2 py-0.5 rounded ${getLanguageColor(file.language)}`}>
                        {file.language}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* File Preview */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span>{selectedFile ? getFileIcon(selectedFile.path) : '📄'}</span>
                  <h3 className="text-sm font-medium text-gray-300">
                    {selectedFile?.path || 'Select a file'}
                  </h3>
                </div>
                {selectedFile?.language && (
                  <span className={`text-xs px-2 py-1 rounded ${getLanguageColor(selectedFile.language)}`}>
                    {selectedFile.language}
                  </span>
                )}
              </div>
              {selectedFile && (
                <div className="bg-[#1e1e1e] rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                    {selectedFile.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onViewInEditor}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-bold text-lg rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02]"
          >
            Open in Editor →
          </button>
          <button
            onClick={async () => {
              try {
                const response = await fetch(`/api/app-projects/${project.id}/preview`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                  const data = await response.json();
                  const html = data.output || data.html || '';
                  if (html) {
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                      newWindow.document.write(html);
                      newWindow.document.close();
                    }
                  } else {
                    alert('Preview generated but no HTML content found');
                  }
                } else {
                  const error = await response.json().catch(() => ({ error: 'Failed to generate preview' }));
                  alert(`Preview Error: ${error.error || 'Failed to generate preview'}`);
                }
              } catch (error: any) {
                console.error('Preview error:', error);
                alert(`Preview Error: ${error.message || 'Failed to open preview'}`);
              }
            }}
            className="flex-1 px-8 py-4 border border-white/20 hover:border-white/40 text-white font-medium rounded-lg transition-all backdrop-blur-sm"
          >
            Preview App
          </button>
          <button
            onClick={onBackToStart}
            className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-all border border-white/10"
          >
            Create Another
          </button>
        </div>

        {/* Storage Info */}
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💾</span>
            <div className="flex-1">
              <h4 className="text-emerald-400 font-semibold mb-1">Files Stored Securely</h4>
              <p className="text-sm text-gray-300">
                All {project.files.length} files have been saved to your account and are accessible anytime. 
                Your project is stored in the cloud and can be accessed from the App Builder or Editor.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{project.files.length}</div>
            <div className="text-sm text-gray-400">Files Saved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {project.files.filter(f => f.language === 'jsx' || f.language === 'tsx').length}
            </div>
            <div className="text-sm text-gray-400">Components</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {new Set(project.files.map(f => f.language)).size}
            </div>
            <div className="text-sm text-gray-400">Languages</div>
          </div>
        </div>
      </div>
    </div>
  );
}
