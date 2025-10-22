# 🚀 Enhanced Implementation Plan - Open Source Stack

## 🎯 Core Principle: Open Source First

**Philosophy**: Use 100% open-source technologies wherever possible. Commercial services only when absolutely necessary (e.g., cloud hosting).

---

## 📊 Open Source Technology Stack

### Vector Database Options (Choose One)
```bash
# Option 1: Qdrant (Recommended - Fully Open Source)
✅ Self-hostable vector database
✅ Written in Rust - extremely fast
✅ Docker support
✅ Free forever

# Option 2: Weaviate (Open Source)
✅ GraphQL + REST APIs
✅ Built-in vectorization
✅ Kubernetes native

# Option 3: Milvus (Apache 2.0)
✅ Cloud-native vector database
✅ Highly scalable
✅ Active community
```

### Graph Database
```bash
# Neo4j Community Edition (GPLv3)
✅ Most popular graph database
✅ Cypher query language
✅ Desktop & Docker available
✅ Community edition is free

# Alternative: Apache AGE (PostgreSQL extension)
✅ Adds graph capabilities to PostgreSQL
✅ No need for separate database
✅ Apache 2.0 license
```

### Real-time Communication
```bash
# Socket.io (MIT License)
✅ Real-time bidirectional communication
✅ Auto reconnection
✅ Room support for workspace isolation
✅ 10M+ weekly downloads
```

### Knowledge Graph Visualization
```bash
# Cytoscape.js (Already in your package.json!)
✅ Graph theory / network library
✅ Highly customizable
✅ MIT License
✅ Perfect for knowledge graphs
```

### Full-Text Search
```bash
# Option 1: PostgreSQL Full-Text Search (Built-in)
✅ Already have PostgreSQL
✅ No additional infrastructure
✅ GIN/GiST indexes

# Option 2: MeiliSearch (MIT)
✅ Lightning-fast search
✅ Typo-tolerant
✅ Easy to deploy
✅ Docker support
```

### AI/ML Open Source
```bash
# OpenAI API (Already using) - Keep for embeddings
# But add open-source alternatives:

# Ollama (MIT) - Run LLMs locally
✅ Run Llama 2, Mistral, Code Llama locally
✅ No API costs
✅ Privacy-first
✅ Docker support

# Hugging Face Transformers
✅ Thousands of open models
✅ Free inference API
✅ Self-hostable

# LangChain (MIT)
✅ LLM orchestration
✅ RAG pipelines
✅ Already planned
```

---

## 🏗️ Enhanced Implementation Plan with Cytoscape & Community

### Phase 0: Foundation Fixes (Week 1) - PRIORITY

#### Existing Tasks
- [ ] Migrate Tailwind 4.x → 3.x stable
- [ ] Clean up globals.css
- [ ] Add responsive breakpoints
- [ ] Fix glass morphism rendering

#### New: Verify Open Source Dependencies
```bash
cd /home/user/webapp && npm install --save \
  cytoscape@^3.23.0 \
  cytoscape-cola@^2.5.1 \
  cytoscape-dagre@^2.5.0 \
  socket.io@^4.6.0 \
  socket.io-client@^4.6.0
```

---

### Phase 1: Core Infrastructure (Weeks 2-4)

#### 1.1 Knowledge Graph with Cytoscape.js

**Goal**: Visualize connections between resources using the existing Cytoscape.js dependency

**Implementation**:

