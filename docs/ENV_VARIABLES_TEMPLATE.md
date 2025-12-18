# Environment Variables for Deployment

Add these variables to your `.env.local` file:

```env
# Vercel Configuration (Required for deployment)
VERCEL_API_TOKEN=vercel_xxxxxxxxxxxxx
VERCEL_TEAM_ID=team_xxxxxxxxxxxxx  # Optional, only if using team account

# GoDaddy Configuration (Required for domain automation)
GODADDY_API_KEY=your_api_key_here
GODADDY_API_SECRET=your_api_secret_here
```

## How to Get These Values

### Vercel API Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it (e.g., "Open Idea Deployment")
4. Copy the token (starts with `vercel_`)
5. Add to `.env.local` as `VERCEL_API_TOKEN`

### Vercel Team ID (Optional)
1. Go to https://vercel.com/teams
2. Select your team
3. Go to Settings → General
4. Copy Team ID (starts with `team_`)
5. Add to `.env.local` as `VERCEL_TEAM_ID`

### GoDaddy API Credentials
1. Go to https://developer.godaddy.com/
2. Sign in with your GoDaddy account
3. Go to "Keys" section
4. Click "Create New API Key"
5. Select "Production" environment
6. Copy Key and Secret
7. Add to `.env.local` as `GODADDY_API_KEY` and `GODADDY_API_SECRET`

**Important**: Your GoDaddy account must have:
- 10+ domains registered, OR
- Discount Domain Club Premier subscription

## After Adding Variables

1. Restart your development server
2. Test deployment endpoint
3. Test domain configuration

