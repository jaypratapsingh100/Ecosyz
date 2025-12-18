# Vercel Claimable Deployment & Domain Integration Implementation

## ✅ What Was Implemented

### 1. Vercel Claimable Deployments
- **Endpoint**: `POST /api/app-projects/[id]/deploy-vercel`
- **Functionality**: Deploys user apps to Vercel without requiring GitHub
- **Features**:
  - Direct file upload to Vercel API
  - Generates claimable deployment URLs
  - Stores deployment info in database
  - Returns deployment URL and claim URL

### 2. Domain Integration (GoDaddy)
- **Endpoint**: `POST /api/app-projects/[id]/deploy-domain`
- **Functionality**: Adds custom domains and configures DNS automatically
- **Features**:
  - Adds domain to Vercel deployment
  - Configures DNS via GoDaddy API (if eligible)
  - Falls back to manual instructions if not eligible
  - Supports both your account and user accounts

## 📁 Files Created

### Utility Libraries
1. **`src/lib/vercel.ts`**
   - `deployToVercel()` - Deploy static files to Vercel
   - `getClaimableDeploymentUrl()` - Generate claim URL
   - `addDomainToVercel()` - Add custom domain
   - `getVercelDNSRecords()` - Get DNS records needed
   - `verifyVercelDomain()` - Verify domain ownership

2. **`src/lib/godaddy.ts`**
   - `checkGoDaddyAccountEligibility()` - Check if account qualifies
   - `configureGoDaddyDNSForVercel()` - Automate DNS configuration
   - `getManualDNSInstructions()` - Generate manual instructions
   - `getGoDaddyDNSRecords()` - Get existing DNS records
   - `updateGoDaddyDNSRecords()` - Update DNS records

### API Endpoints
1. **`app/api/app-projects/[id]/deploy-vercel/route.ts`**
   - Deploys project to Vercel
   - Builds static files from project files
   - Returns deployment URL and claim URL

2. **`app/api/app-projects/[id]/deploy-domain/route.ts`**
   - Adds custom domain to deployment
   - Configures DNS via GoDaddy API
   - Handles both automated and manual cases

### Database Schema
- Added `claimUrl` field to `AppProject` model
- Stores claimable deployment URL for Vercel

## 🔧 Environment Variables Required

Add these to your `.env.local`:

```env
# Vercel Configuration
VERCEL_API_TOKEN=vercel_xxxxxxxxxxxxx
VERCEL_TEAM_ID=team_xxxxxxxxxxxxx  # Optional, if using team account

# GoDaddy Configuration (Your Account)
GODADDY_API_KEY=your_api_key
GODADDY_API_SECRET=your_api_secret
```

### How to Get Vercel API Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Copy the token (starts with `vercel_`)

### How to Get GoDaddy API Credentials
1. Go to https://developer.godaddy.com/
2. Sign in with your GoDaddy account
3. Go to "Keys" section
4. Create Production API Key
5. Copy Key and Secret

**Important**: Your GoDaddy account must have:
- 10+ domains registered, OR
- Discount Domain Club Premier subscription

## 🚀 Usage

### Step 1: Deploy to Vercel

```typescript
// POST /api/app-projects/[id]/deploy-vercel
const response = await fetch(`/api/app-projects/${projectId}/deploy-vercel`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
});

const result = await response.json();
// Returns:
// {
//   success: true,
//   url: "https://app-abc123.vercel.app",
//   claimUrl: "https://vercel.com/claim/xyz789",
//   deploymentId: "xyz789",
//   status: "READY",
//   message: "Deployment initiated successfully!"
// }
```

### Step 2: Add Custom Domain (Optional)

#### Option A: Use Your GoDaddy Account (Recommended)

```typescript
// POST /api/app-projects/[id]/deploy-domain
const response = await fetch(`/api/app-projects/${projectId}/deploy-domain`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    domain: 'myapp.in',
    useYourAccount: true, // Uses your GoDaddy account
  }),
});

const result = await response.json();
// Returns:
// {
//   success: true,
//   domain: "myapp.in",
//   verified: true,
//   message: "Domain configured successfully!"
// }
```

