#!/bin/bash

# Authentication API Testing Script
# Usage: ./scripts/test-auth.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_PASSWORD="test123456"
TEST_NAME="Test User ${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Authentication API Testing${NC}"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Sign Up
echo -e "\n${YELLOW}1. Testing Sign Up...${NC}"
SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -n1)
BODY=$(echo "$SIGNUP_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    print_result 0 "Sign Up successful (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_result 1 "Sign Up failed (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

# Wait a moment
sleep 1

# Test 2: Sign In
echo -e "\n${YELLOW}2. Testing Sign In...${NC}"
SIGNIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -c /tmp/auth_cookies.txt \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$SIGNIN_RESPONSE" | tail -n1)
BODY=$(echo "$SIGNIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Sign In successful (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_result 1 "Sign In failed (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
fi

# Wait a moment
sleep 1

# Test 3: Get Session
echo -e "\n${YELLOW}3. Testing Get Session...${NC}"
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/session" \
  -b /tmp/auth_cookies.txt)

HTTP_CODE=$(echo "$SESSION_RESPONSE" | tail -n1)
BODY=$(echo "$SESSION_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Get Session successful (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_result 1 "Get Session failed (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

# Wait a moment
sleep 1

# Test 4: Request Password Reset
echo -e "\n${YELLOW}4. Testing Password Reset Request...${NC}"
RESET_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")

HTTP_CODE=$(echo "$RESET_RESPONSE" | tail -n1)
BODY=$(echo "$RESET_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Password Reset Request successful (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    
    # Extract reset URL if available (for development)
    RESET_URL=$(echo "$BODY" | jq -r '.resetUrl // empty' 2>/dev/null)
    if [ -n "$RESET_URL" ] && [ "$RESET_URL" != "null" ]; then
        echo -e "${GREEN}Reset URL: $RESET_URL${NC}"
    fi
else
    print_result 1 "Password Reset Request failed (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

# Wait a moment
sleep 1

# Test 5: Sign Out
echo -e "\n${YELLOW}5. Testing Sign Out...${NC}"
SIGNOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/signout" \
  -b /tmp/auth_cookies.txt)

HTTP_CODE=$(echo "$SIGNOUT_RESPONSE" | tail -n1)
BODY=$(echo "$SIGNOUT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "Sign Out successful (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_result 1 "Sign Out failed (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

# Wait a moment
sleep 1

# Test 6: Verify Session Cleared
echo -e "\n${YELLOW}6. Verifying Session Cleared...${NC}"
SESSION_CHECK=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/session" \
  -b /tmp/auth_cookies.txt)

HTTP_CODE=$(echo "$SESSION_CHECK" | tail -n1)
BODY=$(echo "$SESSION_CHECK" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    print_result 0 "Session cleared correctly (HTTP 401)"
else
    print_result 1 "Session not cleared (HTTP $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

# Cleanup
rm -f /tmp/auth_cookies.txt

echo -e "\n${GREEN}✅ Testing Complete!${NC}"
echo ""
echo "Test Account Created:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo ""
echo "You can use this account for manual testing."




