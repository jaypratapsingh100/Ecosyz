# Testing OpenRouter Integration

## Prerequisites

1. **Get OpenRouter API Key**
   - Sign up at: https://openrouter.ai/
   - Get API key from: https://openrouter.ai/keys
   - Copy your API key (starts with `sk-or-`)

2. **Set Environment Variables**
   ```bash
   # .env.local or .env
   OPENROUTER_API_KEY=sk-or-your-key-here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
   ```

## Test Cases

### 1. Test Model Name Normalization

#### Test Valid Model Names
These should map correctly through MODEL_MAP:

```bash
# Test via API directly
curl -X POST http://localhost:3000/api/app-projects/[PROJECT_ID]/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "message": "Hello",
    "provider": "openrouter",
    "model": "llama"
  }'

# Expected: Uses "meta-llama/llama-3.2-70b-instruct"
```

**Models to Test:**
- `"llama"` → should use `meta-llama/llama-3.2-70b-instruct`
- `"llama3.2"` → should use `meta-llama/llama-3.2-70b-instruct`
- `"deepseek"` → should use `deepseek/deepseek-chat`
- `"deepseek-coder"` → should use `deepseek/deepseek-coder`
- `"grok"` → should use `x-ai/grok-2`
- `"mixtral"` → should use `mistralai/mixtral-8x7b-instruct`

#### Test Invalid Model Names
These should fallback to default:

```bash
curl -X POST http://localhost:3000/api/app-projects/[PROJECT_ID]/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "provider": "openrouter",
    "model": "invalid-model-name"
  }'

# Expected: Falls back to "deepseek/deepseek-chat"
```

### 2. Test Error Handling (400 - Invalid Model)

#### Simulate Invalid Model Error
```bash
# Use a model that doesn't exist
curl -X POST http://localhost:3000/api/app-projects/[PROJECT_ID]/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "provider": "openrouter",
    "model": "nonexistent/model-xyz"
  }'

# Expected Response:
# {
#   "error": "Invalid model",
#   "message": "The model \"nonexistent/model-xyz\" is not available for openrouter...",
#   "status": 400
# }
```

### 3. Test Automatic Fallback

When a 400 error occurs, the system should:
1. Catch the error
2. Retry with `deepseek/deepseek-chat`
3. Return success response with `usedFallback: true`

**Check logs for:**
```
⚠️ Invalid model "xxx" for openrouter, attempting fallback
🔄 Retrying with fallback model: deepseek/deepseek-chat
```

### 4. Test OpenRouter Headers

Verify headers are set correctly:

```bash
# Check server logs when making request
# Should see:
# - HTTP-Referer: http://localhost:3000 (or your URL)
# - X-Title: Open Idea - AI App Builder
```

### 5. Test Through UI

1. **Start the app:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Navigate to App Builder:**
   - Go to `/app-builder`
   - Select or create a project

3. **Open Chat Settings:**
   - Click ⚙️ icon in chat panel
   - Select "OpenRouter" as provider
   - Try different model names:
     - `llama`
     - `deepseek`
     - `grok`
     - `invalid-model` (should work with fallback)

4. **Send Test Messages:**
   ```
   Test 1: "Create a simple hello world component"
   Test 2: "Generate a React button component"
   ```

### 6. Test API Key Handling

#### Test Without API Key
```bash
# Should return helpful message about API keys
curl -X POST http://localhost:3000/api/app-projects/[PROJECT_ID]/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "provider": "openrouter"
  }'
```

#### Test With Invalid API Key
```bash
curl -X POST http://localhost:3000/api/app-projects/[PROJECT_ID]/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "provider": "openrouter",
    "apiKey": "sk-or-invalid-key"
  }'

# Expected: 401 error with helpful message
```

### 7. Test Default Behavior

#### Test Without Specifying Model
```bash
curl -X POST http://localhost:3000/api/app-projects/[PROJECT_ID]/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "provider": "openrouter"
  }'

# Expected: Uses default "deepseek/deepseek-chat"
```

