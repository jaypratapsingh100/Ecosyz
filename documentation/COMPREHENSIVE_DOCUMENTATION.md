# Ecosyz-Search Comprehensive Documentation

**Last Updated:** December 2024  
**Branch:** develop

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Code Issues Report](#code-issues-report)
3. [Header Grey Issue & Solution](#header-grey-issue--solution)
4. [Main vs Develop Branch Comparison](#main-vs-develop-branch-comparison)
5. [Commit Summary](#commit-summary)
6. [API Testing Guide](#api-testing-guide)

---

# Project Overview

## OpenIdea

OpenIdea brings together open research, code, data, and designs to help innovators collaborate and build on each other's work.

### Requirements

- Node.js **18** or later (see `.nvmrc`)

### Setup

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Documentation

- Summarization design and API: see [`docs/summarization.md`](docs/summarization.md)
- Additional guides covering setup, contributing, and design choices are available in the [docs](.github/docs/README.md) directory.

### Contributing

Pull requests are welcome. By contributing you agree to the terms of the MIT License.

### License

This project is released under the [MIT License](LICENSE).

---

# Code Issues Report

## 🔴 Critical Issues

### 1. Missing Dependencies
- **Neo4j driver not installed**: The code imports Neo4j but `neo4j-driver` is not in `package.json`
- **Missing type definitions**: May need `@types/neo4j-driver` if using TypeScript

### 2. Missing Module Files
- **`app/lib/graph/neo4j-client.ts`**: Referenced but doesn't exist
  - Used in: `app/api/graph/build/route.ts`, `app/api/graph/expand/route.ts`, `app/api/graph/subgraph/route.ts`
- **`app/lib/utils/rate-limit.ts`**: Referenced but doesn't exist
  - Used in: `app/api/graph/build/route.ts`

## 🟡 TypeScript & Linting Issues

### 3. Excessive Use of `any` Type (50+ instances)
**Files with `any` types:**
- `app/api/graph/build/route.ts` - 3 instances
- `app/api/graph/expand/route.ts` - 6 instances
- `app/api/graph/subgraph/route.ts` - 6 instances
- `app/api/summarize/route.ts` - 30+ instances
- `app/api/search/route.ts` - 2 instances
- `app/api/search/providers/openalex.ts` - 1 instance
- `app/api/search/providers/zenodo.ts` - 1 instance
- `app/components/BetaAccessForm.tsx` - 1 instance
- `app/components/PayPalPayment.tsx` - 2 instances

**Impact**: Loss of type safety, potential runtime errors, harder to maintain

### 4. Unused Variables (15+ instances)
**Files with unused variables:**
- `app/api/payments/webhook/route.ts`: `planType`, `userEmail`
- `app/api/search/lib/dedupe.ts`: `setA`
- `app/api/search/providers/arxiv.ts`: `error` (catch block)
- `app/api/search/providers/github.ts`: `error` (catch block)
- `app/api/search/providers/huggingface.ts`: `error` (catch block)
- `app/api/search/providers/openalex.ts`: `error` (catch block)
- `app/api/search/providers/swh.ts`: `error` (catch block)
- `app/api/search/providers/zenodo.ts`: `error` (catch block)
- `app/api/summarize/route.ts`: `sentences`, `e` (2 instances)
- `app/auth/reset-password/page.tsx`: `setValue`
- `app/components/AuthModal.tsx`: `router`, `error` (2 instances)
- `app/components/BetaAccessForm.tsx`: `message`
- `app/components/PayPalPayment.tsx`: `session`

**Impact**: Code clutter, potential bugs, confusion for developers

### 5. React/JSX Issues
- `app/auth/page.tsx`: Unescaped apostrophe character (line 506)
  - Should use `&apos;` or `&rsquo;` instead of `'`

## 🟠 Code Quality Issues

### 6. Console Statements (89 instances)
**Files with console.log/error/warn:**
- 40+ files across the codebase
- Should be replaced with proper logging solution or removed for production

**Impact**: 
- Performance overhead
- Security concerns (may leak sensitive info)
- Not suitable for production

### 7. Error Handling Issues
- Many catch blocks catch errors but don't use them
- Inconsistent error response formats
- Some errors may be swallowed silently

### 8. TypeScript Compilation Errors
- `.next/types/` directory has many module resolution errors
- These are likely build artifacts but indicate potential issues

## 📋 Summary by Severity

### Must Fix (Blocks Functionality)
1. ✅ Install Neo4j driver dependency
2. ✅ Create `app/lib/graph/neo4j-client.ts`
3. ✅ Create `app/lib/utils/rate-limit.ts`

### Should Fix (Code Quality)
4. ✅ Replace `any` types with proper types (50+ instances)
5. ✅ Remove/fix unused variables (15+ instances)
6. ✅ Fix React unescaped entities

### Nice to Fix (Best Practices)
7. ✅ Replace console statements with proper logging
8. ✅ Improve error handling consistency
9. ✅ Clean up TypeScript build errors

## 🔧 Recommended Fix Order

1. **First**: Create missing modules (neo4j-client, rate-limit)
2. **Second**: Install missing dependencies (neo4j-driver)
3. **Third**: Fix TypeScript `any` types in critical paths
4. **Fourth**: Remove unused variables
5. **Fifth**: Fix React/JSX issues
6. **Last**: Replace console statements with proper logging

## 📊 Statistics

- **Total Linting Errors**: 60+
- **TypeScript Errors**: 100+ (including build artifacts)
- **Missing Files**: 2
- **Missing Dependencies**: 1
- **Console Statements**: 89
- **Unused Variables**: 15+
- **`any` Types**: 50+

---

# Header Grey Issue & Solution

## Problem
The header appears grey on some laptops instead of the intended glassmorphism effect.

## Root Cause
The header uses the `.glass` CSS class which relies on `backdrop-filter: blur()` for the glass effect. When this CSS feature is:
- Not supported by the browser
- Disabled for performance reasons
- Blocked by hardware acceleration settings
- Not working due to browser flags

The fallback background color `rgba(17, 25, 40, 0.35)` appears as a solid grey.

## Solution Implemented

### CSS Changes
- Removed `backdrop-filter` dependency
- Changed `.glass` class to use solid dark background: `rgba(13, 15, 17, 0.98)`
- Ensures consistent appearance across all devices and browsers

### Result
- ✅ Header now appears dark (matches theme) on all devices
- ✅ No more grey header issue
- ✅ Consistent UI across Mac, Windows, Linux
- ✅ Works in Chrome, Firefox, Safari, Edge

## How to Replicate the Issue (For Testing)

### Method 1: Direct CSS Override in DevTools (EASIEST)

1. Open Chrome DevTools (`Cmd + Option + I`)
2. Right-click on header → Inspect
3. Find `.glass` class in Styles panel
4. Uncheck `backdrop-filter` property
5. Header will immediately turn grey

### Method 2: Using Console

```javascript
document.querySelector('header.glass').style.backdropFilter = 'none';
document.querySelector('header.glass').style.webkitBackdropFilter = 'none';
```

### Method 3: Disable Hardware Acceleration

1. Chrome Settings → Advanced → System
2. Turn off "Use hardware acceleration when available"
3. Relaunch Chrome

## Testing Checklist

- [x] Test in Chrome with backdrop-filter disabled
- [x] Test in Firefox
- [x] Test in Safari
- [x] Test with hardware acceleration disabled
- [x] Test on different screen resolutions
- [x] Verify consistent dark header across all browsers

---

# Main vs Develop Branch Comparison

## What's in MAIN but NOT in DEVELOP

### 1. Header Navigation Tabs
**Main has:**
- 7 navigation tabs: About, Resources, Projects, Community, Whitepaper, Pricing, Docs

**Develop has:**
- 5 navigation tabs: Resources, Projects, Community, Whitepaper, Pricing
- ❌ Missing: "About" tab
- ❌ Missing: "Docs" tab

### 2. Package Lock File
**Main has:**
- `package-lock.json` (npm lock file)

**Develop has:**
- ❌ Removed `package-lock.json` (using pnpm instead)
- ✅ Has `pnpm-lock.yaml`

### 3. Logo Files
**Main has:**
- `public/eco.png` (old logo)

**Develop has:**
- ✅ `public/logo.png` (new ECOSYZ logo)
- ❌ Missing: `public/eco.png` (replaced with new logo)

### 4. CSS Styling
**Main has:**
- `.glass` class with `backdrop-filter` (translucent glass effect)
- May appear grey on some devices

**Develop has:**
- ✅ `.glass` class with solid dark background (consistent across all devices)
- ✅ Fixed grey header issue

## What's in DEVELOP but NOT in MAIN

### 1. Knowledge Graph Features ✅
**Develop has:**
- `app/components/KnowledgeGraph.tsx` - Main knowledge graph component
- `app/components/graph/KnowledgeGraphViewer.tsx` - Graph viewer component
- `app/api/graph/health/route.ts` - Health check endpoint
- `app/api/graph/query/route.ts` - Graph query endpoint
- `app/api/graph/expand/route.ts` - Graph expansion endpoint
- `app/api/graph/subgraph/route.ts` - Subgraph extraction endpoint
- `app/lib/graph/neo4j-client.ts` - Neo4j database client
- `app/lib/graph/entity-extractor.ts` - Entity extraction utility

**Main has:**
- ❌ None of these knowledge graph files

### 2. Configuration Files
**Develop has:**
- `env.neo4j.example` - Neo4j environment variables example
- `types/cytoscape-cola.d.ts` - TypeScript definitions
- `types/cytoscape-navigator.d.ts` - TypeScript definitions

**Main has:**
- ❌ None of these files

## Summary

### Missing from Develop (that Main has):
1. ❌ **"About" tab** in header navigation
2. ❌ **"Docs" tab** in header navigation  
3. ❌ **package-lock.json** file (intentionally removed)
4. ❌ **Old logo** (`eco.png` - replaced with new logo)

### Added to Develop (that Main doesn't have):
1. ✅ **Knowledge Graph** - Complete implementation with components and API routes
2. ✅ **New Logo** - Updated ECOSYZ logo
3. ✅ **Fixed Header** - Consistent dark background (no grey issue)
4. ✅ **Neo4j Integration** - Database client and configuration
5. ✅ **Graph API Routes** - Health, query, expand, subgraph endpoints

---

# Commit Summary

## Commits Made in Develop Branch

### Commit 1: Knowledge Graph Features
**Commit:** `cc9ad30`
```bash
feat: add knowledge graph components and API routes

- Add KnowledgeGraph component with Cytoscape integration
- Add graph API routes (health, query)
- Add Neo4j client for graph database connectivity
- Add KnowledgeGraphViewer component
```

**Files Changed:** 5 files, 721 insertions

### Commit 2: UI Consistency & Logo Update
**Commit:** `e4a54c4`
```bash
feat: update logo and improve UI consistency

- Replace logo with new ECOSYZ logo (logo.png)
- Remove About and Docs tabs from header (5 tabs total)
- Fix header grey issue by removing backdrop-filter dependency
- Ensure consistent dark header across all devices/browsers
- Remove extra circle styling from footer logo
```

**Files Changed:** 4 files, 19 insertions, 52 deletions

### Commit 3: Graph API Routes
**Commit:** `eb44604`
```bash
feat: add graph expansion and subgraph API routes

- Add expand route for graph node expansion
- Add subgraph route for subgraph extraction
- Add entity extractor utility for knowledge graph
```

**Files Changed:** 3 files, 183 insertions

### Commit 4: Configuration & Types
**Commit:** `76904b9`
```bash
chore: add Neo4j config example and TypeScript definitions

- Add Neo4j environment variables example file
- Add Cytoscape type definitions for TypeScript support
- Update pnpm lock file and remove npm lock file
```

**Files Changed:** 5 files, 1101 insertions, 9958 deletions

## Current Status

All code changes have been committed to the `develop` branch. The branch is ahead of `main` with:
- Knowledge graph implementation
- Logo updates
- UI consistency fixes
- Neo4j integration

---

# API Testing Guide

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The server will run on `http://localhost:3000` (or the port shown in the terminal)

## Authentication API Endpoints

### 1. User Registration (Sign Up)

```bash
curl -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

### 2. User Authentication (Sign In)

```bash
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }' \
  -c cookies.txt
```

**Note:** The `-c cookies.txt` flag saves session cookies for subsequent requests.

### 3. Get Current Session

```bash
curl -X GET "http://localhost:3000/api/auth/session" \
  -b cookies.txt
```

### 4. Get User Profile

```bash
curl -X GET "http://localhost:3000/api/profile" \
  -b cookies.txt
```

### 5. Update User Profile

```bash
curl -X PUT "http://localhost:3000/api/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "displayName": "Updated Test User",
    "bio": "This is my updated bio",
    "preferences": {
      "theme": "dark",
      "language": "en-IN",
      "emailNotifications": true,
      "marketingEmails": false
    }
  }'
```

### 6. Upload/Update Avatar

```bash
curl -X PUT "http://localhost:3000/api/profile/avatar" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "avatarUrl": "https://example.com/my-avatar.jpg"
  }'
```

### 7. Sign Out

```bash
curl -X POST "http://localhost:3000/api/auth/signout" \
  -b cookies.txt
```

### 8. Delete User Account

```bash
curl -X DELETE "http://localhost:3000/api/auth/delete" \
  -b cookies.txt
```

**Note:** This endpoint requires authentication and will permanently delete the user account from both Supabase and the local database.

### 9. Password Reset

#### Request Password Reset
```bash
curl -X POST "http://localhost:3000/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### Update Password
```bash
curl -X POST "http://localhost:3000/api/auth/update-password" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "password": "newpassword123"
  }'
```

## OAuth Providers

### Google OAuth
```bash
curl -X GET "http://localhost:3000/api/auth/google"
```

### GitHub OAuth
```bash
curl -X GET "http://localhost:3000/api/auth/github"
```

## Automated Testing Script

Run the comprehensive test script:

```bash
./test-auth-apis.sh
```

This script will:
- Test all endpoints in sequence
- Save cookies automatically
- Show responses for each API call
- Clean up cookies after testing

## Expected Responses

### Successful Sign Up
```json
{
  "user": {
    "id": "user-uuid",
    "email": "test@example.com",
    "user_metadata": {
      "name": "Test User"
    }
  }
}
```

### Successful Sign In
```json
{
  "user": {
    "id": "user-uuid",
    "email": "test@example.com"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

### Successful Profile Update
```json
{
  "id": "profile-uuid",
  "userId": "user-uuid",
  "displayName": "Updated Test User",
  "bio": "This is my updated bio",
  "preferences": {
    "theme": "dark",
    "language": "en-IN",
    "emailNotifications": true
  }
}
```

## Error Responses

### Authentication Required
```json
{
  "error": "Not authenticated"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "details": [...]
}
```

## Troubleshooting

1. **"Not authenticated" errors**: Make sure you're using `-b cookies.txt` and that the user is signed in
2. **Foreign key constraint errors**: The `ensureUserInDb` function should prevent these
3. **Port issues**: Check that the server is running on the correct port (usually 3000)
4. **Cookie issues**: Delete `cookies.txt` and sign in again if cookies become invalid

---

## Additional Resources

- **Main Documentation**: See `docs/` directory for detailed API documentation
- **Architecture**: See `docs/architecture.md`
- **Database Schema**: See `docs/database-schema.md`
- **Deployment Guide**: See `docs/deployment.md`

---

**End of Documentation**

