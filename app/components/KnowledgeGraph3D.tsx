'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
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
    // So that the graph looks more "loosely wired", cap the number of
    // connections each node can visibly show in 3D.
    const MAX_VISIBLE_DEGREE = 4;
    const degree: Record<string, number> = {};
    const limitedEdges: GraphLink[] = [];

    for (const e of edges) {
      const s = String(e.source);
      const t = String(e.target);
      const sDeg = degree[s] ?? 0;
      const tDeg = degree[t] ?? 0;

      // If both endpoints are already at or above the cap, skip this edge
      if (sDeg >= MAX_VISIBLE_DEGREE && tDeg >= MAX_VISIBLE_DEGREE) {
        continue;
      }

      limitedEdges.push(e);
      degree[s] = sDeg + 1;
      degree[t] = tDeg + 1;
    }

    const links = limitedEdges.map((e) => ({ source: e.source, target: e.target }));
    return { nodes, links };
  }, [nodes, edges]);

  const width = widthProp ?? size.width;
  const height = heightProp ?? size.height;

  // Fit graph into view whenever size or node count changes
  useEffect(() => {
    if (!fgRef.current) return;
    try {
      fgRef.current.zoomToFit(400);
    } catch {
      // no-op if graph isn't ready yet
    }
  }, [width, height, nodes.length]);

  // Add subtle depth fog so objects closer to the camera appear clearer than those in the distance
  useEffect(() => {
    if (!fgRef.current) return;
    try {
      const scene: THREE.Scene | undefined = fgRef.current.scene?.();
      if (!scene) return;
      // Slight depth fog so closer objects are clearer than distant ones
      scene.fog = new THREE.FogExp2('#020617', 0.018);
    } catch {
      // ignore if scene() is not available yet
    }
  }, []);

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
        nodeVal={(n) => {
          const node = n as GraphNode;
          if (node.type === 'source') return 1.2;
          if (node.type === 'resource') return 0.8;
          return 0.5;
        }}
        backgroundColor="#020617"
        // Pipes: thinner and more transparent
        linkColor={() => 'rgba(148, 163, 184, 0.5)'}
        linkWidth={0.2}
        linkOpacity={0.25}
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
            node.type === 'source' ? 2 :
            node.type === 'resource' ? 1.5 :
            node.type === 'author' ? 1 :
            node.type === 'tag' ? 1 :
            0.8;

          const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: NODE_COLORS[node.type] ?? NODE_COLORS.resource,
            emissive: NODE_COLORS[node.type] ?? NODE_COLORS.resource,
            emissiveIntensity: 0.6,
            metalness: 0.2,
            roughness: 0.4,
          });
          const sphere = new THREE.Mesh(sphereGeom, sphereMat);

          // Label sprite above the node (no overlap)
          const sprite = new SpriteText(label);
          sprite.color = '#e5e7eb';
          sprite.textHeight = 3; // smaller label to reduce clutter
          // Position label so its bottom edge sits just above the sphere
          sprite.center.set(0.5, 0);
          (sprite as any).position.y = radius * 1.9;
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
