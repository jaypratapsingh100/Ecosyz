# Open Idea

**The World's Open Innovation Infrastructure**

Open Idea brings together open research, code, data, and designs to help innovators collaborate and build on each other's work. Where open minds meet open knowledge—dream it, build it, and change the world together.

## 🚀 Features

### Core Functionality
- **Unified Search**: Search across multiple open-source repositories, research papers, datasets, and hardware projects
- **Knowledge Graph**: Visualize relationships between resources, entities, and concepts
- **Workspaces**: Organize and manage your research projects with custom workspaces
- **Resource Management**: Save, annotate, and share resources with your team
- **AI-Powered Summarization**: Get quick summaries of research papers and documents
- **Community**: Connect with other innovators and share your projects

### Search Providers
- ArXiv (Research Papers)
- GitHub (Code Repositories)
- Zenodo (Research Data)
- OpenAlex (Academic Publications)
- Hardware Projects
- Hugging Face (ML Models)
- Software Heritage (Code Archives)
- Wikifactory (Open Hardware)
- YouTube (Educational Content)

### Authentication & User Management
- Multiple authentication methods (Email, GitHub, Google)
- User profiles with avatar support
- Password reset functionality
- Session management

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.5 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.13
- **Database**: 
  - PostgreSQL (via Prisma)
  - Neo4j (Knowledge Graph)
  - Supabase (Authentication & Storage)
- **Authentication**: NextAuth.js
- **UI Components**: 
  - Lucide React (Icons)
  - Framer Motion (Animations)
  - Sonner (Toasts)
- **Graph Visualization**: Cytoscape.js
- **Form Handling**: React Hook Form + Zod
- **Email**: Supabase Edge Functions

## 📋 Requirements

- Node.js **18** or later
- pnpm (recommended) or npm
- PostgreSQL database
- Supabase account (for authentication and email)
- Neo4j database (optional, for knowledge graph features)

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Sony17/Ecosyz.git
cd Ecosyz-search
```

### 2. Install dependencies

```bash
pnpm install
# or
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/openidea"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Email
NEXT_PUBLIC_COMPANY_EMAIL="info@openidea.world"

# Neo4j (Optional)
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="your-password"
NEO4J_DATABASE="neo4j"

# Vercel KV (Optional, for caching)
KV_REST_API_URL="your-kv-url"
KV_REST_API_TOKEN="your-kv-token"
```

### 4. Set up the database

```bash
# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# (Optional) Open Prisma Studio
pnpm db:studio
```

### 5. Start the development server

```bash
pnpm dev
# or
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests with Vitest
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:status` - Check migration status
- `pnpm db:deploy` - Deploy migrations
- `pnpm dev:full` - Start dev server + Prisma Studio concurrently

## 📁 Project Structure

```
app/
├── api/              # API routes
│   ├── auth/         # Authentication endpoints
│   ├── search/       # Search API with multiple providers
│   ├── summarize/    # AI summarization
│   ├── graph/        # Knowledge graph endpoints
│   └── workspaces/   # Workspace management
├── components/       # React components
│   ├── ui/           # Reusable UI components
│   ├── workspace/    # Workspace-related components
│   └── graph/        # Knowledge graph components
├── lib/              # Utility libraries
│   ├── graph/        # Neo4j client and entity extraction
│   └── utils/        # Helper functions
├── openresources/    # Open resources page
├── projects/         # Projects showcase
├── search/           # Search interface
├── workspaces/       # Workspace pages
├── pricing/          # Pricing page
├── contact/          # Contact form
└── feedback/         # Feedback form

prisma/
└── schema.prisma     # Database schema

public/               # Static assets
```

## 🔑 Key Pages

- `/` - Homepage with hero section
- `/search` - Unified search interface
- `/openresources` - Browse open resources
- `/projects` - Explore open projects
- `/workspaces` - Manage your workspaces
- `/pricing` - View pricing plans
- `/contact` - Contact form
- `/feedback` - Submit feedback
- `/researchwhitepaper` - Research whitepaper
- `/community` - Community page

## 📚 Documentation

- **API Documentation**: See [`docs/api.md`](docs/api.md)
- **Summarization**: See [`docs/summarization.md`](docs/summarization.md)
- **Architecture**: See [`docs/architecture.md`](docs/architecture.md)
- **Database Schema**: See [`docs/database-schema.md`](docs/database-schema.md)
- **Authentication**: See [`docs/authentication.md`](docs/authentication.md)
- **Deployment**: See [`docs/deployment.md`](docs/deployment.md)

Additional guides covering setup, contributing, and design choices are available in the [`docs/`](docs/) directory.

## 🧪 Testing

```bash
pnpm test
```

## 🚢 Deployment

The project is configured for deployment on Vercel. See [`docs/deployment.md`](docs/deployment.md) for detailed instructions.

### Vercel Build Command

```bash
prisma generate && next build
```

## 🤝 Contributing

Pull requests are welcome! By contributing you agree to the terms of the AGPL-3.0 License.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [`docs/contributing.md`](docs/contributing.md) for more details.

## 📝 License

This project is released under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

This is a copyleft license that ensures:
- The software remains free and open source
- Anyone who modifies or uses this software (including as a hosted service) must release their modifications under the same license
- Contributions are guaranteed to benefit the community

For more information, see the [full license text](LICENSE) or visit [https://www.gnu.org/licenses/agpl-3.0.en.html](https://www.gnu.org/licenses/agpl-3.0.en.html).

## 🔗 Links

- **Website**: [Open Idea](https://openidea.world)
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/Sony17/Ecosyz/issues)
- **Discord**: [Join our community](https://discord.gg/4weahHXQYY)

## 📧 Contact

For inquiries, please use the [contact form](/contact) or email us at info@openidea.world.

---

Built with ❤️ for global innovation.
