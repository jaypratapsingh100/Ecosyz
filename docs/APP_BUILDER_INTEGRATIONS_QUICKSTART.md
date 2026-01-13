# App Builder Integrations - Quick Start Guide

This guide provides step-by-step instructions to implement the integrations and deployment features for the App Builder.

---

## 🚀 Quick Start: GitHub Integration

### Step 1: Set Up GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Ecosyz App Builder
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/integrations/github/callback`
4. Save and note the **Client ID** and **Client Secret**

### Step 2: Add Environment Variables

Add to `.env.local`:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### Step 3: Install Dependencies

```bash
pnpm add @octokit/rest @octokit/auth-oauth-app
```

### Step 4: Create GitHub Service

Create `src/lib/integrations/github.ts`:

```typescript
import { Octokit } from '@octokit/rest';

export interface GitHubConfig {
  accessToken: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.accessToken,
    });
  }

  async getRepositories() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });
    return data;
  }

  async getRepositoryFiles(owner: string, repo: string, path: string = '') {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });
    return data;
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false) {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });
    return data;
  }

  async pushFiles(owner: string, repo: string, files: Array<{ path: string; content: string; message: string }>) {
    // Get current ref
    const { data: refData } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });

    // Get current tree
    const { data: commitData } = await this.octokit.git.getCommit({
      owner,
      repo,
      commit_sha: refData.object.sha,
    });

    // Create blobs
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data } = await this.octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: data.sha,
        };
      })
    );

    // Create tree
    const { data: treeData } = await this.octokit.git.createTree({
      owner,
      repo,
      base_tree: commitData.tree.sha,
      tree: blobs,
    });

    // Create commit
    const { data: commit } = await this.octokit.git.createCommit({
      owner,
      repo,
      message: files[0].message || 'Update files',
      tree: treeData.sha,
      parents: [refData.object.sha],
    });

    // Update ref
    await this.octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: commit.sha,
    });

    return commit;
  }
}
```

### Step 5: Create OAuth Routes

Create `app/api/integrations/github/auth/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/github/callback`;
  const state = crypto.randomUUID();

  // Store state in session/cookie for verification
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo&state=${state}`;

  return NextResponse.redirect(url);
}
```

Create `app/api/integrations/github/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../src/lib/auth';
import { prisma } from '../../../../../src/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const projectId = req.nextUrl.searchParams.get('projectId');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return NextResponse.json({ error: tokenData.error }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!prismaUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Store integration
  if (projectId) {
    await prisma.projectIntegration.upsert({
      where: {
        projectId_type_provider: {
          projectId,
          type: 'github',
          provider: 'github',
        },
      },
      create: {
        projectId,
        type: 'github',
        provider: 'github',
        credentials: { accessToken: tokenData.access_token },
        isActive: true,
      },
      update: {
        credentials: { accessToken: tokenData.access_token },
        isActive: true,
        lastSyncedAt: new Date(),
      },
    });
  }

  return NextResponse.redirect(`/app-builder?projectId=${projectId || ''}&githubConnected=true`);
}
```

### Step 6: Create Import/Export Routes

Create `app/api/integrations/github/import/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../src/lib/auth';
import { prisma } from '../../../../../src/lib/db';
import { GitHubService } from '../../../../../src/lib/integrations/github';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { owner, repo, branch = 'main' } = await req.json();

    // Get user's GitHub integration
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    // For now, get token from request (in production, get from stored integration)
    const { accessToken } = await req.json();

    const githubService = new GitHubService({ accessToken });
    
    // Get repository files
    const files = await githubService.getRepositoryFiles(owner, repo);

    // Create project
    const project = await prisma.appProject.create({
      data: {
        title: repo,
        type: 'web',
        framework: 'react',
        ownerId: prismaUser!.id,
        githubRepoUrl: `https://github.com/${owner}/${repo}`,
        githubBranch: branch,
      },
    });

    // Process files and create AppFile records
    // (Implement recursive file fetching logic here)

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🚀 Quick Start: Vercel Deployment

### Step 1: Set Up Vercel Account

