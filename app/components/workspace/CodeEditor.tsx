'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown,
  Save,
  Download,
  Copy,
  Eye,
  EyeOff,
  Search,
  Settings
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';

// Monaco Editor dynamic import
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

interface Project {
  id: string;
  name: string;
  files: { [key: string]: string };
  framework: string;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface CodeEditorProps {
  project: Project;
  selectedFile: string;
  onFileSelect: (file: string) => void;
}

export function CodeEditor({ project, selectedFile, onFileSelect }: CodeEditorProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimap, setShowMinimap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('vs-dark');
  const [editorContent, setEditorContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  
  const { toast } = useToast();
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Build file tree from project files
    const tree = buildFileTree(Object.keys(project.files));
    setFileTree(tree);
    
    // Auto-expand root folders
    const rootFolders = tree.filter(node => node.type === 'folder').map(node => node.path);
    setExpandedFolders(new Set(rootFolders));
  }, [project.files]);

  useEffect(() => {
    // Update editor content when file selection changes
    if (selectedFile && project.files[selectedFile]) {
      setEditorContent(project.files[selectedFile]);
      setIsModified(false);
    }
  }, [selectedFile, project.files]);

  const buildFileTree = (filePaths: string[]): FileNode[] => {
    const tree: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    // Sort files to ensure consistent ordering
    const sortedPaths = filePaths.sort();

    for (const filePath of sortedPaths) {
      const parts = filePath.split('/');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (i === parts.length - 1) {
          // It's a file
          const fileNode: FileNode = {
            name: part,
            path: filePath,
            type: 'file'
          };

          if (parentPath) {
            const parentNode = folderMap.get(parentPath);
            if (parentNode && parentNode.children) {
              parentNode.children.push(fileNode);
            }
          } else {
            tree.push(fileNode);
          }
        } else {
          // It's a folder
          if (!folderMap.has(currentPath)) {
            const folderNode: FileNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            };

            folderMap.set(currentPath, folderNode);

            if (parentPath) {
              const parentNode = folderMap.get(parentPath);
              if (parentNode && parentNode.children) {
                parentNode.children.push(folderNode);
              }
            } else {
              tree.push(folderNode);
            }
          }
        }
      }
    }

    return tree;
  };

  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'md': return 'markdown';
      case 'py': return 'python';
      case 'java': return 'java';
      case 'php': return 'php';
      case 'xml': return 'xml';
      case 'yaml':
      case 'yml': return 'yaml';
      default: return 'plaintext';
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const baseClasses = "w-4 h-4";
    
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return <FileCode className={`${baseClasses} text-blue-400`} />;
      case 'js':
        return <FileCode className={`${baseClasses} text-yellow-400`} />;
      case 'ts':
        return <FileCode className={`${baseClasses} text-blue-600`} />;
      case 'css':
      case 'scss':
        return <FileCode className={`${baseClasses} text-purple-400`} />;
      case 'json':
        return <FileCode className={`${baseClasses} text-green-400`} />;
      case 'html':
        return <FileCode className={`${baseClasses} text-orange-400`} />;
      case 'md':
        return <FileCode className={`${baseClasses} text-gray-600`} />;
      default:
        return <FileCode className={`${baseClasses} text-gray-400`} />;
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      setIsModified(value !== project.files[selectedFile]);
    }
  };

  const handleSave = async () => {
    try {
      // In a real implementation, this would save to the backend
      console.log('Saving file:', selectedFile, editorContent);
      
      // Update local state (in real app, sync with backend)
      project.files[selectedFile] = editorContent;
      setIsModified(false);
      
      toast({
        title: "Success",
        description: "File saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(editorContent);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFileTree = (nodes: FileNode[], depth = 0): React.ReactElement[] => {
    return nodes
      .filter(node => {
        if (!searchQuery) return true;
        return node.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .map((node) => (
        <motion.div
          key={node.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`ml-${depth * 4}`}
        >
          {node.type === 'folder' ? (
            <div>
              <div
                className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer group"
                onClick={() => toggleFolder(node.path)}
              >
                {expandedFolders.has(node.path) ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                {expandedFolders.has(node.path) ? (
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                ) : (
                  <Folder className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {node.name}
                </span>
              </div>
              {expandedFolders.has(node.path) && node.children && (
                <div className="ml-4">
                  {renderFileTree(node.children, depth + 1)}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer group ${
                selectedFile === node.path ? 'bg-blue-50 border-l-2 border-blue-500' : ''
              }`}
              onClick={() => onFileSelect(node.path)}
            >
              <div className="w-4" /> {/* Spacer for alignment */}
              {getFileIcon(node.name)}
              <span className={`text-sm ${
                selectedFile === node.path 
                  ? 'text-blue-700 font-medium' 
                  : 'text-gray-600 group-hover:text-gray-800'
              }`}>
                {node.name}
              </span>
              {selectedFile === node.path && isModified && (
                <div className="w-2 h-2 bg-orange-400 rounded-full ml-auto" title="Modified" />
              )}
            </div>
          )}
        </motion.div>
      ));
  };

  return (
    <div className="h-full flex bg-white">
      {/* File Explorer */}
      <div className="w-80 border-r border-gray-200 bg-gray-50/50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Files</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm bg-white border-gray-200"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {renderFileTree(fileTree)}
        </div>

        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{Object.keys(project.files).length} files</span>
            <Badge variant="outline" className="text-xs">
              {project.framework}
            </Badge>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        {selectedFile && (
          <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile)}
              <span className="font-medium text-gray-800">
                {selectedFile.split('/').pop()}
              </span>
              {isModified && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                  Modified
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1"
              >
                <option value="vs-dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="vs">Visual Studio</option>
              </select>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMinimap(!showMinimap)}
                title="Toggle Minimap"
              >
                {showMinimap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyContent}
                title="Copy Content"
              >
                <Copy className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadFile}
                title="Download File"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              {isModified && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Monaco Editor */}
        <div className="flex-1">
          {selectedFile ? (
            <MonacoEditor
              height="100%"
              language={getLanguageFromFile(selectedFile)}
              theme={theme}
              value={editorContent}
              onChange={handleEditorChange}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                minimap: { enabled: showMinimap },
                fontSize: fontSize,
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: 'boundary',
                bracketPairColorization: { enabled: true },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FileCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Select a file to edit</p>
                <p className="text-sm text-gray-400">
                  Choose a file from the explorer to start editing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}