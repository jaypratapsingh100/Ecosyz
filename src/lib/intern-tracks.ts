/**
 * Intern Fellowship tracks derived from the Open Idea Research Whitepaper.
 * Each track maps to a major pillar described in the whitepaper.
 */
export const INTERN_TRACKS = [
  {
    slug: 'platform-development',
    name: 'Platform Development',
    description:
      'Build the unified open-knowledge platform: search engine, data aggregation, project workspaces, and scalable modular architecture.',
    stipendRange: '₹5,000–15,000',
  },
  {
    slug: 'ai-ml',
    name: 'AI / LLM Systems',
    description:
      'Design and implement semantic enrichment, AI-powered discovery, knowledge-graph linking, and license-compliance automation.',
    stipendRange: '₹8,000–20,000',
  },
  {
    slug: 'developer-relations',
    name: 'Developer Relations',
    description:
      'Build community features, API documentation, onboarding flows, and the open-source plugin ecosystem.',
    stipendRange: '₹4,000–12,000',
  },
  {
    slug: 'marketing-growth',
    name: 'Marketing & Growth',
    description:
      'Drive user acquisition, partnership development, monetisation strategy, and brand/content campaigns.',
    stipendRange: '₹4,000–12,000',
  },
] as const;

export type InternTrackSlug = (typeof INTERN_TRACKS)[number]['slug'];

/* ------------------------------------------------------------------ */
/*  Full whitepaper-derived seed data: sub-tracks → milestones → tasks */
/* ------------------------------------------------------------------ */

export interface SeedTask {
  title: string;
  description: string;
  stipend?: number;
}

export interface SeedMilestone {
  title: string;
  description: string;
  order: number;
  stipend?: number;
  highlighted?: boolean;
  tasks: SeedTask[];
}

export interface SeedSubTrack {
  slug: string;
  name: string;
  description: string;
  order: number;
  milestones: SeedMilestone[];
}

export interface SeedTrackData {
  trackSlug: string;
  subTracks: SeedSubTrack[];
}

/**
 * Complete seed payload built from the Open Idea Research Whitepaper sections:
 *  §2 Fragmentation Problem, §3 Unified Solution, §4 How the System Works,
 *  §5 User Types, §6 Technology Stack, §7 Monetization, §8 Roadmap.
 */
