# App Builder Deployment Testing Guide

This guide covers how to test the deployment functionality for app builder projects to Vercel and GitHub Pages.

## 📋 Prerequisites

Before testing deployment, ensure you have:

- [ ] A running development server (`pnpm dev`)
- [ ] User account logged in
- [ ] At least one app builder project created
- [ ] Vercel account and API token (for Vercel testing)
- [ ] GitHub account and Personal Access Token (for GitHub Pages testing)

## 🚀 Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install `jszip` which is required for creating deployment packages.

### 2. Generate Prisma Client

```bash
pnpm prisma generate
```

This ensures all database types are available.

### 3. Get API Tokens

#### Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Give it a name (e.g., "App Builder Testing")
4. Set expiration (or leave as "No Expiration")
5. Copy the token (starts with `vercel_`)

#### GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "App Builder Deployment")
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

⚠️ **Important**: Store these tokens securely. Never commit them to git!

## 🧪 Testing Deployment Features

### Test 1: Access Deployment Panel

1. **Navigate to App Builder**
   - Go to `/app-builder` in your browser
   - Ensure you're logged in

2. **Select a Project**
   - Click on any project from the sidebar
   - Wait for files to load

3. **Open Deployment Tab**
   - Click the "Deploy" tab in the right panel
   - Verify the deployment panel loads correctly
   - Check that both Vercel and GitHub Pages sections are visible

**Expected Result**: 
- ✅ Deployment panel displays
- ✅ Both deployment options are visible
- ✅ Download ZIP button is visible

### Test 2: Download Project ZIP

1. **Click Download Button**
   - In the Deployment panel, click "Download ZIP"
   - Browser should download a ZIP file

2. **Verify ZIP Contents**
   - Extract the ZIP file
   - Check that all project files are included
   - Verify `package.json` exists (for React/Next.js projects)
   - Verify `.gitignore` exists

**Expected Result**:
- ✅ ZIP file downloads successfully
- ✅ All project files are in the ZIP
- ✅ `package.json` is present with correct dependencies
- ✅ `.gitignore` is included

**API Endpoint**: `GET /api/app-projects/[id]/download`

### Test 3: Deploy to Vercel

#### Step 1: Prepare Test Project

1. Create a simple React project:
   - Click "✨ Sample" to create a sample project, OR
   - Create a new React project with at least one file

2. Ensure project has files:
   - At least one `.jsx` or `.js` file
   - Preferably an `index.html` or main component

#### Step 2: Deploy

1. **Open Deployment Panel**
   - Select your project
   - Click "Deploy" tab

2. **Enter Vercel Token**
   - Paste your Vercel token in the "Vercel Token" field
   - Optionally set a custom project name

3. **Click "Deploy to Vercel"**
   - Wait for deployment to complete
   - Check for success/error messages

**Expected Result**:
- ✅ Success message appears
- ✅ Deployment URL is shown (if successful)
- ✅ Instructions are displayed

**API Endpoint**: `POST /api/app-projects/[id]/deploy/vercel`

**Request Body**:
```json
{
  "vercelToken": "vercel_xxx...",
  "projectName": "my-project" // optional
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Project prepared for deployment",
  "vercelProjectId": "...",
  "vercelProjectName": "...",
  "deploymentUrl": "https://...vercel.app",
  "instructions": [...]
}
```

#### Step 3: Verify Deployment

1. **Check Vercel Dashboard**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Find your project
   - Check deployment status

2. **Visit Deployment URL**
   - Click the deployment URL from the success message
   - Verify the app loads correctly

### Test 4: Deploy to GitHub Pages

#### Step 1: Prepare Test Project

1. Use the same project from Vercel test, OR
2. Create a new project with HTML/React files

#### Step 2: Deploy

1. **Open Deployment Panel**
   - Select your project
   - Click "Deploy" tab

2. **Enter GitHub Token**
   - Paste your GitHub Personal Access Token
   - Optionally set a custom repository name

3. **Click "Deploy to GitHub Pages"**
   - Wait for deployment to complete
   - This may take 30-60 seconds

**Expected Result**:
- ✅ Success message appears
- ✅ Repository URL is shown
- ✅ GitHub Pages URL is displayed
- ✅ Instructions are shown

**API Endpoint**: `POST /api/app-projects/[id]/deploy/github-pages`

**Request Body**:
```json
{
  "githubToken": "ghp_xxx...",
  "repositoryName": "my-project" // optional
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Project deployed to GitHub Pages",
  "repositoryUrl": "https://github.com/username/repo",
  "pagesUrl": "https://username.github.io/repo",
  "repositoryName": "...",
  "instructions": [...]
}
```

#### Step 3: Verify Deployment

1. **Check GitHub Repository**
   - Visit the repository URL from the success message
   - Verify all files are present
   - Check that files match your project

2. **Check GitHub Pages**
   - Go to repository Settings > Pages
   - Verify Pages is enabled
   - Visit the Pages URL (may take a few minutes to build)

