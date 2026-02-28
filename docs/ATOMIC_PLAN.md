# Open Idea - Atomic Development Plan

> Derived from the **Open Idea Research Whitepaper** and current codebase audit.
> Generated: 2026-02-28

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| DONE | Already built and functional |
| PARTIAL | Started but incomplete |
| TODO | Not yet started |

---

## Current State Summary

The codebase (Next.js 15 / TypeScript / Tailwind / Prisma + PostgreSQL / Neo4j / Supabase) already has:
- Multi-provider search (arXiv, GitHub, Zenodo, OpenAlex, HuggingFace, Software Heritage, Wikifactory, YouTube)
- Knowledge graph visualization (Neo4j + Cytoscape.js)
- Workspaces with resources, annotations, and share links
- Community: Groups, Discussions, Events, Challenges
- User profiles with rich fields, roles, reputation
- App Studio (AI-powered code generation from ideas)
- Problems & Ideas social feed
- Barter & Gigs marketplace
- Direct messaging
- AI News aggregation
- Newsletter system
- Admin dashboard with analytics
- Authentication (Supabase + NextAuth)

---

## PHASE 1: Foundation Hardening (Current → Q2 2026)

_Goal: Stabilize what exists, fill critical gaps, prepare for Beta launch._

### 1.1 Search & Discovery Improvements

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 1.1.1 | Add semantic/vector search alongside keyword search | M | TODO | Integrate embedding model (e.g. Sentence-BERT or OpenAI embeddings) + vector DB (pgvector or Pinecone) for semantic similarity ranking |
| 1.1.2 | Implement unified search result ranking algorithm | S | TODO | Combine keyword relevance + semantic score + freshness + popularity into a single ranked feed |
| 1.1.3 | Add search filters & facets UI | S | PARTIAL | Extend existing search page with filters: resource type, date range, license, language, domain |
| 1.1.4 | Add search auto-suggestions / typeahead | S | TODO | Query completion based on popular searches and indexed resource titles |
| 1.1.5 | Implement search result caching layer | S | TODO | Use Vercel KV (already in env) or Redis to cache frequent queries for speed |
| 1.1.6 | Add "Related Resources" panel on search results | S | TODO | When user clicks a result, show AI-suggested related papers/code/data |

### 1.2 AI & Enrichment Pipeline

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 1.2.1 | Build background resource indexing pipeline | L | TODO | Scheduled crawlers that continuously fetch new resources from providers (arXiv, GitHub, etc.) and store in local DB |
| 1.2.2 | Implement AI auto-tagging for indexed resources | M | TODO | NLP pipeline to extract topics, entities, and tags from resource metadata and content |
| 1.2.3 | Add AI summarization for search results | S | PARTIAL | Extend existing `/api/summarize` to auto-generate 2-3 line summaries for indexed resources |
| 1.2.4 | Build knowledge graph auto-population | M | PARTIAL | Automatically create Neo4j nodes/edges from indexed resources (link papers→datasets→code→authors) |
| 1.2.5 | Add AI-powered "Explain This" feature | S | TODO | One-click button on any resource to get an LLM-generated plain-language explanation |
| 1.2.6 | Implement personalized recommendations | M | TODO | Based on user's search history, saved resources, and workspace content, suggest relevant new resources |

### 1.3 Data & Infrastructure

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 1.3.1 | Set up resource index database table | M | TODO | New Prisma model `IndexedResource` to store crawled resources locally (title, abstract, url, source, embeddings, tags, license) |
| 1.3.2 | Add pgvector extension for embedding storage | S | TODO | Enable vector similarity search in PostgreSQL |
| 1.3.3 | Implement rate limiting on API routes | S | TODO | Protect search/summarize/graph endpoints from abuse |
| 1.3.4 | Add proper error boundaries and loading states | S | PARTIAL | Ensure all pages have graceful error handling and skeleton loaders |
| 1.3.5 | Set up automated testing for critical paths | M | TODO | Unit tests for search providers, API routes, auth flows |
| 1.3.6 | Add monitoring and alerting | S | TODO | Track API response times, error rates, search latency |

---

## PHASE 2: Beta Launch Features (Q2–Q4 2026)

