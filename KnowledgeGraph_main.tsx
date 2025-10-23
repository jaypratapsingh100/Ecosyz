import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import type { Resource } from './src/types/resource';

type KGNode = { id: string; label: string; type: string };
type KGEdge = { id: string; source: string; target: string; rel: string };

interface KnowledgeGraphProps {
  resources: Resource[];
  onSelect?: (id: string, type: string) => void;
  onSave?: (resource: Resource) => void;
}

export default function KnowledgeGraph({ resources, onSelect, onSave }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [cy, setCy] = useState<Core | null>(null);

  useEffect(() => {
    if (!resources.length) return;

    // Reset selection on data change
    setSelectedNode(null);
    setExpanded(false);

    // Destroy previous instance if exists
    if (cy) {
      cy.stop(); // Stop any animations
      cy.destroy();
    }

    const { nodes, edges } = buildGraph(resources);
    renderGraph(nodes, edges, onSelect);

    // Cleanup on unmount
    return () => {
      if (cy) {
        cy.stop();
        cy.destroy();
        setCy(null);
      }
    };
  }, [resources, onSelect]);

  const buildGraph = (resources: Resource[]): { nodes: KGNode[]; edges: KGEdge[] } => {
    const nodes: KGNode[] = [];
    const edges: KGEdge[] = [];
    const seen = new Set<string>();

    for (const res of resources) {
      // Resource node with curated label (title + score/year)
      const resLabel = `${res.title}${res.score ? ` (Score: ${res.score.toFixed(1)})` : ''}${res.year ? ` (${res.year})` : ''}`;
      nodes.push({ id: res.id, label: resLabel, type: 'resource' });

      // Authors (use first author for simplicity, or all if few)
      if (res.authors) {
        const topAuthors = res.authors.slice(0, 2); // Limit to top 2 authors
        for (const author of topAuthors) {
          const authorId = `author:${author}`;
          if (!seen.has(authorId)) {
            nodes.push({ id: authorId, label: author, type: 'author' });
            seen.add(authorId);
          }
          edges.push({ id: `${res.id}-authored-${authorId}`, source: res.id, target: authorId, rel: 'AUTHORED' });
        }
      }

      // Tags (limit to top 3 for curation)
      if (res.tags) {
        const topTags = res.tags.slice(0, 3);
        for (const tag of topTags) {
          const tagId = `tag:${tag}`;
          if (!seen.has(tagId)) {
            nodes.push({ id: tagId, label: tag, type: 'tag' });
            seen.add(tagId);
          }
          edges.push({ id: `${res.id}-tagged-${tagId}`, source: res.id, target: tagId, rel: 'TAGGED' });
        }
      }

      // Source (provider)
      const sourceId = `source:${res.source}`;
      if (!seen.has(sourceId)) {
        nodes.push({ id: sourceId, label: res.source, type: 'source' });
        seen.add(sourceId);
      }
      edges.push({ id: `${res.id}-from-${sourceId}`, source: res.id, target: sourceId, rel: 'FROM' });

      // Type (resource type)
      const typeId = `type:${res.type}`;
      if (!seen.has(typeId)) {
        nodes.push({ id: typeId, label: res.type, type: 'type' });
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
        ...nodes.map(n => ({ data: n })),
        ...edges.map(e => ({ data: e })),
      ],
      style: [
        { selector: 'node', style: { 'background-color': '#6c5ce7', label: 'data(label)', 'font-size': 12, color: '#fff', 'text-outline-color': '#000', 'text-outline-width': 1 } },
        { selector: 'node[type="author"]', style: { 'background-color': '#0984e3' } },
        { selector: 'node[type="tag"]', style: { 'background-color': '#00b894' } },
        { selector: 'node[type="source"]', style: { 'background-color': '#e17055' } },
        { selector: 'node[type="type"]', style: { 'background-color': '#fdcb6e' } },
        { selector: 'edge', style: { 'line-color': '#b2bec3', width: 2, 'target-arrow-shape': 'triangle', 'target-arrow-color': '#b2bec3', label: 'data(rel)', 'font-size': 10, color: '#fff', 'text-outline-color': '#000', 'text-outline-width': 1 } },
        { selector: 'node:hover', style: { 'border-width': 2, 'border-color': '#fff' } },
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

  return (
    <div className="flex flex-col h-full">
      {!resources.length ? (
        <div className="flex items-center justify-center h-full text-white/60">
          No data to display in the graph.
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-[400px]" ref={containerRef} style={{ width: '100%', height: '100%', border: '1px solid #ccc' }} />
          {selectedNode && (
            <div className="mt-4 p-4 bg-white/10 rounded-lg">
              <h4 className="text-white font-semibold">{selectedNode.label} ({selectedNode.type})</h4>
              <div className="flex gap-2 mt-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? 'Collapse' : 'Expand Details'}
                </button>
                {selectedNode.type === 'resource' && onSave && getResourceDetails() && (
                  <button
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={() => onSave(getResourceDetails()!)}
                  >
                    Save to Workspace
                  </button>
                )}
              </div>
              {expanded && (
                <div className="mt-2 text-sm text-white/80">
                  {selectedNode.type === 'resource' && getResourceDetails() && (
                    <div>
                      <p><strong>Description:</strong> {getResourceDetails()?.description || 'N/A'}</p>
                      <p><strong>URL:</strong> <a href={getResourceDetails()?.url} target="_blank" rel="noopener" className="text-blue-300">Link</a></p>
                      <p><strong>License:</strong> {getResourceDetails()?.license || 'N/A'}</p>
                    </div>
                  )}
                  <p><strong>Connected to:</strong></p>
                  <ul>
                    {getConnectedItems().map((item: KGNode) => (
                      <li key={item.id}>- {item.label} ({item.type})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}