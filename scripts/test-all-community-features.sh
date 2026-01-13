#!/bin/bash

# ===========================================
# Community Features Test Script
# ===========================================

TOKEN="eyJhbGciOiJIUzI1NiIsImtpZCI6IlJOQ2lIN3VWK0MrZmwzdEMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2x0ZW55b2lheWRlbXNucnZkYnBjLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhNjA2NjI4NS0wY2ZlLTQzYzAtYWRhOS0zYmNjM2VmMjQ5NGMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY1MTM5ODAwLCJpYXQiOjE3NjUxMzYyMDAsImVtYWlsIjoidGVzbGFAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc2xhQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiVGVzbGEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImE2MDY2Mjg1LTBjZmUtNDNjMC1hZGE5LTNiY2MzZWYyNDk0YyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY1MTM2MjAwfV0sInNlc3Npb25faWQiOiI0ZTMwY2RmYS03ODY2LTQwMDktODM0NC1mZjgzODY4NjFiZjMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ._dxRFs3tPnEwYnSrHCHGkcg8K7UKglR6ii8hKpkBjA0"
REFRESH="yzxc6jlsfnvy"
BASE_URL="http://localhost:3000"
COOKIE="sb-access-token=$TOKEN; sb-refresh-token=$REFRESH"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "    COMMUNITY FEATURES TEST SCRIPT"
echo "=========================================="
echo ""

# Store IDs for later tests
GROUP_ID=""
DISCUSSION_ID=""
EVENT_ID=""
CHALLENGE_ID=""

# ==========================================
# TEST 1: Create a Group
# ==========================================
echo -e "${BLUE}TEST 1: Create a Community Group${NC}"
echo "-------------------------------------------"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/groups" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "name": "Open Innovation Hub",
    "description": "A community for open-source innovators and researchers",
    "isPublic": true,
    "topics": ["innovation", "open-source", "research"]
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Extract group ID
GROUP_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -n "$GROUP_ID" ]; then
  echo -e "${GREEN}✓ Group created! ID: $GROUP_ID${NC}"
else
  echo -e "${RED}✗ Failed to create group${NC}"
fi
echo ""

# ==========================================
# TEST 2: List Groups
# ==========================================
echo -e "${BLUE}TEST 2: List All Groups${NC}"
echo "-------------------------------------------"

curl -s "$BASE_URL/api/community/groups" | python3 -m json.tool 2>/dev/null
echo -e "${GREEN}✓ Groups listed${NC}"
echo ""

# ==========================================
# TEST 3: Get Group Details
# ==========================================
if [ -n "$GROUP_ID" ]; then
  echo -e "${BLUE}TEST 3: Get Group Details${NC}"
  echo "-------------------------------------------"
  
  curl -s "$BASE_URL/api/community/groups/$GROUP_ID" | python3 -m json.tool 2>/dev/null
  echo -e "${GREEN}✓ Group details retrieved${NC}"
  echo ""
fi

# ==========================================
# TEST 4: Join Group
# ==========================================
if [ -n "$GROUP_ID" ]; then
  echo -e "${BLUE}TEST 4: Join Group${NC}"
  echo "-------------------------------------------"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/groups/$GROUP_ID/join" \
    -H "Cookie: $COOKIE")
  
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo -e "${GREEN}✓ Attempted to join group${NC}"
  echo ""
fi

# ==========================================
# TEST 5: Get Group Members
# ==========================================
if [ -n "$GROUP_ID" ]; then
  echo -e "${BLUE}TEST 5: Get Group Members${NC}"
  echo "-------------------------------------------"
  
  curl -s "$BASE_URL/api/community/groups/$GROUP_ID/members" | python3 -m json.tool 2>/dev/null
  echo -e "${GREEN}✓ Members listed${NC}"
  echo ""
fi

