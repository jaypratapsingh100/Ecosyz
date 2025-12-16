#!/bin/bash

# Test OpenRouter Integration
# Usage: ./scripts/test-openrouter.sh [PROJECT_ID]

set -e

PROJECT_ID="${1:-}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: PROJECT_ID is required"
  echo "Usage: ./scripts/test-openrouter.sh [PROJECT_ID]"
  echo ""
  echo "To get a PROJECT_ID:"
  echo "1. Start your dev server: npm run dev"
  echo "2. Go to /app-builder"
  echo "3. Create a project"
  echo "4. Copy the project ID from the URL"
  exit 1
fi

API_URL="${BASE_URL}/api/app-projects/${PROJECT_ID}/chat"

echo "🧪 Testing OpenRouter Integration"
echo "================================"
echo "Project ID: $PROJECT_ID"
echo "API URL: $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_request() {
  local test_name="$1"
  local model="$2"
  local expected_status="${3:-200}"
  
  echo -e "${YELLOW}Testing: $test_name${NC}"
  echo "Model: $model"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Say hello in one sentence\",
      \"provider\": \"openrouter\",
      \"model\": \"$model\"
    }")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✅ Status: $http_code (expected $expected_status)${NC}"
    
    # Check for error field
    if echo "$body" | jq -e '.error' > /dev/null 2>&1; then
      error_msg=$(echo "$body" | jq -r '.error // .message // "Unknown error"')
      echo -e "${YELLOW}⚠️  Error: $error_msg${NC}"
    else
      # Check for response field
      if echo "$body" | jq -e '.response' > /dev/null 2>&1; then
        response_preview=$(echo "$body" | jq -r '.response' | head -c 100)
        echo -e "${GREEN}✅ Response preview: ${response_preview}...${NC}"
        
        # Check for fallback
        if echo "$body" | jq -e '.usedFallback' > /dev/null 2>&1; then
          fallback=$(echo "$body" | jq -r '.usedFallback')
          if [ "$fallback" = "true" ]; then
            echo -e "${YELLOW}⚠️  Fallback was used${NC}"
          fi
        fi
      fi
    fi
  else
    echo -e "${RED}❌ Status: $http_code (expected $expected_status)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  
  echo ""
}

# Test 1: Valid model name (llama)
test_request "Valid model: llama" "llama" 200

# Test 2: Valid model name (deepseek)
test_request "Valid model: deepseek" "deepseek" 200

# Test 3: Valid model name (grok)
test_request "Valid model: grok" "grok" 200

# Test 4: Unknown model (should use default)
test_request "Unknown model: random-model" "random-model" 200

# Test 5: Invalid model ID (should trigger fallback)
test_request "Invalid model ID: nonexistent/model-xyz" "nonexistent/model-xyz" 200

# Test 6: No model specified (should use default)
echo -e "${YELLOW}Testing: No model specified (default)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Say hello",
    "provider": "openrouter"
  }')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Status: $http_code${NC}"
else
  echo -e "${RED}❌ Status: $http_code${NC}"
fi
echo ""

echo -e "${GREEN}✅ All tests complete!${NC}"
echo ""
echo "📝 Check server logs for:"
echo "   - Model normalization messages"
echo "   - Fallback attempts (if any)"
echo "   - OpenRouter API calls"
