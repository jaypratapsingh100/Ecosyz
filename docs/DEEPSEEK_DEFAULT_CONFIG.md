# DeepSeek as Default Configuration

## Overview
DeepSeek is now configured as the default AI provider throughout the application, with API key priority set to use `DEEPSEEK_API_KEY` from `.env` file first.

## Configuration Changes

### 1. API Key Priority
**File**: `app/api/app-projects/[id]/chat/route.ts`

**Priority Order**:
1. User-provided API key (from localStorage)
2. `DEEPSEEK_API_KEY` from `.env` (highest priority for env vars)
3. `GROQ_API_KEY` from `.env`
4. `OPENROUTER_API_KEY` from `.env`
5. `OPENAI_API_KEY` from `.env`

```typescript
apiKey = userApiKey || process.env.DEEPSEEK_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
```

### 2. Default Provider
**Changed from**: `groq` → **Changed to**: `deepseek`

**Files Updated**:
- `app/api/app-projects/[id]/chat/route.ts` - Default provider set to `deepseek`
- `app/components/ChatSettings.tsx` - Default provider set to `deepseek`
- `src/lib/llm-load-balancer.ts` - Fallback provider set to `deepseek`

### 3. Default Model
**Changed from**: `llama-3.3-70b-versatile` → **Changed to**: `deepseek-chat`

**File**: `app/components/ChatSettings.tsx`

## Environment Setup

### Add to `.env.local` or `.env`:

```bash
# DeepSeek API Key (highest priority)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# Optional: Other providers as fallback
GROQ_API_KEY=sk-your-groq-api-key-here
OPENROUTER_API_KEY=sk-your-openrouter-api-key-here
```

### Get DeepSeek API Key:
1. Visit: https://platform.deepseek.com/api_keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)
5. Add to `.env.local` file

## How It Works

### Automatic Detection:
1. **If `DEEPSEEK_API_KEY` is in `.env`**:
   - Automatically uses DeepSeek provider
   - Uses `deepseek-chat` model
   - No user configuration needed

2. **If user sets provider in Chat Settings**:
   - User's choice takes priority
   - Can override default DeepSeek

3. **If no API key in `.env`**:
   - Prompts user to configure API key
   - Shows helpful setup instructions

### Provider Detection Logic:
```typescript
if (process.env.DEEPSEEK_API_KEY || apiKey?.startsWith('sk-')) {
  detectedProvider = 'deepseek';
} else {
  detectedProvider = getProviderWithFallback(userProvider, apiKey);
}
```

## Benefits

1. **Best for Code**: DeepSeek is optimized for code generation
2. **Free Tier**: DeepSeek offers free tier with good limits
3. **Automatic**: Works automatically with `.env` configuration
4. **No Setup**: Users don't need to configure if API key is in `.env`

## Testing

1. **Add API Key to `.env`**:
   ```bash
   DEEPSEEK_API_KEY=sk-your-key-here
   ```

2. **Restart Server**:
   ```bash
   pnpm dev
   ```

3. **Test Chat**:
   - Open App Builder
   - Go to Chat tab
   - Send a message
   - Should use DeepSeek automatically

4. **Verify**:
   - Check console logs for provider: `deepseek`
   - Check model: `deepseek-chat`
   - API calls should go to `https://api.deepseek.com/v1`

## Troubleshooting

### Issue: Still using Groq/other provider
**Fix**: 
- Check `.env` file has `DEEPSEEK_API_KEY` set
- Restart the development server
- Clear browser localStorage if needed

### Issue: API key not working
**Check**:
- API key format: Should start with `sk-`
- API key is active: Check at https://platform.deepseek.com/api_keys
- Environment variable name: Must be exactly `DEEPSEEK_API_KEY`

### Issue: Default not applying
**Fix**:
- Ensure `.env.local` exists (takes priority over `.env`)
- Restart server after adding API key
- Check server logs for provider detection

## Migration Notes

- **Existing users**: Will continue using their saved provider preference
- **New users**: Will default to DeepSeek
- **No breaking changes**: All existing functionality preserved

