# Deployment Guide

This guide covers deploying Ecosyz to production environments.

## 🚀 Quick Deploy

### Vercel (Recommended)

This is a comprehensive step-by-step guide to deploy your Ecosyz app to Vercel.

#### Prerequisites

Before deploying, ensure you have:
- ✅ A GitHub account
- ✅ Your code pushed to a GitHub repository
- ✅ A Vercel account ([Sign up](https://vercel.com/signup))
- ✅ A Supabase project set up
- ✅ A PostgreSQL database (can use Supabase's database)
- ✅ All your API keys ready

#### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Verify your `vercel.json`** is configured correctly (already configured in your project):
   - Build command: `pnpm prisma generate && pnpm next build`
   - Install command: `pnpm install --frozen-lockfile`
   - Node version: 20.x

#### Step 2: Connect to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New Project"**

3. **Import your GitHub repository**:
   - Click "Import Git Repository"
   - Select your repository from the list
   - If you don't see it, click "Adjust GitHub App Permissions" and grant access

4. **Configure your project**:
   - **Project Name**: Choose a name (e.g., `ecosyz-search`)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Already set in `vercel.json` - leave as is
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: Already set in `vercel.json` - leave as is

#### Step 3: Set Environment Variables

**⚠️ IMPORTANT**: Set these BEFORE your first deployment!

Click "Environment Variables" and add the following:

**Required Variables:**

```env
# Database (from Supabase or your PostgreSQL provider)
DATABASE_URL=postgresql://user:password@host:5432/database
DIRECT_URL=postgresql://user:password@host:5432/database

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Configuration
NEXTAUTH_SECRET=generate-a-random-32-character-string-here
NEXTAUTH_URL=https://your-project-name.vercel.app

# Email (Optional)
NEXT_PUBLIC_COMPANY_EMAIL=info@openidea.world
```

**Optional Variables:**

```env
# Neo4j (if using knowledge graph features)
NEO4J_URI=bolt://your-neo4j-host:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# Vercel KV (for caching)
KV_REST_API_URL=https://your-kv-instance.upstash.io
KV_REST_API_TOKEN=your-kv-token

# External APIs (if using)
OPENAI_API_KEY=sk-...
GOOGLE_SEARCH_API_KEY=...
YOUTUBE_API_KEY=...

# Sentry (for error tracking)
SENTRY_DSN=https://...
```

**How to set environment variables in Vercel:**

1. In the project settings, go to **Settings** → **Environment Variables**
2. For each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Your actual value
   - **Environment**: Select which environments (Production, Preview, Development)
   - Click **Save**

**💡 Tip**: 
- Set `NEXTAUTH_URL` to your production domain after first deployment
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32` or any random string generator
- For Supabase keys, find them in: Supabase Dashboard → Project Settings → API

#### Step 4: Deploy

1. **Click "Deploy"** button

2. **Wait for build to complete** (usually 2-5 minutes):
   - Vercel will:
     - Install dependencies (`pnpm install`)
     - Generate Prisma client (`prisma generate`)
     - Build Next.js app (`next build`)
   - Watch the build logs for any errors

3. **First deployment will fail** (expected!) because:
   - Database migrations haven't been run yet
   - This is normal - we'll fix it in the next step

#### Step 5: Run Database Migrations

After the first deployment, you need to run database migrations:

**Option A: Using Vercel CLI (Recommended)**

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Pull environment variables** (so migrations can access DATABASE_URL):
   ```bash
   vercel env pull .env.local
   ```

5. **Run migrations**:
   ```bash
   pnpm prisma migrate deploy
   ```

**Option B: Using Supabase Dashboard**

If using Supabase, you can run migrations via SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from your migration files in `prisma/migrations/`
3. Run them in order

**Option C: Using a one-time Vercel Build Command**

You can temporarily modify the build command to include migrations:
```json
"buildCommand": "pnpm prisma generate && pnpm prisma migrate deploy && pnpm next build"
```
⚠️ **Warning**: Only do this once, then revert back to the original build command.

#### Step 6: Redeploy

After migrations are complete:

1. **Go to Vercel Dashboard** → Your Project → **Deployments**
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or simply **push a new commit** to trigger auto-deployment:
   ```bash
   git commit --allow-empty -m "Trigger redeploy after migrations"
   git push
   ```

#### Step 7: Verify Deployment

1. **Visit your deployment URL**: `https://your-project-name.vercel.app`

2. **Test critical features**:
   - ✅ Homepage loads
   - ✅ Authentication works (sign up/login)
   - ✅ Search functionality
   - ✅ Database connections work

3. **Check deployment logs**:
   - Go to **Deployments** → Click on deployment → **View Function Logs**
   - Look for any errors

#### Step 8: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` environment variable to your custom domain

#### Step 9: Set Up Automatic Deployments

Vercel automatically deploys when you push to your connected branch:

- **Production**: Deploys from `main` branch
- **Preview**: Deploys from other branches/PRs

To configure:
1. Go to **Settings** → **Git**
2. Set **Production Branch** (usually `main`)
3. Enable **Automatic deployments from Git**

---

### Quick Reference: Vercel Build Settings

Your `vercel.json` already has these configured:

```json
{
  "buildCommand": "pnpm prisma generate && pnpm next build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

**No additional configuration needed!** ✅

### Manual Deployment

#### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for caching)
- Domain name

#### Build Process

```bash
# Install dependencies
pnpm install

# Build application
pnpm build

# Start production server
pnpm start
```

## 🏗️ Infrastructure Setup

### Database

#### Supabase (Recommended)

1. **Create Project**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Link to remote project
supabase link --project-ref your-project-ref
```

2. **Database Schema**
```bash
# Push schema changes
npx prisma db push

# Generate client
npx prisma generate
```

3. **Migrations**
```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply to production
npx prisma migrate deploy
```

#### PostgreSQL (Self-hosted)

```sql
-- Create database
CREATE DATABASE ecosyz;

-- Create user
CREATE USER ecosyz_user WITH PASSWORD 'secure-password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ecosyz TO ecosyz_user;
```

### File Storage

#### Supabase Storage

```typescript
// Configure storage bucket
const { data, error } = await supabase.storage.createBucket('documents', {
  public: false,
  allowedMimeTypes: ['application/pdf', 'text/plain'],
  fileSizeLimit: 10485760 // 10MB
});
```

#### AWS S3 (Alternative)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

## 🔧 Environment Configuration

### Environment Variables

#### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/ecosyz

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Authentication
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-domain.com

# External Services
YOUTUBE_API_KEY=AIzaSy...

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

#### Environment-Specific Config

```typescript
// lib/config.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL,
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};
```

## 📊 Monitoring & Analytics

### Error Tracking

#### Sentry

```typescript
// pages/_app.tsx or app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

#### Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Logging

#### Winston Logger

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

## 🔒 Security

### Security Headers

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

### HTTPS Configuration

```typescript
// next.config.js
module.exports = {
  // Force HTTPS in production
  ...(process.env.NODE_ENV === 'production' && {
    headers: [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ],
  }),
};
```

## 🚀 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Type check
        run: pnpm type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 📈 Scaling

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_resources_title ON resources USING gin(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY idx_resources_created_at ON resources(created_at DESC);

-- Partition large tables
CREATE TABLE resources_y2024 PARTITION OF resources
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Caching Strategy

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export const cache = {
  async get(key: string) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, data: any, ttl = 3600) {
    await redis.setex(key, ttl, JSON.stringify(data));
  },
};
```

### CDN Configuration

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
};
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql

# Upload to cloud storage
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

### Disaster Recovery

1. **Database Recovery**
```bash
# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

2. **Application Rollback**
```bash
# Rollback deployment
vercel rollback
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests pass
- [ ] Code linting passes
- [ ] Type checking passes
- [ ] Build succeeds locally
- [ ] Environment variables configured
- [ ] Database schema up to date
- [ ] Dependencies updated

### Deployment

- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify critical user flows

### Post-Deployment

- [ ] Update documentation
- [ ] Notify team
- [ ] Monitor for 24 hours
- [ ] Create release notes
- [ ] Plan next deployment

## 🆘 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
pnpm install
```

#### Database Connection Issues

```typescript
// Check database connectivity
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.$connect();
console.log('Database connected successfully');
```

#### Environment Variable Issues

```bash
# Check environment variables
printenv | grep NEXT_PUBLIC

# Validate Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

---

For additional support, check the [Contributing Guide](./contributing.md) or create an issue on GitHub.