#### Option B: Use User's GoDaddy Account

```typescript
// POST /api/app-projects/[id]/deploy-domain
const response = await fetch(`/api/app-projects/${projectId}/deploy-domain`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    domain: 'myapp.in',
    useYourAccount: false,
    godaddyApiKey: 'user_api_key',
    godaddyApiSecret: 'user_api_secret',
  }),
});

const result = await response.json();
// If user doesn't qualify:
// {
//   success: false,
//   error: "Account has 5 domains. Need 10+ domains...",
//   manualInstructions: "To configure your domain..."
// }
```

## 📋 Database Migration

Run this migration to add the `claimUrl` field:

```bash
pnpm prisma migrate dev --name add_claim_url_field
pnpm prisma generate
```

## 🎯 User Flow

### Basic Deployment (No Custom Domain)
```
1. User creates app in app builder
2. User clicks "Deploy"
3. App deploys to: app-abc123.vercel.app ✅
4. User gets claim URL (optional)
5. User can claim deployment later if they want
```

### Deployment with Custom Domain
```
1. User creates app in app builder
2. User clicks "Deploy"
3. App deploys to: app-abc123.vercel.app ✅
4. User enters custom domain: "myapp.in"
5. DNS configured automatically (if eligible) ✅
6. Domain verified automatically ✅
7. SSL certificate issued automatically ✅
8. App available at: myapp.in ✅
```

## 🔍 Error Handling

### Vercel Deployment Errors
- **No API Token**: Returns error with configuration message
- **Deployment Failed**: Returns error with Vercel's error message
- **No Files**: Returns error indicating project has no files

### Domain Configuration Errors
- **Invalid Domain**: Returns error for invalid domain format
- **Not Deployed**: Returns error if project not deployed first
- **GoDaddy Not Eligible**: Returns error with manual instructions
- **DNS Configuration Failed**: Returns error with manual fallback

## 🧪 Testing

### Test Deployment
```bash
curl -X POST http://localhost:3000/api/app-projects/[project-id]/deploy-vercel \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]"
```

### Test Domain Configuration
```bash
curl -X POST http://localhost:3000/api/app-projects/[project-id]/deploy-domain \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{"domain": "test.example.com", "useYourAccount": true}'
```

## 📝 Next Steps

1. **Run Migration**: Add `claimUrl` field to database
2. **Set Environment Variables**: Add Vercel and GoDaddy credentials
3. **Test Deployment**: Deploy a test project
4. **Add UI**: Create deploy button in app builder UI
5. **Test Domain**: Test custom domain configuration

## 🎨 UI Integration (Future)

Add deploy button to `ProjectManager.tsx` or `PreviewPanel.tsx`:

```tsx
<button onClick={handleDeploy}>
  Deploy to Vercel
</button>

{project.deploymentUrl && (
  <div>
    <a href={project.deploymentUrl} target="_blank">
      View Deployment
    </a>
    {project.claimUrl && (
      <a href={project.claimUrl} target="_blank">
        Claim Deployment
      </a>
    )}
  </div>
)}
```

## ⚠️ Important Notes

1. **Vercel Free Tier**: 100 deployments/day limit
2. **GoDaddy API**: Requires 10+ domains or DDC subscription
3. **DNS Propagation**: Can take 5-10 minutes (up to 24 hours)
4. **SSL Certificates**: Issued automatically by Vercel
5. **Claim URLs**: Users can claim deployments later (optional)

## 🐛 Troubleshooting

### "VERCEL_API_TOKEN is not configured"
- Add `VERCEL_API_TOKEN` to `.env.local`
- Restart development server

### "GoDaddy account not eligible"
- Your account needs 10+ domains OR DDC subscription
- Use manual DNS instructions as fallback

### "Domain verification failed"
- Check DNS records are configured correctly
- Wait for DNS propagation (5-10 minutes)
- Verify domain manually in Vercel dashboard

---

**Implementation Complete!** 🎉

You can now deploy user apps to Vercel with claimable URLs and configure custom domains via GoDaddy API.