1. Go to [Vercel](https://vercel.com)
2. Create account or sign in
3. Go to Settings → Tokens
4. Create a new token with full access
5. Save the token

### Step 2: Add Environment Variables

```env
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id (optional)
```

### Step 3: Install Dependencies

```bash
pnpm add vercel
```

### Step 4: Create Project Exporter

Create `src/lib/project-exporter.ts`:

```typescript
import { prisma } from './db';

export async function exportProject(projectId: string) {
  const project = await prisma.appProject.findUnique({
    where: { id: projectId },
    include: { files: true },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Generate package.json
  const packageJson = {
    name: project.title.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
  };

  // Generate vite.config.js
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;

  // Generate vercel.json
  const vercelConfig = {
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    framework: 'vite',
  };

  // Map files to directory structure
  const fileMap: Record<string, string> = {};
  
  project.files.forEach((file) => {
    // Map file paths appropriately
    if (file.path.endsWith('.jsx') || file.path.endsWith('.js')) {
      fileMap[`src/${file.name}`] = file.content;
    } else if (file.path.endsWith('.css')) {
      fileMap[`src/${file.name}`] = file.content;
    } else {
      fileMap[file.path] = file.content;
    }
  });

  return {
    files: {
      'package.json': JSON.stringify(packageJson, null, 2),
      'vite.config.js': viteConfig,
      'vercel.json': JSON.stringify(vercelConfig, null, 2),
      'index.html': generateIndexHtml(project),
      ...fileMap,
    },
  };
}

function generateIndexHtml(project: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.js"></script>
</body>
</html>`;
}
```

### Step 5: Create Deployment Route

Create `app/api/deploy/vercel/deploy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../src/lib/auth';
import { prisma } from '../../../../../src/lib/db';
import { exportProject } from '../../../../../src/lib/project-exporter';
import { Vercel } from 'vercel';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { projectId } = await req.json();

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    const project = await prisma.appProject.findUnique({
      where: { id: projectId },
    });

    if (!project || project.ownerId !== prismaUser!.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Export project files
    const exported = await exportProject(projectId);

    // Initialize Vercel client
    const vercel = new Vercel({
      token: process.env.VERCEL_TOKEN!,
    });

    // Create deployment
    const deployment = await vercel.deployments.create({
      name: project.title.toLowerCase().replace(/\s+/g, '-'),
      files: exported.files,
      projectSettings: {
        framework: 'vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
      },
    });

    // Store deployment record
    await prisma.deployment.create({
      data: {
        projectId,
        platform: 'vercel',
        status: 'building',
        url: deployment.url,
        config: deployment,
      },
    });

    return NextResponse.json({ deployment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🎨 Quick Start: UI Components

### Integration Panel Component

Create `app/components/app-builder/IntegrationPanel.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Integration {
  id: string;
  type: string;
  provider: string;
  isActive: boolean;
}

export default function IntegrationPanel({ projectId }: { projectId: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, [projectId]);

  const fetchIntegrations = async () => {
    const res = await fetch(`/api/integrations?projectId=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setIntegrations(data);
    }
  };

  const connectGitHub = () => {
    window.location.href = `/api/integrations/github/auth?projectId=${projectId}`;
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-white font-semibold">Integrations</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">GitHub</p>
              <p className="text-gray-400 text-xs">Import/Export projects</p>
            </div>
          </div>
          <button
            onClick={connectGitHub}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Deployment Panel Component

Create `app/components/app-builder/DeploymentPanel.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function DeploymentPanel({ projectId }: { projectId: string }) {
  const [deploying, setDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  const deployToVercel = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/api/deploy/vercel/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (res.ok) {
        const data = await res.json();
        setDeploymentUrl(data.deployment.url);
      }
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-white font-semibold">Deploy</h3>
      
      <div className="space-y-2">
        <button
          onClick={deployToVercel}
          disabled={deploying}
          className="w-full px-4 py-3 bg-black hover:bg-gray-900 text-white rounded-lg border border-gray-700 flex items-center justify-between transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 22.525H0l12-21.05 12 21.05z"/>
            </svg>
            <span>Deploy to Vercel</span>
          </div>
          {deploying && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
        </button>

        {deploymentUrl && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
            <p className="text-emerald-400 text-sm">Deployed successfully!</p>
            <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-xs underline">
              {deploymentUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📝 Next Steps

1. **Complete GitHub Integration**
   - Implement recursive file fetching
   - Handle large repositories
   - Add error handling

2. **Complete Vercel Deployment**
   - Handle build status polling
   - Show deployment logs
   - Add deployment history

3. **Add More Integrations**
   - Figma integration
   - Canva integration
   - Netlify deployment

4. **Add UI to App Builder**
   - Add integration panel to project toolbar
   - Add deployment button
   - Show integration status

5. **Testing**
   - Test OAuth flows
   - Test import/export
   - Test deployments

---

## 🔗 Useful Resources

- [GitHub OAuth Guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Octokit Documentation](https://octokit.github.io/rest.js/)