**File**: `app/lib/knowledge-graph/cytoscape-graph.ts`
```typescript
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import cola from 'cytoscape-cola';
import dagre from 'cytoscape-dagre';

// Register layouts
cytoscape.use(cola);
cytoscape.use(dagre);

export interface GraphNode {
  id: string;
  label: string;
  type: 'paper' | 'author' | 'dataset' | 'code' | 'concept';
  data: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'cites' | 'authored_by' | 'uses' | 'implements' | 'related_to';
  weight?: number;
}

export class KnowledgeGraph {
  private cy: Core | null = null;

  initializeGraph(container: HTMLElement, nodes: GraphNode[], edges: GraphEdge[]) {
    const elements: ElementDefinition[] = [
      // Nodes
      ...nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          ...node.data
        },
        classes: node.type
      })),
      // Edges
      ...edges.map(edge => ({
        data: {
          source: edge.source,
          target: edge.target,
          type: edge.type,
          weight: edge.weight || 1
        },
        classes: edge.type
      }))
    ];

    this.cy = cytoscape({
      container,
      elements,
      style: this.getGraphStyle(),
      layout: {
        name: 'cola',
        animate: true,
        randomize: false,
        maxSimulationTime: 1500,
        edgeLength: 100,
        nodeSpacing: 50
      },
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3
    });

    this.setupInteractions();
    return this.cy;
  }

  private getGraphStyle() {
    return [
      // Node styles by type
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'width': 40,
          'height': 40,
          'font-size': 12,
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 5,
          'background-color': '#38bdf8',
          'color': '#fff',
          'text-outline-color': '#0d0f11',
          'text-outline-width': 2,
          'overlay-padding': 6,
          'z-index': 10
        }
      },
      {
        selector: 'node.paper',
        style: {
          'background-color': '#3b82f6',
          'shape': 'rectangle',
          'width': 60,
          'height': 40
        }
      },
      {
        selector: 'node.author',
        style: {
          'background-color': '#8b5cf6',
          'shape': 'ellipse'
        }
      },
      {
        selector: 'node.dataset',
        style: {
          'background-color': '#10b981',
          'shape': 'diamond',
          'width': 50,
          'height': 50
        }
      },
      {
        selector: 'node.code',
        style: {
          'background-color': '#f59e0b',
          'shape': 'octagon'
        }
      },
      {
        selector: 'node.concept',
        style: {
          'background-color': '#ec4899',
          'shape': 'round-tag'
        }
      },
      // Edge styles by type
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#374151',
          'target-arrow-color': '#374151',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.6
        }
      },
      {
        selector: 'edge.cites',
        style: {
          'line-color': '#3b82f6',
          'target-arrow-color': '#3b82f6',
          'line-style': 'solid'
        }
      },
      {
        selector: 'edge.authored_by',
        style: {
          'line-color': '#8b5cf6',
          'target-arrow-color': '#8b5cf6'
        }
      },
      {
        selector: 'edge.uses',
        style: {
          'line-color': '#10b981',
          'target-arrow-color': '#10b981',
          'line-style': 'dashed'
        }
      },
      // Hover effects
      {
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-color': '#39ff14',
          'background-color': '#1e40af'
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'width': 4,
          'line-color': '#39ff14',
          'opacity': 1
        }
      }
    ];
  }

  private setupInteractions() {
    if (!this.cy) return;

    // Click on node to highlight connected edges
    this.cy.on('tap', 'node', (event) => {
      const node = event.target;
      const connectedEdges = node.connectedEdges();
      
      // Reset all
      this.cy?.elements().removeClass('highlighted dimmed');
      
      // Highlight connected
      node.addClass('highlighted');
      connectedEdges.addClass('highlighted');
      
      // Dim others
      this.cy?.elements().difference(connectedEdges.union(node)).addClass('dimmed');
    });

    // Click on background to reset
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.cy?.elements().removeClass('highlighted dimmed');
      }
    });

    // Double-click to expand/collapse
    this.cy.on('dbltap', 'node', (event) => {
      const node = event.target;
      // Trigger custom event for expansion
      window.dispatchEvent(new CustomEvent('graph-node-expand', {
        detail: { nodeId: node.id(), nodeData: node.data() }
      }));
    });
  }

  addNode(node: GraphNode) {
    if (!this.cy) return;
    this.cy.add({
      data: { id: node.id, label: node.label, type: node.type, ...node.data },
      classes: node.type
    });
  }

  addEdge(edge: GraphEdge) {
    if (!this.cy) return;
    this.cy.add({
      data: {
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight || 1
      },
      classes: edge.type
    });
  }

  getNeighborhood(nodeId: string, depth: number = 1) {
    if (!this.cy) return null;
    const node = this.cy.getElementById(nodeId);
    return node.neighborhood().filter(`node[depth<=${depth}]`);
  }

  exportGraph() {
    if (!this.cy) return null;
    return {
      nodes: this.cy.nodes().map(n => n.data()),
      edges: this.cy.edges().map(e => e.data())
    };
  }

  destroy() {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }
}
```