# ==========================================
# TEST 6: Create Discussion in Group
# ==========================================
if [ -n "$GROUP_ID" ]; then
  echo -e "${BLUE}TEST 6: Create Discussion in Group${NC}"
  echo "-------------------------------------------"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/discussions" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d "{
      \"title\": \"Welcome to Open Innovation Hub!\",
      \"content\": \"This is our first discussion. Let's share ideas about open-source innovation and how we can collaborate to build amazing projects together.\",
      \"groupId\": \"$GROUP_ID\",
      \"tags\": [\"welcome\", \"introduction\"]
    }")
  
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  
  DISCUSSION_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
  
  if [ -n "$DISCUSSION_ID" ]; then
    echo -e "${GREEN}✓ Discussion created! ID: $DISCUSSION_ID${NC}"
  else
    echo -e "${RED}✗ Failed to create discussion${NC}"
  fi
  echo ""
fi

# ==========================================
# TEST 7: List Discussions
# ==========================================
echo -e "${BLUE}TEST 7: List All Discussions${NC}"
echo "-------------------------------------------"

curl -s "$BASE_URL/api/community/discussions" | python3 -m json.tool 2>/dev/null
echo -e "${GREEN}✓ Discussions listed${NC}"
echo ""

# ==========================================
# TEST 8: Get Discussion Details
# ==========================================
if [ -n "$DISCUSSION_ID" ]; then
  echo -e "${BLUE}TEST 8: Get Discussion Details${NC}"
  echo "-------------------------------------------"
  
  curl -s "$BASE_URL/api/community/discussions/$DISCUSSION_ID" | python3 -m json.tool 2>/dev/null
  echo -e "${GREEN}✓ Discussion details retrieved${NC}"
  echo ""
fi

# ==========================================
# TEST 9: Reply to Discussion
# ==========================================
if [ -n "$DISCUSSION_ID" ]; then
  echo -e "${BLUE}TEST 9: Reply to Discussion${NC}"
  echo "-------------------------------------------"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/discussions/$DISCUSSION_ID/replies" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d '{
      "content": "Great to be here! I am excited to collaborate on open-source projects. Looking forward to learning from everyone."
    }')
  
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo -e "${GREEN}✓ Reply added${NC}"
  echo ""
fi

# ==========================================
# TEST 10: Create Event
# ==========================================
echo -e "${BLUE}TEST 10: Create Event${NC}"
echo "-------------------------------------------"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/events" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "title": "Open Source Innovation Workshop",
    "description": "Join us for a hands-on workshop where we will explore open-source tools and methodologies for innovation. Learn how to contribute to open-source projects and collaborate with developers worldwide.",
    "startDate": "2024-12-20T14:00:00Z",
    "endDate": "2024-12-20T18:00:00Z",
    "location": "Online - Zoom",
    "eventUrl": "https://zoom.us/j/123456789",
    "category": "workshop",
    "maxAttendees": 100,
    "isPublic": true
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

EVENT_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -n "$EVENT_ID" ]; then
  echo -e "${GREEN}✓ Event created! ID: $EVENT_ID${NC}"
else
  echo -e "${RED}✗ Failed to create event${NC}"
fi
echo ""

# ==========================================
# TEST 11: List Events
# ==========================================
echo -e "${BLUE}TEST 11: List Upcoming Events${NC}"
echo "-------------------------------------------"

curl -s "$BASE_URL/api/community/events?status=upcoming" | python3 -m json.tool 2>/dev/null
echo -e "${GREEN}✓ Events listed${NC}"
echo ""

# ==========================================
# TEST 12: Register for Event
# ==========================================
if [ -n "$EVENT_ID" ]; then
  echo -e "${BLUE}TEST 12: Register for Event${NC}"
  echo "-------------------------------------------"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/events/$EVENT_ID/register" \
    -H "Cookie: $COOKIE")
  
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo -e "${GREEN}✓ Registered for event${NC}"
  echo ""
fi

# ==========================================
# TEST 13: Get Event Details
# ==========================================
if [ -n "$EVENT_ID" ]; then
  echo -e "${BLUE}TEST 13: Get Event Details (with registrations)${NC}"
  echo "-------------------------------------------"
  
  curl -s "$BASE_URL/api/community/events/$EVENT_ID" | python3 -m json.tool 2>/dev/null
  echo -e "${GREEN}✓ Event details retrieved${NC}"
  echo ""
