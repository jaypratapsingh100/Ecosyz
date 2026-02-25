import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'System Architecture | Admin | Ecosyz',
  description:
    'System architecture, C4 model, key flows, and deployment overview of the Ecosyz platform for admins, developers, and interns.',
};

export default async function AdminArchitecturePage() {
  const user = await getCurrentUser();
  if (!user?.email) {
    redirect('/auth');
  }
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    redirect('/');
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-10">
      {/* Overview */}
      <section>
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-white">
          Ecosyz System Architecture
        </h1>
        <p className="text-gray-300 mb-3">
          Concrete, diagram-style view of Ecosyz: how the system is split into layers (C4 model),
          how core flows work (sequence diagrams), and how everything is deployed.
        </p>
        <p className="text-gray-400 text-sm">
          Use this as the starting point for onboarding and design discussions. For deeper details,
          jump into the folders and APIs referenced below or the external docs under <code>/docs</code>.
        </p>
      </section>

      {/* 1. System Architecture Diagram (Conceptual) */}
      <section>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-white">
          1. System Architecture Diagram (Conceptual)
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-200 space-y-4">
          <p>
            At the highest level, Ecosyz is a monolithic Next.js application that serves the web UI and
            JSON APIs, backed by a relational DB (via Prisma), a Neo4j graph, and several external
            providers.
          </p>
          <div className="grid gap-4 lg:grid-cols-4 text-xs md:text-sm">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-4">
              <h3 className="font-semibold mb-1 text-cyan-200">Client (Browser)</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>React UI under <code>app/**</code></li>
                <li>Open Resources, Studio, Community, Workspaces UIs</li>
                <li>Calls JSON APIs under <code>/api/**</code></li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 lg:col-span-2">
              <h3 className="font-semibold mb-1 text-emerald-200">Next.js Application Layer</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Routing via App Router (<code>app/</code>)</li>
                <li>Route handlers under <code>app/api/**</code></li>
                <li>Authentication via Supabase APIs</li>
                <li>Domain logic for search, app-builder, community, etc.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-4">
              <h3 className="font-semibold mb-1 text-indigo-200">Data &amp; External Systems</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Relational DB via Prisma (user, workspace, content models)</li>
                <li>Neo4j graph for resources &amp; entities</li>
                <li>OpenAI, GitHub, OpenAlex, Arxiv, Zenodo, YouTube, HF, etc.</li>
                <li>Vercel KV / analytics stores</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-4 overflow-x-auto">
            <p className="text-xs text-gray-400 mb-2">
              Textual system diagram (copy into docs / slides):
            </p>
            <pre className="text-[11px] leading-snug font-mono text-gray-200">
              {`[Users / Browsers]
        |
        v
[Ecosyz Web App (Next.js)]
  |       |        |        |
  v       v        v        v
[UI Pages][API /app/api/**][Auth (Supabase)][Background-like jobs]
                 |
                 v
     +-------------------------------+
     |       Data & External        |
     |------------------------------|
     |  - Relational DB (Prisma)    |
     |  - Neo4j Graph               |
     |  - OpenAI / LLMs             |
     |  - Open-knowledge APIs       |
     |  - KV / Analytics stores     |
     +-------------------------------+`}
            </pre>
          </div>
        </div>
      </section>

      {/* 2. C4 Model */}
      <section>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-white">2. C4 Model</h2>
        <div className="space-y-6 text-sm text-gray-200">
          {/* C1 Context */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-2">C1: System Context</h3>
            <p className="mb-2">
              Ecosyz is the central system used by researchers, founders, and contributors to search,
              organise, and collaborate on open resources.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="font-semibold">Primary users:</span> visitors, signed-in members,
                admins.
              </li>
              <li>
                <span className="font-semibold">Neighbour systems:</span> Supabase Auth, payment
                provider(s), Neo4j, open-knowledge APIs (GitHub, OpenAlex, Arxiv, Zenodo, HF, etc.).
              </li>
              <li>
                <span className="font-semibold">Channel:</span> Web browser over HTTPS.
              </li>
            </ul>
          </div>

          {/* C2 Containers */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-2">C2: Containers</h3>
            <p className="mb-2">The Ecosyz system is primarily composed of these containers:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="font-semibold">Web App (Next.js):</span> serves React UI and handles
                all API routes under <code>/api</code>.
              </li>
              <li>
                <span className="font-semibold">Relational Database:</span> accessed via Prisma for
                core domain data (users, workspaces, posts, events, app projects, etc.).
              </li>
              <li>
                <span className="font-semibold">Neo4j Graph:</span> stores resources and semantic
                entities for the knowledge graph.
              </li>
              <li>
                <span className="font-semibold">Supabase Auth:</span> manages identities, credentials,
                and tokens.
              </li>
              <li>
                <span className="font-semibold">External APIs:</span> open-knowledge providers, AI
                models, and any payment / email services.
              </li>
            </ul>
          </div>

          {/* C3 Components (within Web App) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-2">C3: Major Components (Web App)</h3>
            <p className="mb-2">
              Within the Next.js web app container, the main components are grouped by feature:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="font-semibold">Open Resources &amp; Graph:</span>{' '}
                <code>app/openresources/*</code>, <code>app/api/search/*</code>,{' '}
                <code>app/api/graph/*</code>, <code>KnowledgeGraph3D</code>.
              </li>
              <li>
                <span className="font-semibold">Workspaces:</span> <code>app/workspaces/*</code>,
                <code>app/api/workspaces/*</code>, workspace components.
              </li>
              <li>
                <span className="font-semibold">Community:</span> <code>app/community/*</code>,
                <code>app/api/community/*</code> (users, groups, events, challenges, barter, gigs,
                discussions).
              </li>
              <li>
                <span className="font-semibold">Problems &amp; Ideas:</span>{' '}
                <code>app/problems-and-ideas/*</code>, <code>app/api/problems-and-ideas/*</code>.
              </li>
              <li>
                <span className="font-semibold">Studio / App Builder:</span> <code>app/studio</code>,{' '}
                <code>app/components/app-builder/*</code>, <code>app/api/app-projects/*</code>.
              </li>
              <li>
                <span className="font-semibold">Auth &amp; Profile:</span> <code>app/auth/*</code>,{' '}
                <code>app/api/auth/*</code>, profile APIs, token helpers.
              </li>
              <li>
                <span className="font-semibold">Admin &amp; Telemetry:</span> <code>app/admin/*</code>
                , <code>app/api/admin/*</code>, analytics trackers.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/40 p-4">
            <p className="text-xs text-gray-400 mb-2">
              C4-style container/component sketch (Web App focused):
            </p>
            <pre className="text-[11px] leading-snug font-mono text-gray-200">
              {`[User]
  |
  v
[Ecosyz Web (Next.js)]
  |
  +-- [OpenResources Module]
  |       +-- /openresources pages
  |       +-- /api/search/*
  |       +-- /api/graph/*
  |
  +-- [Workspaces Module]
  |       +-- /workspaces/*
  |       +-- /api/workspaces/*
  |
  +-- [Community Module]
  |       +-- /community/*
  |       +-- /api/community/*
  |
  +-- [Studio / App-Builder Module]
  |       +-- /studio
  |       +-- /components/app-builder/*
  |       +-- /api/app-projects/*
  |
  +-- [Auth & Profile]
  |       +-- /auth/*
  |       +-- /api/auth/*
  |
  +-- [Admin & Analytics]
          +-- /admin/*
          +-- /api/admin/*`}
            </pre>
          </div>
        </div>
      </section>

      {/* 3. Sequence Diagrams (Key Flows) */}
      <section>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-white">
          3. Sequence Diagrams (Core Flows)
        </h2>
        <div className="grid gap-4 md:grid-cols-3 text-xs md:text-sm">
          {/* Login sequence */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <h3 className="font-semibold">3.1 User Login</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-200">
              <li>User submits email/password on <code>/auth</code> page.</li>
              <li>Client calls <code>POST /api/auth/signin</code>.</li>
              <li>Route validates body (Zod) and calls <code>supabase.auth.signInWithPassword</code>.</li>
              <li>On success, session tokens are stored via cookie helpers.</li>
              <li>Client updates local auth state and redirects (e.g. to dashboard/workspaces).</li>
            </ol>
            <div className="mt-3 rounded-lg bg-black/40 border border-white/10 p-3 overflow-x-auto">
              <p className="text-[10px] text-gray-400 mb-1">Sequence (login):</p>
              <pre className="text-[10px] leading-snug font-mono text-gray-200">
                {`User        Browser UI        /api/auth/signin        Supabase
 |              |                     |                    |
 |  enter creds |                     |                    |
 |------------->|                     |                    |
 |              |  POST signin        |                    |
 |              |-------------------->|                    |
 |              |                     | validate + call    |
 |              |                     |------------------->|
 |              |                     |   auth result      |
 |              |                     |<-------------------|
 |              |  set cookies        |                    |
 |              |<--------------------|                    |
 |   redirect   |                     |                    |
 |<-------------|                     |                    |`}
              </pre>
            </div>
          </div>

          {/* Open Resources sequence */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <h3 className="font-semibold">3.2 Open Resources Search + Graph</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-200">
              <li>User types a query on <code>/openresources</code> and hits search.</li>
              <li>Client page calls <code>GET /api/search</code> with providers + filters.</li>
              <li>
                Search route delegates to provider modules (<code>app/api/search/providers/*</code>) and
                merges results.
              </li>
              <li>Results are normalised and deduplicated via search lib functions.</li>
              <li>Client renders cards; user picks a resource to expand in the knowledge graph.</li>
              <li>
                Client then calls <code>GET /api/graph/expand</code> to fetch connected nodes and edges.
              </li>
              <li>
                <code>KnowledgeGraph3D</code> renders a 3D force-directed graph for exploration.
              </li>
            </ol>
            <div className="mt-3 rounded-lg bg-black/40 border border-white/10 p-3 overflow-x-auto">
              <p className="text-[10px] text-gray-400 mb-1">Sequence (search + graph expand):</p>
              <pre className="text-[10px] leading-snug font-mono text-gray-200">
                {`User   OpenResources UI   /api/search        Providers       /api/graph/expand   Neo4j
 |            |                 |                 |                 |               |
 | type query |                 |                 |                 |               |
 |----------->|                 |                 |                 |               |
 |            | GET /api/search |                 |                 |               |
 |            |---------------->| fan-out search  |                 |               |
 |            |                 |--------------->| (GitHub, etc.)  |               |
 |            |                 |<---------------| merged results   |               |
 |            |   results       |                 |                 |               |
 |            |<----------------|                 |                 |               |
 | click node |                 |                 |                 |               |
 |----------->|                 |                 |                 |               |
 |            | GET /api/graph/expand?id=...      |                 |               |
 |            |---------------------------------------------------->| MATCH in DB   |
 |            |                                                     |-------------->|
 |            |                                                     |   nodes/edges |
 |            |<----------------------------------------------------|               |`}
              </pre>
            </div>
          </div>

          {/* Studio / App Builder sequence */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <h3 className="font-semibold">3.3 Studio / App Builder</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-200">
              <li>User creates or opens a project in <code>/studio</code>.</li>
              <li>
                Client uses app-builder components (e.g. <code>ProjectManager</code>, <code>AppChat</code>)
                to collect requirements.
              </li>
              <li>
                On &quot;Generate&quot;, client calls{' '}
                <code>POST /api/app-projects/[id]/generate</code> with the spec.
              </li>
              <li>API composes prompts, calls OpenAI, and writes generated files/code to storage.</li>
              <li>
                Client polls <code>/api/app-projects/[id]</code> or preview endpoints to show status.
              </li>
              <li>User can preview, download, or deploy via Firebase/Vercel deploy APIs.</li>
            </ol>
            <div className="mt-3 rounded-lg bg-black/40 border border-white/10 p-3 overflow-x-auto">
              <p className="text-[10px] text-gray-400 mb-1">Sequence (studio generate):</p>
              <pre className="text-[10px] leading-snug font-mono text-gray-200">
                {`User   Studio UI   /api/app-projects/[id]/generate   OpenAI / LLM   Storage
 |        |           |                            |              |
 | spec   |           |                            |              |
 |------->|           |                            |              |
 |        | POST generate                          |              |
 |        |--------------------------------------->| build prompt |
 |        |                                        |-----------> |
 |        |                                        |  code/files |
 |        |<---------------------------------------|              |
 |        | write artifacts to storage/db         |              |
 |        |--------------------------------------->|              |
 |        | poll status / preview                 |              |
 |<-------|           |                            |              |`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Deployment / Infrastructure */}
      <section>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-white">
          4. Deployment / Infrastructure Diagram
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-200 space-y-4">
          <p>
            Ecosyz is designed to run as a Next.js application deployed to a Node-compatible hosting
            platform (commonly Vercel or similar), with managed databases and external services.
          </p>
          <div className="grid gap-4 md:grid-cols-3 text-xs md:text-sm">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-4">
              <h3 className="font-semibold text-cyan-200 mb-1">Edge / CDN Layer</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>DNS &amp; TLS termination</li>
                <li>Static asset caching (JS, CSS, images)</li>
                <li>Initial routing to the Next.js app</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
              <h3 className="font-semibold text-emerald-200 mb-1">Application Runtime</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Next.js server (Node runtime)</li>
                <li>Renders server components and handles <code>app/api/**</code></li>
                <li>Connects to databases and external APIs</li>
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-4">
              <h3 className="font-semibold text-indigo-200 mb-1">Data &amp; Services</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Managed Postgres (Prisma)</li>
                <li>Neo4j cluster / instance</li>
                <li>Supabase Auth</li>
                <li>OpenAI / external APIs</li>
                <li>KV / analytics stores</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-300">
            For local development, everything runs in a single <code>next dev</code> process against
            your local/remote databases. For production, ensure environment variables are configured
            for all backing services.
          </p>
          <div className="rounded-xl bg-black/40 border border-white/10 p-4 overflow-x-auto">
            <p className="text-[10px] text-gray-400 mb-1">Infrastructure layers (text diagram):</p>
            <pre className="text-[11px] leading-snug font-mono text-gray-200">
              {`+---------------- CDN / Edge ----------------+
|  DNS, TLS, static asset caching            |
+-----------------------+-------------------+
                        |
                        v
+--------------- Application Runtime ----------------+
|  Next.js server (Node runtime)                    |
|  - Renders pages & server components              |
|  - Handles /api route handlers                    |
+------------------------+--------------------------+
                         |
                         v
+-------------- Data & External Services -----------+
|  - Managed Postgres (Prisma)                      |
|  - Neo4j Graph DB                                 |
|  - Supabase Auth                                  |
|  - OpenAI / LLMs                                  |
|  - Open-data providers (GitHub, OpenAlex, etc.)   |
|  - KV / analytics stores                          |
+---------------------------------------------------+`}
            </pre>
          </div>
        </div>
      </section>

      {/* 5. Live / Interactive Architecture */}
      <section>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-white">
          5. Live / Interactive Architecture (Where to Explore)
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-gray-200 space-y-3">
          <p>
            While this page is static, the application itself exposes several &quot;live&quot;
            architectural views you can explore directly in the UI:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-semibold">Knowledge Graph 3D:</span> visit{' '}
              <code>/openresources/knowledge-graph</code> or explore graph views from the Open
              Resources search to see how resources and entities are linked.
            </li>
            <li>
              <span className="font-semibold">Studio / App Builder:</span> open <code>/studio</code>{' '}
              and inspect how generated projects map to API endpoints and storage.
            </li>
            <li>
              <span className="font-semibold">Admin analytics:</span> check <code>/admin</code> and
              related pages to see traffic, API usage, and feature adoption patterns.
            </li>
          </ul>
          <p className="text-gray-300">
            For a more advanced live architecture view, a future iteration could expose health/trace
            endpoints and render a real-time service graph directly on this page, powered by the same
            graph visualisation components used for open resources.
          </p>
          <div className="rounded-xl bg-black/40 border border-dashed border-emerald-400/40 p-4 overflow-x-auto">
            <p className="text-[10px] text-gray-400 mb-1">
              Concept for future live architecture graph:
            </p>
            <pre className="text-[11px] leading-snug font-mono text-gray-200">
              {`[Browser Clients] ---- metrics/requests ----+
                                               |                |
                                               v                |
                                        [Ecosyz Web App]       |
                                           |   |   |           |
                                           v   v   v           |
                                  [DB]  [Neo4j] [External APIs]|
                                               |               |
                                               +----> [Tracer / Telemetry DB]
                                                        |
                                                        v
                                             [Live Architecture UI (this page)]`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

