#!/bin/bash

# Test Azure DeepSeek API Accessibility and Chat Completions
# This script tests the full flow: health check, models, and chat completions

set -e

AZURE_DEEPSEEK_URL="${AZURE_DEEPSEEK_URL:-http://74.225.138.116:8000}"
MODEL="${AZURE_DEEPSEEK_MODEL:-deepseek-coder}"

echo "🧪 Testing Azure DeepSeek API"
echo "=============================="
echo ""
echo "URL: $AZURE_DEEPSEEK_URL"
echo "Model: $MODEL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing /health endpoint..."
echo "----------------------------------------"
if curl -s -f "${AZURE_DEEPSEEK_URL}/health" > /tmp/health_response.json 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    cat /tmp/health_response.json | jq '.' 2>/dev/null || cat /tmp/health_response.json
    echo ""
else
    echo -e "${RED}❌ Health check failed${NC}"
    cat /tmp/health_response.json
    exit 1
fi

# Test 2: Models Endpoint
echo ""
echo "2️⃣  Testing /v1/models endpoint..."
echo "----------------------------------------"
if curl -s -f "${AZURE_DEEPSEEK_URL}/v1/models" > /tmp/models_response.json 2>&1; then
    echo -e "${GREEN}✅ Models endpoint works${NC}"
    cat /tmp/models_response.json | jq '.' 2>/dev/null || cat /tmp/models_response.json
    echo ""
else
    echo -e "${RED}❌ Models endpoint failed${NC}"
    cat /tmp/models_response.json
    exit 1
fi

# Test 3: Chat Completions - Simple Request
echo ""
echo "3️⃣  Testing /v1/chat/completions (simple request)..."
echo "----------------------------------------"
SIMPLE_REQUEST='{
  "model": "'"$MODEL"'",
  "messages": [
    {"role": "user", "content": "Say hello in one sentence."}
  ],
  "max_tokens": 50
}'

if curl -s -f -X POST "${AZURE_DEEPSEEK_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$SIMPLE_REQUEST" > /tmp/chat_simple_response.json 2>&1; then
    echo -e "${GREEN}✅ Simple chat request works${NC}"
    cat /tmp/chat_simple_response.json | jq '.' 2>/dev/null || cat /tmp/chat_simple_response.json
    echo ""
else
    echo -e "${RED}❌ Simple chat request failed${NC}"
    cat /tmp/chat_simple_response.json
    exit 1
fi

# Test 4: Chat Completions - Code Generation Request (like app builder)
echo ""
echo "4️⃣  Testing /v1/chat/completions (code generation request)..."
echo "----------------------------------------"
CODE_REQUEST='{
  "model": "'"$MODEL"'",
  "messages": [
    {"role": "system", "content": "You are a helpful code assistant."},
    {"role": "user", "content": "Create a simple React component called HelloWorld that displays \"Hello, World!\" in a div with some styling."}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}'

if curl -s -f -X POST "${AZURE_DEEPSEEK_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$CODE_REQUEST" > /tmp/chat_code_response.json 2>&1; then
    echo -e "${GREEN}✅ Code generation request works${NC}"
    
    # Extract and display the response content
    RESPONSE_CONTENT=$(cat /tmp/chat_code_response.json | jq -r '.choices[0].message.content' 2>/dev/null || echo "")
    if [ -n "$RESPONSE_CONTENT" ]; then
        echo ""
        echo "Response content:"
        echo "$RESPONSE_CONTENT" | head -20
        echo ""
    fi
    
    # Show full JSON response
    cat /tmp/chat_code_response.json | jq '.' 2>/dev/null || cat /tmp/chat_code_response.json
    echo ""
else
    echo -e "${RED}❌ Code generation request failed${NC}"
    cat /tmp/chat_code_response.json
    exit 1
fi

# Test 5: Test with API Key (if provided)
if [ -n "$AZURE_DEEPSEEK_API_KEY" ] && [ "$AZURE_DEEPSEEK_API_KEY" != "not-required" ]; then
    echo ""
    echo "5️⃣  Testing with API Key authentication..."
    echo "----------------------------------------"
    if curl -s -f -X POST "${AZURE_DEEPSEEK_URL}/v1/chat/completions" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AZURE_DEEPSEEK_API_KEY" \
      -d "$SIMPLE_REQUEST" > /tmp/chat_auth_response.json 2>&1; then
        echo -e "${GREEN}✅ Authenticated request works${NC}"
        cat /tmp/chat_auth_response.json | jq '.' 2>/dev/null || cat /tmp/chat_auth_response.json
        echo ""
    else
        echo -e "${YELLOW}⚠️  Authenticated request failed (may not be required)${NC}"
        cat /tmp/chat_auth_response.json
    fi
fi

# Test 6: Test URL format (without /v1)
echo ""
echo "6️⃣  Testing URL format (baseURL without /v1)..."
echo "----------------------------------------"
BASE_URL=$(echo "$AZURE_DEEPSEEK_URL" | sed 's|/v1$||' | sed 's|/$||')
EXPECTED_ENDPOINT="${BASE_URL}/v1/chat/completions"
echo "Base URL: $BASE_URL"
echo "Expected endpoint: $EXPECTED_ENDPOINT"

if curl -s -f -X POST "$EXPECTED_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$SIMPLE_REQUEST" > /tmp/chat_format_response.json 2>&1; then
    echo -e "${GREEN}✅ URL format test passed${NC}"
    cat /tmp/chat_format_response.json | jq -r '.choices[0].message.content' 2>/dev/null || echo "Response received"
    echo ""
else
    echo -e "${RED}❌ URL format test failed${NC}"
    cat /tmp/chat_format_response.json
    exit 1
fi

# Summary
echo ""
echo "=============================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Azure DeepSeek API is accessible and working correctly."
echo "You can use this endpoint in your app builder."
echo ""
echo "Example curl command:"
echo "curl -X POST ${AZURE_DEEPSEEK_URL}/v1/chat/completions \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'"