**React Component**: `app/components/knowledge-graph/KnowledgeGraphViewer.tsx`
```typescript
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { KnowledgeGraph, GraphNode, GraphEdge } from '@/lib/knowledge-graph/cytoscape-graph';
import { motion } from 'framer-motion';
import { Network, ZoomIn, ZoomOut, Maximize2, Download, RefreshCw } from 'lucide-react';

interface KnowledgeGraphViewerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  height?: string;
}

export default function KnowledgeGraphViewer({
  nodes,
  edges,
  onNodeClick,
  height = '600px'
}: KnowledgeGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<KnowledgeGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    const graph = new KnowledgeGraph();
    graph.initializeGraph(containerRef.current, nodes, edges);
    graphRef.current = graph;
    
    setStats({ nodes: nodes.length, edges: edges.length });
    setIsLoading(false);

    // Listen for node expansion events
    const handleExpand = (event: any) => {
      onNodeClick?.(event.detail.nodeId, event.detail.nodeData);
    };
    window.addEventListener('graph-node-expand', handleExpand);

    return () => {
      graph.destroy();
      window.removeEventListener('graph-node-expand', handleExpand);
    };
  }, [nodes, edges]);

  const handleZoomIn = () => {
    graphRef.current?.cy?.zoom(graphRef.current.cy.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    graphRef.current?.cy?.zoom(graphRef.current.cy.zoom() * 0.8);
  };

  const handleFit = () => {
    graphRef.current?.cy?.fit(undefined, 50);
  };

  const handleExport = () => {
    const data = graphRef.current?.exportGraph();
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'knowledge-graph.json';
      a.click();
    }
  };

  return (
    <div className="relative bg-dark-card rounded-xl border border-white/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-dark-secondary">
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-neon-blue" />
          <div>
            <h3 className="text-white font-semibold">Knowledge Graph</h3>
            <p className="text-sm text-gray-400">
              {stats.nodes} nodes • {stats.edges} connections
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleZoomIn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4 text-white" />
          </motion.button>
          
          <motion.button
            onClick={handleZoomOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4 text-white" />
          </motion.button>
          
          <motion.button
            onClick={handleFit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4 text-white" />
          </motion.button>
          
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="Export Graph"
          >
            <Download className="h-4 w-4 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef} 
        style={{ height }}
        className="w-full relative bg-gradient-to-br from-slate-900 to-slate-800"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-card/50 backdrop-blur-sm">
            <RefreshCw className="h-8 w-8 text-neon-blue animate-spin" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-dark-secondary border-t border-white/20">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-gray-300">Papers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full" />
            <span className="text-gray-300">Authors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rotate-45" />
            <span className="text-gray-300">Datasets</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} />
            <span className="text-gray-300">Code</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-500 rounded-full" />
            <span className="text-gray-300">Concepts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 1.2 Vector Database with Qdrant (Open Source)

**Setup**:
```bash
# Docker Compose for Qdrant
docker run -p 6333:6333 qdrant/qdrant
```

**File**: `app/lib/vectordb/qdrant-client.ts`
```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

export class VectorDatabase {
  private client: QdrantClient;
  private collectionName = 'open_idea_resources';

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333'
    });
  }

  async initialize() {
    // Create collection if doesn't exist
    try {
      await this.client.getCollection(this.collectionName);
    } catch {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 1536, // OpenAI embedding size
          distance: 'Cosine'
        }
      });
    }
  }

  async addDocument(id: string, embedding: number[], metadata: any) {
    await this.client.upsert(this.collectionName, {
      points: [{
        id,
        vector: embedding,
        payload: metadata
      }]
    });
  }

  async search(queryEmbedding: number[], limit: number = 10, filter?: any) {
    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      filter
    });

    return results.map(r => ({
      id: r.id,
      score: r.score,
      ...r.payload
    }));
  }
}
```

#### 1.3 Graph Database with Neo4j Community Edition

**Docker Setup**:
```yaml
# docker-compose.yml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15-community
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    environment:
      - NEO4J_AUTH=neo4j/password123
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  neo4j_data:
  qdrant_data:
```

**File**: `app/lib/knowledge-graph/neo4j-client.ts`
```typescript
import neo4j from 'neo4j-driver';