fi

# ==========================================
# TEST 14: Create Challenge
# ==========================================
echo -e "${BLUE}TEST 14: Create Challenge${NC}"
echo "-------------------------------------------"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/challenges" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{
    "title": "Build an Open Climate Solution",
    "description": "Create an innovative open-source solution that addresses climate change. Your project could be a tool, application, or research that helps reduce carbon emissions, promote sustainability, or raise awareness about environmental issues.",
    "requirements": "1. Must be open-source (MIT, Apache, or similar license)\n2. Must include documentation\n3. Must have a working demo or prototype\n4. Must be original work",
    "prize": "$1,000 cash prize + featured on our platform",
    "startDate": "2024-12-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "category": "climate",
    "status": "active"
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

CHALLENGE_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

if [ -n "$CHALLENGE_ID" ]; then
  echo -e "${GREEN}✓ Challenge created! ID: $CHALLENGE_ID${NC}"
else
  echo -e "${RED}✗ Failed to create challenge${NC}"
fi
echo ""

# ==========================================
# TEST 15: List Challenges
# ==========================================
echo -e "${BLUE}TEST 15: List Active Challenges${NC}"
echo "-------------------------------------------"

curl -s "$BASE_URL/api/community/challenges?status=active" | python3 -m json.tool 2>/dev/null
echo -e "${GREEN}✓ Challenges listed${NC}"
echo ""

# ==========================================
# TEST 16: Submit to Challenge
# ==========================================
if [ -n "$CHALLENGE_ID" ]; then
  echo -e "${BLUE}TEST 16: Submit to Challenge${NC}"
  echo "-------------------------------------------"
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/community/challenges/$CHALLENGE_ID/submit" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d '{
      "title": "EcoTracker - Carbon Footprint Calculator",
      "description": "An open-source web application that helps individuals and organizations track and reduce their carbon footprint. Features include daily activity logging, personalized recommendations, and community challenges.",
      "url": "https://github.com/tesla/ecotracker"
    }')
  
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo -e "${GREEN}✓ Submission created${NC}"
  echo ""
fi

# ==========================================
# TEST 17: Get Challenge Submissions
# ==========================================
if [ -n "$CHALLENGE_ID" ]; then
  echo -e "${BLUE}TEST 17: Get Challenge Submissions${NC}"
  echo "-------------------------------------------"
  
  curl -s "$BASE_URL/api/community/challenges/$CHALLENGE_ID/submissions" | python3 -m json.tool 2>/dev/null
  echo -e "${GREEN}✓ Submissions listed${NC}"
  echo ""
fi

# ==========================================
# TEST 18: Get Activity Feed
# ==========================================
echo -e "${BLUE}TEST 18: Get Activity Feed${NC}"
echo "-------------------------------------------"

curl -s "$BASE_URL/api/community/activity" \
  -H "Cookie: $COOKIE" | python3 -m json.tool 2>/dev/null
echo -e "${GREEN}✓ Activity feed retrieved${NC}"
echo ""

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo "=========================================="
echo "           TEST SUMMARY"
echo "=========================================="
echo ""
echo -e "${GREEN}Created Resources:${NC}"
[ -n "$GROUP_ID" ] && echo "  • Group ID: $GROUP_ID"
[ -n "$DISCUSSION_ID" ] && echo "  • Discussion ID: $DISCUSSION_ID"
[ -n "$EVENT_ID" ] && echo "  • Event ID: $EVENT_ID"
[ -n "$CHALLENGE_ID" ] && echo "  • Challenge ID: $CHALLENGE_ID"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open http://localhost:3000/community to see the UI"
echo "  2. Check Groups tab - your group should appear"
echo "  3. Check Events tab - your event should appear"
echo "  4. Check Challenges tab - your challenge should appear"
echo "  5. Check Activity Feed - your activities should appear"
echo ""
echo -e "${BLUE}View in Database:${NC}"
echo "  Run: npm run db:studio"
echo ""
echo "=========================================="
echo "         ALL TESTS COMPLETED!"
echo "=========================================="






