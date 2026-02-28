# Open Idea — Holistic Atomic Development Plan

> Derived from every section of the **30-page Open Idea Research Whitepaper** (PDF)
> and a full audit of the current codebase on `develop`.
> Generated: 2026-02-28

---

## How to Read This Plan

- **MVP** = Must ship before public beta (highest priority)
- **BETA** = Required for Beta Launch (Mid 2026)
- **V1** = Required for V1.0 Public Launch (2027)
- **GROWTH** = Post-launch scaling (2028+)
- Status: `DONE` | `PARTIAL` | `TODO`
- Size: `XS` (<1 day) | `S` (1–3 days) | `M` (3–7 days) | `L` (1–2 weeks) | `XL` (2+ weeks)

---

## Current Codebase Audit (What Already Exists)

| Feature Area | Status | What's Built |
|---|---|---|
| Multi-provider search | DONE | arXiv, GitHub, Zenodo, OpenAlex, HuggingFace, Software Heritage, Wikifactory, YouTube — live API search with results page |
| Knowledge graph | DONE | Neo4j integration + Cytoscape.js visualization, save-to-workspace from graph |
| Workspaces | DONE | Create workspaces, add resources, annotations, share links (read-only tokens) |
| Community groups | DONE | Groups with members, roles (admin/mod/member), slugs, topics |
| Discussions & replies | DONE | Threaded discussions in groups and workspaces |
| Events | DONE | Create events, register, categories, online/in-person |
| Challenges | DONE | Create challenges, submit entries, status tracking, judging |
| User profiles | DONE | Rich profiles: roles, expertise tags, headline, ORCID, GitHub, LinkedIn, bio, reputation score, badges schema |
| App Studio | DONE | AI-powered app builder (Planner→Architect→Coder pipeline), preview, deployment |
| Problems & Ideas feed | DONE | Social feed with posts, comments, likes (problem/idea types) |
| Barter & Gigs marketplace | DONE | BarterAsk/Pitch + Gig/GigRequest with messaging integration |
| Direct messaging | DONE | Conversations scoped to gigs/barter, participants, read receipts |
| AI News | DONE | Aggregation from HackerNews, Dev.to, GNews, with save/newsletter features |
| Newsletter | DONE | Subscriber model with status tracking |
| Admin dashboard | DONE | API usage tracking, external request logging, analytics |
| Auth | DONE | Supabase + NextAuth, OAuth (GitHub, Google), avatar sync |
| AI summarization | PARTIAL | `/api/summarize` exists, used in search — needs enhancement |
| Search analytics | DONE | SearchLog model tracks queries, clicks, providers |
| Resource views tracking | DONE | ResourceView with session tracking |
| Plagiarism checking | PARTIAL | Schema fields on Resource (score, status, meta) |
| Payments/Pricing | PARTIAL | Payment page exists, subscription fields on User model |
| Landing page | DONE | Hero, features, CTA sections |
| Whitepaper page | DONE | Full interactive whitepaper at `/researchwhitepaper` |

---

## WHAT'S MISSING — Mapped to Every Whitepaper Section

---

## A. UNIFIED AGGREGATION ENGINE (Whitepaper §4.1, §5.1)

_"Open Idea continuously aggregates content from a wide array of open repositories... The user no longer needs to search ten different websites."_

