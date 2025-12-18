# 🚀 Deploy User Apps Guide - Quick Start

This guide shows you how to deploy user-created apps automatically without requiring individual user accounts or payments.

## 🎯 Best Approach: Coolify (Self-Hosted)

**Why Coolify?**
- ✅ 100% free and open source
- ✅ No per-user costs
- ✅ Full control over infrastructure
- ✅ Supports unlimited apps
- ✅ Custom domains
- ✅ Automatic SSL

## 📋 Quick Setup (30 minutes)

### Step 1: Install Coolify

```bash
# On Ubuntu/Debian server
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access Coolify dashboard
# Default: http://your-server-ip:8000
```

### Step 2: Configure Coolify

1. **Set up domain** (e.g., `apps.yourdomain.com`)
2. **Create API token**: Settings → API Tokens → Create Token
3. **Configure wildcard DNS**: `*.apps.yourdomain.com` → Your server IP

### Step 3: Set Environment Variables

Add to your `.env.local`:

```env
# Coolify Configuration
COOLIFY_URL=https://coolify.yourdomain.com
COOLIFY_API_TOKEN=your-api-token-here
DEPLOYMENT_DOMAIN=apps.yourdomain.com

# Optional: GitHub for file storage
GITHUB_TOKEN=ghp_xxx
GITHUB_ORG=your-org-name
```

### Step 4: Run Database Migration

```bash
# Add deployment fields to AppProject
pnpm prisma migrate dev --name add_deployment_fields
pnpm prisma generate
```

### Step 5: Test Deployment

1. **Create an app** in the app builder
2. **Click "Deploy"** button
3. **Check deployment status**
4. **Visit the URL** (e.g., `app-abc123.apps.yourdomain.com`)

## 🔧 Alternative: Single Vercel Account (Free Tier)

If you prefer managed hosting:

### Setup

1. **Create Vercel account** (free tier)
2. **Get API token**: https://vercel.com/account/tokens
3. **Set environment variable**: `VERCEL_API_TOKEN=vercel_xxx`

### Limits

- ✅ 100 deployments/day (free tier)
- ✅ Unlimited projects
- ✅ Custom domains
- ⚠️ Rate limit: 100/day

### Implementation

Use the existing deployment endpoint pattern:
- `app/api/app-projects/[id]/deploy-vercel/route.ts`

## 🏗️ Architecture Overview

```
User creates app
    ↓
App Builder UI
    ↓
Deploy API Endpoint
    ↓
Build Static Files (HTML/CSS/JS)
    ↓
Deploy to Platform (Coolify/Vercel)
    ↓
Return URL to User
    ↓
User gets: app-123.apps.yourdomain.com
```

## 📝 Implementation Checklist

### Backend
- [x] Add deployment fields to database schema
- [ ] Create deployment API endpoint
- [ ] Build static files from project files
- [ ] Integrate with Coolify/Vercel API
- [ ] Handle deployment status updates

### Frontend
- [ ] Add "Deploy" button in app builder
- [ ] Show deployment status
- [ ] Display deployment URL
- [ ] Handle errors gracefully

### Testing
- [ ] Test deployment flow
- [ ] Test error handling
- [ ] Test URL generation
- [ ] Test deployment status updates

## 🚀 Next Steps

1. **Choose platform**: Coolify (recommended) or Vercel
2. **Set up infrastructure**: Install Coolify or get Vercel token
3. **Implement deployment API**: See `app/api/app-projects/[id]/deploy-coolify/route.ts`
4. **Add UI**: Add deploy button to ProjectManager component
5. **Test**: Deploy a sample app

## 📚 Full Documentation

- **Architecture Guide**: [`APP_DEPLOYMENT_ARCHITECTURE.md`](./APP_DEPLOYMENT_ARCHITECTURE.md)
- **Coolify Docs**: https://coolify.io/docs
- **Vercel API**: https://vercel.com/docs/rest-api

## 💡 Pro Tips

1. **Use subdomains**: `app-{id}.apps.yourdomain.com` for each app
2. **Cache deployments**: Store deployment status in database
3. **Handle failures**: Show clear error messages to users
4. **Monitor usage**: Track deployment counts and limits
5. **Auto-redeploy**: Redeploy on file updates

## 🆘 Troubleshooting

**Issue**: Deployment fails
- Check API tokens are valid
- Verify Coolify/Vercel is accessible
- Check server logs

**Issue**: URL not working
- Verify DNS is configured
- Check SSL certificate
- Verify deployment completed

**Issue**: Rate limits
- Use multiple accounts (Vercel)
- Implement queue system
- Consider self-hosted (Coolify)

---

**Ready to deploy?** Start with Coolify for the most flexible, cost-effective solution! 🎉


