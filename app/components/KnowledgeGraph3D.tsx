'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';

const NODE_COLORS: Record<string, string> = {
  resource: '#8b5cf6',
  author: '#3b82f6',
  tag: '#10b981',
  source: '#f97316',
  type: '#eab308',
};

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface GraphNode {
  id: string;
  label: string;
  type: string;
}
interface GraphLink {
  source: string;
  target: string;
}

interface KnowledgeGraph3DProps {
  nodes: GraphNode[];
  edges: GraphLink[];
  onNodeClick?: (id: string, type: string) => void;
  width?: number;
  height?: number;
}

export default function KnowledgeGraph3D({ nodes, edges, onNodeClick, width: widthProp, height: heightProp }: KnowledgeGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const links = edges.map((e) => ({ source: e.source, target: e.target }));
    return { nodes, links };
  }, [nodes, edges]);

  const width = widthProp ?? size.width;
  const height = heightProp ?? size.height;

  if (nodes.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-xl bg-gray-900/40">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(n) => (n as GraphNode).label ?? (n as GraphNode).id ?? ''}
        nodeColor={(n) => NODE_COLORS[(n as GraphNode).type ?? 'resource'] ?? '#8b5cf6'}
        nodeVal={(n) => ((n as GraphNode).type === 'resource' ? 1.2 : 0.8)}
        linkColor={() => 'rgba(178, 190, 195, 0.6)'}
        linkWidth={1}
        linkDirectionalParticles={0}
        onNodeClick={(n) => {
          const node = n as GraphNode;
          if (node?.id != null && onNodeClick) onNodeClick(node.id, node.type ?? 'resource');
        }}
        nodeThreeObject={(n: any) => {
          const node = n as GraphNode;
          const label = node.label || node.id;
          const sprite = new SpriteText(label);
          sprite.color = '#e5e7eb';
          sprite.textHeight = 4;
          (sprite as any).position.y = 8;
          // Keep text visible even when behind nodes
          (sprite as any).material.depthWrite = false;
          return sprite;
        }}
        nodeThreeObjectExtend
        width={width}
        height={height}
      />
    </div>
  );
}