export class GraphDatabase {
  private driver: any;

  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD || 'password123')
    );
  }

  async addResource(resource: any) {
    const session = this.driver.session();
    try {
      await session.run(`
        MERGE (r:Resource {id: $id})
        SET r.title = $title,
            r.type = $type,
            r.url = $url,
            r.createdAt = datetime()
      `, resource);
    } finally {
      await session.close();
    }
  }

  async createRelationship(fromId: string, toId: string, type: string, properties?: any) {
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (from:Resource {id: $fromId})
        MATCH (to:Resource {id: $toId})
        MERGE (from)-[r:${type}]->(to)
        SET r += $properties
      `, { fromId, toId, properties: properties || {} });
    } finally {
      await session.close();
    }
  }

  async getRelatedResources(resourceId: string, depth: number = 2) {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = (r:Resource {id: $id})-[*1..${depth}]-(related:Resource)
        RETURN related, relationships(path)
        LIMIT 20
      `, { id: resourceId });

      return result.records.map(record => ({
        resource: record.get('related').properties,
        relationships: record.get('relationships')
      }));
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }
}
```

---

### Phase 2: Community & Discussion Features (Weeks 5-7)

#### 2.1 Community Hub

**File**: `app/components/community/CommunityHub.tsx`
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Trophy, Calendar, TrendingUp, Award } from 'lucide-react';

interface CommunityHubProps {
  userId?: string;
}

export default function CommunityHub({ userId }: CommunityHubProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'discussions' | 'challenges' | 'leaderboard'>('feed');
  const [communityStats, setCommunityStats] = useState({
    totalMembers: 0,
    activeDiscussions: 0,
    openChallenges: 0,
    projectsShared: 0
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Community Hub</h2>
            <p className="text-gray-400">Connect, collaborate, and learn together</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Members', value: communityStats.totalMembers, icon: Users, color: 'from-blue-500 to-cyan-500' },
          { label: 'Discussions', value: communityStats.activeDiscussions, icon: MessageSquare, color: 'from-green-500 to-emerald-500' },
          { label: 'Challenges', value: communityStats.openChallenges, icon: Trophy, color: 'from-orange-500 to-red-500' },
          { label: 'Projects Shared', value: communityStats.projectsShared, icon: TrendingUp, color: 'from-purple-500 to-pink-500' }
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/20">
        {[
          { id: 'feed', label: 'Community Feed', icon: TrendingUp },
          { id: 'discussions', label: 'Discussions', icon: MessageSquare },
          { id: 'challenges', label: 'Challenges', icon: Trophy },
          { id: 'leaderboard', label: 'Leaderboard', icon: Award }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
              activeTab === tab.id
                ? 'text-neon-blue border-b-2 border-neon-blue'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'feed' && <CommunityFeed />}
        {activeTab === 'discussions' && <DiscussionBoard />}
        {activeTab === 'challenges' && <ChallengesSection />}
        {activeTab === 'leaderboard' && <Leaderboard />}
      </div>
    </div>
  );
}

// Sub-components
function CommunityFeed() {
  return (
    <div className="space-y-4">
      {/* Feed items */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <p className="text-gray-300">Community feed coming soon...</p>
      </div>
    </div>
  );
}

function DiscussionBoard() {
  return (
    <div className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <p className="text-gray-300">Discussion board coming soon...</p>
      </div>
    </div>
  );
}

function ChallengesSection() {
  return (
    <div className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <p className="text-gray-300">Challenges coming soon...</p>
      </div>
    </div>
  );
}

function Leaderboard() {
  return (
    <div className="space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <p className="text-gray-300">Leaderboard coming soon...</p>
      </div>
    </div>
  );
}
```

#### 2.2 Discussion System with Threading

**Database Schema Addition**:
```prisma
// Add to prisma/schema.prisma

model Discussion {
  id          String   @id @default(cuid())
  workspaceId String?
  resourceId  String?
  title       String
  content     String   @db.Text
  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  isPinned    Boolean  @default(false)
  isLocked    Boolean  @default(false)
  tags        String[]
  
  author      User     @relation(fields: [authorId], references: [id])
  comments    Comment[]
  reactions   Reaction[]
  
  @@index([workspaceId])
  @@index([resourceId])
  @@index([authorId])
}

model Comment {
  id           String   @id @default(cuid())
  discussionId String
  parentId     String?  // For threading
  content      String   @db.Text
  authorId     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  isEdited     Boolean  @default(false)
  
  discussion   Discussion @relation(fields: [discussionId], references: [id], onDelete: Cascade)
  parent       Comment?   @relation("CommentThread", fields: [parentId], references: [id])
  replies      Comment[]  @relation("CommentThread")
  author       User       @relation(fields: [authorId], references: [id])
  reactions    Reaction[]
  
  @@index([discussionId])
  @@index([parentId])
  @@index([authorId])
}

model Reaction {
  id           String   @id @default(cuid())
  type         String   // thumbs_up, heart, celebrate, etc.
  userId       String
  discussionId String?
  commentId    String?
  createdAt    DateTime @default(now())
  
  user         User        @relation(fields: [userId], references: [id])
  discussion   Discussion? @relation(fields: [discussionId], references: [id], onDelete: Cascade)
  comment      Comment?    @relation(fields: [commentId], references: [id], onDelete: Cascade)
  
  @@unique([userId, discussionId, type])
  @@unique([userId, commentId, type])
  @@index([userId])
  @@index([discussionId])
  @@index([commentId])
}
```