_Goal: Reach whitepaper Phase 2 milestones — semantic search, expanded content, community traction._

### 2.1 Workspace Enhancements

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 2.1.1 | Add real-time collaboration to workspaces | L | TODO | WebSocket-based presence indicators, live cursors, concurrent editing |
| 2.1.2 | Implement workspace templates | S | TODO | Pre-built workspace templates for common research workflows (lit review, dataset analysis, code comparison) |
| 2.1.3 | Add resource import from search to workspace | S | PARTIAL | One-click "Save to Workspace" from search results with metadata auto-fill |
| 2.1.4 | Build workspace export/publish feature | M | TODO | Export workspace as PDF report, shareable page, or citable bundle |
| 2.1.5 | Add workspace activity timeline | S | TODO | Show history of actions (resources added, annotations made, collaborators joined) |
| 2.1.6 | Implement workspace forking | S | TODO | Allow users to fork public workspaces as starting points |

### 2.2 Community & Collaboration

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 2.2.1 | Add real-time notifications system | M | TODO | In-app notifications for mentions, replies, workspace invites, challenge updates |
| 2.2.2 | Build user reputation and badges system | M | PARTIAL | Schema exists; implement calculation logic and badge display (contributor, reviewer, mentor, etc.) |
| 2.2.3 | Add community leaderboards | S | TODO | Top contributors, most active groups, trending projects |
| 2.2.4 | Implement resource commenting/reviews | S | TODO | Allow users to leave reviews and ratings on indexed resources |
| 2.2.5 | Add collaborative annotation on resources | M | TODO | Multiple users can annotate the same resource with threaded discussions |
| 2.2.6 | Build project showcase / portfolio page | S | TODO | Users can feature their best workspaces and app projects on their profile |

### 2.3 Knowledge Graph Expansion

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 2.3.1 | Add author entity nodes to knowledge graph | M | TODO | Connect researchers to their papers, datasets, and code across platforms |
| 2.3.2 | Build "concept map" visualization | M | TODO | Interactive topic/concept map showing how domains and resources relate |
| 2.3.3 | Add institutional nodes (universities, labs, orgs) | S | TODO | Link institutions to researchers and projects |
| 2.3.4 | Implement graph-based search ("find papers connected to X") | M | TODO | Allow users to traverse the graph visually to discover resources |
| 2.3.5 | Add temporal dimension to knowledge graph | S | TODO | Track how topics and connections evolve over time |

---

## PHASE 3: Platform MVP 1.0 (2027)

_Goal: Full platform as described in whitepaper — complete collaboration suite, API, license compliance._

### 3.1 API & Developer Platform

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 3.1.1 | Build public REST API for resource discovery | L | TODO | Documented API endpoints for external apps to search and retrieve resources |
| 3.1.2 | Create GraphQL API layer | L | TODO | Flexible query interface for complex cross-resource queries |
| 3.1.3 | Build API key management & rate limiting | M | TODO | Self-service API key generation, usage dashboards, tiered limits |
| 3.1.4 | Create developer documentation portal | M | TODO | Interactive API docs (Swagger/OpenAPI), getting started guides, code examples |
| 3.1.5 | Build webhook system for resource updates | M | TODO | Notify external apps when new resources match user-defined criteria |

### 3.2 License & Compliance Engine

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 3.2.1 | Build license detection & classification | M | TODO | Auto-detect license type from resource metadata (MIT, GPL, CC-BY, etc.) |
| 3.2.2 | Implement license compatibility checker | M | TODO | When combining resources in a workspace, flag incompatible licenses |
| 3.2.3 | Add license filter to search results | S | TODO | Users can filter by "commercially usable", "modification allowed", etc. |
| 3.2.4 | Build attribution generator | S | TODO | Auto-generate proper citation/attribution text for used resources |

### 3.3 Monetization Features

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 3.3.1 | Implement tiered subscription plans | M | PARTIAL | Schema has subscription fields; build Stripe integration with Free/Pro/Enterprise tiers |
| 3.3.2 | Build premium AI features (advanced reports) | M | TODO | AI-generated landscape reports, trend analysis, curated digests |
| 3.3.3 | Add team/organization workspaces | L | TODO | Multi-user workspace management with roles and permissions for enterprise |
| 3.3.4 | Build usage analytics for API consumers | M | TODO | Dashboard showing API usage, costs, top queries for paying customers |