## Manual Testing Script

Create `test-openrouter.sh`:

```bash
#!/bin/bash

PROJECT_ID="your-project-id"
API_URL="http://localhost:3000/api/app-projects/$PROJECT_ID/chat"

echo "🧪 Testing OpenRouter Integration"
echo "================================"

# Test 1: Valid model name
echo -e "\n1. Testing valid model 'llama'..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Say hello",
    "provider": "openrouter",
    "model": "llama"
  }' | jq '.'

# Test 2: Invalid model name
echo -e "\n2. Testing invalid model 'invalid-model'..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Say hello",
    "provider": "openrouter",
    "model": "invalid-model"
  }' | jq '.'

# Test 3: Default model (no model specified)
echo -e "\n3. Testing default model..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Say hello",
    "provider": "openrouter"
  }' | jq '.'

echo -e "\n✅ Tests complete!"
```

## Expected Behaviors

### ✅ Success Cases

1. **Valid Model Name:**
   - Request: `model: "llama"`
   - Normalized: `meta-llama/llama-3.2-70b-instruct`
   - Result: Success response with AI content

2. **Unknown Model Name:**
   - Request: `model: "unknown"`
   - Normalized: `deepseek/deepseek-chat` (default)
   - Result: Success response with AI content

3. **Invalid Model (400 Error):**
   - Request: `model: "nonexistent/model"`
   - Error: 400 from OpenRouter
   - Fallback: Retries with `deepseek/deepseek-chat`
   - Result: Success response with `usedFallback: true`

### ❌ Error Cases (Should Return Clean Errors)

1. **No API Key:**
   - Status: 200 (returns helpful message)
   - Message: Instructions for getting API keys

2. **Invalid API Key:**
   - Status: 401
   - Message: "Invalid API key for openrouter..."

3. **Rate Limit:**
   - Status: 429
   - Message: "Rate limit exceeded..."

## Debugging

### Check Server Logs

Look for these log messages:

```
🚀 Making AI request: {
  provider: 'openrouter',
  model: 'meta-llama/llama-3.2-70b-instruct',
  normalizedModel: 'meta-llama/llama-3.2-70b-instruct',
  ...
}

✅ AI response received: {
  provider: 'openrouter',
  model: 'meta-llama/llama-3.2-70b-instruct',
  ...
}
```

### Common Issues

1. **"Invalid model" error:**
   - Check: Is model name being normalized?
   - Check: Is MODEL_MAP being used?
   - Solution: Model should be normalized before sending to OpenRouter

2. **"Invalid API key" error:**
   - Check: Is `OPENROUTER_API_KEY` set in `.env`?
   - Check: Does API key start with `sk-or-`?
   - Solution: Get valid key from https://openrouter.ai/keys

3. **Headers missing:**
   - Check: Are `HTTP-Referer` and `X-Title` set?
   - Check: Is `NEXT_PUBLIC_SITE_URL` set?
   - Solution: Set environment variables

## Quick Test Checklist

- [ ] OpenRouter API key is set in `.env`
- [ ] `NEXT_PUBLIC_SITE_URL` is set
- [ ] Test with model: `"llama"` → should work
- [ ] Test with model: `"deepseek"` → should work
- [ ] Test with model: `"invalid"` → should fallback to default
- [ ] Test with invalid model ID → should fallback to deepseek
- [ ] Test without API key → should show helpful message
- [ ] Test with invalid API key → should return 401
- [ ] Check server logs for proper model normalization
- [ ] Verify headers are sent correctly

## Production Testing

Before deploying:

1. **Test with real OpenRouter API:**
   ```bash
   # Use production URL
   curl -X POST https://your-domain.com/api/app-projects/[ID]/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "provider": "openrouter", "model": "llama"}'
   ```

2. **Monitor error rates:**
   - Check for 400 errors (should be handled gracefully)
   - Check for fallback usage
   - Verify no 500 errors for model issues

3. **Test rate limits:**
   - Make multiple rapid requests
   - Verify 429 errors are handled correctly
