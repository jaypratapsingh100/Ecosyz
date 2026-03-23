'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

const MonacoDiffEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.DiffEditor),
  { ssr: false }
);

interface StreamingFile {
  path: string;
  content: string;
  complete: boolean;
}

interface StreamingCodeViewProps {
  streamingFiles: StreamingFile[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  projectFiles: Array<{ path: string; content?: string }>;
}

function getMonacoLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'jsx' || ext === 'js') return 'javascript';
  if (ext === 'tsx' || ext === 'ts') return 'typescript';
  if (ext === 'css') return 'css';
  if (ext === 'json') return 'json';
  if (ext === 'html') return 'html';
  return 'plaintext';
}

export default function StreamingCodeView({
  streamingFiles,
  activeFile,
  onSelectFile,
  projectFiles,
}: StreamingCodeViewProps) {
  const [showDiff, setShowDiff] = useState(false);
  const sf = streamingFiles.find(f => f.path === activeFile);
  if (!sf) return null;

  const isModified = projectFiles.some(pf => pf.path === sf.path);
  const previousContent = isModified
    ? (projectFiles.find(pf => pf.path === sf.path)?.content || '')
    : '';
  const language = getMonacoLang(sf.path);
  const lineCount = sf.content.split('\n').length;
  const prevLineCount = previousContent ? previousContent.split('\n').length : 0;
  const lineDiff = lineCount - prevLineCount;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-white/10 bg-[#0d0d0d] flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sf.complete ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
        <span className="text-xs font-mono text-gray-300 truncate">{sf.path}</span>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
          isModified ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
        }`}>
          {isModified ? 'MOD' : 'NEW'}
        </span>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
          sf.complete ? 'bg-emerald-500/15 text-emerald-400' : 'bg-cyan-500/15 text-cyan-400 animate-pulse'
        }`}>
          {sf.complete ? 'Done' : isModified ? 'Updating...' : 'Creating...'}
        </span>
        {isModified && sf.complete && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 transition-colors ${
              showDiff ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {showDiff ? 'Hide Diff' : 'View Changes'}
          </button>
        )}
      </div>

      {/* File tabs */}
      <div className="flex-shrink-0 px-1 py-0.5 border-b border-white/5 bg-[#0a0a0a] flex items-center gap-0.5 overflow-x-auto">
        {streamingFiles.map(f => {
          const fMod = projectFiles.some(pf => pf.path === f.path);
          return (
            <button
              key={f.path}
              onClick={() => onSelectFile(f.path)}
              className={`px-2 py-1 text-[10px] rounded transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                f.path === activeFile ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                f.complete ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'
              }`} />
              <span>{f.path.split('/').pop()}</span>
              <span className={`text-[8px] ${fMod ? 'text-amber-500' : 'text-emerald-500'}`}>
                {fMod ? 'MOD' : 'NEW'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 px-3 py-1 bg-[#111] border-b border-white/5 flex items-center gap-3 text-[10px] text-gray-500">
        <span>{lineCount} lines</span>
        <span>{sf.content.length.toLocaleString()} chars</span>
        {isModified && prevLineCount > 0 && (
          <span className="text-amber-500">
            {prevLineCount} → {lineCount}
            <span className={lineDiff > 0 ? ' text-emerald-400' : lineDiff < 0 ? ' text-red-400' : ''}>
              {' '}({lineDiff > 0 ? `+${lineDiff}` : lineDiff < 0 ? `${lineDiff}` : '='} lines)
            </span>
          </span>
        )}
        {!sf.complete && (
          <span className="ml-auto text-cyan-400 animate-pulse flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Live
          </span>
        )}
        {isModified && (
          <span className="ml-auto text-[9px] text-gray-600">
            <span className="text-emerald-500">green</span> = added &nbsp;
            <span className="text-red-500">red</span> = removed
          </span>
        )}
      </div>

      {/* Editor — always use regular editor during streaming to avoid Monaco disposal crashes.
          DiffEditor only shown when complete AND user clicks "View Changes". */}
      <div className="flex-1 min-h-0">
        {showDiff && isModified && sf.complete ? (
          <StreamingDiffEditor
            originalContent={previousContent}
            modifiedContent={sf.content}
            complete={sf.complete}
            language={language}
          />
        ) : (
          <StreamingNewFileEditor
            content={sf.content}
            complete={sf.complete}
            language={language}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Real-time diff editor for MOD files.
 * Shows previous version on left, new version on right with red/green highlights.
 * Updates modified side via imperative API — no re-mount, smooth streaming.
 */
function StreamingDiffEditor({
  originalContent,
  modifiedContent,
  complete,
  language,
}: {
  originalContent: string;
  modifiedContent: string;
  complete: boolean;
  language: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diffEditorRef = useRef<any>(null);

  // Clean up on unmount to prevent "TextModel got disposed" error
  useEffect(() => {
    return () => { diffEditorRef.current = null; };
  }, []);

  // Update modified content via API — smooth, no re-mount
  useEffect(() => {
    const editor = diffEditorRef.current;
    if (!editor) return;

    const modifiedEditor = editor.getModifiedEditor();
    if (!modifiedEditor) return;

    const model = modifiedEditor.getModel();
    if (!model) return;

    const displayContent = modifiedContent + (complete ? '' : '\n// ⏳ Generating...');
    if (model.getValue() !== displayContent) {
      // Check if user scrolled up
      const scrollTop = modifiedEditor.getScrollTop();
      const scrollHeight = modifiedEditor.getScrollHeight();
      const clientHeight = modifiedEditor.getLayoutInfo().height;
      const wasAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

      model.setValue(displayContent);

      if (wasAtBottom) {
        modifiedEditor.revealLine(model.getLineCount());
      }
    }
  }, [modifiedContent, complete]);

  return (
    <MonacoDiffEditor
      height="100%"
      language={language}
      original={originalContent}
      modified={modifiedContent + (complete ? '' : '\n// ⏳ Generating...')}
      theme="vs-dark"
      onMount={(editor) => {
        diffEditorRef.current = editor;
        // Scroll to bottom of modified editor
        const modifiedEditor = editor.getModifiedEditor();
        const model = modifiedEditor?.getModel();
        if (model) modifiedEditor.revealLine(model.getLineCount());
      }}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 12,
        scrollBeyondLastLine: false,
        renderSideBySide: true,
        automaticLayout: true,
        overviewRulerBorder: false,
        padding: { top: 4 },
        diffWordWrap: 'on',
      }}
    />
  );
}

/**
 * Real-time editor for NEW files.
 * Shows code being written with syntax highlighting, auto-scrolls to bottom.
 */
function StreamingNewFileEditor({
  content,
  complete,
  language,
}: {
  content: string;
  complete: boolean;
  language: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const displayContent = content + (complete ? '' : '\n// ⏳ Generating...');
    if (model.getValue() === displayContent) return;

    const scrollTop = editor.getScrollTop();
    const scrollHeight = editor.getScrollHeight();
    const clientHeight = editor.getLayoutInfo().height;
    const wasAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

    model.setValue(displayContent);

    if (wasAtBottom) {
      editor.revealLine(model.getLineCount());
    }
  }, [content, complete]);

  return (
    <MonacoEditor
      height="100%"
      language={language}
      defaultValue={content + (complete ? '' : '\n// ⏳ Generating...')}
      theme="vs-dark"
      onMount={(editor) => {
        editorRef.current = editor;
        const model = editor.getModel();
        if (model) editor.revealLine(model.getLineCount());
      }}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        renderLineHighlight: 'none',
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        padding: { top: 4 },
      }}
    />
  );
}
