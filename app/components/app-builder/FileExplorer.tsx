'use client';

import { useState, useEffect } from 'react';

interface File {
  id: string;
  path: string;
  name: string;
  language?: string;
  isMain: boolean;
}

interface FileExplorerProps {
  projectId: string;
  onSelectFile: (file: File) => void;
  selectedFileId?: string;
  onFileChange: () => void;
}

export default function FileExplorer({ projectId, onSelectFile, selectedFileId, onFileChange }: FileExplorerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  // Listen for files-updated event to refresh files automatically
  useEffect(() => {
    const handleFilesUpdated = () => {
      if (projectId) {
        fetchFiles();
      }
    };

    window.addEventListener('files-updated', handleFilesUpdated);
    return () => {
      window.removeEventListener('files-updated', handleFilesUpdated);
    };
  }, [projectId]);

  const fetchFiles = async () => {
    if (!projectId) return;
    
    try {
      const res = await fetch(`/api/app-projects/${projectId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        
        // Auto-expand paths
        const paths = new Set<string>();
        data.forEach((file: File) => {
          const parts = file.path.split('/');
          let currentPath = '';
          parts.slice(0, -1).forEach((part) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            paths.add(currentPath);
          });
        });
        setExpandedPaths(paths);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleToggleMain = async (file: File) => {
    try {
      const response = await fetch(`/api/app-projects/${projectId}/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMain: !file.isMain }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update main status');
      }
      
      fetchFiles(); // Refresh file list
    } catch (error) {
      console.error('Error toggling main:', error);
      alert('Failed to update main file. Please try again.');
    }
  };
  const buildFileTree = () => {
    const tree: Record<string, any> = {};

    files.forEach((file) => {
      const parts = file.path.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = file;
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
      });

      if (res.ok) {
        await fetchFiles();
        onFileChange();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
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
              className="flex items-center gap-2 px-2 py-1 text-gray-400 hover:text-white cursor-pointer text-sm"
              onClick={() => toggleFolder(currentPath)}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>{name}</span>
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
        const isSelected = selectedFileId === item.id;
        items.push(
          <div
            key={item.id}
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer text-sm group ${
              isSelected
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => onSelectFile(item)}
            onDoubleClick={() => handleToggleMain(item)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="flex-1 truncate">{name}</span>
            {item.isMain && (
              <span className="text-xs text-emerald-400" title="Main file">★</span>
            )}
            <button
              onClick={(e) => handleDeleteFile(item.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
              title="Delete file"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      }
    });

    return items;
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-400 text-sm">Loading files...</div>
    );
  }

  const tree = buildFileTree();

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/10 overflow-hidden">
      <div className="p-3 border-b border-white/10 flex-shrink-0">
        <h3 className="text-white font-semibold text-sm">Files</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p>No files yet</p>
            <p className="mt-2 text-xs">Use the chat to create files</p>
          </div>
        ) : (
          <div>{renderTree(tree)}</div>
        )}
      </div>
    </div>
  );
}

