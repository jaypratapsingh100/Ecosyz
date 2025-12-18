# Deployment Workflow Guide

## 🎯 Recommended Deployment Flow

For the best experience, follow this workflow:

### Option 1: GitHub Pages → Vercel (Recommended)

1. **Deploy to GitHub Pages**
   - Click "Deploy to GitHub Pages"
   - Enter your GitHub token
   - Wait for success message
   - Your site is now live on GitHub Pages

2. **Connect to Vercel**
   - After GitHub deployment succeeds, click "🚀 Connect to Vercel"
   - This opens Vercel's import page
   - Select your GitHub repository
   - Vercel will automatically deploy your site
   - You'll get a Vercel URL (e.g., `your-project.vercel.app`)

**Benefits:**
- ✅ Site is live immediately on GitHub Pages
- ✅ Can then add Vercel for better performance/CDN
- ✅ Automatic deployments on both platforms
- ✅ Free hosting on both platforms

### Option 2: Vercel Only

1. **Create Vercel Project**
   - Click "Create Vercel Project"
   - Enter your Vercel token
   - Project is created but not deployed yet

2. **Deploy via GitHub**
   - Deploy to GitHub Pages first
   - Then connect the GitHub repo to your Vercel project

3. **Or Use Vercel CLI**
   - Download the project ZIP
   - Extract it
   - Run: `vercel --prod`

### Option 3: Download & Manual Deployment

1. **Download ZIP**
   - Click "Download ZIP"
   - Extract the files
   - Deploy manually to any platform

## 🔄 Why This Workflow?

**Vercel Limitation:**
- Vercel's API doesn't support direct file uploads
- Vercel requires Git repository integration for automatic deployments
- Creating a project without files results in a 404 error

**Solution:**
- Deploy to GitHub first (which uploads all files)
- Then connect GitHub repo to Vercel
- Both platforms get automatic deployments

## 📋 Step-by-Step Example

### Step 1: Deploy to GitHub Pages

1. Open your project in App Builder
2. Click "Deploy" tab
3. Enter GitHub token (get from https://github.com/settings/tokens)
4. Click "Deploy to GitHub Pages"
5. Wait for success message
6. Note the GitHub Pages URL (e.g., `username.github.io/repo-name`)

### Step 2: Connect to Vercel

1. After GitHub deployment succeeds, you'll see a "🚀 Connect to Vercel" link
2. Click it (opens Vercel import page)
3. Sign in to Vercel if needed
4. Select your GitHub repository
5. Click "Import"
6. Vercel will deploy your site automatically
7. You'll get a Vercel URL (e.g., `your-project.vercel.app`)

### Step 3: Verify Both Deployments

- **GitHub Pages**: Visit `username.github.io/repo-name`
- **Vercel**: Visit `your-project.vercel.app`

Both should show your deployed app!

## 🐛 Troubleshooting

### Issue: Vercel shows 404 after creating project

**Cause**: Vercel project was created but no files were uploaded.

**Solution**: 
- Deploy to GitHub Pages first
- Then connect the GitHub repo to Vercel
- This ensures files are uploaded

### Issue: GitHub Pages not building

**Cause**: GitHub Pages needs a few minutes to build.

**Solution**:
- Wait 2-5 minutes
- Check repository Settings > Pages for build status
- Ensure `index.html` exists in the repository

### Issue: Vercel import fails

**Cause**: Repository might not be public or token doesn't have access.

**Solution**:
- Ensure GitHub token has `repo` scope
- Make repository public (or use Vercel's GitHub integration)
- Try the import link again

## 💡 Tips

1. **Always deploy to GitHub Pages first** - This ensures files are uploaded
2. **Use the "Connect to Vercel" link** - It's pre-configured with your repo
3. **Keep tokens secure** - Never share or commit them
4. **Check both URLs** - GitHub Pages and Vercel should both work
5. **Update files** - Push to GitHub, both platforms auto-deploy

## 🎉 Success Indicators

✅ GitHub Pages URL works (after 2-5 minutes)  
✅ Vercel URL works (after connecting GitHub repo)  
✅ Both sites show your app correctly  
✅ Changes auto-deploy when you push to GitHub  

---

**Need help?** Check the [Testing Guide](./APP_BUILDER_DEPLOYMENT_TESTING.md) or [Quick Start](./DEPLOYMENT_QUICK_START.md).


