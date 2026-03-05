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
function flattenFiles(files: File[]): { file: File; indent: number; folder?: string }[] {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const result: { file: File; indent: number; folder?: string }[] = [];
  let lastFolder = '';
  for (const file of sorted) {
    const parts = file.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (folder && folder !== lastFolder) {
      lastFolder = folder;
    }
    result.push({ file, indent: parts.length - 1, folder: folder || undefined });
  }
  return result;
}

/** Return an SVG icon class/color for a file based on its extension. */
function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jsx':
    case 'tsx':
      return { icon: 'R', color: 'text-cyan-400' };    // React
    case 'js':
    case 'ts':
      return { icon: 'JS', color: 'text-yellow-400' }; // JavaScript/TypeScript
    case 'css':
      return { icon: '#', color: 'text-blue-400' };     // CSS
    case 'html':
      return { icon: '<>', color: 'text-orange-400' };  // HTML
    case 'json':
      return { icon: '{}', color: 'text-green-400' };   // JSON
    case 'md':
      return { icon: 'M', color: 'text-gray-400' };     // Markdown
    case 'svg':
      return { icon: 'S', color: 'text-purple-400' };   // SVG
    default:
      return { icon: 'F', color: 'text-gray-500' };     // Generic file
  }
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
            {flatList.map(({ file: f, indent }) => {
              const { icon, color } = getFileIcon(f.name);
              return (
                <li key={f.id} style={{ paddingLeft: indent * 12 }}>
                  <button
                    type="button"
                    onClick={() => onFileSelect?.(f)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm truncate flex items-center gap-2 ${
                      file?.id === f.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:bg-white/5'
                    }`}
                    title={f.path}
                  >
                    <span className={`text-[10px] font-bold w-5 text-center flex-shrink-0 ${file?.id === f.id ? 'text-emerald-400' : color}`}>
                      {icon}
                    </span>
                    <span className="truncate">{f.name}</span>
                  </button>
                </li>
              );
            })}
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
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <span className={`text-[10px] font-bold ${getFileIcon(file.name).color}`}>
                  {getFileIcon(file.name).icon}
                </span>
                {file.name}
              </span>
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