#### 2.3 Real-time Discussion with Socket.io

**File**: `app/lib/realtime/discussion-socket.ts`
```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class DiscussionSocketServer {
  private io: SocketIOServer;

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join discussion room
      socket.on('join:discussion', (discussionId: string) => {
        socket.join(`discussion:${discussionId}`);
        socket.to(`discussion:${discussionId}`).emit('user:joined', {
          userId: socket.data.userId,
          socketId: socket.id
        });
      });

      // New comment
      socket.on('comment:new', (data) => {
        this.io.to(`discussion:${data.discussionId}`).emit('comment:created', data);
      });

      // Typing indicator
      socket.on('typing:start', (data) => {
        socket.to(`discussion:${data.discussionId}`).emit('user:typing', {
          userId: socket.data.userId,
          discussionId: data.discussionId
        });
      });

      socket.on('typing:stop', (data) => {
        socket.to(`discussion:${data.discussionId}`).emit('user:stopped-typing', {
          userId: socket.data.userId,
          discussionId: data.discussionId
        });
      });

      // Reactions
      socket.on('reaction:add', (data) => {
        this.io.to(`discussion:${data.discussionId}`).emit('reaction:added', data);
      });

      // Leave discussion
      socket.on('leave:discussion', (discussionId: string) => {
        socket.leave(`discussion:${discussionId}`);
        socket.to(`discussion:${discussionId}`).emit('user:left', {
          userId: socket.data.userId
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    return this.io;
  }
}
```

#### 2.4 Share & Export Features

**File**: `app/components/share/ShareModal.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link2, Mail, MessageSquare, Download, Globe, Lock, Users, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export default function ShareModal({ isOpen, onClose, workspaceId, workspaceName }: ShareModalProps) {
  const [shareType, setShareType] = useState<'public' | 'private' | 'team'>('private');
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const generateShareLink = async () => {
    const response = await fetch('/api/workspaces/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, shareType })
    });
    const data = await response.json();
    setShareLink(data.shareUrl);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Share Workspace</h3>
                  <p className="text-sm text-gray-400">{workspaceName}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                ×
              </button>
            </div>

            {/* Share Type Selection */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-gray-300">Access Level</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'private', label: 'Private', icon: Lock, desc: 'Only you' },
                  { type: 'team', label: 'Team', icon: Users, desc: 'Selected users' },
                  { type: 'public', label: 'Public', icon: Globe, desc: 'Anyone with link' }
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setShareType(option.type as any)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      shareType === option.type
                        ? 'border-neon-blue bg-blue-500/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <option.icon className={`h-5 w-5 mx-auto mb-2 ${
                      shareType === option.type ? 'text-neon-blue' : 'text-gray-400'
                    }`} />
                    <p className="text-sm font-medium text-white">{option.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Link */}
            {!shareLink ? (
              <motion.button
                onClick={generateShareLink}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Generate Share Link
              </motion.button>
            ) : (
              <>
                {/* Share Link */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    />
                    <motion.button
                      onClick={copyToClipboard}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <Copy className="h-5 w-5 text-white" />
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Share Options */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### Phase 3: Complete Implementation (Weeks 8-16)

See `IMPLEMENTATION_PLAN.md` for full details on remaining phases.

---

## 📦 Updated package.json (Open Source Stack)

```json
{
  "dependencies": {
    // Existing
    "next": "15.3.5",
    "react": "^19.0.0",
    "openai": "^6.2.0",
    
    // Knowledge Graph & Visualization
    "cytoscape": "^3.23.0",
    "cytoscape-cola": "^2.5.1",
    "cytoscape-dagre": "^2.5.0",
    
    // Vector Database (Open Source)
    "@qdrant/js-client-rest": "^1.7.0",
    
    // Graph Database
    "neo4j-driver": "^5.15.0",
    
    // Real-time (Open Source)
    "socket.io": "^4.6.0",
    "socket.io-client": "^4.6.0",
    
    // RAG & LLM (Open Source)
    "langchain": "^0.1.0",
    "@langchain/openai": "^0.0.10",
    
    // Full-Text Search (Optional - Open Source)
    "meilisearch": "^0.37.0",
    
    // Misc Open Source
    "zod": "^4.1.9",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^3.2.4",
    "@types/cytoscape": "^3.19.0"
  }
}
```

---

## 🐳 Docker Setup (Complete Open Source Stack)

**File**: `docker-compose.yml`
```yaml
version: '3.8'

