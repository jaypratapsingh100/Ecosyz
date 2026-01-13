# App Builder Integrations & Deployment Plan

## Overview

This document outlines the implementation plan for adding multiple integrations (Canva, Figma, GitHub) and deployment options to the App Builder. The goal is to enable users to:
1. **Edit** projects with design tools (Canva, Figma)
2. **Deploy** projects to various platforms
3. **Version control** projects with GitHub integration

---

## 🎯 Core Features

### 1. **GitHub Integration**
- **Import** projects from GitHub repositories
- **Export** projects to GitHub repositories
- **Sync** changes bidirectionally
- **Version control** with commit history
- **Branch management** for project versions

### 2. **Design Tool Integrations**
- **Figma**: Import designs, extract assets, sync design tokens
- **Canva**: Import templates, extract assets, sync designs

### 3. **Deployment Options**
- **Vercel**: One-click deployment
- **Netlify**: One-click deployment
- **GitHub Pages**: Static site deployment
- **Custom**: Export project files for manual deployment

---

## 📋 Implementation Phases

### Phase 1: Database Schema Extensions

#### 1.1 Add Integration Models

```prisma
model ProjectIntegration {
  id            String   @id @default(cuid())
  projectId     String
  project       AppProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type          String   // "github", "figma", "canva", "vercel", "netlify"
  provider      String   // Provider name
  externalId    String?  // External resource ID
  config        Json?    // Integration-specific configuration
  credentials   Json?    // Encrypted credentials (OAuth tokens, API keys)
  isActive      Boolean  @default(true)
  lastSyncedAt  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([projectId, type, provider])
  @@index([projectId])
}

model Deployment {
  id            String   @id @default(cuid())
  projectId     String
  project       AppProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  platform      String   // "vercel", "netlify", "github-pages", "custom"
  status        String   // "pending", "building", "success", "failed"
  url           String?  // Deployment URL
  buildLog      String?  @db.Text
  error         String?  @db.Text
  config        Json?    // Platform-specific config
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([projectId])
  @@index([status])
}

model ProjectExport {
  id            String   @id @default(cuid())
  projectId     String
  project       AppProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  format        String   // "zip", "github", "vercel", "netlify"
  status        String   // "pending", "processing", "completed", "failed"
  downloadUrl   String?  // Temporary download URL
  expiresAt     DateTime?
  metadata      Json?    // Export metadata
  createdAt     DateTime @default(now())

  @@index([projectId])
}
```

#### 1.2 Update AppProject Model

```prisma
model AppProject {
  // ... existing fields ...
  integrations  ProjectIntegration[]
  deployments   Deployment[]
  exports       ProjectExport[]
  githubRepoUrl String?  // GitHub repository URL
  githubBranch  String?  @default("main")
}
```

---

### Phase 2: GitHub Integration

#### 2.1 OAuth Setup

