#!/bin/bash

# Replace YOUR_VERCEL_URL with your actual Vercel deployment URL
# Replace YOUR_AUTH_TOKEN with your actual authentication token
VERCEL_URL="YOUR_VERCEL_URL"
AUTH_TOKEN="YOUR_AUTH_TOKEN"

echo "Testing Workspace APIs on Vercel"
echo "================================="

# Headers for authenticated requests
HEADERS="-H 'Content-Type: application/json' -H 'Authorization: Bearer $AUTH_TOKEN'"

echo "1. GET /api/workspaces - List all workspaces"
curl -X GET "$VERCEL_URL/api/workspaces" $HEADERS
echo -e "\n\n"

echo "2. POST /api/workspaces - Create a workspace"
curl -X POST "$VERCEL_URL/api/workspaces" $HEADERS \
  -d '{"name": "Test Workspace", "description": "Testing workspace creation"}'
echo -e "\n\n"

# Note: Replace WORKSPACE_ID with an actual workspace ID from the previous response
WORKSPACE_ID="REPLACE_WITH_ACTUAL_WORKSPACE_ID"

echo "3. GET /api/workspaces/$WORKSPACE_ID - Get specific workspace"
curl -X GET "$VERCEL_URL/api/workspaces/$WORKSPACE_ID" $HEADERS
echo -e "\n\n"

echo "4. PATCH /api/workspaces/$WORKSPACE_ID - Update workspace"
curl -X PATCH "$VERCEL_URL/api/workspaces/$WORKSPACE_ID" $HEADERS \
  -d '{"name": "Updated Test Workspace", "description": "Updated description"}'
echo -e "\n\n"

echo "5. GET /api/workspaces/$WORKSPACE_ID/resources - List resources"
curl -X GET "$VERCEL_URL/api/workspaces/$WORKSPACE_ID/resources" $HEADERS
echo -e "\n\n"

echo "6. POST /api/workspaces/$WORKSPACE_ID/resources - Add resource"
curl -X POST "$VERCEL_URL/api/workspaces/$WORKSPACE_ID/resources" $HEADERS \
  -d '{"url": "https://example.com", "title": "Test Resource", "description": "A test resource"}'
echo -e "\n\n"

# Note: Replace RESOURCE_ID with an actual resource ID from the previous response
RESOURCE_ID="REPLACE_WITH_ACTUAL_RESOURCE_ID"

echo "7. GET /api/workspaces/$WORKSPACE_ID/share - Get share info"
curl -X GET "$VERCEL_URL/api/workspaces/$WORKSPACE_ID/share" $HEADERS
echo -e "\n\n"

echo "8. POST /api/workspaces/$WORKSPACE_ID/share - Share workspace"
curl -X POST "$VERCEL_URL/api/workspaces/$WORKSPACE_ID/share" $HEADERS \
  -d '{"email": "test@example.com", "permission": "read"}'
echo -e "\n\n"

echo "9. GET /api/resources/$RESOURCE_ID/annotations - Get annotations"
curl -X GET "$VERCEL_URL/api/resources/$RESOURCE_ID/annotations" $HEADERS
echo -e "\n\n"

echo "10. POST /api/resources/$RESOURCE_ID/annotations - Create annotation"
curl -X POST "$VERCEL_URL/api/resources/$RESOURCE_ID/annotations" $HEADERS \
  -d '{"body": "This is a test annotation", "highlights": ["highlight1", "highlight2"]}'
echo -e "\n\n"

echo "11. DELETE /api/resources/$RESOURCE_ID - Delete resource"
curl -X DELETE "$VERCEL_URL/api/resources/$RESOURCE_ID" $HEADERS
echo -e "\n\n"

echo "12. DELETE /api/workspaces/$WORKSPACE_ID - Delete workspace"
curl -X DELETE "$VERCEL_URL/api/workspaces/$WORKSPACE_ID" $HEADERS
echo -e "\n\n"

echo "API Testing Complete!"