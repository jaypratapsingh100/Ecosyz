#!/bin/bash

# Test Analytics Endpoints
# Make sure your server is running on http://localhost:3001

BASE_URL="http://localhost:3001"

echo "Testing Analytics Endpoints..."
echo ""

# Test 1: Track Page Visit
echo "1. Testing /api/analytics/track/visit"
curl -X POST "${BASE_URL}/api/analytics/track/visit" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/test-page",
    "referrer": "https://example.com",
    "userAgent": "Mozilla/5.0",
    "sessionId": "test-session-123"
  }'
echo ""
echo ""

# Test 2: Track Search
echo "2. Testing /api/analytics/track/search"
curl -X POST "${BASE_URL}/api/analytics/track/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test query",
    "resourceType": "paper",
    "clicked": true,
    "clickedResourceId": "test-resource-id",
    "providers": ["provider1", "provider2"],
    "sessionId": "test-session-123"
  }'
echo ""
echo ""

# Test 3: Track Resource View
echo "3. Testing /api/analytics/track/resource-view"
curl -X POST "${BASE_URL}/api/analytics/track/resource-view" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "test-resource-id",
    "workspaceId": "test-workspace-id",
    "sessionId": "test-session-123"
  }'
echo ""
echo ""

echo "Done!"
