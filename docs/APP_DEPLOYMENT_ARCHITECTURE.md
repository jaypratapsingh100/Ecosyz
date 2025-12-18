# 🚀 App Builder Deployment Architecture Guide

This guide covers strategies for deploying user-created apps automatically without requiring individual user accounts or payments.

## 🎯 Goal

- Users create apps in the app builder
- Apps are automatically deployed
- Users get a unique URL (e.g., `user-app-123.openidea.world`)
- **No cost per user** - use open source or free tier services
- **No user accounts needed** - deploy on behalf of users

## 🏗️ Architecture Options

### Option 1: Self-Hosted with Coolify (Recommended for Open Source)

**Coolify** is a self-hosted alternative to Vercel/Netlify. It's 100% open source and free.

#### Architecture
```
User App → Open Idea Platform → Coolify API → Deploy to Coolify Server
                                    ↓
                            user-app-123.yourdomain.com
```

#### Setup Steps

1. **Install Coolify on Your Server**
   ```bash
   # On Ubuntu/Debian
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. **Configure Coolify**
   - Access Coolify dashboard
   - Create API token
   - Set up domain (e.g., `*.yourdomain.com`)

3. **Create Deployment API Endpoint**

   Create `app/api/app-projects/[id]/deploy-coolify/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { prisma } from '../../../../../src/lib/db';
   import { getCurrentUser } from '../../../../../src/lib/auth';

   export async function POST(
     req: NextRequest,
     { params }: { params: Promise<{ id: string }> }
   ) {
     const user = await getCurrentUser();
     if (!user) {
       return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
     }

     const { id } = await params;
     const project = await prisma.appProject.findUnique({
       where: { id },
       include: { files: true },
     });

     if (!project || project.ownerId !== user.id) {
       return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
     }

     // Build static files from project
     const staticFiles = buildStaticFiles(project.files);

     // Deploy to Coolify
     const coolifyToken = process.env.COOLIFY_API_TOKEN;
     const coolifyUrl = process.env.COOLIFY_URL; // e.g., https://coolify.yourdomain.com

     const response = await fetch(`${coolifyUrl}/api/v1/applications`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${coolifyToken}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         name: `app-${project.id}`,
         domain: `${project.id}.yourdomain.com`,
         build_pack: 'static',
         source: {
           type: 'git',
           repository: staticFiles, // Or upload files
         },
       }),
     });

     const deployment = await response.json();

     // Save deployment URL
     await prisma.appProject.update({
       where: { id },
       data: {
         deploymentUrl: deployment.url,
         deploymentStatus: 'deployed',
       },
     });

     return NextResponse.json({ url: deployment.url });
   }
   ```

#### Pros
- ✅ 100% free and open source
- ✅ Full control
- ✅ No per-user costs
- ✅ Supports custom domains
- ✅ Can deploy unlimited apps

#### Cons
- ❌ Requires your own server
- ❌ You manage infrastructure
- ❌ Need to handle scaling

---

### Option 2: Single Vercel Account (Free Tier)

Use **one Vercel account** to deploy all user apps as separate projects.

#### Architecture
```
User App → Open Idea Platform → Vercel API (Your Account) → Deploy
                                    ↓
                    user-app-123.vercel.app (or custom domain)