**Environment Variables:**
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_APP_ID=your_github_app_id (optional, for advanced features)
GITHUB_APP_PRIVATE_KEY=your_github_app_private_key (optional)
```

**API Routes:**
- `/api/integrations/github/auth` - Initiate OAuth flow
- `/api/integrations/github/callback` - Handle OAuth callback
- `/api/integrations/github/repos` - List user repositories
- `/api/integrations/github/import` - Import project from GitHub
- `/api/integrations/github/export` - Export project to GitHub
- `/api/integrations/github/sync` - Sync project with GitHub
- `/api/integrations/github/commits` - Get commit history

#### 2.2 Implementation Details

**Import from GitHub:**
1. User selects repository and branch
2. Clone repository files
3. Create AppProject with files
4. Map GitHub structure to AppProject structure
5. Store GitHub integration config

**Export to GitHub:**
1. User selects/create repository
2. Generate project files from AppProject
3. Create/update files in GitHub
4. Commit changes with message
5. Store GitHub integration config

**Sync:**
1. Fetch latest changes from GitHub
2. Compare with local project
3. Merge or show conflicts
4. Update local files
5. Optionally push local changes

---

### Phase 3: Design Tool Integrations

#### 3.1 Figma Integration

**API Routes:**
- `/api/integrations/figma/auth` - Initiate OAuth flow
- `/api/integrations/figma/callback` - Handle OAuth callback
- `/api/integrations/figma/files` - List Figma files
- `/api/integrations/figma/import` - Import design from Figma
- `/api/integrations/figma/assets` - Extract assets (images, SVGs)
- `/api/integrations/figma/tokens` - Extract design tokens

**Features:**
- Import Figma designs as React components
- Extract color palettes, typography, spacing
- Download assets (images, icons)
- Generate CSS from Figma styles
- Sync design updates

#### 3.2 Canva Integration

**API Routes:**
- `/api/integrations/canva/auth` - Initiate OAuth flow
- `/api/integrations/canva/callback` - Handle OAuth callback
- `/api/integrations/canva/designs` - List Canva designs
- `/api/integrations/canva/import` - Import design from Canva
- `/api/integrations/canva/assets` - Extract assets

**Features:**
- Import Canva templates
- Extract images and graphics
- Convert designs to HTML/CSS
- Generate React components from templates

---

### Phase 4: Deployment Options

#### 4.1 Vercel Deployment

**API Routes:**
- `/api/deploy/vercel/auth` - Authenticate with Vercel
- `/api/deploy/vercel/deploy` - Deploy project to Vercel
- `/api/deploy/vercel/status` - Check deployment status
- `/api/deploy/vercel/logs` - Get deployment logs

**Implementation:**
1. Generate project files
2. Create Vercel project via API
3. Upload files
4. Trigger build
5. Monitor deployment status
6. Store deployment URL

**Required:**
- Vercel API token
- Vercel project configuration (framework detection)

#### 4.2 Netlify Deployment

**API Routes:**
- `/api/deploy/netlify/auth` - Authenticate with Netlify
- `/api/deploy/netlify/deploy` - Deploy project to Netlify
- `/api/deploy/netlify/status` - Check deployment status

**Implementation:**
Similar to Vercel, using Netlify API

#### 4.3 GitHub Pages Deployment

**API Routes:**
- `/api/deploy/github-pages/deploy` - Deploy to GitHub Pages
- `/api/deploy/github-pages/status` - Check deployment status

**Implementation:**
1. Export project files
2. Push to GitHub repository
3. Enable GitHub Pages in repository settings
4. Configure build settings
5. Monitor deployment

#### 4.4 Custom Export

**API Routes:**
- `/api/export/zip` - Export project as ZIP file
- `/api/export/files` - Get project files for download

**Features:**
- Generate ZIP file with all project files
- Include package.json, README.md
- Include build configuration files
- Provide download link

---

### Phase 5: UI Components

#### 5.1 Integration Panel Component

**Location:** `app/components/app-builder/IntegrationPanel.tsx`

**Features:**
- List all integrations
- Connect/disconnect integrations
- Show sync status
- Quick actions (import, export, sync)

#### 5.2 Deployment Panel Component

**Location:** `app/components/app-builder/DeploymentPanel.tsx`

**Features:**
- List deployment options
- Deploy button for each platform
- Show deployment history
- View deployment logs
- Open deployed URL

#### 5.3 GitHub Integration UI

**Location:** `app/components/app-builder/GitHubIntegration.tsx`

**Features:**
- Connect GitHub account
- Select repository
- Import/export buttons
- Sync status indicator
- Commit history viewer

#### 5.4 Design Tool Integration UI

**Location:** `app/components/app-builder/DesignIntegration.tsx`

**Features:**
- Connect Figma/Canva accounts
- Browse designs
- Import design button
- Asset extraction panel
- Design token viewer

---

### Phase 6: API Implementation

#### 6.1 GitHub API Service

**Location:** `src/lib/integrations/github.ts`

**Functions:**
```typescript
- authenticateUser()
- getRepositories()
- getRepositoryFiles()
- createRepository()
- pushFiles()
- getCommits()
- syncRepository()
```

#### 6.2 Figma API Service

**Location:** `src/lib/integrations/figma.ts`

**Functions:**
```typescript
- authenticateUser()
- getFiles()
- getFileNodes()
- exportAssets()
- extractDesignTokens()
```

#### 6.3 Canva API Service

**Location:** `src/lib/integrations/canva.ts`

**Functions:**
```typescript
- authenticateUser()
- getDesigns()
- exportDesign()
- extractAssets()
```

#### 6.4 Deployment Services

**Location:** `src/lib/deployment/`

**Services:**
- `vercel.ts` - Vercel deployment
- `netlify.ts` - Netlify deployment
- `github-pages.ts` - GitHub Pages deployment
- `exporter.ts` - File export utilities

---

## 🔧 Technical Implementation Details

### 6.1 Project Export Logic

**Location:** `src/lib/project-exporter.ts`

**Functions:**
```typescript
exportProject(projectId: string, format: 'zip' | 'github' | 'vercel' | 'netlify')
  - Fetch all project files
  - Generate package.json based on framework
  - Generate build config files (vercel.json, netlify.toml, etc.)
  - Create directory structure
  - Generate ZIP or push to platform
