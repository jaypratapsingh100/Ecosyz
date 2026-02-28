# Open Idea — Atomic Task Breakdown

> Every task from the Holistic Plan exploded into single-action developer tasks.
> Each atomic task = one file change, one function, one migration, one component, or one config.
> Generated: 2026-02-28

---

## How to Read

- `[ ]` = Not started
- `[~]` = In progress
- `[x]` = Complete
- **Tier**: MVP > BETA > V1 > GROWTH
- **Est**: Estimated hours per atomic task
- Tasks are numbered `Area.Parent.Sub` (e.g., A.1.1 = Aggregation, Task 1, Sub-task 1)

---

# MVP TIER (Ship Before Public Beta)

---

## A. UNIFIED AGGREGATION ENGINE

### A.1 — Create IndexedResource Database Model

- [ ] A.1.1 — Add `IndexedResource` model to `prisma/schema.prisma` with fields: id, title, abstract (Text), url (unique), source (String), sourceId, type (enum: paper/code/dataset/hardware/model), authors (String[]), tags (String[]), license, language, publishedAt, citationCount, rawMeta (Json), createdAt, updatedAt — Est: 1h
- [ ] A.1.2 — Add `@@index` on [source, sourceId], [type], [publishedAt], [url] to IndexedResource — Est: 0.5h
- [ ] A.1.3 — Add `summaryCache` (Text, nullable) field to IndexedResource for cached AI summaries — Est: 0.5h
- [ ] A.1.4 — Run `npx prisma migrate dev --name add-indexed-resource` to create migration — Est: 0.5h
- [ ] A.1.5 — Create `lib/db/indexed-resource.ts` with CRUD helpers: `upsertResource()`, `findByUrl()`, `findBySourceId()`, `searchResources()` — Est: 2h
- [ ] A.1.6 — Create `lib/types/indexed-resource.ts` with TypeScript types/interfaces for IndexedResource — Est: 0.5h

### A.2 — arXiv Ingestion Pipeline

- [ ] A.2.1 — Create `lib/ingestion/arxiv.ts` with function to call arXiv OAI-PMH API (ListRecords, metadata format `oai_dc`) — Est: 2h
- [ ] A.2.2 — Write XML parser to extract title, authors, abstract, categories, date, identifier from arXiv OAI-PMH response — Est: 2h
- [ ] A.2.3 — Write mapper function `mapArxivToIndexedResource()` that converts parsed arXiv record to IndexedResource upsert input — Est: 1h
- [ ] A.2.4 — Add pagination/resumption token handling for arXiv OAI-PMH bulk fetching — Est: 1h
- [ ] A.2.5 — Add `lastSyncedAt` tracking: create `IngestionSync` model in Prisma (source, lastCursor, lastRunAt, recordsProcessed, status) — Est: 1h
- [ ] A.2.6 — Create `app/api/ingestion/arxiv/route.ts` POST endpoint to trigger arXiv ingestion (admin-only) — Est: 1h
- [ ] A.2.7 — Write unit test for arXiv XML parser with sample response — Est: 1h

### A.3 — GitHub Repos Ingestion Pipeline

- [ ] A.3.1 — Create `lib/ingestion/github.ts` with function to call GitHub Search API (`/search/repositories`) filtered by stars:>10 — Est: 2h
- [ ] A.3.2 — Write mapper `mapGithubRepoToIndexedResource()` extracting: name, description, topics, license, language, stargazers_count, html_url, owner — Est: 1h
- [ ] A.3.3 — Add pagination handling for GitHub Search API (max 1000 results per query, paginate by created date ranges) — Est: 1.5h
- [ ] A.3.4 — Add rate limit handling for GitHub API (check `X-RateLimit-Remaining` header, pause when exhausted) — Est: 1h
- [ ] A.3.5 — Create `app/api/ingestion/github/route.ts` POST endpoint to trigger GitHub ingestion (admin-only) — Est: 1h
- [ ] A.3.6 — Write unit test for GitHub mapper with sample API response — Est: 1h

### A.4 — OpenAlex Ingestion Pipeline

- [ ] A.4.1 — Create `lib/ingestion/openalex.ts` with function to call OpenAlex Works API (`/works`) with cursor pagination — Est: 2h
- [ ] A.4.2 — Write mapper `mapOpenAlexToIndexedResource()` extracting: title, abstract_inverted_index (reconstruct abstract), authorships, doi, type, open_access status, cited_by_count, publication_date — Est: 1.5h
- [ ] A.4.3 — Add filter for open-access works only (`is_oa:true`) — Est: 0.5h
- [ ] A.4.4 — Add cursor pagination with `IngestionSync` tracking — Est: 1h
- [ ] A.4.5 — Create `app/api/ingestion/openalex/route.ts` POST endpoint (admin-only) — Est: 1h
- [ ] A.4.6 — Write unit test for OpenAlex abstract reconstruction from inverted index — Est: 1h

### A.5 — Zenodo / Datasets Ingestion Pipeline

- [ ] A.5.1 — Create `lib/ingestion/zenodo.ts` with function to call Zenodo REST API (`/api/records`) with pagination — Est: 2h
- [ ] A.5.2 — Write mapper `mapZenodoToIndexedResource()` extracting: title, description, creators, resource_type, license, doi, keywords, files — Est: 1h
- [ ] A.5.3 — Filter for datasets and publications (type filter in API query) — Est: 0.5h
- [ ] A.5.4 — Add pagination with `IngestionSync` tracking — Est: 1h
- [ ] A.5.5 — Create `app/api/ingestion/zenodo/route.ts` POST endpoint (admin-only) — Est: 1h

