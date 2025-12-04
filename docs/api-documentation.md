# API Documentation

This document provides comprehensive documentation for Ecosyz's API endpoints.

## 📋 Overview

Ecosyz uses Next.js API routes for backend functionality. All endpoints are RESTful and return JSON responses.

### Base URL
```
https://your-domain.com/api
```

### Authentication
Most endpoints require authentication via Supabase JWT tokens.

```typescript
// Include in request headers
{
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

## 🔐 Authentication Endpoints

### POST /api/auth/signup

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "User created successfully"
}
```

**Error Responses:**
- `400` - Invalid input data
- `409` - User already exists
- `500` - Server error

### POST /api/auth/signin

Authenticate a user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token",
    "expires_at": 1638360000
  }
}
```

### POST /api/auth/signout

Sign out the current user.

**Response (200):**
```json
{
  "message": "Signed out successfully"
}
```

### GET /api/auth/session

Get current user session information.

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "access_token": "jwt-token",
    "expires_at": 1638360000
  }
}
```

### POST /api/auth/reset-password

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

## 🔍 Search Endpoints

### GET /api/search

Search for academic resources across multiple providers.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort order (`relevance`, `date`, `citations`)
- `providers` (optional): Comma-separated list of providers

**Example Request:**
```
GET /api/search?q=machine+learning&limit=10&sort=relevance
```

**Response (200):**
```json
{
  "results": [
    {
      "id": "resource-id",
      "title": "Machine Learning Fundamentals",
      "authors": ["John Smith", "Jane Doe"],
      "abstract": "An introduction to machine learning...",
      "url": "https://example.com/paper",
      "provider": "arxiv",
      "publishedDate": "2023-01-15",
      "citations": 150,
      "score": 0.95
    }
  ],
  "total": 1250,
  "hasMore": true,
  "query": "machine learning",
  "took": 250
}
```

**Supported Providers:**
- `arxiv` - ArXiv preprint server
- `pubmed` - PubMed medical literature
- `crossref` - Crossref DOI registry
- `semantic` - Semantic Scholar
- `youtube` - Educational YouTube videos

### GET /api/search/providers

Get information about available search providers.

**Response (200):**
```json
{
  "providers": [
    {
      "id": "arxiv",
      "name": "ArXiv",
      "description": "Open access preprint server",
      "enabled": true,
      "rateLimit": 1000
    }
  ]
}
```

## 📝 Summarization Endpoints

### POST /api/summarize

Generate AI-powered summaries of academic content.

**Request Body:**
```json
{
  "content": "Full text content to summarize...",
  "url": "https://example.com/paper",
  "type": "research_paper"
}
```

**Response (200):**
```json
{
  "summary": {
    "abstract": "Brief overview of the paper...",
    "keyPoints": [
      "Main finding 1",
      "Main finding 2",
      "Methodology used"
    ],
    "conclusion": "Summary of conclusions...",
    "keywords": ["machine learning", "neural networks"]
  },
  "metadata": {
    "wordCount": 2500,
    "readingTime": 12,
    "confidence": 0.89
  }
}
```

**Supported Content Types:**
- `research_paper` - Academic papers
- `article` - News articles
- `book` - Book chapters
- `video_transcript` - Video transcripts

## 🗂️ Workspace Endpoints

### GET /api/workspaces

Get user's workspaces.

**Query Parameters:**
- `limit` (optional): Number of workspaces (default: 20)
- `offset` (optional): Pagination offset

**Response (200):**
```json
{
  "workspaces": [
    {
      "id": "workspace-id",
      "name": "Machine Learning Research",
      "description": "Collection of ML papers",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "resourceCount": 25,
      "isPublic": false
    }
  ],
  "total": 5
}
```

### POST /api/workspaces

Create a new workspace.

**Request Body:**
```json
{
  "name": "My Research Workspace",
  "description": "Collection of papers for my thesis",
  "isPublic": false
}
```

**Response (201):**
```json
{
  "workspace": {
    "id": "new-workspace-id",
    "name": "My Research Workspace",
    "description": "Collection of papers for my thesis",
    "createdAt": "2024-01-20T15:30:00Z",
    "isPublic": false
  }
}
```

### GET /api/workspaces/[id]

Get workspace details and resources.

**Response (200):**
```json
{
  "workspace": {
    "id": "workspace-id",
    "name": "Machine Learning Research",
    "description": "Collection of ML papers",
    "createdAt": "2024-01-01T00:00:00Z",
    "resourceCount": 25,
    "isPublic": false
  },
  "resources": [
    {
      "id": "resource-id",
      "title": "Deep Learning Paper",
      "addedAt": "2024-01-15T10:30:00Z",
      "notes": "Important paper on neural networks",
      "tags": ["deep-learning", "neural-networks"]
    }
  ]
}
```

### POST /api/workspaces/[id]/resources

Add a resource to a workspace.

**Request Body:**
```json
{
  "resourceId": "resource-id",
  "notes": "Key insights from this paper",
  "tags": ["machine-learning", "computer-vision"]
}
```

**Response (201):**
```json
{
  "resource": {
    "id": "workspace-resource-id",
    "resourceId": "resource-id",
    "workspaceId": "workspace-id",
    "notes": "Key insights from this paper",
    "tags": ["machine-learning", "computer-vision"],
    "addedAt": "2024-01-20T15:30:00Z"
  }
}
```

### DELETE /api/workspaces/[id]/resources/[resourceId]

Remove a resource from a workspace.

**Response (200):**
```json
{
  "message": "Resource removed from workspace"
}
```

## 📊 Analytics Endpoints

### GET /api/analytics/search

Get search analytics for the current user.

**Query Parameters:**
- `period` (optional): Time period (`day`, `week`, `month`, `year`)

**Response (200):**
```json
{
  "searches": [
    {
      "query": "machine learning",
      "count": 15,
      "lastSearched": "2024-01-20T10:00:00Z"
    }
  ],
  "totalSearches": 150,
  "popularTopics": ["machine learning", "neural networks", "deep learning"],
  "period": "month"
}
```

### GET /api/analytics/resources

Get resource analytics.

**Response (200):**
```json
{
  "savedResources": 45,
  "sharedResources": 12,
  "topCategories": [
    { "category": "Computer Science", "count": 25 },
    { "category": "Biology", "count": 15 }
  ],
  "readingTime": 240 // minutes
}
```

## 🔧 Utility Endpoints

### GET /api/health

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T15:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "supabase": "connected"
  }
}
```

## 📋 Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Search requests**: 100 requests per hour
- **Summarization requests**: 50 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638360000
```

## 🚨 Error Handling

All API endpoints follow consistent error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request data
- `AUTHENTICATION_ERROR` - Invalid or missing credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## 🔒 Security

### CORS Configuration

API endpoints include CORS headers for web application access:

```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Input Validation

All inputs are validated using Zod schemas:

```typescript
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});
```

### Data Sanitization

User inputs are sanitized to prevent XSS attacks:
- HTML tags are stripped
- Special characters are escaped
- SQL injection prevention via parameterized queries

## 📊 Monitoring

API performance is monitored with:

- **Response times**: Logged for all endpoints
- **Error rates**: Tracked by endpoint and error type
- **Usage patterns**: Analyzed for optimization opportunities

## 🧪 Testing

API endpoints can be tested using:

```bash
# Run API tests
pnpm test -- api

# Test specific endpoint
curl -X GET "https://your-domain.com/api/health" \
  -H "Authorization: Bearer your-token"
```

---

For SDKs and client libraries, see the [Getting Started](./getting-started.md) guide.