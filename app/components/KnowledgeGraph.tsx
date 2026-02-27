'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ZoomIn, ZoomOut, RotateCcw, Info, Eye, X, HelpCircle, Maximize2, Minimize2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import type { Resource } from '../../src/types/resource';
import type { Core } from 'cytoscape';

const KnowledgeGraph3D = dynamic(() => import('./KnowledgeGraph3D'), { ssr: false });

export type KGNode = { id: string; label: string; type: string; meta?: Record<string, any> };
export type KGEdge = { id: string; source: string; target: string; rel: string; relLabel?: string; meta?: Record<string, any> };

const REL_LABELS: Record<string, string> = {
  AUTHORED_BY: 'Written by',
  TAGGED: 'Topic',
  FROM: 'From',
  IS_TYPE: 'Kind',
};

const TYPE_LABELS: Record<string, string> = {
  resource: 'Paper or resource',
  author: 'Person',
  tag: 'Topic',
  source: 'Source',
  type: 'Kind',
};

const NODE_TYPE_DESCRIPTIONS: Record<string, string> = {
  resource: 'This is a paper or resource; the items below are its topics, authors, and sources.',
  author: 'This is an author; the connected papers are written by them.',
  tag: 'This is a topic; the connected papers share this theme.',
  source: 'This is a source (e.g. arXiv, Zenodo); the connected papers come from here.',
  type: 'This is a kind (e.g. paper, dataset); the connected resources are of this type.',
};

const SIMPLE_VIEW_MAX_RESOURCES = 20;

function filterToSimpleView(
  nodes: KGNode[],
  edges: KGEdge[],
  connectionType: 'tag' | 'author' | 'source' | 'type',
  maxResources: number = SIMPLE_VIEW_MAX_RESOURCES
): { nodes: KGNode[]; edges: KGEdge[] } {
  const resourceNodes = nodes.filter((n) => n.type === 'resource').slice(0, maxResources);
  const resourceIds = new Set(resourceNodes.map((n) => n.id));
  const connectedEdges = edges.filter(
    (e) =>
      (resourceIds.has(e.source) && nodes.some((n) => n.id === e.target && n.type === connectionType)) ||
      (resourceIds.has(e.target) && nodes.some((n) => n.id === e.source && n.type === connectionType))
  );
  const connectedOtherIds = new Set(
    connectedEdges.flatMap((e) => [e.source, e.target].filter((id) => !resourceIds.has(id)))
  );
  const otherNodes = nodes.filter((n) => n.type === connectionType && connectedOtherIds.has(n.id));
  const simpleNodes = [...resourceNodes, ...otherNodes];
  const simpleNodeIds = new Set(simpleNodes.map((n) => n.id));
  const simpleEdges = edges.filter((e) => simpleNodeIds.has(e.source) && simpleNodeIds.has(e.target));
  return { nodes: simpleNodes, edges: simpleEdges };
}

interface KnowledgeGraphProps {
  resources: Resource[];
  onSelect?: (id: string, type: string) => void;
  onSave?: (resource: Resource) => void;
  onClose?: () => void;
}