```

### 6.2 File Structure Generation

When exporting, generate proper project structure:

```
project-name/
├── package.json
├── README.md
├── .gitignore
├── public/
│   └── (static assets)
├── src/
│   ├── App.jsx (or App.tsx)
│   ├── index.js (or index.tsx)
│   └── components/
│       └── (component files)
├── styles/
│   └── (CSS files)
└── (framework-specific config files)
```

### 6.3 Framework Detection

Detect framework from project files:
- **React**: Has React imports, JSX files
- **Next.js**: Has `pages/` or `app/` directory, Next.js imports
- **Vite**: Has `vite.config.js`
- **Create React App**: Has `public/index.html` with React scripts

---

## 📦 Required Dependencies

### GitHub Integration
```json
{
  "@octokit/rest": "^20.0.0",
  "@octokit/auth-oauth-app": "^6.0.0"
}
```

### Figma Integration
```json
{
  "figma-api": "^1.11.0"
}
```

### Canva Integration
```json
{
  "canva-api": "^1.0.0" // Check Canva API availability
}
```

### Deployment
```json
{
  "vercel": "^32.0.0",
  "netlify": "^11.0.0",
  "archiver": "^6.0.0" // For ZIP export
}
```

---

## 🔐 Security Considerations

### 1. OAuth Token Storage
- Store tokens encrypted in database
- Use environment variables for encryption keys
- Implement token refresh logic
- Store tokens in `ProjectIntegration.credentials` (encrypted JSON)

### 2. API Key Management
- Never expose API keys to frontend
- Use server-side API routes only
- Implement rate limiting
- Validate user permissions before API calls

### 3. File Access
- Validate file paths to prevent directory traversal
- Sanitize file names
- Limit file sizes
- Validate file types

---

## 🚀 Implementation Steps

### Step 1: Database Migration
1. Update Prisma schema
2. Create migration: `npx prisma migrate dev --name add_integrations_deployments`
3. Generate Prisma client: `npx prisma generate`

### Step 2: GitHub Integration (MVP)
1. Set up GitHub OAuth app
2. Create API routes for GitHub integration
3. Implement GitHub service
4. Create UI components
5. Test import/export flow

### Step 3: Deployment - Vercel (MVP)
1. Set up Vercel API integration
2. Create deployment API routes
3. Implement project export logic
4. Create deployment UI
5. Test deployment flow

### Step 4: Design Tool Integration (Figma)
1. Set up Figma OAuth
2. Create Figma API service
3. Implement design import
4. Create UI components
5. Test import flow

### Step 5: Additional Features
1. Add Netlify deployment
2. Add GitHub Pages deployment
3. Add Canva integration
4. Add sync functionality
5. Add deployment history

---

## 📝 API Route Structure

```
/api/integrations/
  ├── github/
  │   ├── auth/route.ts
  │   ├── callback/route.ts
  │   ├── repos/route.ts
  │   ├── import/route.ts
  │   ├── export/route.ts
  │   └── sync/route.ts
  ├── figma/
  │   ├── auth/route.ts
  │   ├── callback/route.ts
  │   ├── files/route.ts
  │   └── import/route.ts
  └── canva/
      ├── auth/route.ts
      ├── callback/route.ts
      └── import/route.ts

