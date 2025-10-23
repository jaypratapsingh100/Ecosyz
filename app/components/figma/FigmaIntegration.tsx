'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Figma,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Code2,
  Palette,
  Component,
  FileText,
  ExternalLink,
  Settings,
  Link,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
  pages: FigmaPage[];
  components: FigmaComponent[];
  styles: FigmaStyle[];
}

interface FigmaPage {
  id: string;
  name: string;
  frames: FigmaFrame[];
}

interface FigmaFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  background_color: string;
  elements: FigmaElement[];
}

interface FigmaElement {
  id: string;
  type: 'TEXT' | 'RECTANGLE' | 'COMPONENT' | 'INSTANCE';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles?: any;
  children?: FigmaElement[];
}

interface FigmaComponent {
  id: string;
  name: string;
  description: string;
  component_set_id?: string;
  created_at: string;
  updated_at: string;
}

interface FigmaStyle {
  id: string;
  name: string;
  type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
  styles: any;
}

interface FigmaIntegrationProps {
  workspaceId?: string;
  onCodeGenerated?: (code: { [filename: string]: string }) => void;
}

export default function FigmaIntegration({ workspaceId, onCodeGenerated }: FigmaIntegrationProps) {
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FigmaFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshCwing, setIsRefreshCwing] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    // Load saved access token
    const savedToken = localStorage.getItem('figma_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
      loadFigmaFiles(savedToken);
    }
  }, []);

  const loadFigmaFiles = async (token?: string) => {
    const tokenToUse = token || accessToken;
    if (!tokenToUse) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/figma?access_token=${tokenToUse}`);
      const data = await response.json();
      if (data.success) {
        // Mock files for demo - in production this would come from actual Figma API
        const mockFiles: FigmaFile[] = [
          {
            key: 'abc123def456',
            name: 'Ecosyz Design System',
            thumbnail_url: 'https://via.placeholder.com/400x300/3B82F6/FFFFFF?text=Design+System',
            last_modified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            pages: [],
            components: [],
            styles: []
          },
          {
            key: 'ghi789jkl012', 
            name: 'Research Dashboard UI',
            thumbnail_url: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Dashboard+UI',
            last_modified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            pages: [],
            components: [],
            styles: []
          }
        ];
        setFigmaFiles(mockFiles);
      }
    } catch (error) {
      console.error('Failed to load Figma files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAccessToken = (token: string) => {
    setAccessToken(token);
    localStorage.setItem('figma_access_token', token);
    setShowTokenModal(false);
    loadFigmaFiles(token);
  };

  const importFromFigma = async (fileKey?: string, url?: string) => {
    if (!fileKey && !url) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_design',
          file_key: fileKey,
          figma_url: url,
          access_token: accessToken
        })
      });

      const data = await response.json();
      if (data.success) {
        setImportResult(data);
        setSelectedFile(data.figma_file);
        onCodeGenerated?.(data.generated_code);
        setShowUrlModal(false);
        setFigmaUrl('');
      }
    } catch (error) {
      console.error('Failed to import from Figma:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const syncComponents = async (fileKey: string) => {
    if (!workspaceId) return;

    setIsRefreshCwing(true);
    try {
      const response = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_components',
          file_key: fileKey,
          workspace_id: workspaceId,
          access_token: accessToken
        })
      });

      const data = await response.json();
      if (data.success) {
        // Show sync results
        console.log('RefreshCw completed:', data.sync);
      }
    } catch (error) {
      console.error('Failed to sync components:', error);
    } finally {
      setIsRefreshCwing(false);
    }
  };

  const exportToFigma = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_design',
          design_data: { workspace_id: workspaceId },
          access_token: accessToken
        })
      });

      const data = await response.json();
      if (data.success) {
        // Show export results
        console.log('Export completed:', data.export);
      }
    } catch (error) {
      console.error('Failed to export to Figma:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg">
            <Figma className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Figma Integration</h2>
            <p className="text-gray-400">Design-to-code workflow automation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!accessToken && (
            <motion.button
              onClick={() => setShowTokenModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Settings className="h-4 w-4" />
              Connect Figma
            </motion.button>
          )}
          
          <motion.button
            onClick={() => setShowUrlModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-sm font-medium text-white"
          >
            <Link className="h-4 w-4" />
            Import from URL
          </motion.button>
          
          {accessToken && (
            <motion.button
              onClick={() => loadFigmaFiles()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="h-5 w-5 text-white" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${accessToken ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {accessToken ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <span className="font-medium text-white">
                {accessToken ? 'Connected to Figma' : 'Not connected to Figma'}
              </span>
              <p className="text-sm text-gray-400">
                {accessToken 
                  ? 'Ready to import designs and sync components'
                  : 'Connect your Figma account to start importing designs'
                }
              </p>
            </div>
          </div>
          
          {accessToken && (
            <motion.button
              onClick={exportToFigma}
              disabled={isExporting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Export to Figma
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Figma Files */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Figma Files
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading Figma files...</p>
            </div>
          ) : figmaFiles.length === 0 ? (
            <div className="text-center py-8">
              <Figma className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {accessToken ? 'No Figma files found' : 'Connect Figma to see your files'}
              </p>
              {!accessToken && (
                <motion.button
                  onClick={() => setShowTokenModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                >
                  Connect Figma Account
                </motion.button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {figmaFiles.map((file) => (
                <motion.div
                  key={file.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedFile(file)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    selectedFile?.key === file.key
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${file.thumbnail_url})` }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{file.name}</div>
                      <div className="text-xs text-gray-400">
                        Modified {new Date(file.last_modified).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          importFromFigma(file.key);
                        }}
                        disabled={isImporting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isImporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </motion.button>
                      
                      {workspaceId && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            syncComponents(file.key);
                          }}
                          disabled={isRefreshCwing}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRefreshCwing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* File Details */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          {selectedFile || importResult ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {selectedFile?.name || importResult?.figma_file?.name}
                </h3>
                {importResult && (
                  <div className="text-sm text-green-400 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Successfully imported design
                  </div>
                )}
              </div>

              {importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                        <Component className="h-4 w-4" />
                        Components
                      </div>
                      <span className="text-xl font-bold text-white">
                        {importResult.import_summary?.components_imported || 0}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                        <Palette className="h-4 w-4" />
                        Styles
                      </div>
                      <span className="text-xl font-bold text-white">
                        {importResult.import_summary?.styles_imported || 0}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Code2 className="h-5 w-5" />
                      Generated Code Files ({importResult.import_summary?.code_files_generated || 0})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importResult.generated_code && Object.keys(importResult.generated_code).map((filename) => (
                        <div
                          key={filename}
                          className="flex items-center gap-2 text-sm text-gray-300 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="flex-1">{filename}</span>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedFile && !importResult && (
                <div className="text-center py-8">
                  <motion.button
                    onClick={() => importFromFigma(selectedFile.key)}
                    disabled={isImporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-lg hover:from-pink-700 hover:to-violet-700 transition-all duration-300 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Importing Design...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        Import Design & Generate Code
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Figma className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a Figma File</h3>
              <p className="text-gray-400 mb-6">
                Choose a file from your Figma account or import from URL to generate React components
              </p>
              <motion.button
                onClick={() => setShowUrlModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-lg hover:from-pink-700 hover:to-violet-700 transition-all duration-300 flex items-center gap-2 font-semibold mx-auto"
              >
                <Link className="h-5 w-5" />
                Import from Figma URL
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Import URL Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Figma className="h-6 w-6 text-pink-400" />
                Import from Figma URL
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Figma File URL
                  </label>
                  <input
                    type="url"
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="https://www.figma.com/file/..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                
                <p className="text-sm text-gray-400">
                  Paste a Figma file URL to import the design and generate React components automatically.
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <motion.button
                  onClick={() => importFromFigma(undefined, figmaUrl)}
                  disabled={!figmaUrl || isImporting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-lg hover:from-pink-700 hover:to-violet-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Import Design
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  onClick={() => setShowUrlModal(false)}
                  disabled={isImporting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Access Token Modal */}
      <AnimatePresence>
        {showTokenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="h-6 w-6 text-pink-400" />
                Connect Figma Account
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Enter your Figma access token..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                
                <div className="text-sm text-gray-400 space-y-2">
                  <p>To get your Figma access token:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to Figma → Account Settings</li>
                    <li>Click "Create a new personal access token"</li>
                    <li>Copy the token and paste it here</li>
                  </ol>
                  <a
                    href="https://www.figma.com/developers/api#authentication"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:text-pink-300 inline-flex items-center gap-1"
                  >
                    Learn more <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <motion.button
                  onClick={() => saveAccessToken(accessToken)}
                  disabled={!accessToken}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-lg hover:from-pink-700 hover:to-violet-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-5 w-5" />
                  Connect Account
                </motion.button>
                
                <motion.button
                  onClick={() => setShowTokenModal(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}