**Current state:** Live API search only — no local index. Every search hits external APIs in real-time. No persistent resource catalog.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| A.1 | Create `IndexedResource` database model | M | MVP | TODO | §4 "comprehensive index" | Prisma model: id, title, abstract, url, source, sourceId, type (paper/code/dataset/hardware), authors, tags, license, language, publishedAt, embeddings (vector), raw metadata JSON. This is the **foundation of everything**. |
| A.2 | Build data ingestion pipeline for arXiv | M | MVP | TODO | §5.1 "academic publications from arXiv" | Background job: fetch arXiv bulk data via OAI-PMH, parse metadata, store in IndexedResource. Target: index ~500K papers initially. |
| A.3 | Build data ingestion pipeline for GitHub repos | M | MVP | TODO | §5.1 "sync with platforms like GitHub via APIs" | GitHub Search API + GraphQL: index public repos with >10 stars, store README, description, topics, license, language. |
| A.4 | Build data ingestion pipeline for OpenAlex | M | MVP | TODO | §5.1 "CrossRef, PubMed" | OpenAlex covers CrossRef+PubMed+Semantic Scholar metadata. Bulk data download or API ingestion. |
| A.5 | Build data ingestion pipeline for Zenodo/datasets | M | MVP | TODO | §5.1 "datasets, open data portals" | Index Zenodo records (papers + datasets). Also consider data.gov or Kaggle Datasets API. |
| A.6 | Add pgvector extension to PostgreSQL | S | MVP | TODO | §4 "semantic search embeddings" | Enable `vector` column type for embedding storage on IndexedResource. |
| A.7 | Generate embeddings for indexed resources | M | MVP | TODO | §6.1 "models that map text into high-dimensional vectors" | Use OpenAI `text-embedding-3-small` or open-source `all-MiniLM-L6-v2` to create 384/1536-dim embeddings from title+abstract. Store in pgvector column. |
| A.8 | Build continuous sync scheduler | M | MVP | TODO | §5.1 "aggregation is updated continuously" | Vercel Cron or external scheduler to run ingestion pipelines daily/weekly. Track last-synced timestamps per source. |
| A.9 | Implement deduplication logic | S | MVP | TODO | §3 "duplication and inefficiency" | Detect and merge duplicate resources across sources (same DOI, same GitHub URL, same title+author). |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| A.10 | Add HuggingFace models/datasets ingestion | M | BETA | TODO | §5.1 "code implementations, AI models" | Index HF models and datasets with metadata. |
| A.11 | Add PubMed Central full-text ingestion | M | BETA | TODO | §11 "PubMed Central for life sciences" | Expand life science coverage. |
| A.12 | Add open hardware repos (Wikifactory, Thingiverse) | M | BETA | TODO | §5.1 "open hardware designs, blueprints, 3D models" | Index open hardware schematics and designs. |
| A.13 | Add CORE repository aggregation | S | BETA | TODO | §11 "CORE for Open Access repositories" | CORE aggregates 200M+ open access papers. |
| A.14 | Build source health monitoring dashboard | S | BETA | TODO | §13 "monitoring on data pipelines" | Admin page showing sync status, last run, error rate per source. |
| A.15 | Reach 10M+ indexed resources | — | BETA | TODO | §8 Roadmap "tens of millions of indexed items" | Milestone target, not a task per se — achieved via A.2-A.13. |

### V1 Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| A.16 | Add government open data portals | L | V1 | TODO | §5.1 "governmental open data sites, World Bank" | Index data.gov, EU Open Data, World Bank indicators. |
| A.17 | Add institutional repository crawlers | L | V1 | TODO | §5.1 "university repositories" | Crawl university DSpace/EPrints repositories. |
| A.18 | Reach 50-100M indexed resources | — | V1 | TODO | §8 Roadmap Phase 3 | Milestone. |

---

## B. AI-POWERED DISCOVERY (Whitepaper §4.2, §5.2, §6)

_"The heart of Open Idea is an AI layer that interprets user intent and context to deliver relevant knowledge."_

**Current state:** Basic keyword search across providers. `/api/summarize` exists. No semantic search, no recommendations, no AI Q&A chatbot.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| B.1 | Implement semantic vector search | L | MVP | TODO | §5.2 "semantic search, contextual query" | Query user input → generate embedding → cosine similarity against IndexedResource embeddings via pgvector. Return top-K results ranked by semantic + keyword score. |
| B.2 | Build hybrid search (keyword + semantic + filters) | M | MVP | TODO | §5.1 "advanced search & filtering" | Combine PostgreSQL full-text search (ts_vector) with pgvector similarity + filters (type, year, license, source, domain). Single unified ranking formula. |
| B.3 | Add rich search result snippets | S | MVP | TODO | §5.1 "rich snippets — title, authors, AI summary, metadata" | Display structured cards: title, authors, 2-line AI summary, year, type badge, source badge, license badge, citation count. |
| B.4 | Implement search filters & facets UI | S | MVP | PARTIAL | §5.1 "filters include content type, publication year, subject area, tags, source" | Sidebar/top-bar filters: resource type, date range, source, license, language, domain tags. Facet counts. |
| B.5 | Add search auto-suggestions | S | MVP | TODO | §5.1 "natural language queries" | Typeahead from popular queries (SearchLog) + indexed resource titles. |
| B.6 | AI summarization on search results | S | MVP | PARTIAL | §5.2 "summarize a document with one click" | Enhance existing `/api/summarize`. Auto-generate 2-3 line summaries for each search result card. Cache summaries in IndexedResource. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| B.7 | Build AI recommendation engine | L | BETA | TODO | §5.2 "AI recommendations — related content" | "Users who collected these also looked at X." Based on co-occurrence in workspaces, citation links, knowledge graph proximity, embedding similarity. |
| B.8 | Add "Related Resources" sidebar | S | BETA | TODO | §5.2 "related content via AI recommender" | When viewing a resource detail page, show 5-10 related items (papers→code, code→papers, dataset→papers). |
| B.9 | Build AI Q&A chatbot interface | L | BETA | TODO | §6.2 "users can ask complex questions and get syntheses" | "Ask AI" sidebar panel. User asks natural language question → AI searches IndexedResource → synthesizes answer with citations. RAG (Retrieval Augmented Generation) architecture. |
| B.10 | Implement "Explain This" feature | S | BETA | TODO | §5.2 "explain what this code does, summarize in simpler terms" | One-click button on any resource → LLM generates plain-language explanation. Different prompts for papers vs code vs datasets. |
| B.11 | Add content preview for different types | M | BETA | TODO | §5.1 "built-in previews — PDF view, dataset preview, code README" | PDF inline viewer with keyword highlights. Dataset: sample rows/stats. Code: README render + file tree. |
| B.12 | Build personalized feed/dashboard | M | BETA | TODO | §6.3 "personalization — personalized feed of innovation highlights" | Home dashboard shows AI-curated resources based on user's search history, workspace content, expertise tags. |
| B.13 | Add AI trend analysis | M | BETA | TODO | §5.2 "trend analysis — rise of certain topics" | Dashboard showing trending topics in research/code over time. "Publications on X have grown 40% in 3 years." |