/api/deploy/
  ├── vercel/
  │   ├── auth/route.ts
  │   ├── deploy/route.ts
  │   └── status/route.ts
  ├── netlify/
  │   ├── auth/route.ts
  │   ├── deploy/route.ts
  │   └── status/route.ts
  └── github-pages/
      └── deploy/route.ts

/api/export/
  ├── zip/route.ts
  └── files/route.ts
```

---

## 🎨 UI/UX Flow

### Integration Panel
1. User clicks "Integrations" button in project toolbar
2. Modal opens showing available integrations
3. User clicks "Connect" for desired integration
4. OAuth flow initiates
5. On success, integration appears as connected
6. User can now import/export/sync

### Deployment Flow
1. User clicks "Deploy" button in project toolbar
2. Modal opens showing deployment options
3. User selects platform (Vercel, Netlify, etc.)
4. If not authenticated, OAuth flow initiates
5. User configures deployment settings
6. Click "Deploy" button
7. Show deployment progress
8. On success, show deployment URL

### GitHub Import Flow
1. User clicks "Import from GitHub"
2. Modal shows list of repositories
3. User selects repository and branch
4. Click "Import"
5. Show import progress
6. On success, project appears in project list

---

## 🧪 Testing Strategy

### Unit Tests
- Test GitHub API service functions
- Test project export logic
- Test file structure generation
- Test framework detection

### Integration Tests
- Test GitHub OAuth flow
- Test import/export flow
- Test deployment flow
- Test sync functionality

### E2E Tests
- Test complete GitHub import flow
- Test complete deployment flow
- Test design tool import flow

---

## 📊 Success Metrics

1. **GitHub Integration**
   - Users can import projects from GitHub
   - Users can export projects to GitHub
   - Sync works correctly

2. **Deployment**
   - Successful deployments to Vercel/Netlify
   - Deployment URLs are accessible
   - Build logs are accurate

3. **Design Tools**
   - Designs can be imported
   - Assets are extracted correctly
   - Components are generated accurately

---

## 🔄 Future Enhancements

1. **Advanced GitHub Features**
   - Pull request creation
   - Issue tracking integration
   - GitHub Actions workflows

2. **More Design Tools**
   - Adobe XD integration
   - Sketch integration
   - Framer integration

3. **More Deployment Options**
   - AWS Amplify
   - Cloudflare Pages
   - Railway
   - Render

4. **Collaboration Features**
   - Real-time collaboration
   - Team deployments
   - Deployment approvals

5. **CI/CD Integration**
   - Automated deployments on push
   - Preview deployments for branches
   - Rollback functionality

---

## 📚 Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Figma API Documentation](https://www.figma.com/developers/api)
- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Netlify API Documentation](https://docs.netlify.com/api/get-started/)
- [Canva API Documentation](https://www.canva.dev/docs/)

---

## ⚠️ Notes

1. **Rate Limiting**: Implement rate limiting for all external API calls
2. **Error Handling**: Comprehensive error handling for all integrations
3. **User Feedback**: Clear error messages and loading states
4. **Documentation**: Document all API endpoints and integration flows
5. **Monitoring**: Set up monitoring for integration health and errors

---

## 🎯 MVP Scope (Minimum Viable Product)

For initial release, focus on:
1. ✅ GitHub import/export
2. ✅ Vercel deployment
3. ✅ ZIP export
4. ⏳ Figma import (basic)

Defer to later:
- Canva integration
- Netlify deployment
- GitHub Pages deployment
- Advanced sync features






