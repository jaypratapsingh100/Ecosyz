'use client';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

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

/** File list sorted by path, with indent for nested paths (e.g. src/App.jsx). */
function flattenFiles(files: File[]): { file: File; indent: number }[] {
  return files
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => ({ file, indent: file.path.includes('/') ? 1 : 0 }));
}

/** Map file extension / language to Monaco language id. */
function getMonacoLanguage(file: File): string {
  const lang = file.language?.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (lang === 'jsx' || ext === 'jsx') return 'javascript';
  if (lang === 'tsx' || ext === 'tsx') return 'typescript';
  if (lang === 'ts' || ext === 'ts') return 'typescript';
  if (lang === 'html' || ext === 'html') return 'html';
  if (lang === 'css' || ext === 'css') return 'css';
  if (lang === 'json' || ext === 'json') return 'json';
  return 'plaintext';
}

export default function CodeEditor({ file, projectId, onChange, files = [], onFileSelect }: CodeEditorProps) {
  const hasFiles = files.length > 0;
  const flatList = flattenFiles(files);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* File list / tree */}
      <div className="flex-shrink-0 border-b border-white/10 p-2">
        <div className="text-gray-400 text-xs font-medium px-2 py-1 mb-1">Files</div>
        {hasFiles ? (
          <ul className="space-y-0.5 max-h-48 overflow-y-auto">
            {flatList.map(({ file: f, indent }) => (
              <li key={f.id} style={{ paddingLeft: indent ? 12 : 0 }}>
                <button
                  type="button"
                  onClick={() => onFileSelect?.(f)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm truncate block ${
                    file?.id === f.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:bg-white/5'
                  }`}
                  title={f.path}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-xs px-2 py-1">No files</p>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#1e1e1e]">
        {!file ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select a file to view or edit</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10 flex-shrink-0">
              <span className="text-white text-sm font-medium">{file.name}</span>
              <div className="text-xs text-gray-500">{file.path}</div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <MonacoEditor
                height="100%"
                language={getMonacoLanguage(file)}
                value={file.content}
                onChange={(value) => onChange(value ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                }}
                loading={null}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