3. **Visit Pages URL**
   - Click the Pages URL from the success message
   - Wait a few minutes for GitHub to build
   - Verify the app loads correctly

### Test 5: Error Handling

#### Test Invalid Vercel Token

1. Enter an invalid Vercel token (e.g., "invalid_token")
2. Click "Deploy to Vercel"
3. **Expected**: Error message displayed

#### Test Invalid GitHub Token

1. Enter an invalid GitHub token (e.g., "invalid_token")
2. Click "Deploy to GitHub Pages"
3. **Expected**: Error message displayed

#### Test Missing Tokens

1. Leave token fields empty
2. Try to deploy
3. **Expected**: Error message asking for token

#### Test Unauthorized Access

1. Try to deploy a project you don't own
2. **Expected**: 403 Forbidden error

## 🔍 Manual API Testing

### Using cURL

#### Download Project

```bash
curl -X GET \
  http://localhost:3000/api/app-projects/[PROJECT_ID]/download \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  --output project.zip
```

#### Deploy to Vercel

```bash
curl -X POST \
  http://localhost:3000/api/app-projects/[PROJECT_ID]/deploy/vercel \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{
    "vercelToken": "vercel_xxx...",
    "projectName": "test-project"
  }'
```

#### Deploy to GitHub Pages

```bash
curl -X POST \
  http://localhost:3000/api/app-projects/[PROJECT_ID]/deploy/github-pages \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{
    "githubToken": "ghp_xxx...",
    "repositoryName": "test-project"
  }'
```

### Using Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform deployment action
4. Inspect the API request/response

## 📝 Test Checklist

### Basic Functionality

- [ ] Deployment panel loads correctly
- [ ] Download ZIP works
- [ ] ZIP contains all project files
- [ ] ZIP includes package.json (for React/Next.js)
- [ ] ZIP includes .gitignore

### Vercel Deployment

- [ ] Vercel token validation works
- [ ] Project creation succeeds
- [ ] Success message displays
- [ ] Deployment URL is correct
- [ ] Instructions are shown
- [ ] Error handling works for invalid tokens
- [ ] Error handling works for missing tokens

### GitHub Pages Deployment

- [ ] GitHub token validation works
- [ ] Repository creation succeeds
- [ ] Files are uploaded correctly
- [ ] GitHub Pages is enabled
- [ ] Success message displays
- [ ] Repository URL is correct
- [ ] Pages URL is correct
- [ ] Instructions are shown
- [ ] Error handling works for invalid tokens
- [ ] Error handling works for missing tokens

### Security

- [ ] Unauthorized users cannot deploy projects
- [ ] Users cannot deploy projects they don't own
- [ ] Tokens are not exposed in responses
- [ ] Tokens are not logged

### UI/UX

- [ ] Loading states display correctly
- [ ] Error messages are clear
- [ ] Success messages are informative
- [ ] Links work correctly
- [ ] Responsive design works

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module 'jszip'"

**Solution**:
```bash
pnpm install jszip
```

### Issue: Prisma type errors

**Solution**:
```bash
pnpm prisma generate
```

### Issue: Vercel deployment fails with 401

**Solution**:
- Check that your Vercel token is valid
- Ensure token hasn't expired
- Verify token has correct permissions

### Issue: GitHub Pages deployment fails

**Solution**:
- Check that your GitHub token has `repo` and `workflow` scopes
- Ensure repository name doesn't already exist
- Check GitHub API rate limits

### Issue: Files missing from ZIP

**Solution**:
- Verify project has files
- Check file paths are correct
- Ensure files are saved in database

### Issue: Deployment panel doesn't show

**Solution**:
- Check browser console for errors
- Verify component is imported correctly
- Ensure project is selected

## 📊 Performance Testing

### Test Large Projects

1. Create a project with 50+ files
2. Try to download ZIP
3. **Expected**: ZIP downloads within reasonable time (< 10 seconds)

### Test Concurrent Deployments

1. Open multiple browser tabs
2. Try to deploy same project simultaneously
3. **Expected**: Each deployment succeeds independently

## 🔐 Security Testing

### Test Token Exposure

1. Deploy a project
2. Check browser DevTools Network tab
3. Verify tokens are not in response body
4. **Expected**: Tokens are not exposed

### Test Authorization

1. Create project as User A
2. Try to deploy as User B
3. **Expected**: 403 Forbidden error

## 📚 Additional Resources

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [JSZip Documentation](https://stuk.github.io/jszip/)

## 🎯 Next Steps

After successful testing:

1. ✅ Document any issues found
2. ✅ Create GitHub issues for bugs
3. ✅ Update deployment documentation
4. ✅ Consider adding deployment history tracking
5. ✅ Add deployment status polling
6. ✅ Add support for more deployment platforms (Netlify, etc.)

---

**Need Help?** Check the main [Deployment Guide](./deployment.md) or create an issue on GitHub.