services:
  # Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334

  # Graph Database
  neo4j:
    image: neo4j:5.15-community
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    environment:
      - NEO4J_AUTH=neo4j/your_password_here
      - NEO4J_PLUGINS=["apoc", "graph-data-science"]
      - NEO4J_dbms_memory_heap_max__size=2G
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs

  # Full-Text Search (Optional)
  meilisearch:
    image: getmeili/meilisearch:latest
    ports:
      - "7700:7700"
    environment:
      - MEILI_MASTER_KEY=your_master_key_here
    volumes:
      - meilisearch_data:/meili_data

  # PostgreSQL (Already using Supabase, but for local dev)
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=openidea
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis (for caching)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  qdrant_storage:
  neo4j_data:
  neo4j_logs:
  meilisearch_data:
  postgres_data:
  redis_data:
```

**Start all services**:
```bash
docker-compose up -d
```

---

## 🎯 Implementation Checklist (Open Source Focus)

### Phase 0: Foundation (Week 1)
- [ ] Fix Tailwind 4.x → 3.x
- [ ] Clean globals.css
- [ ] Install Cytoscape.js dependencies
- [ ] Set up Docker services

### Phase 1: Core (Weeks 2-4)
- [ ] Implement Cytoscape.js knowledge graph visualization
- [ ] Set up Qdrant vector database
- [ ] Configure Neo4j Community Edition
- [ ] Build semantic search with OpenAI embeddings
- [ ] Implement RAG pipeline with LangChain

### Phase 2: Community (Weeks 5-7)
- [ ] Build Community Hub component
- [ ] Implement discussion system with threading
- [ ] Add Socket.io real-time features
- [ ] Create share & export functionality
- [ ] Add reaction system

### Phase 3: Polish (Weeks 8-16)
- [ ] Gamification features
- [ ] Personalization engine
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta launch

---

## 🔒 Environment Variables (.env.local)

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# AI
OPENAI_API_KEY="sk-..."

# Vector Database (Qdrant)
QDRANT_URL="http://localhost:6333"

# Graph Database (Neo4j)
NEO4J_URI="bolt://localhost:7687"
NEO4J_PASSWORD="your_password_here"

# Search (MeiliSearch - Optional)
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="your_master_key_here"

# Redis
REDIS_URL="redis://localhost:6379"

# Real-time
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

---

## ✅ Success Criteria

### Knowledge Graph Visualization
- ✅ Interactive Cytoscape.js graph with 1000+ nodes
- ✅ Multiple layout algorithms (cola, dagre)
- ✅ Node expansion on double-click
- ✅ Export graph as JSON/PNG

### Community Features
- ✅ Threaded discussions with real-time updates
- ✅ Reaction system (emoji reactions)
- ✅ Share links with access control
- ✅ Export workspace as bundle

### Performance
- ✅ Graph renders in < 2 seconds
- ✅ Real-time updates < 100ms latency
- ✅ Search results in < 500ms

---

## 🚀 Next Steps

1. **This Week**: 
   - Install Cytoscape.js dependencies
   - Set up Docker services
   - Fix Tailwind issues

2. **Next Week**:
   - Implement knowledge graph visualization
   - Build community hub
   - Add discussion system

3. **Month 2-4**:
   - Complete all features
   - Testing and optimization
   - Beta launch

---

**All Open Source. All Free. All Yours.** 🎉
