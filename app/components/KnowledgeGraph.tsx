import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ZoomIn, ZoomOut, RotateCcw, Info, Eye, X } from 'lucide-react';
import type { Resource } from '../../src/types/resource';

type KGNode = { id: string; label: string; type: string; meta?: Record<string, any> };
type KGEdge = { id: string; source: string; target: string; rel: string; meta?: Record<string, any> };

interface KnowledgeGraphProps {
  resources: Resource[];
  onSelect?: (id: string, type: string) => void;
  onSave?: (resource: Resource) => void;
  onClose?: () => void;
}

export default function KnowledgeGraph({ resources, onSelect, onSave, onClose }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [cy, setCy] = useState<Core | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [stats, setStats] = useState<{
    nodes: number;
    edges: number;
    resources: number;
    authors: number;
    tags: number;
    sources: number;
  } | null>(null);

  useEffect(() => {
    if (!resources.length || !containerRef.current) return;
    
    const { nodes, edges } = buildGraph(resources);
    renderGraph(nodes, edges, onSelect);

    return () => {
      if (cy && !cy.destroyed()) {
        cy.destroy();
      }
    };
  }, [resources, onSelect]);

  const buildGraph = (resources: Resource[]) => {
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];
    const seen = new Set<string>();

    for (const res of resources) {
      // Main resource node
      if (!seen.has(res.id)) {
        nodes.push({ 
          id: res.id, 
          label: res.title.length > 50 ? `${res.title.substring(0, 50)}...` : res.title, 
          type: 'resource',
          meta: { fullTitle: res.title }
        });
        seen.add(res.id);
      }

      // Authors
      if (res.authors && res.authors.length > 0) {
        for (const author of res.authors) {
          const authorId = `author:${author}`;
          if (!seen.has(authorId)) {
            nodes.push({ 
              id: authorId, 
              label: author, 
              type: 'author',
              meta: { authorName: author }
            });
            seen.add(authorId);
          }
          edges.push({ id: `${res.id}-authored-by-${authorId}`, source: res.id, target: authorId, rel: 'AUTHORED_BY' });
        }
      }

      // Tags
      if (res.tags && res.tags.length > 0) {
        for (const tag of res.tags) {
          const tagId = `tag:${tag}`;
          if (!seen.has(tagId)) {
            nodes.push({ 
              id: tagId, 
              label: tag, 
              type: 'tag',
              meta: { tagName: tag }
            });
            seen.add(tagId);
          }
          edges.push({ id: `${res.id}-tagged-${tagId}`, source: res.id, target: tagId, rel: 'TAGGED' });
        }
      }

      // Source
      const sourceId = `source:${res.source || 'Unknown'}`;
      if (!seen.has(sourceId)) {
        nodes.push({ 
          id: sourceId, 
          label: res.source || 'Unknown', 
          type: 'source',
          meta: { sourceName: res.source }
        });
        seen.add(sourceId);
      }
      edges.push({ id: `${res.id}-from-${sourceId}`, source: res.id, target: sourceId, rel: 'FROM' });

      // Type (resource type)
      const typeId = `type:${res.type}`;
      if (!seen.has(typeId)) {
        nodes.push({ 
          id: typeId, 
          label: res.type, 
          type: 'type',
          meta: { typeName: res.type }
        });
        seen.add(typeId);
      }
      edges.push({ id: `${res.id}-is-${typeId}`, source: res.id, target: typeId, rel: 'IS_TYPE' });
    }

    return { nodes, edges };
  };

  const renderGraph = (nodes: KGNode[], edges: KGEdge[], onSelect?: (id: string, type: string) => void) => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((n: KGNode) => ({ data: n })),
        ...edges.map((e: KGEdge) => ({ data: e })),
      ],
      style: [
        // Default node style - perfect circles with vibrant colors like the screenshot
        {
          selector: 'node',
          style: {
            'background-color': '#8b5cf6',
            label: 'data(label)',
            'font-size': 10,
            color: '#fff',
            'text-outline-color': '#000',
            'text-outline-width': 1,
            'text-wrap': 'wrap',
            'text-max-width': '60px',
            'width': '20px',
            'height': '20px',
            'shape': 'ellipse',
            'border-width': 2,
            'border-color': 'rgba(255, 255, 255, 0.3)',
            'transition-property': 'background-color, border-width, border-color, width, height',
            'transition-duration': 200
          }
        },
        // Node type specific vibrant colors matching the screenshot
        { selector: 'node[type="author"]', style: { 'background-color': '#3b82f6' } },
        { selector: 'node[type="tag"]', style: { 'background-color': '#10b981' } },
        { selector: 'node[type="source"]', style: { 'background-color': '#f97316' } },
        { selector: 'node[type="type"]', style: { 'background-color': '#eab308' } },
        // Enhanced edge style
        {
          selector: 'edge',
          style: {
            'line-color': '#b2bec3',
            width: 2,
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#b2bec3',
            label: 'data(rel)',
            'font-size': 10,
            color: '#fff',
            'text-outline-color': '#000',
            'text-outline-width': 1,
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            'opacity': 0.8
          }
        },
        // Interactive hover effects - elegant scaling like the screenshot
        {
          selector: 'node:hover',
          style: {
            'width': 28,
            'height': 28,
            'border-width': 3,
            'border-color': 'rgba(255, 255, 255, 0.9)'
          }
        },
        // Selected node style - prominent selection with emerald glow
        {
          selector: 'node:selected',
          style: {
            'width': 32,
            'height': 32,
            'border-width': 4,
            'border-color': 'rgba(16, 185, 129, 0.9)'
          }
        },
        // Hidden nodes (for search)
        {
          selector: 'node.hidden',
          style: {
            'opacity': 0.1,
            'events': 'no'
          }
        },
        {
          selector: 'edge.hidden',
          style: {
            'opacity': 0.05,
            'events': 'no'
          }
        }
      ],
      layout: { name: 'cose', animate: false },
    });

    cy.on('tap', 'node', evt => {
      const d = evt.target.data();
      setSelectedNode(d);
      setExpanded(false);
      onSelect?.(d.id, d.type);
    });

    setCy(cy);
    
    // Update stats
    setStats({
      nodes: nodes.length,
      edges: edges.length,
      resources: nodes.filter(n => n.type === 'resource').length,
      authors: nodes.filter(n => n.type === 'author').length,
      tags: nodes.filter(n => n.type === 'tag').length,
      sources: nodes.filter(n => n.type === 'source').length
    });
  };

  const getConnectedItems = (): KGNode[] => {
    if (!selectedNode || !cy || cy.destroyed()) return [];
    const connected = cy.getElementById(selectedNode.id).connectedEdges().connectedNodes();
    return connected.map((n: any) => n.data() as KGNode);
  };

  const getResourceDetails = () => {
    if (!selectedNode) return null;
    return resources.find(r => r.id === selectedNode.id);
  };

  // Search functionality
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!cy) return;

    if (term.length === 0) {
      cy.elements().removeClass('hidden');
      return;
    }

    cy.elements().forEach(ele => {
      const label = ele.data('label')?.toLowerCase() || '';
      if (label.includes(term.toLowerCase())) {
        ele.removeClass('hidden');
        if (ele.isNode()) {
          ele.connectedEdges().removeClass('hidden');
          ele.connectedEdges().connectedNodes().removeClass('hidden');
        }
      } else {
        ele.addClass('hidden');
      }
    });
  }, [cy]);

  const zoomIn = useCallback(() => {
    if (cy) cy.zoom(cy.zoom() * 1.2);
  }, [cy]);

  const zoomOut = useCallback(() => {
    if (cy) cy.zoom(cy.zoom() * 0.8);
  }, [cy]);

  const resetView = useCallback(() => {
    if (cy) {
      cy.fit();
      cy.center();
      cy.elements().removeClass('hidden');
      setSelectedNode(null);
      setExpanded(false);
      setSearchTerm('');
    }
  }, [cy]);

  return (
    <div className="flex flex-col h-full relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl">
      {!resources.length ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-full text-slate-300 p-8"
        >
          <Info className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No Knowledge Graph Data</p>
          <p className="text-sm opacity-75 text-center">Search for resources to generate the knowledge graph visualization</p>
        </motion.div>
      ) : (
        <>
          {/* Header with stats and controls */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 border-b border-emerald-500/20 bg-gray-800/60 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Knowledge Graph
              </h3>
              {stats && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-slate-300 flex items-center gap-4"
                >
                  <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                    {stats.resources} resources
                  </span>
                  <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                    {stats.authors} authors
                  </span>
                  <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                    {stats.tags} tags
                  </span>
                  <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                    {stats.nodes} nodes total
                  </span>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800/60 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 w-48"
                />
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={zoomIn}
                  className="p-2 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={zoomOut}
                  className="p-2 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetView}
                  className="p-2 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-all"
                  title="Reset View"
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLegend(!showLegend)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-all"
                  title="Toggle Legend"
                >
                  <Eye className="h-4 w-4" />
                </motion.button>
                {onClose && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2 text-slate-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all ml-2"
                    title="Close Knowledge Graph"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Graph container */}
          <div className="relative flex-1 min-h-[400px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              ref={containerRef}
              className="w-full h-full bg-gray-900/40 backdrop-blur-sm"
              style={{ 
                minHeight: '400px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px'
              }}
            />
            
            {/* Floating Legend */}
            <AnimatePresence>
              {showLegend && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute top-4 left-4 bg-gray-800/80 backdrop-blur-md rounded-xl p-4 border border-emerald-500/30 shadow-xl"
                >
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Legend
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                      <span className="text-slate-300">Resources</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span className="text-slate-300">Authors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                      <span className="text-slate-300">Tags</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                      <span className="text-slate-300">Sources</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
                      <span className="text-slate-300">Types</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected node details */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-md rounded-xl p-4 border border-emerald-500/30 shadow-xl max-w-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ 
                          backgroundColor: 
                            selectedNode.type === 'resource' ? '#8b5cf6' :
                            selectedNode.type === 'author' ? '#3b82f6' :
                            selectedNode.type === 'tag' ? '#10b981' :
                            selectedNode.type === 'source' ? '#f97316' :
                            selectedNode.type === 'type' ? '#eab308' : '#8b5cf6'
                        }}
                      ></div>
                      <span className="text-xs px-2 py-1 bg-gray-700/60 border border-emerald-500/30 rounded text-slate-300 font-medium">
                        {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="text-white font-semibold text-sm mb-3 leading-tight">
                    {selectedNode.meta?.fullTitle || selectedNode.label}
                  </h4>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? 'Collapse' : 'Details'}
                    </motion.button>
                    {selectedNode.type === 'resource' && onSave && getResourceDetails() && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-all"
                        onClick={() => onSave(getResourceDetails()!)}
                      >
                        Save to Workspace
                      </motion.button>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 text-xs overflow-hidden"
                      >
                        {selectedNode.type === 'resource' && getResourceDetails() && (
                          <div className="space-y-2">
                            {getResourceDetails()?.summary && (
                              <div>
                                <span className="font-medium text-slate-200">Summary:</span>
                                <p className="text-slate-400 mt-1 leading-relaxed">
                                  {(() => {
                                    const summary = getResourceDetails()?.summary;
                                    const summaryStr = typeof summary === 'string' ? summary : String(summary || '');
                                    return summaryStr.substring(0, 200) + (summaryStr.length > 200 ? '...' : '');
                                  })()}
                                </p>
                              </div>
                            )}
                            {getResourceDetails()?.url && (
                              <div>
                                <span className="font-medium text-slate-200">URL:</span>
                                <a 
                                  href={getResourceDetails()?.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-400 hover:text-blue-300 underline break-all"
                                >
                                  {(() => {
                                    const url = getResourceDetails()?.url;
                                    return url && url.length > 40 ? `${url.substring(0, 40)}...` : url;
                                  })()}
                                </a>
                              </div>
                            )}
                            {getResourceDetails()?.license && (
                              <div>
                                <span className="font-medium text-slate-200">License:</span>
                                <span className="ml-2 text-slate-400">{getResourceDetails()?.license}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {getConnectedItems().length > 0 && (
                          <div>
                            <span className="font-medium text-slate-200">Connected to:</span>
                            <div className="mt-1 max-h-20 overflow-y-auto">
                              {getConnectedItems().slice(0, 5).map((item: KGNode) => (
                                <div key={item.id} className="flex items-center gap-2 py-1">
                                  <div 
                                    className="w-2 h-2 rounded" 
                                    style={{ 
                                      backgroundColor: 
                                        item.type === 'resource' ? '#8b5cf6' :
                                        item.type === 'author' ? '#3b82f6' :
                                        item.type === 'tag' ? '#10b981' :
                                        item.type === 'source' ? '#f97316' :
                                        item.type === 'type' ? '#eab308' : '#8b5cf6'
                                    }}
                                  ></div>
                                  <span className="text-slate-400">
                                    {item.label.length > 25 ? `${item.label.substring(0, 25)}...` : item.label}
                                  </span>
                                  <span className="text-slate-500">({item.type})</span>
                                </div>
                              ))}
                              {getConnectedItems().length > 5 && (
                                <div className="text-slate-500 text-xs mt-1">
                                  +{getConnectedItems().length - 5} more connections
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}