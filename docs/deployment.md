# Deployment Guide

This guide covers deploying Ecosyz to production environments.

## 🚀 Quick Deploy

### Vercel (Recommended)

1. **Connect Repository**
   - Import project to Vercel
   - Connect GitHub repository

2. **Environment Variables**
```env
# Database
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# External APIs
YOUTUBE_API_KEY=your-youtube-key
```

3. **Build Settings**
   - **Build Command**: `npm run build` or `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install` or `pnpm install`

4. **Deploy**
   - Push to main branch
   - Vercel auto-deploys
   - Check deployment logs

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