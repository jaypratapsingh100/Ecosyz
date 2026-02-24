import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ResearchWhitepaperPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          {/* Globe background image */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-emerald-400/20 to-transparent opacity-80 blur-3xl" />
          </div>

          {/* Hero */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 text-white flex justify-center">
            <div className="inline-block max-w-3xl w-full mx-auto px-8 py-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-3 uppercase">
                <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text">
                  Open Idea
                </span>{' '}
                Research Whitepaper
              </h1>
              <p className="mt-3 text-xl text-teal-100/90 sm:text-2xl sm:max-w-xl sm:mx-auto">
                Democratizing Innovation Through Unified Open Knowledge
              </p>
              <div className="mt-6 flex justify-center">
                <a
                  href="https://github.com/Sony17/Ecosyz/blob/main/Open%20Idea.pdf?raw=true"
                  download="Open_Idea_Whitepaper.pdf"
                  className="px-6 py-3 rounded-lg bg-transparent border-2 border-cyan-400/50 text-cyan-400 font-semibold shadow-lg transition hover:scale-105 hover:bg-cyan-400/10 hover:border-cyan-400"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </div>

          {/* Content sections */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white">
            {/* 1. Mission and Vision */}
            <section id="mission" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4 uppercase">
                  1. Mission and Vision
                </h2>
                <p className="mb-4 text-teal-100/90">
                  Open Idea&apos;s mission is to democratize innovation by providing an open, AI-powered platform
                  where impactful projects across all domains can launch, connect, and thrive together.
                </p>
                <p className="mb-4 text-teal-100/90">
                  Our vision is a world where every breakthrough – in science, technology, or social impact – has the
                  open platform, community, and resources to change the world. In essence, Open Idea aspires to be
                  &quot;the world&apos;s open innovation infrastructure&quot;, unifying knowledge and people to accelerate
                  positive change.
                </p>
                <p className="mb-6 text-teal-100/90">
                  By bringing every open resource under one roof and empowering anyone to build on them, Open Idea aims
                  to multiply the impact of individual ideas through global collaboration.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-xl font-semibold text-emerald-300 mb-3">Core Mission</h3>
                    <ul className="list-disc list-inside space-y-2 text-teal-100/90">
                      <li>Democratize access to innovation resources</li>
                      <li>Connect disparate open knowledge silos</li>
                      <li>Empower collaborative problem-solving</li>
                    </ul>
                  </div>
                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-xl font-semibold text-cyan-300 mb-3">Strategic Vision</h3>
                    <ul className="list-disc list-inside space-y-2 text-teal-100/90">
                      <li>Become the default infrastructure for open innovation</li>
                      <li>10x the velocity of impactful innovation</li>
                      <li>Create a virtuous cycle of open contribution</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. The Fragmentation Problem in Open Knowledge */}
            <section id="problem" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  2. The Fragmentation Problem in Open Knowledge
                </h2>
                <p className="mb-4 text-teal-100/90">
                  Open source and open knowledge are growing exponentially – GitHub&apos;s 2024 data shows over 518
                  million projects (25% YoY growth) and nearly 1 billion contributions to open source, alongside a surge
                  in AI projects.
                </p>
                <p className="mb-4 text-teal-100/90">
                  This explosive growth of open content highlights the opportunity – and challenge – of harnessing
                  dispersed knowledge. Despite the tremendous growth of open-access publications, open-source software,
                  open data, and other open resources, the landscape is highly fragmented. Valuable knowledge is
                  scattered across siloed platforms and formats, making it difficult for innovators to find what they
                  need and connect the dots.
                </p>
                <p className="mb-6 text-teal-100/90">
                  These fragmentation issues mean lost opportunities – innovations that could happen if disparate
                  knowledge were easier to find and integrate often don&apos;t happen. In short, open knowledge is
                  abundant but disjointed, limiting its potential impact.
                </p>

                <h3 className="text-2xl font-semibold text-cyan-200 mb-4">Key Pain Points</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-emerald-200 mb-2">Scattered Resources</h4>
                    <p className="text-teal-100/90">
                      Open knowledge is spread across countless repositories, journals, and websites. Researchers must
                      search one site for papers, another for code, another for datasets, etc.
                    </p>
                  </div>
                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-cyan-200 mb-2">Heterogeneous Data</h4>
                    <p className="text-teal-100/90">
                      Each domain uses different formats and metadata standards. Software projects, research papers,
                      datasets, and hardware designs all describe content differently.
                    </p>
                  </div>
                  <div className="border border-purple-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-purple-200 mb-2">Licensing Barriers</h4>
                    <p className="text-teal-100/90">
                      Even &quot;open&quot; resources come with varied licenses (MIT, GPL, Creative Commons, etc.) and
                      conditions. Combining a public dataset with an open-source algorithm can trigger legal
                      uncertainty.
                    </p>
                  </div>
                </div>

                <div className="mt-6 border border-emerald-400/30 bg-white/5 rounded-xl p-5 italic text-teal-100/90">
                  &quot;Although nearly 38% of global research articles are now published open access (up from just 11%
                  a decade ago), much of that knowledge isn&apos;t reaching software developers or entrepreneurs who
                  could apply it.&quot;
                </div>
              </div>
            </section>

            {/* 3. Open Idea: A Unified Solution */}
            <section id="solution" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  3. Open Idea: A Unified Solution
                </h2>
                <p className="mb-6 text-teal-100/90">
                  Open Idea addresses the fragmentation head-on by serving as a unified, AI-powered platform for all
                  open resources. It acts as a one-stop hub where users can seamlessly discover and utilize open
                  knowledge across domains, transforming isolated information into integrated action.
                </p>

                <h3 className="text-2xl font-semibold text-cyan-200 mb-4">Key Aspects of Our Solution</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-emerald-200 mb-2">Unified Open Knowledge Platform</h4>
                    <p className="text-teal-100/90">
                      Aggregates research, code, data, designs, and more—into one searchable, AI-boosted space.
                      Intelligent crawlers index resources from all major open hubs.
                    </p>
                  </div>
                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-cyan-200 mb-2">Intelligent Semantic Linking</h4>
                    <p className="text-teal-100/90">
                      Uses AI to connect related content across silos—linking papers to datasets, code to publications,
                      projects to people, and more via knowledge graphs.
                    </p>
                  </div>
                  <div className="border border-purple-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-purple-200 mb-2">Modular, Scalable Architecture</h4>
                    <p className="text-teal-100/90">
                      Built as a smart, modular infrastructure—adapts to any resource type. Microservices power search,
                      data handling, AI, and more.
                    </p>
                  </div>
                  <div className="border border-yellow-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-yellow-200 mb-2">
                      Built-in Legal &amp; License Compliance
                    </h4>
                    <p className="text-teal-100/90">
                      Automatically tracks licenses, highlights rights, and prevents invalid content combinations—
                      keeping your projects safe and open.
                    </p>
                  </div>
                </div>

                <div className="mt-6 border border-emerald-400/30 bg-white/5 rounded-xl p-5 italic text-teal-100/90">
                  In summary, Open Idea is the bridge across the open knowledge silos—an AI-enhanced platform that
                  unifies everything open in one place, making it dramatically easier to go from discovery to action.
                </div>
              </div>
            </section>

            {/* 4. How the System Works */}
            <section id="system" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  4. How the System Works
                </h2>
                <p className="mb-6 text-teal-100/90">
                  Open Idea&apos;s platform workflow combines powerful search technology, AI-driven enrichment, and
                  collaborative project workspaces. From a user&apos;s perspective, the journey on Open Idea might look
                  like this:
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-emerald-200">
                      1. Comprehensive Search Engine
                    </h3>
                    <p className="text-teal-100/90">
                      Unified search across all resources—enter a natural-language query, retrieve research, code,
                      datasets, hardware, and more ranked by semantic relevance.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-cyan-200">
                      2. Semantic Enrichment &amp; Auto-Tagging
                    </h3>
                    <p className="text-teal-100/90">
                      AI tags and categorizes each resource with rich metadata (like field, type, keywords, license,
                      etc.), making everything more discoverable and remixable.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-purple-200">
                      3. AI-Powered Discovery Tools
                    </h3>
                    <p className="text-teal-100/90">
                      Advanced AI assistants help digest, summarize, and connect content. Example: auto-summary of long
                      papers or technical docs, concept-mapping, recommendations.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-yellow-200">
                      4. Project Workspaces &amp; Remixing
                    </h3>
                    <p className="text-teal-100/90">
                      Create live projects, pull in any open resource, remix and collaborate—all in-browser. Every user
                      gets an innovation studio for building together.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-teal-200">
                      5. Community Collaboration
                    </h3>
                    <p className="text-teal-100/90">
                      Invite, open-source, and co-create—extend the open-source workflow to every format and domain.
                    </p>
                  </div>
                </div>
                <div className="mt-6 border border-emerald-400/30 bg-white/5 rounded-xl p-5 italic text-teal-100/90">
                  &quot;This seamless workflow from search to creation is what makes Open Idea a game-changer in
                  harnessing the world&apos;s open resources.&quot;
                </div>
              </div>
            </section>

            {/* 5. User Types and Use Cases */}
            <section id="users" className="py-8">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  5. User Types and Use Cases
                </h2>
                <p className="mb-8 text-teal-100/90 max-w-5xl">
                  Open Idea is designed to serve a broad spectrum of users—essentially anyone driven to create or learn
                  using open resources.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-4">
                      <h3 className="text-lg font-medium text-gray-900">Researchers &amp; Scientists</h3>
                    </div>
                    <div className="p-6 text-teal-100/90">
                      <p className="mb-4">
                        Unified research hub. Quickly survey literature across fields (e.g. climate science preprints +
                        code implementations).
                      </p>
                      <div className="border border-emerald-400/30 bg-white/5 rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-1">Use Case:</p>
                        <p>
                          A biomedical researcher finds a new imaging paper, its open dataset, and a GitHub repo of
                          analysis code—all in one search, then invites a statistician to collaborate on her project.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-400 to-blue-400 px-6 py-4">
                      <h3 className="text-lg font-medium text-gray-900">Engineers &amp; Developers</h3>
                    </div>
                    <div className="p-6 text-teal-100/90">
                      <p className="mb-4">
                        Accelerate product dev or hobby projects—find open-source components and insights, remix and
                        ship faster.
                      </p>
                      <div className="border border-cyan-400/30 bg-white/5 rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-1">Use Case:</p>
                        <p>
                          An AI engineer finds a public satellite dataset and open-source crop health model. Remixes
                          them, tweaks the model with platform AI.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-purple-400/30 bg-white/5 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-400 to-cyan-400 px-6 py-4">
                      <h3 className="text-lg font-medium text-gray-900">Students &amp; Educators</h3>
                    </div>
                    <div className="p-6 text-teal-100/90">
                      <p className="mb-4">
                        Rich educational resource. Students find free courseware, example projects; educators get open
                        textbooks, datasets, etc.
                      </p>
                      <div className="border border-purple-400/30 bg-white/5 rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-1">Use Case:</p>
                        <p>
                          A CS student learning blockchain finds MIT OCW lectures, an open-source project, and a
                          security article, all linked.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-yellow-400/30 bg-white/5 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-400 to-emerald-400 px-6 py-4">
                      <h3 className="text-lg font-medium text-gray-900">Entrepreneurs &amp; Innovators</h3>
                    </div>
                    <div className="p-6 text-teal-100/90">
                      <p className="mb-4">
                        Validate and prototype ideas fast using existing open tech and global knowledge.
                      </p>
                      <div className="border border-yellow-400/30 bg-white/5 rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-1">Use Case:</p>
                        <p>
                          A social entrepreneur finds rural health datasets, diagnostic AI models, and telemedicine
                          case studies for a new project.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Technology Stack and Architecture */}
            <section id="tech" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  6. Technology Stack and Architecture
                </h2>
                <p className="mb-6 text-teal-100/90">
                  Open Idea’s tech stack is open, modular, and scalable—reflecting our mission to embrace open-source
                  and adapt to diverse content.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-xl font-semibold text-cyan-200 mb-2">Data Aggregation Layer</h3>
                    <p className="text-teal-100/90">
                      Connectors and crawlers fetch content from APIs (arXiv, CrossRef, GitHub, etc.) and sites—
                      aggregating everything open, everywhere.
                    </p>
                  </div>
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-xl font-semibold text-emerald-200 mb-2">Indexing &amp; Storage</h3>
                    <p className="text-teal-100/90">
                      Unified index supports full-text &amp; semantic search. Combines Elasticsearch (keywords) and a
                      vector DB (semantic similarity).
                    </p>
                  </div>
                  <div className="border border-purple-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-xl font-semibold text-purple-200 mb-2">AI/ML Services</h3>
                    <p className="text-teal-100/90">
                      NLP &amp; LLMs enrich and summarize content, power search, and generate semantic embeddings (e.g.,
                      with Sentence-BERT or OpenAI embeddings).
                    </p>
                  </div>
                  <div className="border border-yellow-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-xl font-semibold text-yellow-200 mb-2">Application Backend (API)</h3>
                    <p className="text-teal-100/90">
                      REST &amp; GraphQL APIs orchestrate search, user/project management, comments, and all
                      user-facing features.
                    </p>
                  </div>
                </div>
                <div className="mt-6 border border-emerald-400/30 bg-white/5 rounded-xl p-5 italic text-teal-100/90">
                  True to its philosophy, Open Idea&apos;s architecture is being developed as open-source modules—ready
                  for the world to inspect, contribute, or run themselves.
                </div>
              </div>
            </section>

            {/* 7. Monetization Strategy */}
            <section id="monetization" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  7. Monetization Strategy
                </h2>
                <p className="mb-6 text-teal-100/90">
                  As an open-oriented platform, Open Idea will always provide core discovery and collaboration features
                  for free to maximize community participation. However, to sustain and grow the platform, a sustainable
                  monetization strategy is planned, focused on value-added services and partnerships rather than
                  paywalling knowledge.
                </p>

                <h3 className="text-2xl font-semibold text-cyan-200 mb-4">Key Revenue Streams</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-cyan-200 mb-2">
                      API Access &amp; Enterprise Solutions
                    </h4>
                    <p className="text-teal-100/90 text-sm">
                      Open Idea will offer a commercial API for third-parties (companies, developers, institutions) to
                      programmatically access its aggregated knowledge base and intelligence. Enterprise clients like
                      R&amp;D labs or innovation departments might subscribe to a premium API tier for high-volume
                      queries, custom data feeds, or integration with their internal systems.
                    </p>
                  </div>
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-emerald-200 mb-2">
                      Advanced Discovery &amp; Analytics
                    </h4>
                    <p className="text-teal-100/90 text-sm">
                      While basic search is free, professional users could pay for advanced discovery tools. This might
                      include paid discovery reports or analytics—e.g. a curated landscape report on a given topic
                      (using the platform&apos;s AI to summarize state-of-the-art from open resources), or alerts and
                      monitoring of new open resources in specific areas.
                    </p>
                  </div>
                  <div className="border border-purple-400/30 bg-white/5 rounded-xl p-5">
                    <h4 className="text-lg font-semibold text-purple-200 mb-2">
                      Open Innovation Consulting &amp; Services
                    </h4>
                    <p className="text-teal-100/90 text-sm">
                      Building on the platform, Open Idea can offer consulting services to organizations (corporates,
                      NGOs, governments) seeking to leverage open innovation. This might involve bespoke research,
                      facilitating hackathons or open innovation challenges for a fee, or providing technical support to
                      integrate a company’s own open projects with the community.
                    </p>
                  </div>
                </div>

                <div className="mt-6 border border-emerald-400/30 bg-white/5 rounded-xl p-5 italic text-teal-100/90">
                  “Importantly, Open Idea will remain open-by-default—meaning all openly licensed resources and
                  community contributions stay freely accessible. The monetization focuses on convenience, scale, and
                  enterprise value-add.”
                </div>
              </div>
            </section>

            {/* 8. Roadmap and Milestones */}
            <section id="roadmap" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  8. Roadmap and Milestones
                </h2>
                <p className="mb-6 text-teal-100/90">
                  Open Idea is in early-stage development, and the path from a mini-MVP to the fully realized platform
                  is mapped out in iterative phases. Each phase of the roadmap focuses on delivering key features,
                  testing with users, and expanding the open resource base.
                </p>
                <div className="space-y-6">
                  <div className="border-l-4 border-emerald-400 bg-white/5 rounded-md pl-4 pr-3 py-3 border border-emerald-400/30">
                    <h3 className="text-xl font-semibold text-emerald-200 mb-1">
                      Phase 1: Mini-MVP (Prototype Stage) – Target: Q4 2025
                    </h3>
                    <p className="text-teal-100/90 mb-2">
                      This initial release will validate core functionality with a limited feature set. Features: A
                      basic unified search across a few select data sources (e.g. arXiv for papers, GitHub for code,
                      and one open data repository) with keyword search.
                    </p>
                    <p className="text-sm text-teal-100/80">
                      <span className="font-semibold">Milestone:</span> Index ~1 million resources, onboard first small
                      group of beta users (researchers, developers) to test search.
                    </p>
                  </div>
                  <div className="border-l-4 border-cyan-400 bg-white/5 rounded-md pl-4 pr-3 py-3 border border-cyan-400/30">
                    <h3 className="text-xl font-semibold text-cyan-200 mb-1">
                      Phase 2: Beta Launch (Search &amp; Community) – Target: Mid 2026
                    </h3>
                    <p className="text-teal-100/90 mb-2">
                      An expanded beta release with broader content coverage and introduction of community elements.
                      Features: Unified search extended to many more sources (targeting tens of millions of indexed
                      items), now with full semantic search and filtering.
                    </p>
                    <p className="text-sm text-teal-100/80">
                      <span className="font-semibold">Milestone:</span> &gt;10 million resources indexed; first
                      community projects initiated on the platform; partnerships with one or two institutions for data
                      integration.
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-400 bg-white/5 rounded-md pl-4 pr-3 py-3 border border-purple-400/30">
                    <h3 className="text-xl font-semibold text-purple-200 mb-1">
                      Phase 3: Full Platform MVP (Launch 1.0) – Target: 2027
                    </h3>
                    <p className="text-teal-100/90 mb-2">
                      The first public version of Open Idea 1.0, offering the complete suite of features as envisioned.
                      Features: Project workspaces, public/private projects, import resources, real-time collaboration,
                      publish project outputs.
                    </p>
                    <p className="text-sm text-teal-100/80">
                      <span className="font-semibold">Milestone:</span> Public launch with at least 50–100 million
                      aggregated resources, a growing user base across multiple countries, and success stories of
                      projects built via Open Idea.
                    </p>
                  </div>
                  <div className="border-l-4 border-yellow-400 bg-white/5 rounded-md pl-4 pr-3 py-3 border border-yellow-400/30">
                    <h3 className="text-xl font-semibold text-yellow-200 mb-1">
                      Phase 4: Growth and Scale – Target: 2028 and beyond
                    </h3>
                    <p className="text-teal-100/90 mb-2">
                      With the core platform established, this phase focuses on scaling up and continuously improving:
                      Rapid expansion of indexed content, non-English resources, optimization of search and AI, and
                      scaling infrastructure for high availability.
                    </p>
                    <p className="text-sm text-teal-100/80">
                      <span className="font-semibold">Milestone:</span> 1 million+ active users, 100+ countries, and a
                      healthy ecosystem where external developers build plugins/apps on the Open Idea API.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 9. Call to Action */}
            <section id="cta" className="py-8">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  9. Call to Action
                </h2>
                <p className="mb-6 text-teal-100/90">
                  Open Idea is more than just a product—it&apos;s a movement to unlock the world&apos;s knowledge for
                  collective progress. We invite you to join us on this journey:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-emerald-200 mb-2">
                      For Open-Source Contributors &amp; Innovators
                    </h3>
                    <p className="text-teal-100/90 text-sm">
                      If you are a developer, designer, researcher, or creator who believes in the power of open
                      collaboration, join our community and help build Open Idea.
                    </p>
                  </div>
                  <div className="border border-cyan-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-cyan-200 mb-2">
                      For Investors &amp; Visionary Backers
                    </h3>
                    <p className="text-teal-100/90 text-sm">
                      We are seeking partners who see the transformative potential of a unified open innovation
                      platform and want to be part of its growth.
                    </p>
                  </div>
                  <div className="border border-purple-400/30 bg-white/5 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">
                      For Partners: Universities, NGOs, Institutions
                    </h3>
                    <p className="text-teal-100/90 text-sm">
                      Open Idea thrives on collaboration with organizations that champion open innovation. We invite
                      universities and research institutions to partner with us.
                    </p>
                  </div>
                </div>

                <div className="border border-emerald-400/30 bg-white/5 rounded-xl p-5 text-center text-teal-100/90">
                  Visit our website (<span className="underline decoration-dotted decoration-cyan-400">
                    openidea.world
                  </span>{' '}
                  ) to sign up for early access, contribute to our open whitepaper discussions, or reach out directly at{' '}
                  <span className="underline decoration-dotted decoration-cyan-400">info@openidea.world</span>.
                  <br />
                  Let&apos;s build the future of open innovation together.
                </div>
              </div>
            </section>

            {/* Final CTA */}
            <section className="py-12 text-white text-center">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                  Ready to Join the Open Innovation Movement?
                </h3>
                <p className="mt-4 text-xl text-teal-100/90">
                  Be part of shaping the future of collaborative problem-solving.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/studio"
                    className="px-6 py-3 rounded-md bg-transparent border-2 border-cyan-400/50 text-cyan-400 font-semibold hover:bg-cyan-400/10 hover:border-cyan-400 transition"
                  >
                    Idea to App
                  </Link>
                </div>
              </div>
            </section>

            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

