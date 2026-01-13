#!/bin/bash

# Local Authentication Testing Script
# This script helps you test authentication locally without OAuth

BASE_URL="http://localhost:3000"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="test123"
TEST_NAME="Test User"

echo "🧪 Local Authentication Testing"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
    echo "Please start the dev server: pnpm dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Step 1: Sign Up
echo "Step 1: Creating test account..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\"
  }")

if echo "$SIGNUP_RESPONSE" | grep -q "error"; then
    if echo "$SIGNUP_RESPONSE" | grep -q "already registered"; then
        echo -e "${YELLOW}⚠️  Account already exists, proceeding to sign in...${NC}"
    else
        echo -e "${RED}❌ Sign up failed:${NC}"
        echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Account created successfully${NC}"
fi
echo ""

# Step 2: Sign In
echo "Step 2: Signing in..."
SIGNIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$SIGNIN_RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Sign in failed:${NC}"
    echo "$SIGNIN_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Signed in successfully${NC}"
echo ""

# Step 3: Test Session
echo "Step 3: Testing session..."
SESSION_RESPONSE=$(curl -s -b cookies.txt "$BASE_URL/api/auth/session")

if echo "$SESSION_RESPONSE" | grep -q "user"; then
    echo -e "${GREEN}✅ Session is valid${NC}"
    echo "$SESSION_RESPONSE" | jq '.' 2>/dev/null || echo "$SESSION_RESPONSE"
else
    echo -e "${RED}❌ Session check failed:${NC}"
    echo "$SESSION_RESPONSE"
    exit 1
fi
echo ""

# Step 4: Test App Projects API
echo "Step 4: Testing App Projects API..."
PROJECTS_RESPONSE=$(curl -s -b cookies.txt "$BASE_URL/api/app-projects")

if echo "$PROJECTS_RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Failed to fetch projects:${NC}"
    echo "$PROJECTS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROJECTS_RESPONSE"
else
    echo -e "${GREEN}✅ App Projects API is working${NC}"
    echo "$PROJECTS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROJECTS_RESPONSE"
fi
echo ""

echo -e "${GREEN}🎉 Authentication test completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open your browser and go to: $BASE_URL/app-builder"
echo "2. The cookies are saved in 'cookies.txt'"
echo "3. You can manually set cookies in browser DevTools if needed"
echo ""
echo "To use in browser:"
echo "1. Go to $BASE_URL/auth"
echo "2. Sign in with:"
echo "   Email: $TEST_EMAIL"
echo "   Password: $TEST_PASSWORD"