export const WHITEPAPER_SEED: SeedTrackData[] = [
  /* ================================================================
     TRACK 1 – Platform Development
     ================================================================ */
  {
    trackSlug: 'platform-development',
    subTracks: [
      /* ---------- Sub-track 1.1: Unified Search Engine ---------- */
      {
        slug: 'unified-search-engine',
        name: 'Unified Search Engine',
        description:
          'Build a comprehensive search across all resource types — research papers, code, datasets, hardware designs — ranked by semantic relevance (§4.1).',
        order: 1,
        milestones: [
          {
            title: 'Basic Keyword Search MVP',
            description:
              'Implement Elasticsearch-backed full-text search across ≤3 data sources (arXiv, GitHub, one open dataset).',
            order: 1,
            stipend: 3000,
            tasks: [
              { title: 'Set up Elasticsearch cluster & indices', description: 'Provision ES instance, create index mappings for papers, repos, and datasets.' },
              { title: 'Build unified query parser', description: 'Accept natural-language queries and translate into ES multi-index queries.' },
              { title: 'Implement search result ranking', description: 'Score results by BM25 + recency; expose paginated REST endpoint.' },
              { title: 'Add resource-type facet filters', description: 'Let users narrow results by type: paper, code, dataset.' },
            ],
          },
          {
            title: 'Semantic / Vector Search',
            description:
              'Add vector-based similarity search using embeddings so queries return semantically related results (§6 Indexing & Storage).',
            order: 2,
            stipend: 5000,
            tasks: [
              { title: 'Integrate vector database (Pinecone / pgvector)', description: 'Stand up a vector store alongside ES for hybrid search.' },
              { title: 'Generate embeddings pipeline', description: 'Batch-compute Sentence-BERT / OpenAI embeddings for indexed resources.' },
              { title: 'Implement hybrid keyword + vector ranking', description: 'Fuse BM25 and cosine-similarity scores for final ranking.' },
              { title: 'Write search relevance evaluation suite', description: 'Create benchmark queries + expected top-5 results; track precision/recall.' },
            ],
          },
          {
            title: 'Multi-Source Expansion (10 M+ resources)',
            description:
              'Expand search to tens of millions of indexed items across many more sources (§8 Phase 2).',
            order: 3,
            stipend: 5000,
            tasks: [
              { title: 'Add CrossRef, Semantic Scholar connectors', description: 'Crawl and normalise metadata from CrossRef and S2 APIs.' },
              { title: 'Add open-data portals (Kaggle, HuggingFace)', description: 'Index dataset cards and model cards from Kaggle and HuggingFace.' },
              { title: 'Implement incremental index refresh', description: 'Schedule nightly delta crawls so new resources appear within 24 h.' },
              { title: 'Performance-tune search at scale', description: 'Shard ES indices, add caching layer, target < 500 ms p95 latency.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 1.2: Data Aggregation Layer ---------- */
      {
        slug: 'data-aggregation',
        name: 'Data Aggregation & Crawling',
        description:
          'Connectors and crawlers that fetch content from APIs (arXiv, CrossRef, GitHub, etc.) and websites (§6 Data Aggregation Layer).',
        order: 2,
        milestones: [
          {
            title: 'Core Crawler Framework',
            description:
              'Build a pluggable crawler framework with rate-limiting, retry logic, and normalisation.',
            order: 1,
            stipend: 3000,
            tasks: [
              { title: 'Design crawler plugin interface', description: 'Define Source → NormalisedResource adapter pattern.' },
              { title: 'Implement arXiv OAI-PMH harvester', description: 'Fetch paper metadata and abstracts via OAI-PMH protocol.' },
              { title: 'Implement GitHub REST/GraphQL connector', description: 'Fetch public repos, READMEs, topics, and star counts.' },
              { title: 'Add rate-limiting & back-off logic', description: 'Respect API quotas; exponential back-off on 429 responses.' },
            ],
          },
          {
            title: 'Extended Source Connectors',
            description:
              'Add connectors for additional open-knowledge hubs: CrossRef, PubMed, Kaggle, HuggingFace, ORCID.',
            order: 2,
            stipend: 4000,
            tasks: [
              { title: 'CrossRef connector', description: 'Fetch journal article metadata via CrossRef REST API.' },
              { title: 'PubMed / PMC connector', description: 'Harvest biomedical papers and open-access full texts.' },
              { title: 'Kaggle datasets connector', description: 'Pull dataset metadata, descriptions, and tags via Kaggle API.' },
              { title: 'HuggingFace model & dataset cards', description: 'Crawl HuggingFace Hub API for model/dataset metadata.' },
            ],
          },
          {
            title: 'Data Quality & Deduplication',
            description:
              'Ensure aggregated resources are deduplicated, normalised, and quality-scored.',
            order: 3,
            stipend: 3000,
            tasks: [
              { title: 'Build deduplication pipeline', description: 'Use DOI / URL / title-similarity hashing to detect duplicates.' },
              { title: 'Implement metadata normalisation', description: 'Map heterogeneous schemas to a unified resource model (§2 Heterogeneous Data).' },
              { title: 'Add data quality scoring', description: 'Score resources on completeness, freshness, and source authority.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 1.3: Project Workspaces ---------- */
      {
        slug: 'project-workspaces',
        name: 'Project Workspaces & Remixing',
        description:
          'Create live projects, pull in any open resource, remix and collaborate in-browser (§4.4).',
        order: 3,
        milestones: [
          {
            title: 'Basic Workspace CRUD',
            description:
              'Users can create, list, rename, and delete project workspaces; drag resources in.',
            order: 1,
            stipend: 3000,
            tasks: [
              { title: 'Workspace create/list/delete API', description: 'REST endpoints for workspace lifecycle with ownership checks.' },
              { title: 'Resource import into workspace', description: 'Allow users to save any search result into a workspace.' },
              { title: 'Workspace detail UI', description: 'Dashboard showing saved resources, annotations, and metadata.' },
            ],
          },
          {
            title: 'Real-Time Collaboration',
            description:
              'Multiple users can co-edit a workspace in real-time with presence indicators (§8 Phase 3).',
            order: 2,
            stipend: 5000,
            tasks: [
              { title: 'Implement WebSocket layer for live sync', description: 'Use Socket.io / Supabase Realtime for collaborative editing.' },
              { title: 'Add user presence indicators', description: 'Show who else is viewing / editing the workspace.' },
              { title: 'Build conflict resolution strategy', description: 'CRDT or OT-based conflict handling for simultaneous edits.' },
              { title: 'Sharing & access control', description: 'Public/private workspaces, invite-by-email, read/write roles.' },
            ],
          },
          {
            title: 'Remix & Publish',
            description:
              'Users can remix resources, create derivative projects, and publish back to the community.',
            order: 3,
            stipend: 4000,
            tasks: [
              { title: 'Build remix workflow', description: 'Fork a workspace, combine resources from multiple sources, attribute originals.' },
              { title: 'Add publication flow', description: 'Let users publish a workspace as a public project with a DOI-like permalink.' },
              { title: 'Implement license compatibility checker', description: 'Before publishing, verify all imported resource licenses are compatible.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 1.4: Infrastructure & Architecture ---------- */
      {
        slug: 'infrastructure',
        name: 'Infrastructure & Scalable Architecture',
        description:
          'Modular, microservices-based infrastructure that adapts to any resource type and scales globally (§3, §6).',
        order: 4,
        milestones: [
          {
            title: 'Core Backend Services',
            description:
              'REST & GraphQL APIs orchestrate search, user/project management, and all user-facing features (§6 Application Backend).',
            order: 1,
            stipend: 4000,
            tasks: [
              { title: 'Set up API gateway', description: 'Single entry-point routing to internal microservices.' },
              { title: 'Implement auth & session management', description: 'JWT/session-based auth with Supabase integration.' },
              { title: 'Build GraphQL schema for resources', description: 'Unified GQL schema spanning papers, code, datasets, projects.' },
              { title: 'CI/CD pipeline setup', description: 'GitHub Actions pipeline: lint → test → build → deploy to staging.' },
            ],
          },
          {
            title: 'Horizontal Scaling',
            description:
              'Scale infrastructure to support 50–100 M aggregated resources and growing user base (§8 Phase 3).',
            order: 2,
            stipend: 5000,
            tasks: [
              { title: 'Containerise all services (Docker)', description: 'Dockerfiles + docker-compose for local dev; K8s manifests for prod.' },
              { title: 'Implement job queue for crawlers', description: 'Use BullMQ or similar for background crawl/index jobs.' },
              { title: 'Add CDN & edge caching', description: 'Cache static assets and popular search results at the edge.' },
              { title: 'Set up monitoring & alerting', description: 'Prometheus + Grafana dashboards; PagerDuty-style alerts on error spikes.' },
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================
     TRACK 2 – AI / LLM Systems
     3 sub-tracks:  Research (open-source aggregation)
                    Build   (idea-to-app)
                    Collaborate (community · smart-connect · knowledge graph)
     ================================================================ */
  {
    trackSlug: 'ai-ml',
    subTracks: [
      /* ──────────────────────────────────────────────────────────────
         2.1  RESEARCH  —  Open-Source Aggregation
         Federated search, new providers, semantic search, crawling,
         indexing, data quality, and enrichment.
         ────────────────────────────────────────────────────────────── */
      {
        slug: 'research',
        name: 'Research — Open-Source Aggregation',
        description:
          'Expand federated search with new providers, add semantic/vector search, build a crawl-and-index pipeline, and enrich resource metadata.',
        order: 1,
        milestones: [
          /* --- M1: Knowledge Graph Comprehension Engine --- */
          {
            title: 'Knowledge Graph Comprehension Engine',
            description:
              'Build an AI engine that reads, understands, and reasons over the knowledge graph — answering complex multi-hop questions, generating insight reports, and surfacing hidden connections between resources.',
            order: 1,
            highlighted: true,
            tasks: [
              { title: 'Design comprehension query language', description: 'Define a natural-language-to-Cypher translation layer so users can ask "What papers cite X and use dataset Y?" without writing Cypher.' },
              { title: 'Build multi-hop question-answering API', description: 'New app/api/graph/comprehend/route.ts — accept a natural-language question, decompose into graph traversals, return structured answer.' },
              { title: 'Implement graph-summarisation prompt', description: 'Given a subgraph neighbourhood (up to 50 nodes), generate a concise narrative summary using LLM.' },
              { title: 'Build "hidden connections" detector', description: 'Find resources that share 2+ entities but are not directly linked; surface as "You might not know X is related to Y".' },
              { title: 'Create insight report generator', description: 'New app/api/graph/insight-report/route.ts — given a topic, traverse the graph and produce a structured report: key papers, top authors, trending methods, related datasets.' },
              { title: 'Add graph-comprehension panel to open-resources', description: 'New component GraphComprehension.tsx — chat-style interface where users ask questions and get graph-backed answers.' },
              { title: 'Implement entity disambiguation dialog', description: 'When a user query matches multiple entities (e.g. "Smith"), show a disambiguation popup with entity cards.' },
              { title: 'Cache comprehension results', description: 'Store question→answer pairs with TTL of 24 h to avoid repeated LLM + graph traversal costs.' },
            ],
          },
          /* --- M2: Index 10,000 Resources --- */
          {
            title: 'Index 10,000 Resources',
            description:
              'Pre-index the first 10,000 high-quality open resources into the database — papers from arXiv/OpenAlex, repos from GitHub, datasets from Kaggle/HuggingFace — so the platform has a searchable base even without live API calls.',
            order: 2,
            highlighted: true,
            tasks: [
              { title: 'Create IndexedResource Prisma model', description: 'New model with fields: source, externalId, title, abstract, authors[], tags[], license, url, resourceType, indexedAt, embedding (vector).' },
              { title: 'Write Prisma migration for IndexedResource', description: 'Generate and apply migration; add indexes on source, externalId, resourceType, and a GIN index on tags.' },
              { title: 'Build arXiv batch importer', description: 'Script scripts/import-arxiv.ts — fetch 3,000 recent CS/AI papers via arXiv OAI-PMH; normalise and bulk-insert.' },
              { title: 'Build OpenAlex batch importer', description: 'Script scripts/import-openalex.ts — paginate OpenAlex /works?filter=is_oa:true for 3,000 papers; bulk-insert.' },
              { title: 'Build GitHub batch importer', description: 'Script scripts/import-github.ts — fetch 2,000 trending/popular repos (stars > 100, pushed recently); bulk-insert.' },
              { title: 'Build Kaggle/HuggingFace dataset importer', description: 'Script scripts/import-datasets.ts — fetch 1,000 popular datasets from Kaggle API + 1,000 from HuggingFace; bulk-insert.' },
              { title: 'Add deduplication check on import', description: 'Before inserting, check DOI/URL/externalId uniqueness against existing IndexedResource records.' },
              { title: 'Generate embeddings for all 10K resources', description: 'Script scripts/embed-indexed.ts — batch-embed all IndexedResource titles+abstracts; store vectors in embedding column.' },
              { title: 'Wire search route to query IndexedResource first', description: 'Update app/api/search/route.ts — query local IndexedResource table before falling back to live provider APIs.' },
              { title: 'Add admin dashboard card showing index stats', description: 'On admin page, show total indexed resources, breakdown by source and type, last index date.' },
            ],
          },
          /* --- M3: Enable Semantic Search --- */
          {
            title: 'Enable Semantic Search',
            description:
              'Add embedding-based semantic search so users get relevant results even when their query wording differs from resource titles. Powered by pgvector over the 10K+ indexed resources.',
            order: 3,
            highlighted: true,
            tasks: [
              { title: 'Enable pgvector extension in Supabase', description: 'Run CREATE EXTENSION IF NOT EXISTS vector; verify via Supabase SQL editor.' },
              { title: 'Add vector column to IndexedResource', description: 'Prisma migration adding embedding vector(1536) column with an ivfflat index for fast similarity search.' },
              { title: 'Build query-embedding endpoint', description: 'New app/api/search/embed-query/route.ts — accept query text, return embedding vector using chosen model (OpenAI text-embedding-3-small).' },
              { title: 'Build semantic search endpoint', description: 'New app/api/search/semantic/route.ts — embed query, run cosine similarity via pgvector <=> operator, return top-K results.' },
              { title: 'Implement hybrid ranking (keyword + semantic)', description: 'Update app/api/search/route.ts — merge keyword results and semantic results with configurable weights (0.4 keyword + 0.4 semantic + 0.2 recency).' },
              { title: 'Add "Semantic" toggle in search UI', description: 'In open-resources page, add a toggle switch: "Keyword" | "Semantic" | "Hybrid"; default to Hybrid.' },
              { title: 'Add "Find similar" button on each resource card', description: 'Button that queries semantic search using that resource\'s embedding; opens results in a side panel.' },
              { title: 'Build search relevance dashboard', description: 'Admin page showing top queries, avg result count, click-through rate for semantic vs. keyword.' },
            ],
          },
          /* --- M4: New Search Providers --- */
          {
            title: 'Integrate Missing Search Providers',
            description:
              'Add the high-value sources not yet wired into app/api/search/providers/. Currently live: OpenAlex, arXiv, Zenodo, SWH, GitHub, HuggingFace (models only), YouTube. Stubs: Hardware, OSHWA, Wikifactory.',
            order: 4,
            stipend: 4000,
            tasks: [
              { title: 'Add CrossRef provider', description: 'Create app/api/search/providers/crossref.ts — fetch journal articles via CrossRef REST API; normalise to Resource type.' },
              { title: 'Add PubMed / PMC provider', description: 'Create app/api/search/providers/pubmed.ts — E-Utilities esearch+efetch; map PMID, title, abstract, MeSH tags.' },
              { title: 'Add Semantic Scholar provider', description: 'Create app/api/search/providers/semanticscholar.ts — /paper/search endpoint; include citation count and tldr.' },
              { title: 'Add Kaggle Datasets provider', description: 'Create app/api/search/providers/kaggle.ts — Kaggle public API; map dataset title, size, usability rating.' },
              { title: 'Add HuggingFace Datasets provider', description: 'Extend existing huggingface.ts to also query /api/datasets; return separate resource type "dataset".' },
              { title: 'Add DOAJ provider', description: 'Create app/api/search/providers/doaj.ts — DOAJ article search API; capture open-access journal metadata.' },
              { title: 'Replace hardware stub with real OSHWA API', description: 'Update app/api/search/providers/oshwa.ts — hit OSHWA certification API and return real results.' },
              { title: 'Register new providers in search route', description: 'Wire each new provider into app/api/search/route.ts fan-out; add to coverage stats.' },
            ],
          },
          /* --- M5: Semantic / Vector Search (extended) --- */
          {
            title: 'Add Semantic Vector Search',
            description:
              'Current ranking is keyword + recency + license (scoreResource in route.ts). Add embedding-based retrieval for semantic relevance.',
            order: 5,
            stipend: 5000,
            tasks: [
              { title: 'Evaluate embedding models', description: 'Benchmark Sentence-BERT, OpenAI text-embedding-3-small, Cohere Embed v3 on 500 sample resources for cost vs. quality.' },
              { title: 'Provision pgvector extension in Supabase', description: 'Enable the pgvector extension on the existing Postgres database; add a resource_embeddings table via Prisma migration.' },
              { title: 'Create embedding generation job', description: 'New src/lib/embeddings/generate.ts — accept Resource, call chosen model, upsert vector into resource_embeddings.' },
              { title: 'Batch-embed existing cached resources', description: 'Script scripts/backfill-embeddings.ts — iterate saved workspace resources and generate embeddings.' },
              { title: 'Implement vector similarity endpoint', description: 'New app/api/search/semantic/route.ts — accept query, embed it, run cosine similarity via pgvector; return top-K.' },
              { title: 'Fuse keyword + vector scores in search route', description: 'Update scoreResource() in app/api/search/route.ts — weighted merge: 0.4 keyword + 0.4 vector + 0.2 recency.' },
              { title: 'Add "Find similar" button per resource', description: 'In open-resources page, add a button that queries vector search with that resource\'s embedding as input.' },
            ],
          },
          /* --- M6: Crawling & Indexing Pipeline --- */
          {
            title: 'Build Crawl & Index Pipeline',
            description:
              'Currently all data is fetched at query time with no persistence. Build a background pipeline that pre-indexes resources.',
            order: 6,
            stipend: 5000,
            tasks: [
              { title: 'Design IndexedResource Prisma model', description: 'New model IndexedResource with fields: source, externalId, title, abstract, authors, tags, license, embedding, indexedAt.' },
              { title: 'Create crawler plugin interface', description: 'New src/lib/crawlers/types.ts — CrawlerPlugin interface with crawl(since: Date) → NormalisedResource[].' },
              { title: 'Implement arXiv OAI-PMH crawler plugin', description: 'src/lib/crawlers/arxiv-oai.ts — incremental harvest via OAI-PMH ListRecords; emit normalised resources.' },
              { title: 'Implement GitHub trending crawler plugin', description: 'src/lib/crawlers/github-trending.ts — fetch trending repos daily via GitHub REST; normalise.' },
              { title: 'Implement OpenAlex bulk crawler plugin', description: 'src/lib/crawlers/openalex-bulk.ts — paginate through OpenAlex works API; emit normalised resources.' },
              { title: 'Build crawler orchestrator with rate limiting', description: 'src/lib/crawlers/orchestrator.ts — run plugins with configurable concurrency, exponential back-off on 429.' },
              { title: 'Create nightly cron trigger', description: 'app/api/cron/index-resources/route.ts — Vercel cron or node-cron that kicks off the orchestrator nightly.' },
              { title: 'Deduplicate against existing index on ingest', description: 'Reuse keys.ts DOI/SWHID/URL logic; skip resources already in IndexedResource.' },
              { title: 'Generate embeddings on ingest', description: 'After inserting an IndexedResource, run generate.ts to compute and store its embedding.' },
            ],
          },
          /* --- M7: Data Quality & Normalisation --- */
          {
            title: 'Improve Data Quality & Normalisation',
            description:
              'Strengthen dedup, add quality scoring, and harmonise metadata from heterogeneous sources.',
            order: 7,
            stipend: 3000,
            tasks: [
              { title: 'Add title-similarity threshold config', description: 'Make the 0.92 threshold in dedupe.ts configurable via env var; add integration test covering edge cases.' },
              { title: 'Implement author-name normalisation', description: 'Extend normalize.ts normAuthors to handle "Last, First", "First Last", initials, and Unicode diacritics.' },
              { title: 'Build resource quality scorer', description: 'New src/lib/search/quality.ts — score 0–1 based on: has abstract, has authors, has license, has DOI, recency, citation count.' },
              { title: 'Surface quality score in UI', description: 'Add a tiny quality-badge (green/yellow/red) on each resource card in open-resources page.' },
              { title: 'Detect and flag duplicate workspaces resources', description: 'When saving to workspace, warn if a near-duplicate already exists (DOI or title similarity > 0.9).' },
            ],
          },
          /* --- M8: Auto-Tagging & Enrichment --- */
          {
            title: 'Semantic Auto-Tagging & Metadata Enrichment',
            description:
              'Automatically enrich every resource with domain tags, keywords, and licence classification.',
            order: 8,
            stipend: 4000,
            tasks: [
              { title: 'Build keyword extraction service', description: 'New app/api/enrich/keywords/route.ts — accept title+abstract, return top-8 keywords via LLM or KeyBERT.' },
              { title: 'Build domain classifier service', description: 'New app/api/enrich/domain/route.ts — classify resource into fields (CS, Bio, Physics, Eng, Social Sci, etc.).' },
              { title: 'Build licence classifier', description: 'New app/api/enrich/license/route.ts — detect licence from GitHub metadata or LLM parsing; emit SPDX identifier.' },
              { title: 'Run enrichment on ingest', description: 'In crawler orchestrator, after indexing a resource call the three enrich endpoints and store results.' },
              { title: 'Store enrichment results in IndexedResource', description: 'Add enrichedKeywords, enrichedDomain, enrichedLicense JSON fields to IndexedResource model.' },
              { title: 'Display enriched tags on resource cards', description: 'Show domain pill and keyword chips on open-resources search results.' },
            ],
          },
        ],
      },

      /* ──────────────────────────────────────────────────────────────
         2.2  BUILD  —  Idea to App
         The AI app-builder: prompt engineering, generation pipeline,
         multi-agent system, validation, preview, deployment, and UX.
         ────────────────────────────────────────────────────────────── */
      {
        slug: 'build',
        name: 'Build — Idea to App',
        description:
          'Improve the AI app-builder: generation pipeline quality, multi-provider reliability, preview/deploy, prompt engineering, and new capabilities.',
        order: 2,
        milestones: [
          /* --- M1: OpenClaw Integration --- */
          {
            title: 'OpenClaw Integration',
            description:
              'Integrate OpenClaw (open-source legal clause library) into the platform so generated apps, workspaces, and resources automatically get proper licensing, terms-of-use, and legal scaffolding.',
            order: 1,
            highlighted: true,
            tasks: [
              { title: 'Research OpenClaw API and clause library', description: 'Survey OpenClaw docs, available clause types (MIT, Apache, GPL, ToS, Privacy), and API authentication flow.' },
              { title: 'Create OpenClaw client library', description: 'New src/lib/openclaw/client.ts — typed wrapper for OpenClaw API: listClauses(), getClause(id), renderClause(params).' },
              { title: 'Add OpenClaw API key to environment', description: 'Add OPENCLAW_API_KEY to .env.example and .env.local; document in README.' },
              { title: 'Build licence selector component', description: 'New component LicenceSelector.tsx — dropdown of OpenClaw licences; preview rendered clause text; used in app-builder and workspaces.' },
              { title: 'Auto-generate LICENSE file in app-builder', description: 'In generation-pipeline.ts, after file creation, render the selected OpenClaw licence and add as LICENSE.md to project files.' },
              { title: 'Auto-generate Terms of Use for deployed apps', description: 'In build-deployable-html.ts, inject a /terms page with OpenClaw-rendered ToS clause based on project metadata.' },
              { title: 'Auto-generate Privacy Policy for deployed apps', description: 'In build-deployable-html.ts, inject a /privacy page with OpenClaw-rendered privacy policy clause.' },
              { title: 'Add licence compatibility check using OpenClaw', description: 'When importing open resources into a workspace, query OpenClaw to check compatibility between imported licence and workspace licence.' },
              { title: 'Build admin OpenClaw settings page', description: 'Admin page to set default licence, ToS template, and privacy policy template for the platform.' },
            ],
          },
          /* --- M2: Website Builder Backend Integration Agent --- */
          {
            title: 'Website Builder Backend Integration Agent',
            description:
              'Upgrade the app-builder from a frontend-only code generator to a full-stack agent that can scaffold backends, connect databases, wire APIs, and deploy server-side logic.',
            order: 2,
            highlighted: true,
            tasks: [
              { title: 'Design backend agent architecture', description: 'New src/lib/app-builder/agents/backend-agent.ts — define how the agent decides when to generate API routes, DB schema, and server logic.' },
              { title: 'Add backend scaffold templates', description: 'Create scaffold templates for: Next.js API routes, Supabase client, Prisma schema, and auth middleware.' },
              { title: 'Extend planner to emit backend requirements', description: 'In agents/planner.ts, add fields: needsDatabase, needsAuth, needsApi, dataModels[] to the plan schema.' },
              { title: 'Build database schema generator', description: 'Agent generates a Prisma-style schema from planner\'s dataModels; output as schema.prisma in project files.' },
              { title: 'Build API route generator', description: 'Agent generates Next.js-style API routes (GET/POST/PATCH/DELETE) for each data model; include input validation.' },
              { title: 'Build Supabase integration generator', description: 'Agent generates Supabase client setup, auth hooks, and RLS policies based on planner output.' },
              { title: 'Add backend file types to scaffold-guard', description: 'Update scaffold-guard.ts to protect server-side files (api/, prisma/) from accidental overwrite.' },
              { title: 'Extend preview to mock API responses', description: 'In preview/route.ts, intercept fetch calls to /api/* and return mock data based on generated schema.' },
              { title: 'Add "Full-stack" toggle in project creation', description: 'In CreateProjectModal.tsx, add a toggle: "Frontend only" vs "Full-stack (with backend)"; feed choice to planner.' },
              { title: 'Write integration tests for backend agent', description: 'Tests that verify: given a "todo app" prompt, agent generates a schema, API routes, and wired frontend.' },
            ],
          },
          /* --- M3: Domain Integration Agent --- */
          {
            title: 'Domain Integration Agent',
            description:
              'Wire the existing domain utilities (src/lib/vercel.ts, src/lib/godaddy.ts) into a complete agent that automates custom domain setup for deployed apps.',
            order: 3,
            highlighted: true,
            tasks: [
              { title: 'Create deploy-domain API route', description: 'New app/api/app-projects/[id]/deploy-domain/route.ts — accept domain name, call addDomainToVercel(), return DNS records needed.' },
              { title: 'Build DNS verification polling endpoint', description: 'New app/api/app-projects/[id]/deploy-domain/verify/route.ts — call verifyVercelDomain(), return status (pending/verified/failed).' },
              { title: 'Build GoDaddy auto-configure endpoint', description: 'New app/api/app-projects/[id]/deploy-domain/auto-configure/route.ts — call configureGoDaddyDNSForVercel() if user provides GoDaddy credentials.' },
              { title: 'Build manual DNS instructions endpoint', description: 'New app/api/app-projects/[id]/deploy-domain/instructions/route.ts — call getManualDNSInstructions() and return step-by-step guide.' },
              { title: 'Add domain setup UI to DeploymentPanel', description: 'In DeploymentPanel.tsx, add a "Custom Domain" section: input domain, show DNS records, verify button, status indicator.' },
              { title: 'Implement domain verification polling in UI', description: 'After user adds DNS records, poll /verify every 10 s; show progress bar and success/failure state.' },
              { title: 'Add domain field to AppProject model', description: 'Prisma migration adding customDomain and domainVerified fields to AppProject.' },
              { title: 'Show custom domain on project card', description: 'In project gallery and studio, show the custom domain (if set) alongside the default Vercel URL.' },
              { title: 'Build domain agent auto-suggest', description: 'New src/lib/app-builder/agents/domain-agent.ts — given project name + brand name, suggest 3 available domain names via Domainr API.' },
            ],
          },
          /* --- M4: Generation Pipeline Hardening --- */
          {
            title: 'Harden Generation Pipeline',
            description:
              'Current pipeline (generation-pipeline.ts): parse → filter → sanitize → validate → fix-loop → save. Improve reliability and quality.',
            order: 4,
            stipend: 5000,
            tasks: [
              { title: 'Replace regex validation with esbuild parse', description: 'In validate-files.ts, swap regex JSX checks for esbuild.transform() to catch real syntax errors.' },
              { title: 'Add import-graph resolver', description: 'New src/lib/app-builder/import-graph.ts — build dependency graph of generated files; flag missing imports before preview.' },
              { title: 'Improve fix-loop context window', description: 'In fix-loop.ts, include the exact esbuild error message and the 5 lines around the error in the retry prompt.' },
              { title: 'Cap fix-loop iterations with graceful fallback', description: 'After 3 failed fix attempts, save best-effort files and surface a clear error to the user in AppChat.' },
              { title: 'Add file-size guard', description: 'In generation-pipeline.ts, reject any single file > 50 KB to prevent LLM hallucinating massive outputs.' },
              { title: 'Write pipeline integration tests', description: 'New tests/generation-pipeline.spec.ts — feed sample LLM outputs through the pipeline; assert file count, syntax, and scaffold integrity.' },
            ],
          },
          /* --- M5: Prompt Engineering & Agent Quality --- */
          {
            title: 'Improve Prompt Engineering & Agent Quality',
            description:
              'Improve planner.ts, architect.ts, promptBuilder.ts, and contextBuilder.ts for higher-quality generated apps.',
            order: 5,
            stipend: 4000,
            tasks: [
              { title: 'Add few-shot examples to planner prompt', description: 'In agents/planner.ts, include 2–3 gold-standard plan examples so the LLM produces better structured plans.' },
              { title: 'Add component-level architecture to architect prompt', description: 'In agents/architect.ts, instruct the architect to specify per-component state, props, and data flow.' },
              { title: 'Create prompt regression test suite', description: 'New tests/prompts/ — snapshot tests for system prompts; CI fails if prompts change without review.' },
              { title: 'Implement compact prompt mode for all providers', description: 'In promptBuilder.ts, ensure the compact prompt path works for every provider, not just OpenRouter/DeepSeek.' },
              { title: 'Add design-system tokens to prompt context', description: 'Feed colour palette, spacing scale, and typography from themePresets.ts directly into the coder prompt.' },
              { title: 'Tune AI temperature/top_p per stage', description: 'In ai-params.ts, benchmark different values for planner (low temp) vs. coder (moderate temp); document findings.' },
            ],
          },
          /* --- M6: Multi-Provider Reliability --- */
          {
            title: 'Strengthen Multi-Provider Reliability',
            description:
              'model-router.ts handles fallback across Groq, OpenRouter, OpenAI, Anthropic. Improve resilience and observability.',
            order: 6,
            stipend: 3000,
            tasks: [
              { title: 'Add provider health-check endpoint', description: 'New app/api/app-projects/ai-health/route.ts — ping each provider, return latency + status; cache 60 s.' },
              { title: 'Implement automatic provider failover with retry', description: 'In model-router.ts, on 5xx or timeout, retry once on same provider then failover to next; log which provider served.' },
              { title: 'Add per-provider latency tracking', description: 'In generation-tracker.ts, record provider, model, latency, token count per generation; expose in admin API usage.' },
              { title: 'Surface active provider in chat UI', description: 'In AppChat.tsx, show a small badge ("via Groq" / "via OpenRouter") next to the AI message.' },
              { title: 'Implement cost estimator', description: 'New src/lib/app-builder/cost-estimator.ts — estimate token cost before generation; warn user if it exceeds free tier.' },
            ],
          },
          /* --- M7: Preview & Deployment Improvements --- */
          {
            title: 'Improve Preview & Deployment',
            description:
              'Enhance the iframe preview (PreviewPanel.tsx), Vercel deploy, and add new deployment targets.',
            order: 7,
            stipend: 4000,
            tasks: [
              { title: 'Add console-error overlay in preview', description: 'In PreviewPanel.tsx, catch iframe window.onerror and display errors inline with a "Fix with AI" button.' },
              { title: 'Implement "Send error to Chat" flow', description: 'When preview errors, auto-populate AppChat input with the error + file context; one-click send.' },
              { title: 'Add responsive preview breakpoints', description: 'In PreviewPanel.tsx, add mobile / tablet / desktop toggle buttons that resize the iframe.' },
              { title: 'Fix Firebase deployment route', description: 'Complete app/api/app-projects/[id]/deploy/firebase/route.ts — currently less developed than Vercel; add hosting deploy.' },
              { title: 'Add Netlify deployment option', description: 'New app/api/app-projects/[id]/deploy/netlify/route.ts — deploy built HTML to Netlify via API.' },
              { title: 'Add custom-domain support for Vercel deploys', description: 'Extend Vercel deploy route to accept an optional custom domain; configure via Vercel API.' },
              { title: 'Generate social-media preview meta tags', description: 'In build-deployable-html.ts, inject og:title, og:description, og:image meta tags from project metadata.' },
            ],
          },
          /* --- M8: App Builder UX & New Capabilities --- */
          {
            title: 'App Builder UX & New Capabilities',
            description:
              'Enhance the studio experience: templates, undo/redo, multi-page apps, and TypeScript support.',
            order: 8,
            stipend: 5000,
            tasks: [
              { title: 'Add starter template gallery', description: 'New component TemplateGallery.tsx — show 6–8 pre-built templates (SaaS landing, portfolio, dashboard, e-commerce); one-click scaffold.' },
              { title: 'Implement undo/redo for code edits', description: 'In CodeEditor.tsx, add undo/redo stack backed by Monaco editor history; expose buttons in toolbar.' },
              { title: 'Add multi-page routing support', description: 'Update scaffold to include react-router; teach planner/architect to generate multiple page components with routes.' },
              { title: 'Improve TypeScript generation path', description: 'In promptBuilder.ts + scaffold, ensure .tsx files are generated with proper type annotations when user picks TypeScript.' },
              { title: 'Add project versioning / snapshots', description: 'New AppProjectSnapshot Prisma model — save a snapshot of all files before each generation; allow rollback.' },
              { title: 'Implement real-time generation status labels', description: 'In GenerationLoader.tsx, show distinct labels: "Planning…", "Designing architecture…", "Writing code…", "Validating…".' },
              { title: 'Split chat/route.ts into smaller modules', description: 'Refactor the ~2600-line app/api/app-projects/[id]/chat/route.ts into handlers (handlePlan, handleGenerate, handleEdit).' },
            ],
          },
          /* --- M9: AI-Assisted Iteration & Debugging --- */
          {
            title: 'AI-Assisted Iteration & Debugging',
            description:
              'Help users iterate on generated apps with AI assistance — explain errors, suggest improvements, and auto-fix.',
            order: 9,
            stipend: 4000,
            tasks: [
              { title: 'Build "Explain this code" feature', description: 'In CodeEditor.tsx, add right-click → "Explain" that sends selected code to chat with an explain prompt.' },
              { title: 'Build "Improve this component" feature', description: 'Right-click on a file → "Improve" sends the file to chat with a refactor/improve prompt.' },
              { title: 'Add visual diff for AI edits', description: 'Before applying AI-generated file changes, show a side-by-side diff in the editor; user confirms or rejects.' },
              { title: 'Implement auto-lint on generated files', description: 'Run ESLint (browser-compatible) on generated files; surface warnings as non-blocking suggestions.' },
              { title: 'Add accessibility audit for generated apps', description: 'Run axe-core on the preview iframe; surface a11y issues with AI-suggested fixes.' },
            ],
          },
        ],
      },

      /* ──────────────────────────────────────────────────────────────
         2.3  COLLABORATE  —  Community · Smart Connect · Knowledge Graph
         Community AI features, intelligent matching, knowledge graph
         population, and cross-resource recommendations.
         ────────────────────────────────────────────────────────────── */
      {
        slug: 'collaborate',
        name: 'Collaborate — Community & Smart Connect',
        description:
          'Enrich the community with AI: populate the knowledge graph, build smart-connect recommendations, and link people ↔ resources ↔ projects.',
        order: 3,
        milestones: [
          /* --- M1: Smart Network Agent --- */
          {
            title: 'Smart Network Agent',
            description:
              'An AI agent that continuously analyses user profiles, activity, expertise, and saved resources to proactively suggest connections, collaborations, and opportunities across the community.',
            order: 1,
            highlighted: true,
            tasks: [
              { title: 'Build user-profile embedding pipeline', description: 'New src/lib/community/profile-embeddings.ts — embed each user\'s bio + expertiseTags + saved resources + group memberships into a single vector.' },
              { title: 'Create profile_embeddings table', description: 'Prisma migration adding userId, embedding vector(1536), updatedAt; rebuild nightly or on profile change.' },
              { title: 'Build "People like you" API', description: 'New app/api/recommend/people/route.ts — cosine similarity on profile embeddings; return top-10 similar users with match reason.' },
              { title: 'Build "Collaborators for your project" API', description: 'New app/api/recommend/collaborators/route.ts — given a workspace or app-project, find users whose expertise matches the project domain.' },
              { title: 'Build "Opportunity matcher" agent', description: 'New src/lib/community/opportunity-agent.ts — match users to open gig requests, barter asks, and challenges by embedding similarity.' },
              { title: 'Add smart-connect widget on profile page', description: 'New component SmartConnect.tsx on UserProfileView — show "People with similar interests" + "Opportunities for you".' },
              { title: 'Add smart-connect widget on community home', description: 'On app/community/page.tsx, add a "Suggested for you" banner showing 3 people + 3 opportunities.' },
              { title: 'Build weekly "Connections Digest" email', description: 'Cron job that emails each user: 3 new people matches + 3 resource recommendations + 2 open opportunities.' },
              { title: 'Track connection acceptance rate', description: 'Log when a user follows/messages a suggested person; compute acceptance rate; feed back into ranking.' },
            ],
          },
          /* --- M2: Barter Engine --- */
          {
            title: 'Barter Engine',
            description:
              'Upgrade the existing barter system (BarterAsk/BarterPitch) with AI matching, smart categorisation, and automated deal suggestions. Currently barter has full CRUD but no intelligence.',
            order: 2,
            highlighted: true,
            tasks: [
              { title: 'Build barter-ask embedding pipeline', description: 'Embed whatINeed + whatIOffer + description for each BarterAsk; store in barter_embeddings table.' },
              { title: 'Build "Matching asks" API', description: 'New app/api/community/barter/matches/route.ts — given a barter ask, find other asks where their "offer" matches your "need" (embedding similarity).' },
              { title: 'Build "Auto-suggest pitch" feature', description: 'When viewing a barter ask, AI generates a draft pitch based on the viewer\'s profile and what they can offer.' },
              { title: 'Add smart categorisation to barter asks', description: 'Auto-tag barter asks with categories (design, code, marketing, research) using LLM classification on creation.' },
              { title: 'Build barter match notification', description: 'When a new ask is posted and matches an existing user\'s "offer" profile, send a push/email notification.' },
              { title: 'Enable barter attachments in UI', description: 'The upload route exists (app/api/community/barter/upload/route.ts) but attachments are disabled in UI — wire them up in BarterList.tsx.' },
              { title: 'Add barter success stories section', description: 'New component BarterSuccessStories.tsx — after a barter is closed, prompt both parties for a brief testimonial; display on community page.' },
              { title: 'Build barter analytics dashboard', description: 'Admin page showing: total asks, match rate, avg time to first pitch, top categories, completion rate.' },
            ],
          },
          /* --- M3: Project Showcase --- */
          {
            title: 'Project Showcase & Discovery',
            description:
              'Upgrade the existing project gallery (app/projects/page.tsx) with AI-powered discovery, remix/fork workflow, and social features. Currently has grid view + upvotes but no intelligence.',
            order: 3,
            highlighted: true,
            tasks: [
              { title: 'Build project embedding pipeline', description: 'Embed project title + description + generated code summary for each public AppProject; store in project_embeddings table.' },
              { title: 'Build "Similar projects" API', description: 'New app/api/public-app-projects/similar/route.ts — given a project ID, return top-5 similar projects by embedding cosine similarity.' },
              { title: 'Add "Similar projects" section to project detail', description: 'On the project view page, show a carousel of similar projects below the live preview.' },
              { title: 'Build remix/fork flow', description: 'Add a "Remix" button on public projects that clones all files into a new project under the current user; track fork lineage.' },
              { title: 'Add fork-lineage display', description: 'Show "Forked from [original project]" badge and a fork-tree visualisation on each remixed project.' },
              { title: 'Add project categories and filtering', description: 'Auto-categorise projects (SaaS, Portfolio, E-commerce, Dashboard, Game) using LLM; add category filter to gallery.' },
              { title: 'Build trending projects algorithm', description: 'Rank projects by: recent upvotes + views + forks weighted over 7-day window; show "Trending" tab in gallery.' },
              { title: 'Add project comments / feedback', description: 'New ProjectComment model + API; let users leave feedback on public projects; show comment count on gallery cards.' },
              { title: 'Build "Featured projects" curation', description: 'Admin can mark projects as "Featured"; shown in a hero section at the top of the gallery page.' },
              { title: 'Add "Share to community" flow', description: 'From app-builder studio, one-click share to Problems & Ideas feed or a community group with auto-generated post.' },
            ],
          },
          /* --- M4: Knowledge Graph Population --- */
          {
            title: 'Populate Knowledge Graph from Search Results',
            description:
              'Neo4j APIs exist (app/api/graph/) but nothing writes data. Build the ingestion pipeline so the graph is always up-to-date.',
            order: 4,
            stipend: 5000,
            tasks: [
              { title: 'Create graph-ingest service', description: 'New src/lib/graph/ingest.ts — accept a Resource, create Resource node + AUTHORED_BY, TAGGED edges in Neo4j.' },
              { title: 'Upgrade entity extractor beyond regex', description: 'Extend app/lib/graph/entity-extractor.ts — use LLM-based extraction for PERSON, ORG, METHOD, DATASET entities.' },
              { title: 'Ingest search results on save-to-workspace', description: 'When a user saves a resource to a workspace, call graph-ingest to add it to Neo4j.' },
              { title: 'Ingest indexed resources from crawl pipeline', description: 'After the nightly crawl writes to IndexedResource, batch-ingest all new resources into the graph.' },
              { title: 'Add MENTIONS edges for extracted entities', description: 'For each entity extracted from a resource, create (Resource)-[MENTIONS]->(Entity) edge with confidence score.' },
              { title: 'Build graph stats endpoint', description: 'New app/api/graph/stats/route.ts — return node count, edge count, top entities; show on admin dashboard.' },
            ],
          },
          /* --- M5: Smart Connect — Recommendations --- */
          {
            title: 'Smart Connect — AI Recommendations',
            description:
              'Replace the heuristic recommendation in OpenResourcesChat.tsx with embedding-based and graph-based intelligent suggestions.',
            order: 5,
            stipend: 5000,
            tasks: [
              { title: 'Build "Find similar resources" API', description: 'New app/api/recommend/similar/route.ts — given a resource ID, return top-10 by embedding cosine similarity.' },
              { title: 'Build "People also saved" API', description: 'New app/api/recommend/also-saved/route.ts — collaborative filtering: users who saved X also saved Y (from workspace data).' },
              { title: 'Build "Related by graph" API', description: 'New app/api/recommend/graph-related/route.ts — 2-hop traversal in Neo4j: resource → entity → other resource.' },
              { title: 'Add recommendation cards on resource detail', description: 'On the open-resources detail view, show "Similar", "Also saved", and "Graph-related" sections.' },
              { title: 'Build personalised feed', description: 'New app/api/recommend/feed/route.ts — based on user\'s saved resources + profile expertiseTags, surface new resources daily.' },
              { title: 'Add "Discover" tab on open-resources page', description: 'New tab that shows the personalised feed instead of search results; lazy-load on scroll.' },
            ],
          },
          /* --- M6: Community ↔ Resource Linking --- */
          {
            title: 'Link Community Features to Resources',
            description:
              'Groups, events, challenges, and discussions exist but are disconnected from the resource graph. Bridge them.',
            order: 6,
            stipend: 4000,
            tasks: [
              { title: 'Add "Related resources" to community groups', description: 'New GroupResource join table; let group admins pin relevant open-resources to the group page.' },
              { title: 'Add "Resources for this challenge" section', description: 'On the challenge detail page, let challenge creators link relevant datasets, papers, or tools.' },
              { title: 'Auto-suggest resources for a discussion', description: 'When someone posts a discussion, run the title through search and suggest 3 related resources as a reply.' },
              { title: 'Link app-builder projects to open-resources', description: 'In app-builder, add a "Research" panel that searches open-resources for papers/code relevant to the project prompt.' },
              { title: 'Surface community activity on resource cards', description: 'Show "Discussed in 2 groups" or "Used in 1 challenge" badges on resource search results.' },
            ],
          },
          /* --- M7: Cross-Resource Linking --- */
          {
            title: 'Cross-Resource Linking (Paper ↔ Code ↔ Dataset)',
            description:
              'Automatically discover and persist links between papers, their code implementations, and associated datasets.',
            order: 7,
            stipend: 5000,
            tasks: [
              { title: 'Build paper-to-code linker', description: 'New src/lib/graph/linkers/paper-code.ts — match arXiv papers to GitHub repos by title similarity + URL extraction from abstract.' },
              { title: 'Build paper-to-dataset linker', description: 'New src/lib/graph/linkers/paper-dataset.ts — detect dataset names (ImageNet, CIFAR, etc.) in abstracts; link to Kaggle/HuggingFace records.' },
              { title: 'Build citation-graph importer', description: 'New src/lib/graph/linkers/citations.ts — fetch citation edges from Semantic Scholar for indexed papers; write CITES edges to Neo4j.' },
              { title: 'Run linkers on nightly crawl output', description: 'After the crawl pipeline finishes, trigger all three linkers on newly indexed resources.' },
              { title: 'Show linked resources in UI', description: 'On a paper card, show "Code: github.com/…" and "Dataset: kaggle.com/…" links pulled from the graph.' },
              { title: 'Add "Explore connections" deep link', description: 'Each linked-resource badge links to /openresources/knowledge-graph pre-filtered to that resource\'s neighbourhood.' },
            ],
          },
          /* --- M8: AI-Powered Community Matching --- */
          {
            title: 'AI-Powered Community Matching',
            description:
              'Use profile embeddings and interest signals to intelligently connect community members.',
            order: 8,
            stipend: 4000,
            tasks: [
              { title: 'Generate user-interest embeddings', description: 'Embed each user\'s expertiseTags + saved resources + group memberships into a single vector; store in user_embeddings table.' },
              { title: 'Build "People like you" API', description: 'New app/api/recommend/people/route.ts — cosine similarity on user-interest embeddings; return top-5 similar users.' },
              { title: 'Build "Collaborators for your project" API', description: 'Given an app-builder project or workspace, find users whose expertise matches the project domain.' },
              { title: 'Add smart-connect widget on profile page', description: 'Show "People with similar interests" section on UserProfileView; one-click follow or message.' },
              { title: 'Implement weekly "Connections digest" email', description: 'Cron-triggered email suggesting 3 new people + 3 new resources based on user-interest vector changes.' },
              { title: 'Add "Match me to a challenge" feature', description: 'On the challenges list, highlight challenges that align with the user\'s expertise using embedding similarity.' },
            ],
          },
          /* --- M9: Knowledge Graph UI Improvements --- */
          {
            title: 'Knowledge Graph Visualisation Upgrades',
            description:
              'Upgrade the existing KnowledgeGraph.tsx (Cytoscape) and connect it to the populated Neo4j backend.',
            order: 9,
            stipend: 3000,
            tasks: [
              { title: 'Switch graph data source from search results to Neo4j', description: 'Update KnowledgeGraph.tsx to fetch from /api/graph/subgraph instead of building the graph client-side from search results.' },
              { title: 'Add graph search/filter controls', description: 'Search by entity name, filter by type (person, institution, method); update graph in real-time.' },
              { title: 'Implement node-click detail panel', description: 'Click a node → side panel shows entity details, linked resources, and "Explore deeper" button.' },
              { title: 'Add graph expand-on-click', description: 'Clicking a node calls /api/graph/expand to load 1-hop neighbours and adds them to the view.' },
              { title: 'Replace KnowledgeGraphViewer placeholder', description: 'In app/components/graph/KnowledgeGraphViewer.tsx, replace the "coming soon" placeholder with the real Cytoscape viewer.' },
              { title: 'Add shareable graph URL', description: 'Encode graph state (centre node, zoom, filters) into URL params so users can share a specific graph view.' },
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================
     TRACK 3 – Developer Relations
     ================================================================ */
  {
    trackSlug: 'developer-relations',
    subTracks: [
      /* ---------- Sub-track 3.1: Community Platform ---------- */
      {
        slug: 'community-platform',
        name: 'Community & Collaboration',
        description:
          'Invite, open-source, and co-create — extend the open-source workflow to every format and domain (§4.5).',
        order: 1,
        milestones: [
          {
            title: 'Discussion Forums & Groups',
            description:
              'Community discussion boards, topic-based groups, and threaded replies.',
            order: 1,
            stipend: 3000,
            tasks: [
              { title: 'Forum post CRUD & threading', description: 'Implement create/reply/edit/delete for discussion threads.' },
              { title: 'Topic-based groups', description: 'Users can create and join groups focused on specific domains.' },
              { title: 'Moderation tools', description: 'Flag, pin, lock, and delete posts; admin moderation dashboard.' },
            ],
          },
          {
            title: 'Events & Challenges',
            description:
              'Community events (hackathons, webinars) and innovation challenges with submissions.',
            order: 2,
            stipend: 3000,
            tasks: [
              { title: 'Event creation & registration flow', description: 'Create events with dates, descriptions, and registration limits.' },
              { title: 'Challenge submission system', description: 'Users submit projects to challenges; voting and judging workflow.' },
              { title: 'Leaderboard & badges', description: 'Gamified leaderboard showing top contributors, badge awards.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 3.2: API & Documentation ---------- */
      {
        slug: 'api-documentation',
        name: 'API & Developer Documentation',
        description:
          'REST & GraphQL APIs for third-party access to the aggregated knowledge base (§6, §7).',
        order: 2,
        milestones: [
          {
            title: 'Public API v1',
            description:
              'Release a stable, documented public API for external developers and enterprise clients.',
            order: 1,
            stipend: 4000,
            tasks: [
              { title: 'API design & OpenAPI spec', description: 'Define all public endpoints, request/response schemas in OpenAPI 3.0.' },
              { title: 'API key management', description: 'Self-service API key generation, usage tracking, and rate limiting.' },
              { title: 'Interactive API docs (Swagger UI)', description: 'Host Swagger UI for try-it-out style API exploration.' },
              { title: 'SDKs for Python & JavaScript', description: 'Generate and publish thin SDK wrappers for the two most popular languages.' },
            ],
          },
          {
            title: 'Developer Portal',
            description:
              'A developer portal with guides, tutorials, and code samples.',
            order: 2,
            stipend: 3000,
            tasks: [
              { title: 'Write "Getting Started" guide', description: '5-minute quickstart: sign up, get API key, make first search query.' },
              { title: 'Build code-sample gallery', description: 'Curated code samples in Python, JS, and cURL for common workflows.' },
              { title: 'Add changelog & versioning page', description: 'Track API changes, deprecations, and version history.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 3.3: Onboarding & Education ---------- */
      {
        slug: 'onboarding-education',
        name: 'Onboarding & User Education',
        description:
          'Build onboarding flows, tutorials, and FAQs so every user type can self-serve (§5).',
        order: 3,
        milestones: [
          {
            title: 'Persona-Based Onboarding',
            description:
              'Tailored onboarding experiences for Researchers, Engineers, Students, and Entrepreneurs (§5).',
            order: 1,
            stipend: 3000,
            tasks: [
              { title: 'Onboarding wizard UI', description: 'Multi-step wizard that asks user role and customises the home view.' },
              { title: 'Researcher quickstart', description: 'Guided flow: search papers → save to workspace → summarise → collaborate.' },
              { title: 'Engineer quickstart', description: 'Guided flow: find open-source components → remix → deploy.' },
              { title: 'Student quickstart', description: 'Guided flow: find courseware → bookmark → join study group.' },
            ],
          },
          {
            title: 'Help Centre & FAQ',
            description:
              'Self-serve help centre with searchable FAQ and video tutorials.',
            order: 2,
            stipend: 2000,
            tasks: [
              { title: 'Build FAQ database', description: 'Compile top-50 questions from beta users; write clear answers.' },
              { title: 'In-app contextual help tooltips', description: 'Add "?" tooltips on key UI elements linking to relevant FAQ entries.' },
              { title: 'Record 5 tutorial videos', description: 'Screen-recorded walkthroughs of core features for YouTube/embedded player.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 3.4: Open Source Ecosystem ---------- */
      {
        slug: 'open-source-ecosystem',
        name: 'Open Source Plugin Ecosystem',
        description:
          'Enable external developers to build plugins and apps on the Open Idea API (§8 Phase 4).',
        order: 4,
        milestones: [
          {
            title: 'Plugin Architecture',
            description:
              'Design and ship a plugin system so third-party developers can extend the platform.',
            order: 1,
            stipend: 5000,
            tasks: [
              { title: 'Plugin manifest spec', description: 'Define JSON manifest format for declaring plugin metadata, permissions, hooks.' },
              { title: 'Plugin sandbox runtime', description: 'Sandboxed execution environment (iframe / Web Worker) for third-party code.' },
              { title: 'Plugin marketplace UI', description: 'Browse, install, and rate community-built plugins.' },
              { title: 'Sample plugin: Zotero exporter', description: 'Build a reference plugin that exports workspace resources to Zotero.' },
            ],
          },
        ],
      },
    ],
  },

  /* ================================================================
     TRACK 4 – Marketing & Growth
     ================================================================ */
  {
    trackSlug: 'marketing-growth',
    subTracks: [
      /* ---------- Sub-track 4.1: User Acquisition ---------- */
      {
        slug: 'user-acquisition',
        name: 'User Acquisition & Content Marketing',
        description:
          'Drive multi-channel campaigns, content, and community-led growth to reach 1 M+ users (§8 Phase 4).',
        order: 1,
        milestones: [
          {
            title: 'Beta User Onboarding Campaign',
            description:
              'Onboard first beta users — researchers and developers — to test search (§8 Phase 1).',
            order: 1,
            stipend: 2000,
            tasks: [
              { title: 'Identify 50 target beta users', description: 'Shortlist researchers and OSS developers from Twitter/LinkedIn.' },
              { title: 'Create beta invitation email sequence', description: '3-email drip: welcome → feature tour → feedback request.' },
              { title: 'Launch beta feedback survey', description: 'Google Form / Typeform capturing search quality, UX, and feature requests.' },
            ],
          },
          {
            title: 'Content & SEO Strategy',
            description:
              'Publish blog posts, case studies, and SEO-optimised landing pages to drive organic traffic.',
            order: 2,
            stipend: 3000,
            tasks: [
              { title: 'Write 10 SEO blog posts', description: 'Topics: "How to find open datasets", "Best open-source AI tools", etc.' },
              { title: 'Publish 3 case studies', description: 'Document how beta users solved real problems using the platform.' },
              { title: 'Build landing page A/B tests', description: 'Test headline + CTA variants on the homepage for conversion.' },
            ],
          },
          {
            title: 'Community-Led Growth',
            description:
              'Leverage community events, social media, and word-of-mouth to scale to 100+ countries (§8 Phase 4).',
            order: 3,
            stipend: 3000,
            tasks: [
              { title: 'Launch referral programme', description: 'Invite-a-friend with badge rewards and early feature access.' },
              { title: 'Host monthly community webinar', description: 'Showcase new features, user spotlights, and Q&A.' },
              { title: 'Social media content calendar', description: 'Weekly posts on Twitter, LinkedIn, and Reddit (r/opensource, r/machinelearning).' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 4.2: Partnership Development ---------- */
      {
        slug: 'partnerships',
        name: 'Partnership Development',
        description:
          'Build partnerships with universities, NGOs, and institutions that champion open innovation (§9).',
        order: 2,
        milestones: [
          {
            title: 'University & Research Partnerships',
            description:
              'Partner with universities and research institutions for data integration and co-promotion (§8 Phase 2).',
            order: 1,
            stipend: 3000,
            tasks: [
              { title: 'Create partnership pitch deck', description: 'Slide deck highlighting mutual value: data access ↔ platform exposure.' },
              { title: 'Outreach to 20 universities', description: 'Email + LinkedIn outreach to library directors and research offices.' },
              { title: 'Sign first 2 institutional data-sharing MOUs', description: 'Formalise data-sharing agreements with pilot institutions.' },
            ],
          },
          {
            title: 'NGO & Government Partnerships',
            description:
              'Engage NGOs and government bodies that produce open data and benefit from the platform.',
            order: 2,
            stipend: 3000,
            tasks: [
              { title: 'Identify 10 target NGOs/gov agencies', description: 'WHO, World Bank, national science foundations, etc.' },
              { title: 'Customise onboarding for institutional users', description: 'SSO integration, bulk import, admin dashboards.' },
              { title: 'Co-publish impact report', description: 'Annual report showcasing how open innovation accelerated outcomes.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 4.3: Monetisation ---------- */
      {
        slug: 'monetisation',
        name: 'Monetisation & Revenue',
        description:
          'Implement sustainable revenue streams: API access, enterprise solutions, advanced analytics, and consulting (§7).',
        order: 3,
        milestones: [
          {
            title: 'API Access & Tiered Pricing',
            description:
              'Commercial API with free / pro / enterprise tiers (§7 API Access & Enterprise Solutions).',
            order: 1,
            stipend: 4000,
            tasks: [
              { title: 'Design pricing tiers', description: 'Free (100 req/day), Pro ($49/mo, 10k req/day), Enterprise (custom).' },
              { title: 'Implement usage metering & billing', description: 'Track API calls per key; integrate Stripe for billing.' },
              { title: 'Build enterprise self-serve signup', description: 'Form for enterprise clients to request custom plans and SLAs.' },
            ],
          },
          {
            title: 'Advanced Discovery & Analytics Products',
            description:
              'Paid discovery reports and analytics dashboards for professional users (§7).',
            order: 2,
            stipend: 4000,
            tasks: [
              { title: 'Build topic landscape report generator', description: 'AI-curated report on a given topic: key papers, trends, players.' },
              { title: 'Analytics dashboard for institutions', description: 'Usage stats, trending topics, citation analysis for subscribing orgs.' },
              { title: 'Open Innovation Consulting landing page', description: 'Describe bespoke research and facilitation services; contact form.' },
            ],
          },
        ],
      },
      /* ---------- Sub-track 4.4: Brand & Content ---------- */
      {
        slug: 'brand-content',
        name: 'Brand & Content',
        description:
          'Establish the Open Idea brand identity, newsletter, and thought-leadership content.',
        order: 4,
        milestones: [
          {
            title: 'Brand Identity & Design System',
            description:
              'Define logo, colour palette, typography, and reusable UI components.',
            order: 1,
            stipend: 2000,
            tasks: [
              { title: 'Finalise brand guidelines doc', description: 'Logo usage, colours, typography, tone-of-voice in a shareable PDF.' },
              { title: 'Build shared UI component library', description: 'Storybook-based component library aligned with brand guidelines.' },
            ],
          },
          {
            title: 'Newsletter & Thought Leadership',
            description:
              'Weekly newsletter and blog establishing Open Idea as a thought leader in open innovation.',
            order: 2,
            stipend: 2000,
            tasks: [
              { title: 'Set up newsletter infra (Resend / Mailchimp)', description: 'Subscriber management, template design, send scheduling.' },
              { title: 'Write inaugural whitepaper companion blog post', description: 'Summarise the research whitepaper as a public blog post.' },
              { title: 'Plan 12-week content calendar', description: 'Weekly themes aligned with roadmap milestones and community events.' },
            ],
          },
        ],
      },
    ],
  },
];