```

#### Setup Steps

1. **Get Vercel API Token**
   - Go to https://vercel.com/account/tokens
   - Create a token
   - Store in `.env`: `VERCEL_API_TOKEN=vercel_xxx`

2. **Create Deployment API**

   Create `app/api/app-projects/[id]/deploy-vercel/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { prisma } from '../../../../../src/lib/db';
   import { getCurrentUser } from '../../../../../src/lib/auth';

   export async function POST(
     req: NextRequest,
     { params }: { params: Promise<{ id: string }> }
   ) {
     const user = await getCurrentUser();
     if (!user) {
       return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
     }

     const { id } = await params;
     const project = await prisma.appProject.findUnique({
       where: { id },
       include: { files: true },
     });

     if (!project || project.ownerId !== user.id) {
       return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
     }

     // Create a temporary GitHub repo or use Vercel's file upload
     const projectFiles = buildProjectFiles(project.files);

     // Deploy to Vercel using API
     const vercelToken = process.env.VERCEL_API_TOKEN;
     const vercelTeamId = process.env.VERCEL_TEAM_ID; // Optional

     // Option A: Upload files directly
     const formData = new FormData();
     projectFiles.forEach((file, index) => {
       formData.append(`file-${index}`, new Blob([file.content]), file.path);
     });

     const response = await fetch('https://api.vercel.com/v13/deployments', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${vercelToken}`,
       },
       body: formData,
     });

     const deployment = await response.json();

     // Save deployment URL
     await prisma.appProject.update({
       where: { id },
       data: {
         deploymentUrl: deployment.url,
         deploymentStatus: 'deployed',
       },
     });

     return NextResponse.json({ 
       url: `https://${deployment.url}`,
       deploymentId: deployment.id,
     });
   }
   ```

#### Vercel Free Tier Limits
- ✅ 100 deployments/day
- ✅ Unlimited projects
- ✅ Custom domains
- ✅ Automatic SSL

#### Pros
- ✅ No server management
- ✅ Fast CDN
- ✅ Automatic SSL
- ✅ Free tier is generous

#### Cons
- ❌ Limited to 100 deployments/day
- ❌ Need to manage rate limits
- ❌ All apps under one account

---

### Option 3: Render.com (Free Tier + API)

**Render** offers free tier with API access.

#### Architecture
```
User App → Open Idea Platform → Render API → Deploy
                                    ↓
                user-app-123.onrender.com
```

#### Setup Steps

1. **Get Render API Key**
   - Go to https://dashboard.render.com/account/api-keys
   - Create API key
   - Store in `.env`: `RENDER_API_KEY=xxx`

2. **Create Deployment API**

   ```typescript
   // app/api/app-projects/[id]/deploy-render/route.ts
   const renderApiKey = process.env.RENDER_API_KEY;

   const response = await fetch('https://api.render.com/v1/services', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${renderApiKey}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       type: 'static_site',
       name: `app-${project.id}`,
       repo: 'https://github.com/your-org/temp-repo', // Or use file upload
       branch: 'main',
       buildCommand: 'npm run build',
       publishPath: './dist',
       envVars: [],
     }),
   });
   ```

#### Render Free Tier Limits
- ✅ 750 hours/month free
- ✅ Sleeps after 15 min inactivity
- ✅ Custom domains
- ✅ Automatic SSL

---

### Option 4: Static Hosting + Reverse Proxy (Most Flexible)

Host static files yourself and use a reverse proxy for subdomains.

#### Architecture
```
User App → Open Idea Platform → Build Static Files → Store in S3/Storage
                                    ↓
                            Reverse Proxy (Nginx/Caddy)
                                    ↓
                    user-app-123.yourdomain.com
