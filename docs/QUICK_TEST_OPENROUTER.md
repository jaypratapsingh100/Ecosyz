# Quick Test Guide: OpenRouter Integration

## 🚀 Quick Start (5 minutes)

### Step 1: Set Up Environment
```bash
# Add to .env.local
OPENROUTER_API_KEY=sk-or-your-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 2: Start Server
```bash
npm run dev
# or
pnpm dev
```

### Step 3: Test Through UI

1. **Go to App Builder:**
   - Navigate to `http://localhost:3000/app-builder`
   - Create a new project or select existing one

2. **Open Chat Settings:**
   - Click the ⚙️ (gear) icon in the chat panel
   - Select **"OpenRouter"** as provider
   - Try these model names:

   **✅ Should Work:**
   - `llama` → Uses Llama 3.2 70B
   - `deepseek` → Uses DeepSeek Chat
   - `grok` → Uses Grok 2
   - `mixtral` → Uses Mixtral 8x7B

   **⚠️ Will Fallback:**
   - `invalid-model` → Falls back to DeepSeek Chat
   - `random-name` → Falls back to DeepSeek Chat

3. **Send Test Message:**
   ```
   Create a simple React button component
   ```

### Step 4: Check Results

**✅ Success Indicators:**
- Chat responds with code
- No error messages
- Check browser console for logs

**❌ Error Indicators:**
- "Invalid model" error → Check model name
- "Invalid API key" → Check OPENROUTER_API_KEY
- "Connection error" → Check internet/API key

## 🔍 What to Look For

### In Browser Console:
```
✅ Should see:
- "🚀 Making AI request" with normalized model name
- "✅ AI response received"

⚠️ If fallback used:
- "⚠️ Invalid model ... attempting fallback"
- "🔄 Retrying with fallback model: deepseek/deepseek-chat"
```

### In Server Logs:
```
✅ Normalized model names:
- User sends: "llama" → API uses: "meta-llama/llama-3.2-70b-instruct"
- User sends: "deepseek" → API uses: "deepseek/deepseek-chat"

✅ Headers set:
- HTTP-Referer: http://localhost:3000
- X-Title: Open Idea - AI App Builder
```

## 🧪 Test Scenarios

### Scenario 1: Valid Model Name
1. Set model to: `llama`
2. Send: "Hello"
3. **Expected:** Response with AI content
4. **Check:** Model normalized to `meta-llama/llama-3.2-70b-instruct`

### Scenario 2: Invalid Model Name
1. Set model to: `invalid-model-xyz`
2. Send: "Hello"
3. **Expected:** Falls back to `deepseek/deepseek-chat` and succeeds
4. **Check:** Response includes `usedFallback: true` (in network tab)

### Scenario 3: No Model Specified
1. Don't set model (use default)
2. Send: "Hello"
3. **Expected:** Uses default `deepseek/deepseek-chat`
4. **Check:** Works without errors

### Scenario 4: Invalid API Key
1. Set invalid API key in settings
2. Send: "Hello"
3. **Expected:** 401 error with helpful message
4. **Check:** Error message suggests checking API key

## 📊 Testing Checklist

- [ ] OpenRouter API key is set in `.env.local`
- [ ] Server starts without errors
- [ ] Can access `/app-builder`
- [ ] Can open chat settings (⚙️ icon)
- [ ] Can select OpenRouter provider
- [ ] Model `llama` works
- [ ] Model `deepseek` works
- [ ] Model `grok` works
- [ ] Invalid model falls back gracefully
- [ ] No 500 errors for model issues
- [ ] Error messages are helpful

## 🐛 Troubleshooting

### "Invalid API key" Error
```bash
# Check .env.local has:
OPENROUTER_API_KEY=sk-or-your-actual-key

# Restart dev server after changing .env
```

### "Invalid model" Error
- Check: Model name is normalized (see MODEL_MAP)
- Check: Server logs show normalization
- Solution: Use model names from MODEL_MAP or let it fallback

### "Connection error"
- Check: Internet connection
- Check: OpenRouter API is accessible
- Check: API key is valid
- Solution: Verify API key at https://openrouter.ai/keys

### Model Not Working
- Check: Server logs for actual model being used
- Check: OpenRouter supports the model
- Solution: Try default model or check OpenRouter docs

## 📝 Quick Reference

**Valid Model Names:**
- `llama`, `llama3.2`, `llama-3.2`
- `deepseek`, `deepseek-chat`
- `deepseek-coder`, `deepseekcoder`
- `grok`, `grok-2`
- `mixtral`, `mixtral-8x7b`
- `mistral`, `mistral-7b`

**Default Model:**
- `deepseek/deepseek-chat` (if no model specified)

**Fallback Model:**
- `deepseek/deepseek-chat` (if invalid model)

## 🎯 Success Criteria

✅ **Integration is working if:**
1. Valid model names work correctly
2. Invalid model names fallback gracefully
3. No 500 errors for model issues
4. Error messages are helpful
5. Headers are set correctly
6. Model names are normalized properly
