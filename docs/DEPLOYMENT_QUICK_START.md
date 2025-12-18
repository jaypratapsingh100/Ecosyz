# 🚀 Deployment Quick Start Guide

Quick guide to test the deployment functionality for app builder projects.

## ⚡ Quick Test (5 minutes)

### Step 1: Install Dependencies

```bash
pnpm install
pnpm prisma generate
```

### Step 2: Start Development Server

```bash
pnpm dev
```

### Step 3: Get API Tokens

**Vercel Token** (for Vercel deployment):
1. Visit: https://vercel.com/account/tokens
2. Click "Create Token"
3. Copy the token (starts with `vercel_`)

**GitHub Token** (for GitHub Pages):
1. Visit: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` and `workflow`
4. Copy the token (starts with `ghp_`)

### Step 4: Test Deployment

1. **Open App Builder**
   - Go to `http://localhost:3000/app-builder`
   - Log in if needed

2. **Create or Select a Project**
   - Click "✨ Sample" to create a sample project, OR
   - Select an existing project

3. **Open Deployment Panel**
   - Click the "Deploy" tab in the right panel

4. **Test Download**
   - Click "Download ZIP"
   - Verify ZIP file downloads with all project files

5. **Test Vercel Deployment**
   - Paste your Vercel token
   - Click "Deploy to Vercel"
   - Check success message and deployment URL

6. **Test GitHub Pages Deployment**
   - Paste your GitHub token
   - Click "Deploy to GitHub Pages"
   - Wait for success message
   - Visit the GitHub Pages URL (may take a few minutes)

## ✅ Expected Results

- ✅ Download ZIP works
- ✅ Vercel deployment creates project and returns URL
- ✅ GitHub Pages creates repository and enables Pages
- ✅ Success messages display correctly
- ✅ Error messages show for invalid tokens

## 🐛 Troubleshooting

**Issue**: "Cannot find module 'jszip'"
- **Fix**: Run `pnpm install`

**Issue**: TypeScript errors
- **Fix**: Run `pnpm prisma generate`

**Issue**: 401 Unauthorized
- **Fix**: Check your tokens are valid and not expired

**Issue**: Deployment fails
- **Fix**: Check browser console and network tab for errors

## 📚 Full Testing Guide

For comprehensive testing, see: [APP_BUILDER_DEPLOYMENT_TESTING.md](./APP_BUILDER_DEPLOYMENT_TESTING.md)

---

**Ready to deploy?** Follow the steps above and you'll have your app deployed in minutes! 🎉


