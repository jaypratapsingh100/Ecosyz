'use client';

import { useEffect, useRef } from 'react';

export interface GraphNode { id: string; label?: string; type?: string }
export interface GraphEdge { id: string; source: string; target: string; label?: string; type?: string }

interface KnowledgeGraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function KnowledgeGraphViewer({ nodes, edges }: KnowledgeGraphViewerProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Placeholder: later, initialize Cytoscape here
  }, [nodes, edges]);

  return (
    <div ref={ref} className="w-full h-96 rounded-xl border border-gray-700/50 bg-gray-900/60 flex items-center justify-center text-gray-400">
      Knowledge Graph Viewer (coming soon)
    </div>
  );
}
