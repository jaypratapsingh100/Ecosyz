#!/bin/bash

# Community Features API Testing Script
# Usage: ./scripts/test-community-apis.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
echo "Testing Community APIs at: $BASE_URL"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}Error: Server is not running at $BASE_URL${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo -e "${GREEN}Server is running!${NC}\n"

# Test 1: List Groups (Public endpoint)
echo -e "${YELLOW}Test 1: List Public Groups${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/community/groups")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Groups endpoint working (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.groups | length' 2>/dev/null && echo " groups found" || echo "Response: $BODY"
else
    echo -e "${RED}✗ Groups endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: List Events
echo -e "${YELLOW}Test 2: List Events${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/community/events?status=upcoming")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Events endpoint working (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.events | length' 2>/dev/null && echo " events found" || echo "Response: $BODY"
else
    echo -e "${RED}✗ Events endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: List Challenges
echo -e "${YELLOW}Test 3: List Challenges${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/community/challenges?status=active")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Challenges endpoint working (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.challenges | length' 2>/dev/null && echo " challenges found" || echo "Response: $BODY"
else
    echo -e "${RED}✗ Challenges endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 4: List Discussions (requires workspaceId or groupId)
echo -e "${YELLOW}Test 4: List Discussions${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/community/discussions")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Discussions endpoint working (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.discussions | length' 2>/dev/null && echo " discussions found" || echo "Response: $BODY"
else
    echo -e "${RED}✗ Discussions endpoint failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

echo -e "${GREEN}=========================================="
echo "Basic API Tests Complete!"
echo "==========================================${NC}"
echo ""
echo "Note: To test authenticated endpoints (create, update, delete),"
echo "you need to:"
echo "1. Sign in via the browser"
echo "2. Get your session cookie from DevTools"
echo "3. Use it in curl commands like:"
echo ""
echo "curl -X POST '$BASE_URL/api/community/groups' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: sb-access-token=YOUR_TOKEN' \\"
echo "  -d '{\"name\": \"Test Group\", \"isPublic\": true}'"
echo ""
echo "See docs/COMMUNITY_TESTING_GUIDE.md for detailed testing instructions."

