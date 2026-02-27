'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

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
  const fgRef = useRef<any>(null);
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

  useEffect(() => {
    if (!fgRef.current) return;
    // Fit graph into view whenever size or node count changes
    try {
      fgRef.current.zoomToFit(400);
    } catch {
      // no-op if graph isn't ready yet
    }
  }, [width, height, nodes.length]);

  if (nodes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-xl bg-black"
    >
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(n) => (n as GraphNode).label ?? (n as GraphNode).id ?? ''}
        nodeColor={(n) => NODE_COLORS[(n as GraphNode).type ?? 'resource'] ?? '#8b5cf6'}
        nodeVal={(n) => ((n as GraphNode).type === 'resource' ? 2 : 1.2)}
        backgroundColor="#020617"
        linkColor={() => 'rgba(148, 163, 184, 0.7)'}
        linkWidth={0.8}
        linkOpacity={0.5}
        linkCurvature={0.3}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.003}
        showNavInfo={false}
        enableNodeDrag={false}
        onNodeClick={(n) => {
          const node = n as GraphNode;
          if (node?.id != null && onNodeClick) onNodeClick(node.id, node.type ?? 'resource');
        }}
        nodeThreeObject={(n: any) => {
          const node = n as GraphNode;
          const label = node.label || node.id;
          const group = new THREE.Group();

          const radius =
            node.type === 'resource' ? 6 :
            node.type === 'author' ? 4 :
            node.type === 'tag' ? 4 :
            3.2;

          const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: NODE_COLORS[node.type] ?? NODE_COLORS.resource,
            emissive: NODE_COLORS[node.type] ?? NODE_COLORS.resource,
            emissiveIntensity: 0.6,
            metalness: 0.2,
            roughness: 0.4,
          });
          const sphere = new THREE.Mesh(sphereGeom, sphereMat);

          const sprite = new SpriteText(label);
          sprite.color = '#e5e7eb';
          sprite.textHeight = 5;
          (sprite as any).position.y = radius * 1.8;
          (sprite as any).material.depthWrite = false;

          group.add(sphere);
          group.add(sprite);
          return group;
        }}
        width={width}
        height={height}
      />
    </div>
  );
}
