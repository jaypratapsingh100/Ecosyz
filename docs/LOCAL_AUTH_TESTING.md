# Local Authentication Testing Guide

## Quick Solution: Use Email/Password Authentication

For local testing, **use email/password authentication** instead of OAuth (Google/GitHub). OAuth redirects are configured for production URLs.

### Steps to Test Locally:

1. **Navigate to `/auth`**
2. **Use Email/Password Sign Up**:
   - Click "Sign Up" tab
   - Enter:
     - Name: `Test User`
     - Email: `test@example.com` (or any email)
     - Password: `test123` (minimum 6 characters)
   - Click "Sign Up"
   - You should be redirected to `/profile`

3. **Sign In**:
   - Go to `/auth`
   - Enter your email and password
   - Click "Sign In"
   - You should be redirected to `/profile`

4. **Test App Builder**:
   - After signing in, go to `/app-builder`
   - You should now be able to create projects

## Why OAuth Redirects to Production?

OAuth providers (Google/GitHub) are configured with production callback URLs in Supabase:
- Production URL: `https://openidea.world/auth/callback`
- Local URL: `http://localhost:3000/auth/callback`

Supabase OAuth settings need to include localhost URLs for local testing.

## Option 1: Configure Supabase for Local Development

### In Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://127.0.0.1:3000/auth/callback`
3. Set **Site URL** to: `http://localhost:3000` (for local testing)

### For OAuth Providers:

#### GitHub:
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Add **Authorization callback URL**:
   - `http://localhost:3000/auth/callback`

#### Google:
1. Go to Google Cloud Console
2. Add **Authorized redirect URIs**:
   - `http://localhost:3000/auth/callback`

## Option 2: Use Test Accounts (Recommended for Quick Testing)

### Create Test User via API:

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'

# Sign in
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

## Option 3: Bypass Auth for Testing (Development Only)

If you want to test without authentication, you can temporarily modify the API routes to allow anonymous access. **⚠️ Only for local development!**

### Quick Test Script:

Create a test user and sign in:

```bash
# 1. Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'

# 2. Sign in (this sets cookies)
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@test.com","password":"test123"}'

# 3. Test API with cookies
curl http://localhost:3000/api/app-projects \
  -b cookies.txt
```

## Troubleshooting

### Issue: "Not authenticated" error
**Solution**: 
- Make sure you're signed in
- Check browser cookies (should have `sb-access-token` and `sb-refresh-token`)
- Try signing out and signing in again

### Issue: OAuth redirects to production
**Solution**: 
- Use email/password auth instead
- Or configure Supabase with localhost URLs

### Issue: Can't create account
**Solution**:
- Check Supabase dashboard → Authentication → Settings
- Ensure "Enable email signups" is enabled
- For local testing, you might want to disable email confirmation

### Issue: Session not persisting
**Solution**:
- Check browser console for cookie errors
- Ensure cookies are being set (check Application → Cookies in DevTools)
- Try clearing cookies and signing in again

## Recommended Testing Flow

1. **Start dev server**: `pnpm dev`
2. **Go to** `/auth`
3. **Sign up** with email/password
4. **Go to** `/app-builder`
5. **Create a project** to test

## Environment Variables for Local Testing

Make sure your `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

If using local Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_key
```