```

#### Setup Steps

1. **Build Static Files**
   ```typescript
   function buildStaticFiles(files: AppFile[]) {
     // Build React app to static HTML/CSS/JS
     // Use tools like react-snap or next export
     return staticFiles;
   }
   ```

2. **Store Files** (Choose one):
   - **S3-compatible storage** (MinIO, AWS S3, Cloudflare R2)
   - **Local filesystem** (if on same server)
   - **IPFS** (decentralized)

3. **Reverse Proxy Setup** (Nginx example):
   ```nginx
   # /etc/nginx/sites-available/apps
   server {
       listen 80;
       server_name *.yourdomain.com;
       
       location / {
           set $app_id $host;
           rewrite ^(.*)$ /apps/$app_id$1 break;
           root /var/www/apps;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. **Wildcard DNS**
   ```
   *.yourdomain.com → Your Server IP
   ```

#### Pros
- ✅ Full control
- ✅ No external dependencies
- ✅ Can use free storage (MinIO, IPFS)
- ✅ Unlimited apps

#### Cons
- ❌ Need to manage infrastructure
- ❌ Need to handle scaling
- ❌ More complex setup

---

### Option 5: GitHub Pages via API (Free)

Use GitHub API to create repos and enable Pages.

#### Architecture
```
User App → Open Idea Platform → GitHub API → Create Repo → Enable Pages
                                    ↓
            username.github.io/repo-name (or custom domain)
```

#### Setup Steps

1. **Create GitHub App or Personal Access Token**
   - Go to https://github.com/settings/tokens
   - Create token with `repo` scope
   - Store in `.env`: `GITHUB_TOKEN=ghp_xxx`

2. **Create Deployment API**

   ```typescript
   // app/api/app-projects/[id]/deploy-github/route.ts
   const githubToken = process.env.GITHUB_TOKEN;
   const githubOrg = process.env.GITHUB_ORG; // Your org name

   // Create repository
   const repoResponse = await fetch(`https://api.github.com/orgs/${githubOrg}/repos`, {
     method: 'POST',
     headers: {
       'Authorization': `token ${githubToken}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       name: `app-${project.id}`,
       private: false,
       auto_init: false,
     }),
   });

   const repo = await repoResponse.json();

   // Upload files
   // Use GitHub API to create files in repo
   // Enable GitHub Pages via API

   // Save deployment URL
   await prisma.appProject.update({
     where: { id },
     data: {
       deploymentUrl: `https://${githubOrg}.github.io/app-${project.id}`,
       deploymentStatus: 'deployed',
     },
   });
   ```

#### Pros
- ✅ Free
- ✅ Reliable CDN
- ✅ Custom domains supported
- ✅ Automatic SSL

#### Cons
- ❌ Public repos (unless GitHub Pro)
- ❌ Rate limits (5000 requests/hour)
- ❌ Need to manage repos

---

## 🎯 Recommended Strategy: Hybrid Approach

**Use multiple options based on app type:**

1. **Static Apps** → Coolify (self-hosted) or Vercel (free tier)
2. **Simple Sites** → GitHub Pages
3. **Custom Domains** → Reverse Proxy + Storage

## 📋 Implementation Checklist

### Phase 1: Basic Deployment
- [ ] Choose deployment platform (Coolify recommended)
- [ ] Set up deployment API endpoint
- [ ] Create file builder utility
- [ ] Test deployment flow
- [ ] Store deployment URLs in database

### Phase 2: User Experience
- [ ] Add "Deploy" button in app builder
- [ ] Show deployment status
- [ ] Display deployment URL
- [ ] Handle deployment errors gracefully

### Phase 3: Advanced Features
- [ ] Custom domains
- [ ] Automatic redeployment on update
- [ ] Deployment history
- [ ] Rollback functionality

## 🔧 Database Schema Updates

Add to `prisma/schema.prisma`:

```prisma
model AppProject {
  // ... existing fields
  deploymentUrl      String?
  deploymentStatus   String?  // 'pending' | 'deployed' | 'failed'
  deploymentPlatform String?  // 'coolify' | 'vercel' | 'render' | 'github'
  deploymentId       String?  // Platform-specific deployment ID
  deployedAt         DateTime?
}
```

## 🚀 Quick Start: Coolify Deployment

1. **Install Coolify**:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. **Get API Token**:
   - Access Coolify dashboard
   - Go to Settings → API Tokens
   - Create token

3. **Set Environment Variables**:
   ```env
   COOLIFY_URL=https://coolify.yourdomain.com
   COOLIFY_API_TOKEN=your-token-here
   DEPLOYMENT_DOMAIN=yourdomain.com
   ```

4. **Create Deployment Endpoint** (see Option 1 code above)

5. **Test Deployment**:
   ```bash
   curl -X POST http://localhost:3000/api/app-projects/[id]/deploy-coolify
   ```

## 📚 Additional Resources

- **Coolify Docs**: https://coolify.io/docs
- **Vercel API**: https://vercel.com/docs/rest-api
- **Render API**: https://render.com/docs/api
- **GitHub API**: https://docs.github.com/en/rest

---

**Next Steps**: Choose your preferred option and implement the deployment API endpoint. Coolify is recommended for full control and zero per-user costs.


