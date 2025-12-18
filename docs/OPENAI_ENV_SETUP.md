# OpenAI API Key Setup for App Builder

## Quick Setup

The App Builder AI chat automatically uses your OpenAI API key from `.env` file. No need to enter it manually!

## Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

## Step 2: Add to .env File

Open your `.env` or `.env.local` file and add:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o
```

**Recommended models:**
- `gpt-4o` - Best quality, latest model (default)
- `gpt-4o-mini` - Faster and cheaper, good quality
- `gpt-3.5-turbo` - Most affordable option

## Step 3: Restart Dev Server

After adding the key:

```bash
# Stop server (Ctrl+C)
pnpm dev
```

## How It Works

The system uses API keys in this priority order:

1. **User-provided key** (from chat settings) - Highest priority
2. **`.env.local` OPENAI_API_KEY** - Second priority  
3. **`.env` OPENAI_API_KEY** - Third priority

If no key is found, users will be prompted to set one in chat settings.

## Verify It's Working

1. Go to `/app-builder`
2. Create or select a project
3. Open the **Chat** tab
4. Send a message like: "Create a simple hello world component"
5. If it works, your API key is configured correctly!

## Troubleshooting

### Issue: "Invalid OpenAI API key"
- Check that your key starts with `sk-`
- Make sure there are no extra spaces or quotes
- Verify the key is active in OpenAI dashboard

### Issue: "Rate limit exceeded"
- You've hit OpenAI's rate limit
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

### Issue: API key not being used
- Make sure `.env` or `.env.local` has `OPENAI_API_KEY=...`
- Restart the dev server after adding the key
- Check server logs to see which key is being used

## Example .env Configuration

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-abc123xyz...
OPENAI_MODEL=gpt-4o

# Database (existing)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Security Notes

- ✅ `.env` files are gitignored (safe to store keys)
- ✅ Never commit API keys to git
- ✅ Use different keys for development and production
- ✅ Rotate keys if compromised

## Cost Considerations

OpenAI API usage is pay-as-you-go:
- **gpt-4o**: ~$5 per 1M input tokens, ~$15 per 1M output tokens
- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens  
- **gpt-3.5-turbo**: ~$0.50 per 1M input tokens, ~$1.50 per 1M output tokens

For testing, `gpt-4o-mini` or `gpt-3.5-turbo` are cost-effective options.


