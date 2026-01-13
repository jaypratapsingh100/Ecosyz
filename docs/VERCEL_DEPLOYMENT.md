# 🚀 Vercel Deployment Quick Start

A concise guide to deploy your Ecosyz app to Vercel in minutes.

## Prerequisites Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Supabase project ready
- [ ] Database connection string ready
- [ ] API keys collected

## 5-Minute Deployment

### 1️⃣ Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your repository
4. Click "Import"

### 2️⃣ Configure Environment Variables

**Before clicking Deploy**, go to **Environment Variables** and add:

#### Required (Minimum)

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXTAUTH_SECRET=your-random-32-char-string
NEXTAUTH_URL=https://your-project.vercel.app
```

#### Where to Find These Values

- **DATABASE_URL**: Supabase Dashboard → Settings → Database → Connection String
- **Supabase Keys**: Supabase Dashboard → Settings → API
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **NEXTAUTH_URL**: Will be `https://your-project-name.vercel.app` (update after first deploy)

### 3️⃣ Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for build
3. First deployment may show errors (normal - migrations needed)

### 4️⃣ Run Database Migrations

**After first deployment**, run migrations:

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Pull env vars and run migrations
vercel env pull .env.local
pnpm prisma migrate deploy
```

### 5️⃣ Redeploy

- Go to Vercel Dashboard → Deployments
- Click **"Redeploy"** on latest deployment
- Or push empty commit: `git commit --allow-empty -m "redeploy" && git push`

## ✅ Verify Deployment

Visit your URL: `https://your-project-name.vercel.app`

Test:
- [ ] Homepage loads
- [ ] Can sign up/login
- [ ] Search works
- [ ] No console errors

## 🔧 Troubleshooting

### Build Fails

**Error: Prisma Client not generated**
- ✅ Already handled in `vercel.json` build command

**Error: Database connection failed**
- Check `DATABASE_URL` is correct
- Ensure database allows connections from Vercel IPs
- For Supabase: Check connection pooling settings

**Error: Missing environment variables**
- Go to Settings → Environment Variables
- Ensure all required vars are set for **Production** environment

### Runtime Errors

**Error: NEXTAUTH_URL mismatch**
- Update `NEXTAUTH_URL` env var to match your deployment URL
- Redeploy after updating

**Error: Supabase connection failed**
- Verify Supabase keys are correct
- Check Supabase project is active
- Ensure RLS policies allow access

### Database Migration Issues

**Migrations not running**
- Run manually: `vercel env pull .env.local && pnpm prisma migrate deploy`
- Or add to build command temporarily (remove after first deploy)

## 📋 Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | `abc123...` |
| `NEXTAUTH_URL` | Your app URL | `https://app.vercel.app` |

### Optional

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `NEO4J_URI` | Neo4j connection | Using knowledge graph |
| `KV_REST_API_URL` | Vercel KV URL | Using caching |
| `OPENAI_API_KEY` | OpenAI API key | Using AI features |
| `DIRECT_URL` | Direct DB connection | Connection pooling |

## 🎯 Post-Deployment

### Set Up Custom Domain

1. Settings → Domains → Add Domain
2. Configure DNS as instructed
3. Update `NEXTAUTH_URL` to custom domain
4. Redeploy

### Enable Analytics

1. Settings → Analytics
2. Enable Vercel Analytics
3. (Optional) Add to `app/layout.tsx`:
   ```tsx
   import { Analytics } from '@vercel/analytics/react';
   // Add <Analytics /> to your layout
   ```

### Monitor Deployments

- **Deployments**: View all deployments and logs
- **Functions**: Monitor serverless function performance
- **Analytics**: Track page views and performance

## 🔄 Continuous Deployment

Vercel automatically deploys:
- ✅ **Production**: Every push to `main` branch
- ✅ **Preview**: Every push to other branches/PRs

To configure:
- Settings → Git → Production Branch → Set to `main`

## 📚 Additional Resources

- [Full Deployment Guide](./deployment.md)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

**Need Help?** Check the [troubleshooting section](./deployment.md#-troubleshooting) in the full deployment guide.