### A.6 — pgvector Extension

- [ ] A.6.1 — Create SQL migration to enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector` — Est: 0.5h
- [ ] A.6.2 — Add `embedding` column to IndexedResource: `vector(1536)` (via raw SQL migration since Prisma doesn't natively support vector) — Est: 1h
- [ ] A.6.3 — Create raw SQL index: `CREATE INDEX idx_resource_embedding ON "IndexedResource" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` — Est: 0.5h
- [ ] A.6.4 — Create `lib/db/vector-search.ts` helper: `searchByEmbedding(vector, limit, filters)` using raw Prisma `$queryRaw` with cosine distance operator `<=>` — Est: 1.5h

### A.7 — Generate Embeddings

- [ ] A.7.1 — Create `lib/ai/embeddings.ts` with function `generateEmbedding(text: string): Promise<number[]>` calling OpenAI `text-embedding-3-small` API — Est: 1h
- [ ] A.7.2 — Create `lib/ai/batch-embeddings.ts` with function to batch-process up to 100 texts per API call (OpenAI supports batch) — Est: 1.5h
- [ ] A.7.3 — Create `app/api/ingestion/generate-embeddings/route.ts` that processes IndexedResources with null embedding field in batches of 100, updates embedding column — Est: 2h
- [ ] A.7.4 — Add progress tracking: log count of resources with/without embeddings — Est: 0.5h
- [ ] A.7.5 — Add error handling: retry failed embeddings, skip resources with empty title+abstract — Est: 1h

### A.8 — Continuous Sync Scheduler

- [ ] A.8.1 — Create `app/api/cron/sync-resources/route.ts` with GET handler (Vercel Cron compatible) — Est: 1h
- [ ] A.8.2 — Add cron job config to `vercel.json`: run daily at 2 AM UTC — Est: 0.5h
- [ ] A.8.3 — Implement orchestrator logic: call arXiv → GitHub → OpenAlex → Zenodo sequentially, update IngestionSync timestamps — Est: 1.5h
- [ ] A.8.4 — Add `app/api/cron/generate-embeddings/route.ts` cron to process new resources without embeddings (run after sync) — Est: 1h
- [ ] A.8.5 — Add admin UI button "Trigger Manual Sync" on admin dashboard — Est: 1h

### A.9 — Deduplication Logic

- [ ] A.9.1 — Create `lib/ingestion/dedup.ts` with `findDuplicates()` function: match by DOI, then by url, then by normalized title+first-author — Est: 2h
- [ ] A.9.2 — Add `canonicalId` field to IndexedResource (nullable, points to master record) for merged duplicates — Est: 0.5h
- [ ] A.9.3 — Create merge function: keep record with most metadata, link duplicates via canonicalId — Est: 1.5h
- [ ] A.9.4 — Run dedup as post-processing step after each ingestion batch — Est: 0.5h

---

## B. AI-POWERED DISCOVERY

### B.1 — Semantic Vector Search

- [ ] B.1.1 — Create `app/api/search/semantic/route.ts` POST endpoint accepting `{ query: string, limit: number, filters: object }` — Est: 1h
- [ ] B.1.2 — In handler: generate embedding for query text using `generateEmbedding()` — Est: 0.5h
- [ ] B.1.3 — Call `searchByEmbedding()` with query vector, return top-K results ordered by cosine similarity — Est: 1h
- [ ] B.1.4 — Add filter support: WHERE clauses for type, source, publishedAt range, license, language — Est: 1.5h
- [ ] B.1.5 — Return results with similarity score alongside resource data — Est: 0.5h

### B.2 — Hybrid Search (Keyword + Semantic + Filters)

- [ ] B.2.1 — Add `searchVector` tsvector column to IndexedResource (generated from title + abstract) — Est: 1h
- [ ] B.2.2 — Create migration and GIN index on searchVector — Est: 0.5h
- [ ] B.2.3 — Create `lib/search/hybrid.ts` with function that runs keyword search (ts_query) and semantic search (pgvector) in parallel — Est: 2h
- [ ] B.2.4 — Implement ranking formula: `final_score = (0.4 * keyword_rank) + (0.4 * semantic_similarity) + (0.1 * freshness_score) + (0.1 * citation_score)` — Est: 1.5h
- [ ] B.2.5 — Create unified `app/api/search/route.ts` that replaces or enhances existing search to use hybrid search on local index + fallback to live APIs — Est: 2h
- [ ] B.2.6 — Add pagination (offset/limit) to hybrid search results — Est: 0.5h

### B.3 — Rich Search Result Snippets

- [ ] B.3.1 — Create `components/search/ResourceCard.tsx` component with structured layout: title, authors, abstract snippet, badges row — Est: 2h
- [ ] B.3.2 — Add type badge component (color-coded): Paper (blue), Code (green), Dataset (orange), Hardware (purple), Model (pink) — Est: 1h
- [ ] B.3.3 — Add source badge component: arXiv, GitHub, OpenAlex, Zenodo logos/icons — Est: 1h
- [ ] B.3.4 — Add license badge component: MIT (green), GPL (yellow), CC-BY (blue), etc. — Est: 0.5h
- [ ] B.3.5 — Add citation count display and publication date — Est: 0.5h
- [ ] B.3.6 — Add "Save to Workspace" button on each card — Est: 0.5h
- [ ] B.3.7 — Add "View Source" external link button on each card — Est: 0.5h

### B.4 — Search Filters & Facets UI

- [ ] B.4.1 — Create `components/search/SearchFilters.tsx` sidebar component — Est: 1h
- [ ] B.4.2 — Add resource type filter (checkboxes: Paper, Code, Dataset, Hardware, Model) — Est: 1h
- [ ] B.4.3 — Add date range filter (from-to date pickers or preset: Last year, Last 5 years, All time) — Est: 1h
- [ ] B.4.4 — Add source filter (checkboxes: arXiv, GitHub, OpenAlex, Zenodo, etc.) — Est: 0.5h
- [ ] B.4.5 — Add license filter (dropdown: Any, Commercially usable, Public domain, CC-BY, MIT/Apache, GPL) — Est: 0.5h
- [ ] B.4.6 — Add language filter (dropdown: English, Chinese, Spanish, French, etc.) — Est: 0.5h
- [ ] B.4.7 — Add sort options (Relevance, Newest, Most cited, Most starred) — Est: 0.5h
- [ ] B.4.8 — Wire filters to search API query parameters — Est: 1h
- [ ] B.4.9 — Add facet counts next to each filter option (e.g., "Papers (12,345)") — Est: 1.5h

### B.5 — Search Auto-Suggestions

- [ ] B.5.1 — Create `app/api/search/suggest/route.ts` GET endpoint accepting `?q=partial_query` — Est: 1h
- [ ] B.5.2 — Query SearchLog for top matching previous queries (prefix match, ordered by frequency) — Est: 1h
- [ ] B.5.3 — Query IndexedResource titles for prefix matches (limit 5) — Est: 0.5h
- [ ] B.5.4 — Merge and return top 8 suggestions — Est: 0.5h
- [ ] B.5.5 — Create `components/search/SearchAutocomplete.tsx` dropdown component with debounced input — Est: 1.5h
- [ ] B.5.6 — Wire autocomplete to search input on search page — Est: 0.5h

### B.6 — AI Summarization on Search Results

- [ ] B.6.1 — Modify existing `/api/summarize` to accept IndexedResource id and return cached summary if available — Est: 1h
- [ ] B.6.2 — Add batch summarization endpoint: accept array of resource IDs, return summaries — Est: 1.5h
- [ ] B.6.3 — Generate 2-3 line summary using LLM with prompt: "Summarize this [paper/code/dataset] in 2-3 sentences for a general audience: {title} {abstract}" — Est: 1h
- [ ] B.6.4 — Cache generated summary in IndexedResource.summaryCache field — Est: 0.5h
- [ ] B.6.5 — Display cached summary on ResourceCard component (show placeholder if not yet generated) — Est: 0.5h
- [ ] B.6.6 — Add "Summarize" button on cards without cached summary — Est: 0.5h

---

## C. COLLABORATIVE WORKSPACES (MVP)

### C.1 — Save to Workspace from Search (Polish)

- [ ] C.1.1 — Create `components/search/SaveToWorkspaceModal.tsx` — modal with workspace dropdown, auto-filled title/url/type from search result — Est: 1.5h
- [ ] C.1.2 — Add API endpoint or modify existing resource creation to accept IndexedResource metadata — Est: 1h
- [ ] C.1.3 — Show success toast with link to workspace after saving — Est: 0.5h

### C.2 — Workspace Sections/Organization

- [ ] C.2.1 — Create `WorkspaceSection` model in Prisma: id, workspaceId, name, position (Int), createdAt — Est: 1h
- [ ] C.2.2 — Add `sectionId` (nullable) foreign key on Resource model — Est: 0.5h
- [ ] C.2.3 — Run migration — Est: 0.5h
- [ ] C.2.4 — Create API routes: `POST /api/workspaces/[id]/sections` (create), `PATCH` (rename, reorder), `DELETE` — Est: 1.5h
- [ ] C.2.5 — Create `components/workspace/SectionHeader.tsx` with rename/delete actions — Est: 1h
- [ ] C.2.6 — Add drag-and-drop resource movement between sections (using dnd-kit or similar) — Est: 2h
- [ ] C.2.7 — Add default sections on workspace creation: "Resources", "Notes" — Est: 0.5h

### C.3 — Workspace Public/Private Toggle

- [ ] C.3.1 — Add `isPublic` Boolean field (default false) to Workspace model in Prisma — Est: 0.5h
- [ ] C.3.2 — Run migration — Est: 0.5h
- [ ] C.3.3 — Add toggle switch UI in workspace settings — Est: 1h
- [ ] C.3.4 — Create `app/api/workspaces/[id]/visibility/route.ts` PATCH endpoint — Est: 0.5h
- [ ] C.3.5 — Add middleware: public workspaces viewable without auth, private require owner check — Est: 1h
- [ ] C.3.6 — Create public workspace page `/workspaces/public/[id]` (read-only, no auth required) — Est: 1.5h

### C.4 — One-Click Citation Generation

- [ ] C.4.1 — Create `lib/citations/formatter.ts` with functions: `formatAPA()`, `formatMLA()`, `formatBibTeX()`, `formatChicago()` — Est: 2h
- [ ] C.4.2 — Each function accepts `{ title, authors, year, url, doi, source, journal }` and returns formatted string — Est: (included above)
- [ ] C.4.3 — Create `components/resource/CiteButton.tsx` with dropdown showing all formats + copy-to-clipboard — Est: 1.5h
- [ ] C.4.4 — Add CiteButton to ResourceCard and resource detail pages — Est: 0.5h

---

## D. KNOWLEDGE GRAPH (MVP)

### D.1 — Auto-Populate Graph from Ingestion

- [ ] D.1.1 — Create `lib/graph/auto-populate.ts` with function `addResourceToGraph(resource: IndexedResource)` — Est: 1h
- [ ] D.1.2 — For paper type: create Paper node with properties (title, doi, year, source) — Est: 1h
- [ ] D.1.3 — For code type: create Repository node with properties (name, url, language, stars) — Est: 1h
- [ ] D.1.4 — For dataset type: create Dataset node with properties (title, url, format) — Est: 0.5h
- [ ] D.1.5 — Create Topic nodes from resource tags, link with HAS_TOPIC relationship — Est: 1h
- [ ] D.1.6 — Call `addResourceToGraph()` as post-processing step in each ingestion pipeline — Est: 0.5h
- [ ] D.1.7 — Add batch processing: process 100 resources at a time to Neo4j — Est: 1h

### D.2 — Author Entity Nodes

- [ ] D.2.1 — Create Author node type in Neo4j with properties: name, orcid (nullable), affiliation (nullable) — Est: 0.5h
- [ ] D.2.2 — Parse author names from IndexedResource.authors array — Est: 1h
- [ ] D.2.3 — Create AUTHORED relationship: (Author)-[:AUTHORED]->(Paper/Dataset) — Est: 1h
- [ ] D.2.4 — Implement author deduplication: match by ORCID first, then by normalized name — Est: 1.5h
- [ ] D.2.5 — Add author nodes to graph visualization (different color/shape from resources) — Est: 1h

---

## E. USER EXPERIENCE (MVP)

### E.1 — ORCID Integration

- [ ] E.1.1 — Create `lib/integrations/orcid.ts` with function to call ORCID public API (`/v3.0/{orcid}/works`) — Est: 1.5h
- [ ] E.1.2 — Parse ORCID works response: extract titles, dois, years, journal names — Est: 1.5h
- [ ] E.1.3 — Create `app/api/profile/orcid-sync/route.ts` POST endpoint: fetch works by user's orcidId, display on profile — Est: 1.5h
- [ ] E.1.4 — Add "Sync ORCID" button on profile settings page — Est: 0.5h
- [ ] E.1.5 — Display imported publications list on public profile page — Est: 1h

### E.2 — GitHub Profile Integration (Polish)

- [ ] E.2.1 — Create `lib/integrations/github-profile.ts` to fetch user's public repos via GitHub API — Est: 1h
- [ ] E.2.2 — Create `app/api/profile/github-sync/route.ts` endpoint — Est: 1h
- [ ] E.2.3 — Display top repos on profile page (sorted by stars) — Est: 1h
- [ ] E.2.4 — Add "Sync GitHub" button on profile settings — Est: 0.5h

### E.3 — License Badges on Resources

- [ ] E.3.1 — Create `components/badges/LicenseBadge.tsx` with color mapping: MIT→green, GPL→yellow, CC-BY→blue, Apache→orange, unlicensed→gray — Est: 1h
- [ ] E.3.2 — Add LicenseBadge to ResourceCard component — Est: 0.5h
- [ ] E.3.3 — Add LicenseBadge to resource detail page — Est: 0.5h

### E.4 — One-Click Access Links

- [ ] E.4.1 — Create `components/resource/AccessLinks.tsx` with buttons: "View PDF" (for papers), "Open on GitHub" (for code), "Download Dataset" (for data) — Est: 1h
- [ ] E.4.2 — Generate correct external URLs based on resource type and source — Est: 1h
- [ ] E.4.3 — Add AccessLinks to ResourceCard component — Est: 0.5h

---

## F. COMMUNITY (MVP)

### F.1 — In-App Notification System

- [ ] F.1.1 — Add `Notification` model to Prisma: id, userId, type (String), title, message (nullable), entityType (nullable), entityId (nullable), read (Boolean default false), createdAt — Est: 1h
- [ ] F.1.2 — Add relation: User has many Notifications — Est: 0.5h
- [ ] F.1.3 — Run migration — Est: 0.5h
- [ ] F.1.4 — Create `app/api/notifications/route.ts` GET (list user's notifications, paginated) — Est: 1h
- [ ] F.1.5 — Create `app/api/notifications/[id]/read/route.ts` PATCH (mark as read) — Est: 0.5h
- [ ] F.1.6 — Create `app/api/notifications/read-all/route.ts` PATCH (mark all as read) — Est: 0.5h
- [ ] F.1.7 — Create `lib/notifications/create.ts` helper: `createNotification(userId, type, title, entityType?, entityId?)` — Est: 1h
- [ ] F.1.8 — Add notification triggers: call `createNotification()` when discussion reply created — Est: 0.5h
- [ ] F.1.9 — Add notification trigger: when user is followed — Est: 0.5h
- [ ] F.1.10 — Add notification trigger: when workspace is shared with user — Est: 0.5h
- [ ] F.1.11 — Add notification trigger: when challenge submission status changes — Est: 0.5h
- [ ] F.1.12 — Create `components/notifications/NotificationBell.tsx` — bell icon with unread count badge in header — Est: 1.5h
- [ ] F.1.13 — Create `components/notifications/NotificationDropdown.tsx` — dropdown list of recent notifications — Est: 1.5h
- [ ] F.1.14 — Add Supabase Realtime subscription for live notification push (optional, can start with polling) — Est: 1.5h

### F.2 — Email Notification Digests

- [ ] F.2.1 — Create `lib/notifications/email-digest.ts` with function to aggregate unread notifications into HTML email — Est: 1.5h
- [ ] F.2.2 — Create `app/api/cron/notification-digest/route.ts` cron endpoint (daily at 8 AM) — Est: 1h
- [ ] F.2.3 — Add cron config to `vercel.json` — Est: 0.5h
- [ ] F.2.4 — Respect user preference: only send if `profile.preferences.emailNotifications === true` — Est: 0.5h

---

## G. SEARCH INFRASTRUCTURE (MVP)

### G.1 — Search Result Caching

- [ ] G.1.1 — Create `lib/cache/search-cache.ts` with `getCachedResults(queryHash)` and `setCachedResults(queryHash, results, ttl)` using Vercel KV — Est: 1.5h
- [ ] G.1.2 — Generate cache key from: query + filters + sort + page (hash with SHA-256) — Est: 0.5h
- [ ] G.1.3 — Add cache check at top of search API route: return cached if hit — Est: 0.5h
- [ ] G.1.4 — Set cache on search response: TTL 1 hour for live results, 24 hours for index results — Est: 0.5h

### G.2 — Switch Primary Search to Local Index

- [ ] G.2.1 — Modify `app/api/search/route.ts` to query IndexedResource via hybrid search first — Est: 1.5h
- [ ] G.2.2 — If local results < threshold (e.g., < 5), supplement with live API calls to existing providers — Est: 1h
- [ ] G.2.3 — Merge local + live results, dedup by URL — Est: 1h
- [ ] G.2.4 — Add `source: "index" | "live"` flag to each result so UI can indicate origin — Est: 0.5h

### G.3 — Rate Limiting

- [ ] G.3.1 — Create `lib/middleware/rate-limit.ts` using Vercel KV for token-bucket rate limiting — Est: 1.5h
- [ ] G.3.2 — Define limits: unauthenticated (30 search/hr, 10 AI/hr), authenticated (200 search/hr, 50 AI/hr) — Est: 0.5h
- [ ] G.3.3 — Apply rate limit middleware to `/api/search`, `/api/summarize`, `/api/chat`, `/api/graph` routes — Est: 1h
- [ ] G.3.4 — Return `429 Too Many Requests` with `Retry-After` header when limit exceeded — Est: 0.5h

### G.4 — Search Analytics Dashboard (Admin)

- [ ] G.4.1 — Create `app/admin/search-analytics/page.tsx` — Est: 1h
- [ ] G.4.2 — Add chart: top 20 search queries this week (bar chart) — Est: 1h
- [ ] G.4.3 — Add metric: average results per query, zero-result query percentage — Est: 1h
- [ ] G.4.4 — Add metric: click-through rate (queries with clicks / total queries) — Est: 0.5h
- [ ] G.4.5 — Add chart: searches per day over last 30 days (line chart) — Est: 1h

---

## K. GO-TO-MARKET (MVP)

### K.1 — Seed Sample Projects

- [ ] K.1.1 — Create public workspace "AI for Climate Research" with 10-15 curated resources — Est: 1h
- [ ] K.1.2 — Create public workspace "Open Source Drug Discovery" with 10-15 curated resources — Est: 1h
- [ ] K.1.3 — Create public workspace "Learn Machine Learning" with 10-15 curated resources — Est: 1h
- [ ] K.1.4 — Feature these on the landing page or explore section — Est: 0.5h

### K.2 — Onboarding Tutorial

- [ ] K.2.1 — Create `components/onboarding/OnboardingTour.tsx` component using a tooltip library (e.g., react-joyride) — Est: 2h
- [ ] K.2.2 — Define 5-7 tour steps: welcome → search bar → filters → save to workspace → knowledge graph → AI features → profile — Est: 1h
- [ ] K.2.3 — Show tour on first login (track via `profile.onboardingCompleted` flag) — Est: 0.5h
- [ ] K.2.4 — Add "Replay Tour" option in user menu — Est: 0.5h

### K.3 — SEO for Public Content

- [ ] K.3.1 — Add `generateMetadata()` to public workspace page with title, description, Open Graph tags — Est: 1h
- [ ] K.3.2 — Add `generateMetadata()` to public app project pages — Est: 0.5h
- [ ] K.3.3 — Create `app/sitemap.ts` generating sitemap.xml for public workspaces and projects — Est: 1h
- [ ] K.3.4 — Add structured data (JSON-LD) for research resources (Schema.org ScholarlyArticle, SoftwareSourceCode, Dataset) — Est: 1.5h

---

## L. SECURITY & TRUST (MVP)

### L.1 — Error Boundaries

- [ ] L.1.1 — Create `components/ErrorBoundary.tsx` React error boundary component with friendly fallback UI — Est: 1h
- [ ] L.1.2 — Create `components/SkeletonCard.tsx` loading skeleton for resource cards — Est: 0.5h
- [ ] L.1.3 — Create `components/SkeletonPage.tsx` full-page skeleton loader — Est: 0.5h
- [ ] L.1.4 — Add error.tsx files to all major app route directories — Est: 1h
- [ ] L.1.5 — Add loading.tsx files to all major app route directories — Est: 1h

### L.2 — AI Output Source Citations

- [ ] L.2.1 — Modify AI summarization prompt to always include source title and URL in output — Est: 0.5h
- [ ] L.2.2 — Parse AI response to extract citation references — Est: 1h
- [ ] L.2.3 — Render citations as clickable links below AI-generated text — Est: 0.5h
- [ ] L.2.4 — Add "Sources" section to all AI outputs (summaries, explanations, Q&A) — Est: 0.5h

### L.3 — AI Confidence Indicators

- [ ] L.3.1 — Add "AI Generated" label/badge to all AI-produced content — Est: 0.5h
- [ ] L.3.2 — Create `components/ai/FeedbackButtons.tsx` with thumbs-up/thumbs-down buttons — Est: 1h
- [ ] L.3.3 — Create `app/api/ai-feedback/route.ts` POST endpoint to store feedback (resourceId, type, positive/negative) — Est: 1h
- [ ] L.3.4 — Add `AIFeedback` model to Prisma: id, userId, resourceId, outputType, isPositive, createdAt — Est: 0.5h

### L.4 — GDPR Compliance

- [ ] L.4.1 — Create cookie consent banner component — Est: 1h
- [ ] L.4.2 — Create `app/api/profile/export-data/route.ts` — exports user's data as JSON download — Est: 1.5h
- [ ] L.4.3 — Create `app/api/profile/delete-account/route.ts` — cascade deletes user and all associated data — Est: 1.5h
- [ ] L.4.4 — Add "Export My Data" and "Delete Account" buttons to profile settings — Est: 0.5h
- [ ] L.4.5 — Update privacy policy page with GDPR-required disclosures — Est: 1h

---

# BETA TIER (Ship for Beta Launch — Mid 2026)

---

## A. AGGREGATION (BETA)

- [ ] A.10.1 — Create `lib/ingestion/huggingface.ts` for HuggingFace API models endpoint — Est: 2h
- [ ] A.10.2 — Create HuggingFace datasets ingestion — Est: 1.5h
- [ ] A.10.3 — Write mappers for both HF models and datasets — Est: 1.5h
- [ ] A.11.1 — Create `lib/ingestion/pubmed.ts` for PubMed Central E-utilities API — Est: 2h
- [ ] A.11.2 — Parse PubMed XML response (title, abstract, authors, MeSH terms, PMCID) — Est: 1.5h
- [ ] A.12.1 — Create `lib/ingestion/wikifactory.ts` — Est: 1.5h
- [ ] A.12.2 — Create `lib/ingestion/thingiverse.ts` — Est: 1.5h
- [ ] A.13.1 — Create `lib/ingestion/core.ts` for CORE API v3 — Est: 2h
- [ ] A.14.1 — Create `app/admin/ingestion/page.tsx` dashboard: table of sources with last sync time, records count, status — Est: 2h
- [ ] A.14.2 — Add per-source "Run Now" button — Est: 0.5h
- [ ] A.14.3 — Add error log viewer per source — Est: 1h

## B. AI DISCOVERY (BETA)

- [ ] B.7.1 — Create `lib/ai/recommendations.ts` with function `getRecommendations(resourceId)` — Est: 1.5h
- [ ] B.7.2 — Implement embedding-based similarity: find 10 nearest neighbors by cosine distance — Est: 1h
- [ ] B.7.3 — Implement co-occurrence: resources frequently saved together in workspaces — Est: 1.5h
- [ ] B.7.4 — Implement citation-link: follow citation graph edges in Neo4j — Est: 1h
- [ ] B.7.5 — Blend all three signals into ranked recommendation list — Est: 1h
- [ ] B.8.1 — Create `components/resource/RelatedSidebar.tsx` — Est: 1.5h
- [ ] B.8.2 — Fetch recommendations on resource detail page load — Est: 0.5h
- [ ] B.9.1 — Create `app/api/chat/knowledge/route.ts` RAG endpoint: embed query → retrieve top-K resources → send to LLM with context — Est: 3h
- [ ] B.9.2 — Create `components/ai/KnowledgeChatPanel.tsx` slide-out panel — Est: 2h
- [ ] B.9.3 — Add message history management (session-based) — Est: 1h
- [ ] B.9.4 — Always include source citations in chat responses — Est: 1h
- [ ] B.10.1 — Create `app/api/ai/explain/route.ts` POST endpoint accepting resourceId — Est: 1.5h
- [ ] B.10.2 — Different prompts per type: papers ("explain in simple terms"), code ("explain what this does"), datasets ("describe fields and use cases") — Est: 1h
- [ ] B.10.3 — Add "Explain This" button to resource detail page — Est: 0.5h
- [ ] B.11.1 — Add inline PDF viewer component using `react-pdf` — Est: 2h
- [ ] B.11.2 — Add code README renderer using markdown — Est: 1h
- [ ] B.11.3 — Add dataset preview: show first 10 rows if CSV, or field descriptions — Est: 1.5h
- [ ] B.12.1 — Create `app/api/feed/personalized/route.ts` — query based on user's expertise tags + recent searches — Est: 2h
- [ ] B.12.2 — Create `components/dashboard/PersonalizedFeed.tsx` — Est: 1.5h
- [ ] B.12.3 — Show on user's home/dashboard page — Est: 0.5h
- [ ] B.13.1 — Create `app/api/analytics/trends/route.ts` — aggregate IndexedResource by tags over time — Est: 2h
- [ ] B.13.2 — Create `components/analytics/TrendChart.tsx` line chart (Recharts or Chart.js) — Est: 1.5h
- [ ] B.13.3 — Create `/trends` page showing top rising topics — Est: 1h

## C. WORKSPACES (BETA)

- [ ] C.5.1 — Set up Supabase Realtime channel per workspace — Est: 1.5h
- [ ] C.5.2 — Broadcast resource additions/removals to all connected clients — Est: 1.5h
- [ ] C.5.3 — Add presence indicators (avatar dots showing who's online) — Est: 1.5h
- [ ] C.5.4 — Handle conflict resolution for concurrent edits — Est: 2h
- [ ] C.6.1 — Create `WorkspaceEvent` model: id, workspaceId, userId, action (String), entityType, entityId, metadata (Json), createdAt — Est: 1h
- [ ] C.6.2 — Log events on every workspace mutation — Est: 1h
- [ ] C.6.3 — Create `components/workspace/ActivityTimeline.tsx` — Est: 1.5h
- [ ] C.6.4 — Add revert button on each event (undo action) — Est: 2h
- [ ] C.7.1 — Create `WorkspaceComment` model: id, workspaceId, resourceId (nullable), content (Text), authorId, createdAt — Est: 1h
- [ ] C.7.2 — Create comments API routes — Est: 1h
- [ ] C.7.3 — Create `components/workspace/CommentThread.tsx` — Est: 1.5h
- [ ] C.7.4 — Add @mention detection and notification trigger — Est: 1h
- [ ] C.8.1 — Create `app/api/workspaces/[id]/fork/route.ts` POST — copy workspace + resources to new owner — Est: 1.5h
- [ ] C.8.2 — Add "Forked from" attribution link on forked workspaces — Est: 0.5h
- [ ] C.8.3 — Add "Fork" button on public workspace pages — Est: 0.5h
- [ ] C.9.1 — Create `WorkspaceCollaborator` model: id, workspaceId, userId, role (owner/editor/viewer), invitedAt — Est: 1h
- [ ] C.9.2 — Create invite API: send email/notification with accept link — Est: 1.5h
- [ ] C.9.3 — Create `components/workspace/CollaboratorManager.tsx` — list, invite, remove, change role — Est: 2h
- [ ] C.9.4 — Add permission checks: viewer can't edit, editor can't delete workspace — Est: 1h
- [ ] C.10.1 — Create `lib/workspace/templates.ts` with preset configs: Literature Review, Dataset Analysis, Prototype Build — Est: 1h
- [ ] C.10.2 — Add "Start from Template" option in workspace creation modal — Est: 1h
- [ ] C.10.3 — Each template pre-creates sections and optional guide notes — Est: 1h

## D. KNOWLEDGE GRAPH (BETA)

- [ ] D.3.1 — Create Institution node type in Neo4j — Est: 0.5h
- [ ] D.3.2 — Parse affiliation data from author metadata — Est: 1h
- [ ] D.3.3 — Create AFFILIATED_WITH relationship — Est: 0.5h
- [ ] D.4.1 — Create `components/graph/ConceptMap.tsx` — topic-centric graph view (topics as large nodes, resources as smaller connected nodes) — Est: 3h
- [ ] D.4.2 — Add zoom/pan controls — Est: 0.5h
- [ ] D.4.3 — Add click-to-expand: clicking topic shows connected resources — Est: 1h
- [ ] D.5.1 — Add "Explore connections" button on resource detail page — Est: 0.5h
- [ ] D.5.2 — Query Neo4j for 2-hop neighbors of selected node — Est: 1h
- [ ] D.5.3 — Render expanded subgraph in Cytoscape.js — Est: 1h
- [ ] D.6.1 — Add `year` property to graph relationships — Est: 0.5h
- [ ] D.6.2 — Create timeline slider UI component — Est: 1.5h
- [ ] D.6.3 — Filter visible nodes/edges by year range — Est: 1h

## E. PROFILES (BETA)

- [ ] E.5.1 — Create `lib/reputation/calculate.ts` with scoring formula: workspaces*5 + resources*2 + discussions*3 + replies*1 + followers*2 + challengeWins*20 — Est: 1.5h
- [ ] E.5.2 — Create cron job to recalculate reputation scores daily — Est: 1h
- [ ] E.5.3 — Define badge thresholds: Early Adopter (signed up in beta), Knowledge Sharer (50+ resources), Open Mentor (100+ replies), etc. — Est: 1h
- [ ] E.5.4 — Create `components/profile/BadgeDisplay.tsx` — grid of earned badges — Est: 1h
- [ ] E.6.1 — Add "Featured Projects" section to profile page — Est: 1h
- [ ] E.6.2 — Create `app/api/profile/featured/route.ts` to pin/unpin workspaces — Est: 1h
- [ ] E.7.1 — Create `components/profile/ActivityStream.tsx` — timeline of user's activities — Est: 1.5h
- [ ] E.7.2 — Query Activity model for user's public actions — Est: 0.5h
- [ ] E.8.1 — Create `app/api/users/suggestions/route.ts` — recommend users with similar expertise tags — Est: 1.5h
- [ ] E.8.2 — Create `components/community/PeopleYouMayFollow.tsx` — Est: 1h

## F. COMMUNITY (BETA)

- [ ] F.3.1 — Create badge icon assets (SVG) for each badge type — Est: 1.5h
- [ ] F.3.2 — Create `components/badges/BadgeIcon.tsx` — renders appropriate badge by ID — Est: 0.5h
- [ ] F.3.3 — Display earned badges on profile page header — Est: 0.5h
- [ ] F.4.1 — Create `app/community/leaderboard/page.tsx` — Est: 1h
- [ ] F.4.2 — Add "Top Contributors" table sorted by reputation score — Est: 1h
- [ ] F.4.3 — Add "Trending Projects" section — workspaces with most views this week — Est: 1h
- [ ] F.4.4 — Add "Most Active Groups" section — groups with most discussions this week — Est: 1h
- [ ] F.5.1 — Add prize tiers (1st, 2nd, 3rd) to Challenge model — Est: 0.5h
- [ ] F.5.2 — Add team formation: allow challenge participants to form teams — Est: 2h
- [ ] F.5.3 — Link challenge to workspace template — Est: 0.5h
- [ ] F.6.1 — Create 3 learning pathway workspace templates with guided step-by-step notes — Est: 2h
- [ ] F.6.2 — Create `/learn` page listing available pathways — Est: 1h

## H. LICENSE & COMPLIANCE (BETA)

- [ ] H.1.1 — Create `lib/license/detect.ts` — extract license from resource metadata per source — Est: 1.5h
- [ ] H.1.2 — Create SPDX license mapping table (50+ common licenses) — Est: 1h
- [ ] H.1.3 — Run license detection as post-processing step in ingestion — Est: 0.5h
- [ ] H.2.1 — Add license category filter to search filters component — Est: 1h
- [ ] H.2.2 — Map licenses to categories: "Permissive" (MIT, Apache, BSD), "Copyleft" (GPL), "Creative Commons", "Public Domain" — Est: 0.5h
- [ ] H.3.1 — Create `lib/citations/auto-cite.ts` using resource metadata — Est: 1h
- [ ] H.3.2 — Add "Copy Citation" button dropdown to resource cards — Est: 0.5h

## I. MONETIZATION (BETA)

- [ ] I.1.1 — Install `stripe` npm package — Est: 0.5h
- [ ] I.1.2 — Create Stripe products and prices (Free, Pro $19/mo, Enterprise custom) in Stripe dashboard — Est: 0.5h
- [ ] I.1.3 — Create `app/api/payments/create-checkout/route.ts` — Stripe Checkout session — Est: 1.5h
- [ ] I.1.4 — Create `app/api/payments/webhook/route.ts` — handle checkout.session.completed, subscription updated/cancelled — Est: 2h
- [ ] I.1.5 — Update User model subscriptionPlan/Status on webhook events — Est: 1h
- [ ] I.1.6 — Create billing portal link for managing subscription — Est: 0.5h
- [ ] I.2.1 — Create `lib/auth/plan-check.ts` with `getUserPlan(userId)` and `canAccess(userId, feature)` — Est: 1h
- [ ] I.2.2 — Define feature gates: free (5 private workspaces, 20 AI queries/day), pro (unlimited workspaces, 200 AI/day), enterprise (unlimited) — Est: 0.5h
- [ ] I.2.3 — Add middleware to AI endpoints checking plan limits — Est: 1h
- [ ] I.2.4 — Show upgrade prompt when user hits limit — Est: 1h
- [ ] I.3.1 — Create `AIUsage` model: id, userId, type (search/summarize/chat), createdAt — Est: 0.5h
- [ ] I.3.2 — Log usage on every AI API call — Est: 0.5h
- [ ] I.3.3 — Create `components/settings/UsageBar.tsx` showing current usage vs limit — Est: 1h

## K. GTM (BETA)

- [ ] K.4.1 — Create `Referral` model: id, referrerId, referredEmail, status, rewardGranted, createdAt — Est: 1h
- [ ] K.4.2 — Create referral link generation on profile page — Est: 0.5h
- [ ] K.4.3 — Track signups from referral links — Est: 1h
- [ ] K.4.4 — Grant bonus AI quota to both users on successful referral — Est: 0.5h
- [ ] K.5.1 — Create `app/explore/page.tsx` — gallery of public workspaces and app projects — Est: 2h
- [ ] K.5.2 — Add tabs: Trending, Newest, Featured — Est: 1h
- [ ] K.5.3 — Add search within explore page — Est: 0.5h

## L. SECURITY (BETA)

- [ ] L.5.1 — Set up Jest/Vitest test runner configuration — Est: 1h
- [ ] L.5.2 — Write tests for arXiv ingestion parser (3+ test cases) — Est: 1h
- [ ] L.5.3 — Write tests for hybrid search ranking algorithm — Est: 1.5h
- [ ] L.5.4 — Write tests for citation formatter (all 4 formats) — Est: 1h
- [ ] L.5.5 — Write tests for auth middleware (authenticated, unauthenticated, admin) — Est: 1h
- [ ] L.5.6 — Add test script to package.json and CI workflow — Est: 0.5h
- [ ] L.6.1 — Add request duration logging middleware — Est: 0.5h
- [ ] L.6.2 — Add error tracking (Sentry or similar) — Est: 1h
- [ ] L.6.3 — Create health check endpoint `/api/health` — Est: 0.5h
- [ ] L.7.1 — Add "Report" button on resources, discussions, comments — Est: 1h
- [ ] L.7.2 — Create `ContentReport` model and admin review page — Est: 1.5h

## M. MOBILE (BETA)

- [ ] M.1.1 — Audit all pages on 375px viewport, fix layout issues — Est: 2h
- [ ] M.1.2 — Fix navigation menu for mobile (hamburger, slide-out) — Est: 1h
- [ ] M.1.3 — Make search filters collapsible on mobile — Est: 1h
- [ ] M.1.4 — Optimize graph visualization for touch/small screens — Est: 1.5h
- [ ] M.2.1 — Create `public/manifest.json` with app name, icons, theme color — Est: 0.5h
- [ ] M.2.2 — Create service worker for offline caching of static assets — Est: 1.5h
- [ ] M.2.3 — Add install prompt component — Est: 0.5h

---

# V1 + GROWTH TIERS

> These are deferred. Atomic breakdown will be created when BETA is complete and these tiers are prioritized. See `ATOMIC_PLAN.md` for high-level task list for V1 (17 tasks) and GROWTH (9 tasks).

---

## SUMMARY

| Tier | Atomic Tasks | Estimated Hours |
|------|-------------|-----------------|
| MVP | ~175 | ~200h |
| BETA | ~130 | ~155h |
| V1 | (deferred) | — |
| GROWTH | (deferred) | — |
| **Total (MVP+BETA)** | **~305** | **~355h** |

---

_Pick any `[ ]` task. Each one is completable in a single sitting (1-3 hours). Mark `[x]` when done._