### V1 Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| B.14 | Cross-language search & translation | L | V1 | TODO | §5.2 "translate queries and content — Portuguese → English → results → Portuguese" | Auto-detect query language, translate, search, translate results back. |
| B.15 | AI workflow automation in workspaces | M | V1 | TODO | §6.4 "auto-generate data visualizations, run test cases, auto-bibliography" | When dataset added → auto-generate stats. When papers collected → auto-draft literature review. |
| B.16 | AI quality checker for projects | M | V1 | TODO | §6.4 "evaluate completeness — did you consider related work X?" | AI reviews workspace and suggests gaps, missing references, potential biases. |
| B.17 | Continuous learning from user feedback | L | V1 | TODO | §6.5 "fine-tuning models with anonymized query logs" | Thumbs up/down on AI outputs → retrain/adjust ranking models. |

---

## C. COLLABORATIVE PROJECT WORKSPACES (Whitepaper §4.3, §5.3)

_"Discovery is only half the journey — the end goal is creation."_

**Current state:** Basic workspaces exist (title, resources, annotations, share links). No real-time collab, no version history, no public/private toggle, no forking, no tool integration.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| C.1 | Add one-click "Save to Workspace" from search | S | MVP | PARTIAL | §5.3 "Add to Project button" | Button on every search result → modal to pick workspace → auto-fill metadata. Already partially exists. |
| C.2 | Add workspace resource organization (sections/groups) | S | MVP | TODO | §5.3 "grouped into sections — Background Reading, Data to Use, Code Components" | Allow users to create sections/columns within a workspace and drag resources between them. |
| C.3 | Add workspace public/private toggle | S | MVP | TODO | §5.3 "projects can be private or public" | Boolean on Workspace model. Public workspaces are discoverable. |
| C.4 | One-click citation generation | S | MVP | TODO | §5.1 "generate citations in common formats (APA, BibTeX, etc.)" | For any resource, generate citation in APA/MLA/BibTeX/Chicago format. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| C.5 | Real-time collaboration (presence + live sync) | L | BETA | TODO | §5.3 "multiple people work together in real time, changes synced live" | Supabase Realtime channels: presence indicators (who's online), live resource additions, concurrent annotation. |
| C.6 | Workspace version history | M | BETA | TODO | §5.3 "version history — track changes, revert, see how project evolved" | Track every workspace mutation (resource add/remove, annotation, section change). Timeline view. Revert capability. |
| C.7 | Workspace commenting & @mentions | S | BETA | TODO | §5.3 "chat or comment area, tag each other @Alice" | Threaded comments on workspace items. @mention triggers notification. |
| C.8 | Workspace forking/remixing | S | BETA | TODO | §5.3 "public projects can be forked/remixed" | Fork a public workspace → creates a copy in your account with attribution. |
| C.9 | Workspace invite & team collaboration | M | BETA | TODO | §5.3 "invite collaborators to join workspace" | Email/username invite system. Roles: owner, editor, viewer. |
| C.10 | Workspace templates | S | BETA | TODO | "Innovation canvas" | Pre-built templates: Literature Review, Dataset Analysis, Prototype Build, Grant Proposal. |

### V1 Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| C.11 | Workspace publishing & output sharing | M | V1 | TODO | §5.3 "published as an Open Idea output — summary page with narrative, links, outputs" | Publish workspace as a shareable report page. Choose open license. Feed outputs back into index. |
| C.12 | Embedded Jupyter/Colab integration | L | V1 | TODO | §5.3 "embedded Jupyter Notebook environment launched with one click" | Launch notebook from workspace with dataset + code pre-loaded. Via Binder or Google Colab link. |
| C.13 | Workspace import/export (Google Drive, Dropbox) | M | V1 | TODO | §11 "integration with Google Drive or Dropbox for import/export" | Import files from cloud storage. Export workspace bundle as ZIP/PDF. |
| C.14 | AI-assisted drafting within workspaces | M | V1 | TODO | §5.3 "AI can draft a literature review summary... or brief report" | "Generate Report" button → AI drafts narrative from collected resources. |

---

## D. KNOWLEDGE GRAPH (Whitepaper §4.4, §6.1)

_"Underlying Open Idea is a growing knowledge graph that maps relationships between entities."_

**Current state:** Neo4j integration exists with Cytoscape.js visualization. Basic node creation from search results.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| D.1 | Auto-populate graph from IndexedResource ingestion | M | MVP | PARTIAL | §6.1 "auto-classify and tag resources, detect entities, build knowledge graph" | When resources are indexed (A.2-A.5), automatically create Neo4j nodes and edges: Paper→cites→Paper, Paper→uses→Dataset, Author→wrote→Paper, Code→implements→Paper. |
| D.2 | Add author entity nodes | M | MVP | TODO | §6.1 "connect a researcher to their papers" | Author nodes linked to papers, datasets, code across platforms. ORCID matching where available. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| D.3 | Add institutional nodes (universities, labs, companies) | S | BETA | TODO | §6.1 "institutions mentioned in texts" | Link institutions to authors and projects via affiliation data. |
| D.4 | Build interactive concept map visualization | M | BETA | TODO | §4.4 "visual map of how an idea has developed" | Topic/concept map showing how domains and resources relate. Zoomable, clickable. |
| D.5 | Graph-based discovery ("find papers connected to X") | M | BETA | TODO | §4.4 "Project X is similar to Project Y — consider collaboration" | Click any node → traverse connections → discover related resources across domains. |
| D.6 | Temporal graph evolution | S | BETA | TODO | §4.4 "linking seminal papers to newer studies" | Timeline slider showing how topics and connections evolved over years. |

---

## E. USER EXPERIENCE & PROFILES (Whitepaper §4.5, §7)

_"Clean and minimalistic UI... diverse user base from students to senior researchers."_

**Current state:** Rich profile model exists with roles, expertise, ORCID, GitHub, LinkedIn. Profile page exists. Reputation schema exists but calculation logic doesn't.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| E.1 | ORCID integration (auto-import publications) | M | MVP | TODO | §4.5 "link ORCID for researchers — import content and credibility" | User links ORCID → auto-import their publications list → show on profile. |
| E.2 | GitHub integration (auto-sync repos) | S | MVP | PARTIAL | §4.5 "link GitHub — easy import of own content" | User links GitHub username → show their public repos on profile. Auto-sync README into index. |
| E.3 | License badges on all resources | XS | MVP | TODO | §5.1 "display license info for each item" | Show MIT/GPL/CC-BY/etc. badge on every search result card and resource detail page. |
| E.4 | One-click access links | XS | MVP | TODO | §5.1 "View Paper PDF, Open in GitHub, Download Dataset" | Direct action buttons on every resource card. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| E.5 | Reputation system calculation logic | M | BETA | PARTIAL | §5.3 "reputation system, contributor stats" | Calculate score from: workspaces created, resources shared, discussions, challenges won, followers, project views. Award badges (Open Mentor, Top Contributor, etc.). |
| E.6 | Project showcase on profile | S | BETA | TODO | §7 "showcase public projects to potential collaborators" | Pin top workspaces and app projects to profile. Portfolio view. |
| E.7 | Contributor activity stream | S | BETA | TODO | §7 "credibility indicators — publications, contributions visible" | Public activity feed on profile: what they've searched, built, shared, commented on. |
| E.8 | User follow recommendations | S | BETA | TODO | §6.3 "users following projects or each other" | "People you may want to follow" based on shared interests/domain. |

---

## F. COMMUNITY & GAMIFICATION (Whitepaper §5.3 badges, §7, §11)

_"Gamification and Recognition... project badges, contributor stats, reputation system."_

**Current state:** Groups, discussions, events, challenges, barter, gigs, messaging all exist. No notifications, no leaderboards, no badges display.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| F.1 | In-app notification system | M | MVP | TODO | §5.3 "tag each other @Alice to draw attention" | Notification bell: mentions, replies, workspace invites, challenge updates, follower activity. Supabase Realtime for push. DB model: Notification (userId, type, entityType, entityId, read, createdAt). |
| F.2 | Email notification digests | S | MVP | TODO | Profile "emailNotifications" preference | Daily/weekly digest of unread notifications. Integrate with existing newsletter infra. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| F.3 | Badge display on profiles | S | BETA | TODO | §5.3 "Open Mentor badge, project badges" | Render earned badges on profile page. Badge types: Early Adopter, Open Mentor, Top Contributor, Challenge Winner, Knowledge Sharer, Community Builder. |
| F.4 | Community leaderboards | S | BETA | TODO | §5.3 "encourage collaboration" | Top contributors this week/month. Most active groups. Trending projects/workspaces. |
| F.5 | In-platform challenge/hackathon hosting | S | BETA | PARTIAL | §5.3 "hosting challenges or hackathons within Open Idea" | Enhance existing Challenge model: add prize tiers, judging rubric, team formation, workspace integration. |
| F.6 | Learning pathways | M | BETA | TODO | §7 "learning pathways — learn data science by doing a project with guided plan" | Curated workspace templates with guided steps for common learning goals. |

---

## G. SEARCH INFRASTRUCTURE & PERFORMANCE (Whitepaper §4, §5.1)

**Current state:** Live API search works but is slow (multiple external API calls per query). No caching. No local index to fall back on.

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| G.1 | Search result caching | S | MVP | TODO | Performance | Cache frequent queries in Vercel KV (Redis). TTL: 1 hour for live results, 24 hours for indexed results. |
| G.2 | Switch primary search to local index | M | MVP | TODO | §4 "one search bar to query across all open knowledge silos" | When IndexedResource is populated, search local DB first (fast), supplement with live API for freshness. |
| G.3 | Rate limiting on search/AI API routes | S | MVP | TODO | Security | Token-bucket rate limiting. Free: 100 searches/hr, 20 AI queries/hr. Logged-in: 500/50. |
| G.4 | Search analytics dashboard (admin) | S | MVP | PARTIAL | §11 "metrics-driven iteration" | Enhance existing SearchLog: show top queries, click-through rate, zero-result queries, response times. |

---

## H. LICENSE & COMPLIANCE ENGINE (Whitepaper §4, §5.1, §13)

_"We display license info for each item... users know how they can use the content."_

**Current state:** No license tracking or compliance features.

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| H.1 | License detection from resource metadata | M | BETA | TODO | §5.1 "display license info" | Auto-detect license from GitHub API (license field), arXiv (OA status), Zenodo (rights field). Store on IndexedResource. Map to SPDX identifiers. |
| H.2 | License filter in search | S | BETA | TODO | §5.1 "filter by license" | Filter: "commercially usable", "modification allowed", "share-alike required", "public domain". |
| H.3 | Auto-attribution generator | S | BETA | TODO | §5.1 "generate citations in common formats" | For any resource: generate BibTeX, APA, MLA, Chicago citation text. Copy-to-clipboard. |

### V1 Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| H.4 | License compatibility checker | M | V1 | TODO | §13 "combining resources may trigger legal uncertainty" | When workspace contains multiple resources, flag incompatible license combinations (e.g., GPL + proprietary). Visual indicator. |
| H.5 | Content opt-out system | S | V1 | TODO | §13 "allow content owners to opt-out if needed" | API/form for content owners to request removal of their resources from index. |

---

## I. MONETIZATION & BUSINESS MODEL (Whitepaper §10)

_"Freemium model... Pro Accounts... Enterprise Licenses... API Access... Sponsorships."_

**Current state:** Payment page exists. Subscription fields on User model. No actual Stripe integration or tier enforcement.

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| I.1 | Stripe integration for subscriptions | M | BETA | PARTIAL | §10 "premium subscription" | Connect Stripe. Plans: Free, Pro ($19/mo), Enterprise (custom). Webhook handling for payment events. |
| I.2 | Feature gating by plan | M | BETA | TODO | §10 "Pro tier — higher AI limits, private projects, larger storage" | Middleware/helper to check user plan. Gate: AI query limits, private workspace count, collaborator count, API access. |
| I.3 | Usage tracking for AI features | S | BETA | TODO | §10 "AI usage limits" | Track per-user: search count, AI summarizations, AI Q&A queries. Reset monthly. Show usage bar in settings. |

### V1 Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| I.4 | Enterprise/organization accounts | L | V1 | TODO | §10 "Enterprise — self-hosting, internal data, admin features, team management" | Organization model: invite members, assign roles, shared workspaces, admin console, usage analytics. |
| I.5 | API key self-service | M | V1 | TODO | §10 "API Access — usage-based pricing" | Generate API keys. Dashboard: usage stats, billing, rate limits by tier. |
| I.6 | Sponsored content/channels | M | V1 | TODO | §10 "sponsored innovation hubs, curated verticals" | Allow sponsors to create branded content hubs (e.g., "Climate Innovation Hub by [Sponsor]"). |

---

## J. PUBLIC API & DEVELOPER PLATFORM (Whitepaper §10, §11)

_"Open Idea itself can become a data provider... API where developers can query our aggregated index."_

### V1 Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| J.1 | Public REST API for search & retrieval | L | V1 | TODO | §10 "commercial API for third-parties" | `/api/v1/search`, `/api/v1/resources/:id`, `/api/v1/graph/query`. OpenAPI spec. |
| J.2 | GraphQL API layer | L | V1 | TODO | §10 "complex cross-resource queries" | Flexible query interface for connected data (resource → authors → papers → datasets). |
| J.3 | API rate limiting by tier | M | V1 | TODO | §10 "free limited access, premium tiers for higher volumes" | Free: 1K calls/day. Pro: 10K/day. Enterprise: custom. |
| J.4 | Developer documentation portal | M | V1 | TODO | §11 "APIs, open-source modules" | Interactive docs (Swagger UI), getting started guide, code examples in Python/JS/curl. |
| J.5 | Webhook system | M | V1 | TODO | §6.3 "alerts — notification if new content appears" | Subscribe to topics/queries → receive webhook when matching resources are indexed. |

---

## K. GO-TO-MARKET & GROWTH (Whitepaper §11)

_"Initial target communities: graduate students, young researchers, open-source developers."_

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| K.1 | Seed platform with sample projects | S | MVP | TODO | §13 "create sample projects demonstrating platform" | Create 3-5 public workspace showcases: "COVID-19 Open Research", "AI for Agriculture", "Climate Data Explorer". |
| K.2 | Onboarding tutorial / guided tour | S | MVP | TODO | §11 "ease of onboarding, tutorials, example projects" | First-time user walkthrough: search → save to workspace → explore graph → use AI. |
| K.3 | SEO for public workspaces & resources | S | MVP | TODO | §11 "naturally generate content for SEO" | Server-side rendered public workspace pages. Open Graph metadata for sharing. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| K.4 | Referral system | S | BETA | TODO | §11 "word-of-mouth" | "Invite a friend" → both get extended AI quota for a month. |
| K.5 | Public project gallery / explore page | M | BETA | TODO | §11 "open to community to follow or contribute" | Browse trending/new/featured public workspaces and app projects. |

---

## L. SECURITY, TRUST & INFRASTRUCTURE (Whitepaper §6.6, §13)

### MVP Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| L.1 | Error boundaries on all pages | S | MVP | PARTIAL | UX | Graceful error handling + skeleton loaders for every page. |
| L.2 | AI output source citations | S | MVP | TODO | §6.6 "all AI-driven content accompanied by citations or links to original sources" | Every AI summary/answer must include clickable source references. Never show unsourced AI text. |
| L.3 | AI confidence indicators | XS | MVP | TODO | §6.6 "indicate AI-generated text, allow users to rate or flag" | Label AI outputs clearly. Add thumbs up/down for accuracy feedback. |
| L.4 | GDPR-compliant data handling | S | MVP | TODO | §13 "GDPR compliant from the start" | Cookie consent, data export, account deletion, privacy policy update. |

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| L.5 | Automated testing suite | L | BETA | TODO | Stability | Unit tests for search providers, API routes, auth flows, workspace operations. CI/CD integration. |
| L.6 | Monitoring & alerting | S | BETA | TODO | §13 "monitoring on data pipelines" | Track API response times, error rates, search latency, AI success rates. Alert on anomalies. |
| L.7 | Content moderation tools | S | BETA | TODO | §13 "user-uploaded content" | Flag/report system for inappropriate content. Admin review queue. |

---

## M. MOBILE & ACCESSIBILITY (Whitepaper §11)

### BETA Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| M.1 | Mobile-responsive polish | M | BETA | PARTIAL | §11 "mobile-responsive design" | Ensure all pages render well on mobile. Already partially done. |
| M.2 | PWA support | S | BETA | TODO | §11 "Innovation in your pocket" | Service worker, offline search cache, install prompt. |

### GROWTH Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| M.3 | Native mobile app (React Native) | XL | GROWTH | TODO | §11 "mobile app fully developed for discovery" | iOS + Android app focused on search, AI Q&A, and workspace reading. |

---

## N. INTERNATIONALIZATION (Whitepaper §5.2, §11)

### GROWTH Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| N.1 | i18n framework (multi-language UI) | L | GROWTH | TODO | §5.2 "cross-language support" | next-intl or similar. Start with EN, ES, FR, DE, ZH, JA, PT, AR, HI. |
| N.2 | Non-English resource indexing | L | GROWTH | TODO | §5.2 "innovation is global and multilingual" | Index non-English paper repos (CNKI, J-STAGE, SciELO, HAL). |
| N.3 | Cross-language search via translation | M | GROWTH | TODO | §5.2 "user in Brazil asks in Portuguese → search English → translate back" | Auto-translate queries and results. |

---

## O. PLUGIN ECOSYSTEM & API EXTENSIONS (Whitepaper §11)

### GROWTH Priority

| # | Task | Size | Tier | Status | Whitepaper Reference | Details |
|---|------|------|------|--------|---------------------|---------|
| O.1 | Plugin API specification | M | GROWTH | TODO | §11 "APIs, open-source modules" | Define extension points: custom search providers, visualizations, export formats, AI models. |
| O.2 | Plugin marketplace | L | GROWTH | TODO | Community | Browse, install, rate community plugins. |
| O.3 | JavaScript/Python SDK | L | GROWTH | TODO | §10 "API Access" | SDKs for building on Open Idea. npm package + PyPI package. |
| O.4 | Zotero/Mendeley integration | M | GROWTH | TODO | §11 "integration with Zotero" | Import/export references between Open Idea and reference managers. |

---

## MVP MASTER CHECKLIST

**These tasks MUST ship before public beta. Ordered by dependency chain.**

### Sprint 1: Data Foundation (Week 1-2)
| # | Task | Depends On |
|---|------|-----------|
| A.1 | Create IndexedResource database model | — |
| A.6 | Add pgvector extension to PostgreSQL | A.1 |
| A.9 | Deduplication logic | A.1 |
| A.2 | arXiv ingestion pipeline | A.1 |
| A.3 | GitHub repos ingestion pipeline | A.1 |

### Sprint 2: Search Core (Week 3-4)
| # | Task | Depends On |
|---|------|-----------|
| A.4 | OpenAlex ingestion pipeline | A.1 |
| A.5 | Zenodo/datasets ingestion pipeline | A.1 |
| A.7 | Generate embeddings for indexed resources | A.1, A.6 |
| B.1 | Semantic vector search | A.7 |
| G.2 | Switch primary search to local index | A.1, B.1 |

### Sprint 3: Search Experience (Week 5-6)
| # | Task | Depends On |
|---|------|-----------|
| B.2 | Hybrid search (keyword + semantic + filters) | B.1 |
| B.3 | Rich search result snippets | B.2 |
| B.4 | Search filters & facets UI | B.2 |
| B.5 | Search auto-suggestions | G.2 |
| B.6 | AI summarization on results | B.2 |

### Sprint 4: Knowledge & Workspace (Week 7-8)
| # | Task | Depends On |
|---|------|-----------|
| D.1 | Auto-populate graph from ingestion | A.2-A.5 |
| D.2 | Author entity nodes | D.1 |
| C.1 | "Save to Workspace" from search (polish) | B.2 |
| C.2 | Workspace sections/organization | — |
| C.3 | Workspace public/private toggle | — |
| C.4 | One-click citation generation | — |

### Sprint 5: Intelligence & Trust (Week 9-10)
| # | Task | Depends On |
|---|------|-----------|
| A.8 | Continuous sync scheduler | A.2-A.5 |
| L.2 | AI output source citations | B.6 |
| L.3 | AI confidence indicators | B.6 |
| E.3 | License badges on resources | A.1 |
| E.4 | One-click access links | B.3 |

### Sprint 6: Community & Polish (Week 11-12)
| # | Task | Depends On |
|---|------|-----------|
| F.1 | In-app notification system | — |
| F.2 | Email notification digests | F.1 |
| G.1 | Search result caching | B.2 |
| G.3 | Rate limiting on API routes | — |
| L.1 | Error boundaries on all pages | — |
| L.4 | GDPR-compliant data handling | — |

### Sprint 7: Onboarding & Launch Prep (Week 13-14)
| # | Task | Depends On |
|---|------|-----------|
| K.1 | Seed sample projects | C.1 |
| K.2 | Onboarding tutorial | All search features |
| K.3 | SEO for public content | C.3 |
| E.1 | ORCID integration | — |
| E.2 | GitHub profile integration (polish) | — |
| G.4 | Search analytics dashboard | — |

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary DB | PostgreSQL (Supabase) + pgvector | Already in use; pgvector avoids adding another service |
| Graph DB | Neo4j (existing) | Already integrated; rich query language for relationship traversal |
| Vector search | pgvector | Simplifies stack; scales to ~100M vectors; upgrade to dedicated vector DB later if needed |
| Embedding model | OpenAI `text-embedding-3-small` (1536-dim) | Best cost/quality ratio at scale; migrate to self-hosted SBERT later |
| LLM for AI features | Groq/OpenRouter (existing) | Already configured in codebase; fast inference |
| Background jobs | Vercel Cron + Edge Functions | Already on Vercel; no new infra |
| Real-time | Supabase Realtime | Already using Supabase; built-in WebSocket channels |
| Caching | Vercel KV (Redis) | Already configured |
| License detection | SPDX list + provider API metadata | Standard; enhance with ML later |
| Full-text search | PostgreSQL ts_vector | Native; combine with pgvector for hybrid ranking |

---

## Key Metrics (from Whitepaper §8, §11, §12)

| Phase | Timeline | Resources Indexed | Users | Revenue |
|-------|----------|-------------------|-------|---------|
| MVP | Now → Q2 2026 | ~1M | Alpha/beta testers | $0 (pre-revenue) |
| Beta | Mid 2026 | >10M | 1K+ registered | First Pro subscribers |
| V1.0 | 2027 | 50-100M | 5K+ registered, first enterprise pilots | $X0K ARR |
| Growth | 2028+ | 100M+ | 1M+ active users, 100+ countries | Sustainable |

---

## Risk Mitigation Matrix (Whitepaper §13)

| Risk | Severity | Mitigation | Related Tasks |
|------|----------|------------|---------------|
| Data integration fails / API limits | HIGH | Start with bulk-data-friendly sources (arXiv OAI-PMH, OpenAlex dump). Modular pipeline — one source failing doesn't crash all. | A.2-A.5, A.14 |
| AI hallucination / inaccurate outputs | HIGH | Always cite sources (L.2). Confidence scoring (L.3). Human feedback loop (B.17). Start with mature NLP models. | L.2, L.3, B.17 |
| Cold start / low adoption | MEDIUM | Pre-seed with indexed content (A.2-A.5). Sample projects (K.1). Onboarding (K.2). Target hackathons and university labs. | K.1-K.5 |
| Big player competition (Google, Microsoft) | MEDIUM | Focus on unified cross-domain experience. Build community moat. Move fast on AI features. Open-source components. | F.1-F.6, D.1-D.6 |
| Monetization too slow | MEDIUM | Diverse streams (freemium + enterprise + API). Validate willingness-to-pay early via pilot programs. Control burn. | I.1-I.6 |
| Legal / licensing issues | LOW | Auto-detect licenses (H.1). Compliance checker (H.4). Opt-out system (H.5). Legal counsel pre-launch. | H.1-H.5 |
| Team execution / hiring gaps | MEDIUM | Lean team, advisors, agile sprints, contractor support for gaps. | — |

---

## Funding Allocation Alignment (Whitepaper §12)

_Pre-seed ask: $250K-$750K (~$500K target)_

| Category | % | Amount (~$500K) | Maps To |
|----------|---|-----------------|---------|
| Product Development | 50% | $250K | Sections A, B, C, D, G (engineering salaries, AI R&D, infra) |
| Team & Operations | 20% | $100K | Founders, key hires, admin |
| Go-To-Market | 15% | $75K | Section K (hackathon sponsorship, content marketing, conferences) |
| Contingency | 15% | $75K | Buffer for pivots, extra hires, unexpected costs |

---

## Total Task Count

| Tier | Count | Description |
|------|-------|-------------|
| MVP | 38 | Must ship before public beta |
| BETA | 30 | Required for Beta Launch (Mid 2026) |
| V1 | 17 | Required for V1.0 Public Launch (2027) |
| GROWTH | 9 | Post-launch scaling (2028+) |
| **Total** | **94** | Complete platform as envisioned in whitepaper |

---

_This is the single source of truth for Open Idea development. Update task statuses as work progresses._