export default function KnowledgeGraph({ resources, onSelect, onSave, onClose }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [cy, setCy] = useState<Core | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'full'>('simple');
  const [simpleConnectionType, setSimpleConnectionType] = useState<'tag' | 'author' | 'source' | 'type'>('tag');
  const [is3D, setIs3D] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [mobileHeaderExpanded, setMobileHeaderExpanded] = useState(false);
  const [simpleMaxResources, setSimpleMaxResources] = useState<number>(SIMPLE_VIEW_MAX_RESOURCES);
  const [stats, setStats] = useState<{
    nodes: number;
    edges: number;
    resources: number;
    authors: number;
    tags: number;
    sources: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && resources.length > 0) {
      const done = localStorage.getItem('kg-onboarding-done');
      if (!done) setShowFirstTimeHint(true);
    }
  }, [resources.length]);

  // Default: expand controls on desktop, collapse on small screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.innerWidth >= 640;
    setMobileHeaderExpanded(isDesktop);
  }, []);

  // When entering fullscreen, start with controls collapsed; user can expand if needed
  useEffect(() => {
    if (isFullscreen) {
      setMobileHeaderExpanded(false);
    }
  }, [isFullscreen]);

  // When controls are hidden, also hide legend and any open details panel
  useEffect(() => {
    if (!mobileHeaderExpanded) {
      setShowLegend(false);
      setSelectedNode(null);
      setExpanded(false);
    }
  }, [mobileHeaderExpanded]);

  const buildGraph = (resources: Resource[]) => {
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];
    const seen = new Set<string>();

    for (const res of resources) {
      if (!seen.has(res.id)) {
        nodes.push({
          id: res.id,
          label: res.title.length > 50 ? `${res.title.substring(0, 50)}...` : res.title,
          type: 'resource',
          meta: { fullTitle: res.title },
        });
        seen.add(res.id);
      }
      if (res.authors && res.authors.length > 0) {
        for (const author of res.authors) {
          const authorId = `author:${author}`;
          if (!seen.has(authorId)) {
            nodes.push({ id: authorId, label: author, type: 'author', meta: { authorName: author } });
            seen.add(authorId);
          }
          edges.push({ id: `${res.id}-authored-by-${authorId}`, source: res.id, target: authorId, rel: 'AUTHORED_BY', relLabel: REL_LABELS.AUTHORED_BY });
        }
      }
      if (res.tags && res.tags.length > 0) {
        for (const tag of res.tags) {
          const tagId = `tag:${tag}`;
          if (!seen.has(tagId)) {
            nodes.push({ id: tagId, label: tag, type: 'tag', meta: { tagName: tag } });
            seen.add(tagId);
          }
          edges.push({ id: `${res.id}-tagged-${tagId}`, source: res.id, target: tagId, rel: 'TAGGED', relLabel: REL_LABELS.TAGGED });
        }
      }
      const sourceId = `source:${res.source || 'Unknown'}`;
      if (!seen.has(sourceId)) {
        nodes.push({ id: sourceId, label: res.source || 'Unknown', type: 'source', meta: { sourceName: res.source } });
        seen.add(sourceId);
      }
      edges.push({ id: `${res.id}-from-${sourceId}`, source: res.id, target: sourceId, rel: 'FROM', relLabel: REL_LABELS.FROM });
      const typeId = `type:${res.type}`;
      if (!seen.has(typeId)) {
        nodes.push({ id: typeId, label: res.type, type: 'type', meta: { typeName: res.type } });
        seen.add(typeId);
      }
      edges.push({ id: `${res.id}-is-${typeId}`, source: res.id, target: typeId, rel: 'IS_TYPE', relLabel: REL_LABELS.IS_TYPE });
    }
    return { nodes, edges };
  };

  const graphData = useMemo(() => {
    if (!resources.length) return { nodes: [] as KGNode[], edges: [] as KGEdge[] };
    const { nodes: fullNodes, edges: fullEdges } = buildGraph(resources);
    return viewMode === 'simple'
      ? filterToSimpleView(fullNodes, fullEdges, simpleConnectionType, simpleMaxResources)
      : { nodes: fullNodes, edges: fullEdges };
  }, [resources, viewMode, simpleConnectionType, simpleMaxResources]);

  const overviewSentence = useMemo(() => {
    if (!stats) return '';
    const { resources: r, authors: a, tags: t, sources: s } = stats;
    const parts = [`${r} paper${r !== 1 ? 's' : ''} connected across ${t} topic${t !== 1 ? 's' : ''}, ${a} author${a !== 1 ? 's' : ''}, and ${s} source${s !== 1 ? 's' : ''} in this view`];
    if (viewMode === 'simple') {
      const byLabel = { tag: 'Grouped by topics', author: 'Grouped by authors', source: 'Grouped by source', type: 'Grouped by kind' };
      parts.push(byLabel[simpleConnectionType]);
    }
    return parts.join('. ');
  }, [stats, viewMode, simpleConnectionType]);

  const insights = useMemo(() => {
    const { nodes, edges } = graphData;
    if (!nodes.length) return { topTopics: [], topAuthors: [] };
    const resourceIds = new Set(nodes.filter((n) => n.type === 'resource').map((n) => n.id));
    const tagCount: Record<string, number> = {};
    const authorCount: Record<string, number> = {};
    edges.forEach((e) => {
      const src = nodes.find((n) => n.id === e.source);
      const tgt = nodes.find((n) => n.id === e.target);
      if (src?.type === 'tag' && resourceIds.has(e.target)) {
        tagCount[e.source] = (tagCount[e.source] ?? 0) + 1;
      }
      if (tgt?.type === 'tag' && resourceIds.has(e.source)) {
        tagCount[e.target] = (tagCount[e.target] ?? 0) + 1;
      }
      if (src?.type === 'author' && resourceIds.has(e.target)) {
        authorCount[e.source] = (authorCount[e.source] ?? 0) + 1;
      }
      if (tgt?.type === 'author' && resourceIds.has(e.source)) {
        authorCount[e.target] = (authorCount[e.target] ?? 0) + 1;
      }
    });
    const topTopics = Object.entries(tagCount)
      .map(([id, count]) => ({ id, label: nodes.find((n) => n.id === id)?.label ?? id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    const topAuthors = Object.entries(authorCount)
      .map(([id, count]) => ({ id, label: nodes.find((n) => n.id === id)?.label ?? id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return { topTopics, topAuthors };
  }, [graphData]);

  useEffect(() => {
    if (graphData.nodes.length === 0) return;
    setStats({
      nodes: graphData.nodes.length,
      edges: graphData.edges.length,
      resources: graphData.nodes.filter((n) => n.type === 'resource').length,
      authors: graphData.nodes.filter((n) => n.type === 'author').length,
      tags: graphData.nodes.filter((n) => n.type === 'tag').length,
      sources: graphData.nodes.filter((n) => n.type === 'source').length,
    });
  }, [graphData]);

  useEffect(() => {
    if (typeof window === 'undefined' || is3D || !graphData.nodes.length || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;
    const { nodes, edges } = graphData;

    void import('cytoscape').then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;
      if (cancelled || !containerRef.current) return;

      if (cyRef.current && !cyRef.current.destroyed()) {
        cyRef.current.destroy();
        cyRef.current = null;
      }

      const cyInstance = cytoscape({
        container,
        elements: [
          ...nodes.map((n: KGNode) => ({ data: n })),
          ...edges.map((e: KGEdge) => ({ data: e })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#8b5cf6',
              label: 'data(label)',
              'font-size': 11,
              color: '#fff',
              'text-outline-color': '#000',
              'text-outline-width': 1,
              'text-wrap': 'wrap',
              'text-max-width': '70px',
              width: '20px',
              height: '20px',
              shape: 'ellipse',
              'border-width': 2,
              'border-color': 'rgba(255, 255, 255, 0.3)',
              'transition-property': 'background-color, border-width, border-color, width, height',
              'transition-duration': 200,
            },
          },
          { selector: 'node[type="author"]', style: { 'background-color': '#3b82f6' } },
          { selector: 'node[type="tag"]', style: { 'background-color': '#10b981' } },
          { selector: 'node[type="source"]', style: { 'background-color': '#f97316' } },
          { selector: 'node[type="type"]', style: { 'background-color': '#eab308' } },
          { selector: 'node[type="resource"]', style: { 'font-size': 12 } },
          {
            selector: 'edge',
            style: {
              'line-color': '#b2bec3',
              width: 2,
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#b2bec3',
              label: '',
              'font-size': 9,
              color: '#fff',
              'text-outline-color': '#000',
              'text-outline-width': 1,
              'curve-style': 'bezier',
              'arrow-scale': 0.8,
              opacity: 0.8,
            },
          },
          { selector: 'edge:hover', style: { label: 'data(relLabel)', opacity: 1 } },
          {
            selector: 'node:hover',
            style: {
              width: 28,
              height: 28,
              'border-width': 3,
              'border-color': 'rgba(255, 255, 255, 0.9)',
            },
          },
          {
            selector: 'node:selected',
            style: {
              width: 32,
              height: 32,
              'border-width': 4,
              'border-color': 'rgba(16, 185, 129, 0.9)',
            },
          },
          { selector: 'node.hidden', style: { opacity: 0.1, events: 'no' } },
          { selector: 'edge.hidden', style: { opacity: 0.05, events: 'no' } },
          { selector: 'node.dimmed', style: { opacity: 0.25 } },
          { selector: 'edge.dimmed', style: { opacity: 0.2 } },
        ],
        layout: { name: 'cose', animate: true, animationDuration: 400 },
      });

      cyInstance.on('tap', 'node', (evt) => {
        const d = evt.target.data();
        setSelectedNode(d);
        setExpanded(false);
        onSelect?.(d.id, d.type);
      });

      if (cancelled) {
        cyInstance.destroy();
        return;
      }
      cyRef.current = cyInstance;
      setCy(cyInstance);
      setSelectedNode(null);
      setExpanded(false);
      setSearchTerm('');
    });

    return () => {
      cancelled = true;
      if (cyRef.current && !cyRef.current.destroyed()) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
      setCy(null);
    };
  }, [is3D, graphData, onSelect]);

  // Update edge labels when toggle changes
  useEffect(() => {
    if (!cy || cy.destroyed()) return;
    try {
      (cy as any).style().selector('edge').style('label', showEdgeLabels ? 'data(relLabel)' : '').update();
    } catch (_) {}
  }, [cy, showEdgeLabels]);

  // Dim non-neighborhood when a node is selected (2D only)
  useEffect(() => {
    if (!cy || cy.destroyed() || is3D) return;
    cy.elements().removeClass('dimmed');
    if (selectedNode) {
      const node = cy.getElementById(selectedNode.id);
      if (!node.empty()) {
        const neighborhood = node.closedNeighborhood();
        cy.elements().difference(neighborhood).addClass('dimmed');
      }
    }
  }, [cy, selectedNode, is3D]);

  const getConnectedItems = (): KGNode[] => {
    if (!selectedNode) return [];
    if (cy && !cy.destroyed()) {
      const connected = cy.getElementById(selectedNode.id).connectedEdges().connectedNodes();
      return connected.map((n: any) => n.data() as KGNode);
    }
    if (is3D && graphData.nodes.length) {
      const connectedIds = new Set<string>();
      graphData.edges.forEach((e) => {
        if (e.source === selectedNode.id) connectedIds.add(e.target);
        if (e.target === selectedNode.id) connectedIds.add(e.source);
      });
      return graphData.nodes.filter((n) => connectedIds.has(n.id));
    }
    return [];
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

  const focusSelectedNode = useCallback(() => {
    if (!cy || !selectedNode) return;
    const node = cy.getElementById(selectedNode.id);
    if (!node || node.empty()) return;

    cy.elements().removeClass('hidden');
    const neighborhood = node.closedNeighborhood();
    cy.elements().difference(neighborhood).addClass('hidden');
    cy.fit(neighborhood, 50);
  }, [cy, selectedNode]);

  const selectNode = useCallback(
    (node: KGNode) => {
      setSelectedNode(node);
      setExpanded(false);
      onSelect?.(node.id, node.type);
      if (!is3D && cy && !cy.destroyed()) {
        const el = cy.getElementById(node.id);
        if (!el.empty()) {
          el.select();
          cy.animate({ fit: { eles: el, padding: 80 }, duration: 300 });
        }
      }
    },
    [cy, is3D, onSelect]
  );

  const content = (
    <div className="flex flex-col h-full relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl">
      {!resources.length ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-full text-slate-300 p-8"
        >
          <Info className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No connection map yet</p>
          <p className="text-sm opacity-75 text-center mb-4">Search for papers or resources to generate the map.</p>
          <p className="text-xs text-slate-500 text-center max-w-sm">
            1. Run a search · 2. Open &quot;Explore connections&quot; · 3. Start in Simple view by topic
          </p>
        </motion.div>
      ) : (
        <>
          {/* Header with stats and controls */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-emerald-500/20 bg-gray-800/60 backdrop-blur-sm gap-3"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></div>
                    Explore connections
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                    title="How to read this"
                    aria-label="How to read this"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-400 hidden sm:inline">Knowledge graph</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileHeaderExpanded((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-medium"
                  aria-expanded={mobileHeaderExpanded}
                >
                  {mobileHeaderExpanded ? 'Hide controls' : 'Stats & filters'}
                  {mobileHeaderExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <div className={mobileHeaderExpanded ? 'block' : 'hidden'}>
              <p className="text-xs text-slate-400">A map of how your search results connect by topic, author, and source so you can spot clusters and key people fast. Click any item to see details; use search to focus.</p>
              {stats && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-slate-300 flex flex-col gap-1 mt-1"
                >
                  {overviewSentence && (
                    <p className="text-xs text-slate-400">
                      {overviewSentence}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                      {stats.resources} papers
                    </span>
                    <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                      {stats.authors} authors
                    </span>
                    <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                      {stats.tags} topics
                    </span>
                    <span className="bg-gray-700/60 border border-emerald-500/30 px-2 py-1 rounded text-xs">
                      {stats.sources} sources
                    </span>
                  </div>
                  {(insights.topTopics.length > 0 || insights.topAuthors.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {insights.topTopics.slice(0, 3).map(({ id, label, count }) => {
                        const node = graphData.nodes.find((n) => n.id === id);
                        return node ? (
                          <button
                            key={id}
                            type="button"
                            onClick={() => selectNode(node)}
                            className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs hover:bg-emerald-500/30 transition-colors"
                          >
                            Top topic: {label.length > 12 ? `${label.slice(0, 12)}…` : label} ({count})
                          </button>
                        ) : null;
                      })}
                      {insights.topAuthors.slice(0, 2).map(({ id, label, count }) => {
                        const node = graphData.nodes.find((n) => n.id === id);
                        return node ? (
                          <button
                            key={id}
                            type="button"
                            onClick={() => selectNode(node)}
                            className="px-2 py-1 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs hover:bg-blue-500/30 transition-colors"
                          >
                            Author: {label.length > 10 ? `${label.slice(0, 10)}…` : label} ({count})
                          </button>
                        ) : null;
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    In this view only. Switch <span className="text-emerald-300">Show</span> or <span className="text-emerald-300">View</span> to see other connection types.
                  </p>
                </motion.div>
              )}
              {/* Simple vs Full view */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">View:</span>
                <div className="flex rounded-lg overflow-hidden border border-emerald-500/30">
                  <button
                    type="button"
                    onClick={() => setViewMode('simple')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'simple' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'}`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('full')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'full' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'}`}
                  >
                    Full
                  </button>
                </div>
                {viewMode === 'simple' && (
                  <>
                    <span className="text-xs text-slate-500">Show:</span>
                    <select
                      value={simpleConnectionType}
                      onChange={(e) => setSimpleConnectionType(e.target.value as 'tag' | 'author' | 'source' | 'type')}
                      className="bg-gray-700/60 border border-emerald-500/30 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                    >
                      <option value="tag">By topic</option>
                      <option value="author">By author</option>
                      <option value="source">By source</option>
                      <option value="type">By kind</option>
                    </select>
                    <span className="text-xs text-slate-500 ml-2">Density:</span>
                    <div className="flex rounded-lg overflow-hidden border border-emerald-500/30">
                      <button
                        type="button"
                        onClick={() => setSimpleMaxResources(10)}
                        className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          simpleMaxResources === 10 ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Low
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimpleMaxResources(SIMPLE_VIEW_MAX_RESOURCES)}
                        className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          simpleMaxResources === SIMPLE_VIEW_MAX_RESOURCES ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Med
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimpleMaxResources(40)}
                        className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          simpleMaxResources === 40 ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        High
                      </button>
                    </div>
                  </>
                )}
                <span className="text-xs text-slate-500 ml-1">|</span>
                <div className="flex rounded-lg overflow-hidden border border-emerald-500/30">
                  <button
                    type="button"
                    onClick={() => setIs3D(false)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${!is3D ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'}`}
                    title="2D view"
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    onClick={() => setIs3D(true)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${is3D ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-700/60 text-slate-400 hover:text-slate-200'}`}
                    title="3D view"
                  >
                    3D
                  </button>
                </div>
              </div>
              </div>
            </div>
            
            <div className={`${mobileHeaderExpanded ? 'flex' : 'hidden'} items-center gap-2 flex-shrink-0`}>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by topic, author, or paper…"
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
                  title="Reset view / Show all"
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEdgeLabels((v) => !v)}
                  className={`p-2 rounded-lg transition-all ${showEdgeLabels ? 'text-emerald-300 bg-emerald-500/20' : 'text-slate-300 hover:text-white hover:bg-emerald-500/20'}`}
                  title="Show relationship labels"
                  aria-label="Show relationship labels on edges"
                >
                  <Tag className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLegend(!showLegend)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-all"
                  title="Toggle Legend"
                  aria-label="Toggle legend"
                >
                  <Eye className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-all"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </motion.button>
                {onClose && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2 text-slate-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all ml-2"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Help / How to read this modal */}
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowHelp(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-gray-800 border border-emerald-500/30 rounded-xl p-6 max-w-md shadow-2xl"
                >
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-emerald-400" />
                    How to read this map
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300 mb-4">
                    <li>• <strong className="text-white">Purple</strong> = papers and resources</li>
                    <li>• <strong className="text-white">Blue</strong> = people (authors)</li>
                    <li>• <strong className="text-white">Green</strong> = topics</li>
                    <li>• <strong className="text-white">Orange</strong> = where it&apos;s from (source)</li>
                    <li>• <strong className="text-white">Yellow</strong> = kind (paper, dataset, etc.)</li>
                    <li>• Lines show how items are connected. Turn on &quot;relationship labels&quot; (tag icon) to see labels on lines.</li>
                  </ul>
                  <div className="mb-4 rounded-lg bg-gray-900/60 border border-emerald-500/20 p-3">
                    <p className="text-xs text-emerald-300 font-semibold mb-2">Relationship types</p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li><strong className="text-white">Written by</strong> — links a paper to its author. Example: Paper A → Written by → Jane Doe</li>
                      <li><strong className="text-white">Topic</strong> — links a paper to a topic tag. Example: Paper A → Topic → LLM</li>
                      <li><strong className="text-white">From</strong> — links a paper to its source (e.g. arXiv, Zenodo). Example: Paper A → From → arXiv</li>
                      <li><strong className="text-white">Kind</strong> — links a resource to its type (paper, dataset, etc.). Example: Paper A → Kind → paper</li>
                    </ul>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Click any dot to see details. Use the search box to focus on a topic, author, or paper.
                  </p>
                  <div className="mb-4 rounded-lg bg-gray-900/60 border border-emerald-500/20 p-3">
                    <p className="text-xs text-emerald-300 font-semibold mb-1">Example: how to read this</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300">
                      <li>Start in <span className="text-emerald-300">Simple</span> view with <span className="text-emerald-300">Show: By topic</span>.</li>
                      <li>Look for a topic node (green) such as &quot;LLM&quot; or &quot;open hardware&quot;.</li>
                      <li>Click that topic to see the papers (purple) connected to it in the details panel.</li>
                      <li>Switch <span className="text-emerald-300">Show</span> to &quot;By author&quot; to see who writes across multiple topics.</li>
                      <li>Use <span className="text-emerald-300">Full</span> view when you want to see all connection types at once.</li>
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="w-full py-2 rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 font-medium transition-colors"
                  >
                    Got it
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* First-time hint */}
          <AnimatePresence>
            {showFirstTimeHint && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-2 right-2 z-40 max-w-xs rounded-xl bg-gray-800/95 border border-emerald-500/40 p-4 shadow-xl"
              >
                <p className="text-sm text-slate-200 mb-3">This map shows how your results connect. <strong className="text-white">Purple</strong> = papers, <strong className="text-white">Blue</strong> = authors, <strong className="text-white">Green</strong> = topics. Click a dot to see details.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFirstTimeHint(false);
                      if (typeof window !== 'undefined') localStorage.setItem('kg-onboarding-done', '1');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 text-xs font-medium"
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFirstTimeHint(false);
                      if (typeof window !== 'undefined') localStorage.setItem('kg-onboarding-done', '1');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-gray-700 text-slate-300 hover:bg-gray-600 text-xs"
                  >
                    Don&apos;t show again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Graph container */}
          <div className="relative flex-1 min-h-[50vh] sm:min-h-[400px]">
            {!is3D ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                ref={containerRef}
                className="w-full h-full bg-gray-900/40 backdrop-blur-sm"
                style={{
                  minHeight: '400px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '12px',
                }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col bg-gray-900/40 backdrop-blur-sm rounded-xl"
                style={{
                  minHeight: '400px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <p className="text-xs text-slate-400 px-3 py-2 border-b border-emerald-500/20 shrink-0">
                  Hover over a node to see its name · Click a node for details · Use the legend (left) for colors
                </p>
                <div className="flex-1 min-h-0 relative">
                <KnowledgeGraph3D
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onNodeClick={(id, type) => {
                    const node = graphData.nodes.find((n) => n.id === id);
                    if (node) {
                      setSelectedNode(node);
                      setExpanded(false);
                      onSelect?.(id, type);
                    }
                  }}
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-gray-800/90 border border-emerald-500/20 text-xs text-slate-300 pointer-events-none">
                  Drag to rotate · Scroll to zoom · Right-drag to pan
                </div>
                </div>
              </div>
            )}
            
            {/* Contextual tip when nothing is selected */}
            {!selectedNode && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-gray-800/90 border border-emerald-500/20 text-[11px] text-slate-300">
                Tip: Click any node to see details. Use <span className="text-emerald-300">View</span> and <span className="text-emerald-300">Show</span> to switch between topics, authors, and sources.
              </div>
            )}

            {/* Floating Legend */}
            <AnimatePresence>
              {showLegend && !isFullscreen && (
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
                      <span className="text-slate-300">Papers & resources</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span className="text-slate-300">People</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                      <span className="text-slate-300">Topics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                      <span className="text-slate-300">Where it&apos;s from</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
                      <span className="text-slate-300">Kind (paper, dataset…)</span>
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
                  className={
                    expanded
                      ? 'fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70'
                      : 'absolute bottom-4 right-4 z-30'
                  }
                  onClick={() => {
                    if (expanded) {
                      setExpanded(false);
                      setSelectedNode(null);
                    }
                  }}
                >
                  <div
                    className={`bg-gray-800/90 backdrop-blur-md rounded-xl p-4 border border-emerald-500/30 shadow-xl ${
                      expanded ? 'w-full max-w-2xl max-h-[80vh] overflow-y-auto' : 'max-w-sm'
                    }`}
                    onClick={(e) => e.stopPropagation()}
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
                          {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded(false);
                          setSelectedNode(null);
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors"
                        aria-label="Close details"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <h4 className={`text-white font-semibold mb-1 leading-tight ${expanded ? 'text-base' : 'text-sm'}`}>
                      {selectedNode.meta?.fullTitle || selectedNode.label}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      {NODE_TYPE_DESCRIPTIONS[selectedNode.type] ?? 'This node is connected to others in the graph.'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all"
                        onClick={() => setExpanded(!expanded)}
                      >
                        {expanded ? 'Collapse' : 'Details'}
                      </motion.button>
                      {!is3D && cy && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1.5 bg-gray-700/80 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-all"
                          onClick={focusSelectedNode}
                        >
                          Focus on this
                        </motion.button>
                      )}
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
                              <span className="font-medium text-slate-200">Connected to (click to select):</span>
                              <div className="mt-1 max-h-32 overflow-y-auto">
                                {getConnectedItems().slice(0, 10).map((item: KGNode) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectNode(item)}
                                    className="w-full flex items-center gap-2 py-1 text-left rounded hover:bg-gray-700/50 transition-colors"
                                  >
                                    <div 
                                      className="w-2 h-2 rounded shrink-0" 
                                      style={{ 
                                        backgroundColor: 
                                          item.type === 'resource' ? '#8b5cf6' :
                                          item.type === 'author' ? '#3b82f6' :
                                          item.type === 'tag' ? '#10b981' :
                                          item.type === 'source' ? '#f97316' :
                                          item.type === 'type' ? '#eab308' : '#8b5cf6'
                                      }}
                                    />
                                    <span className="text-slate-400 truncate">
                                      {item.label.length > 40 ? `${item.label.substring(0, 40)}...` : item.label}
                                    </span>
                                    <span className="text-slate-500 shrink-0">({TYPE_LABELS[item.type] ?? item.type})</span>
                                  </button>
                                ))}
                                {getConnectedItems().length > 10 && (
                                  <div className="text-slate-500 text-xs mt-1">
                                    +{getConnectedItems().length - 10} more connections
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-6xl h-[calc(100vh-2rem)] flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return content;
}