# 🧪 OpenIdea API Testing Guide

## 📋 Complete API Endpoints Overview

### 🔐 **Authentication APIs**
- `GET /api/auth/me` - Get current user
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signup` - User sign up
- `POST /api/auth/signout` - User sign out
- `POST /api/auth/callback` - OAuth callback
- `POST /api/auth/reset-password` - Password reset

### 🔍 **Search & Discovery APIs**
- `GET /api/search` - Federated search across multiple providers
- `POST /api/summarize` - AI-powered text summarization
- `GET /api/resources/[id]` - Get specific resource
- `POST /api/resources/[id]/annotations` - Add annotations

### 🏢 **Workspace & Project APIs**
- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/[id]` - Get workspace details
- `PUT /api/workspaces/[id]` - Update workspace
- `DELETE /api/workspaces/[id]` - Delete workspace
- `GET /api/workspaces/[id]/resources` - Get workspace resources
- `POST /api/workspaces/[id]/resources` - Add resource to workspace

### 💻 **Project Management APIs**
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create project
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### 🤖 **AI & Generation APIs**
- `POST /api/generate` - Generate applications from resources
- `POST /api/openhands` - OpenHands AI development
- `GET /api/openhands` - Get OpenHands status

### 🎨 **Design & Integration APIs**
- `POST /api/figma` - Import Figma designs
- `GET /api/figma` - Get Figma integration status

### 👤 **Profile & User APIs**
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### 💳 **Payment APIs**
- `POST /api/payments` - Process payments
- `GET /api/payments/status` - Payment status

### 🚀 **Deployment APIs**
- `POST /api/deploy/vercel` - Deploy to Vercel
- `POST /api/github` - GitHub integration

---

## 🧪 Testing Strategy

### Phase 1: Authentication Testing
### Phase 2: Search & Discovery Testing
### Phase 3: Workspace & Project Testing
### Phase 4: AI Features Testing
### Phase 5: Integration Testing
### Phase 6: UI Enhancement

---

## 📊 Test Results Tracking

| API Endpoint | Status | Response Time | Notes |
|--------------|--------|---------------|-------|
| GET /api/auth/me | ⏳ Pending | - | - |
| GET /api/search | ⏳ Pending | - | - |
| POST /api/generate | ⏳ Pending | - | - |
| GET /api/workspaces | ⏳ Pending | - | - |

---

## 🎯 Success Criteria
- ✅ All APIs return proper HTTP status codes
- ✅ Response times under 2 seconds
- ✅ Proper error handling and validation
- ✅ Authentication working correctly
- ✅ UI is minimalistic and systematic