---

## PHASE 4: Growth & Scale (2028+)

_Goal: Global scale, multilingual, plugin ecosystem._

### 4.1 Internationalization & Scale

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 4.1.1 | Add i18n support (multi-language UI) | L | TODO | Support for major languages (EN, ES, FR, DE, ZH, JA, etc.) |
| 4.1.2 | Index non-English resources | L | TODO | Expand crawlers to non-English paper repositories, code platforms |
| 4.1.3 | Add cross-language search | M | TODO | Search in English, find relevant resources in other languages via translation |
| 4.1.4 | Horizontal scaling architecture | L | TODO | CDN, read replicas, queue-based indexing for high-availability |

### 4.2 Plugin & Extension Ecosystem

| # | Task | Size | Status | Details |
|---|------|------|--------|---------|
| 4.2.1 | Design plugin API specification | M | TODO | Define extension points: custom search providers, visualizations, export formats |
| 4.2.2 | Build plugin marketplace | L | TODO | Community-contributed plugins with install, review, and rating system |
| 4.2.3 | Create SDK for third-party integrations | L | TODO | JavaScript/Python SDKs for building on Open Idea |

---

## Immediate Sprint Backlog (Next 2 Weeks)

These are the highest-priority atomic tasks to tackle right now:

| Priority | Task ID | Task | Why Now |
|----------|---------|------|---------|
| P0 | 1.3.1 | Set up `IndexedResource` DB model | Foundation for all indexing/search improvements |
| P0 | 1.1.1 | Add semantic/vector search | Core differentiator from whitepaper vision |
| P0 | 1.3.2 | Add pgvector extension | Required for 1.1.1 |
| P1 | 1.2.1 | Build background resource indexing pipeline | Needed to grow from live-search to indexed catalog |
| P1 | 1.2.2 | Implement AI auto-tagging | Makes indexed resources more discoverable |
| P1 | 1.1.2 | Unified search ranking algorithm | Improves search quality immediately |
| P2 | 1.1.3 | Search filters & facets UI | Better UX for existing search |
| P2 | 1.3.3 | Rate limiting on API routes | Security hardening before beta |
| P2 | 1.3.4 | Error boundaries & loading states | Polish before public beta |
| P2 | 2.2.1 | Real-time notifications | Community engagement driver |

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vector DB | pgvector (PostgreSQL extension) | Simplify stack — single DB; good enough for <100M vectors |
| Embedding model | OpenAI text-embedding-3-small or Sentence-BERT | Cost vs quality tradeoff; start with OpenAI, migrate to self-hosted later |
| Background jobs | Vercel Cron + Edge Functions | Already on Vercel; no extra infra needed initially |
| Real-time | Supabase Realtime | Already using Supabase; built-in WebSocket channels |
| Caching | Vercel KV (Redis) | Already configured in env vars |
| License detection | SPDX license list + regex matching | Standard approach; can enhance with ML later |

---

## Key Metrics (from Whitepaper)

| Phase | Target | Metric |
|-------|--------|--------|
| Phase 1 (Now) | ~1M resources indexed | Track via `IndexedResource` count |
| Phase 2 (Mid 2026) | >10M resources, first partnerships | Track indexed count + institutional sign-ups |
| Phase 3 (2027) | 50-100M resources, growing user base | Track MAU, workspaces created, API usage |
| Phase 4 (2028+) | 1M+ active users, 100+ countries | Track DAU/MAU, geographic distribution |

---

## Risk Mitigation (from Whitepaper)

| Risk | Mitigation | Task IDs |
|------|------------|----------|
| Data integration complexity | Start with well-documented APIs (arXiv, GitHub); add incrementally | 1.2.1 |
| AI accuracy/hallucination | Human-in-the-loop review, confidence scoring on AI outputs | 1.2.2, 1.2.5 |
| Low adoption | Focus community features, open-source the platform itself | 2.2.x |
| Monetization viability | Freemium model, validate API demand early | 3.3.x |
| Legal/licensing | Build compliance engine early, consult legal | 3.2.x |

---

_This plan is a living document. Update task statuses as work progresses._
