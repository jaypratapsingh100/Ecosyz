# Fix: "Failed to fetch" Error in App Builder

## Problem
The app builder shows "Failed to fetch" errors when trying to load projects and files.

## Root Causes

1. **Server not running** - The Next.js dev server might not be running
2. **Database connection issues** - Database might be unreachable or misconfigured
3. **Authentication issues** - User might not be authenticated
4. **API route errors** - Unhandled errors in API routes causing crashes

## Solutions Applied

### 1. Enhanced Error Handling in API Routes
- Added try-catch blocks around database operations
- Better error messages for database connection failures
- Proper error responses instead of crashes

### 2. Improved Frontend Error Handling
- Better error logging in console
- Checks for network vs. API errors
- More informative error messages

## How to Debug

### Step 1: Check Server Status
```bash
# Make sure dev server is running
pnpm dev

# Check if server is accessible
curl http://localhost:3000/api/app-projects
```

### Step 2: Check Database Connection
```bash
# Test database connection
pnpm prisma db push

# Check environment variables
cat .env.local | grep DATABASE_URL
```

### Step 3: Check Browser Console
Open browser DevTools → Console and look for:
- Network errors (red)
- API error responses
- Authentication errors

### Step 4: Check Server Logs
Look at your terminal where `pnpm dev` is running for:
- Database connection errors
- API route errors
- Stack traces

## Common Issues & Fixes

### Issue: "Failed to fetch" with no server logs
**Fix**: Server might not be running. Start it with `pnpm dev`

### Issue: Database connection errors
**Fix**: 
1. Check `DATABASE_URL` in `.env.local`
2. Verify database is accessible
3. Run `pnpm prisma db push` to sync schema

### Issue: 401 Unauthorized errors
**Fix**: 
1. Make sure you're logged in
2. Check authentication cookies
3. Try logging out and back in

### Issue: 503 Service Unavailable
**Fix**: 
1. Database connection issue
2. Check `DATABASE_URL` is correct
3. Verify database server is running

## Testing the Fix

1. **Start the server:**
   ```bash
   pnpm dev
   ```

2. **Open app builder:**
   - Navigate to `/app-builder`
   - Select a project

3. **Check console:**
   - Should see successful API calls
   - No "Failed to fetch" errors
   - Files and project load correctly

4. **If errors persist:**
   - Check browser Network tab
   - Look at failed requests
   - Check response status and body

## API Endpoints Fixed

- `GET /api/app-projects/[id]` - Fetch project details
- `GET /api/app-projects/[id]/files` - Fetch project files

Both now have:
- Better error handling
- Database connection error handling
- More informative error messages

## Next Steps

If the error persists:
1. Check server logs for specific errors
2. Verify database connection
3. Check authentication status
4. Review browser Network tab for failed requests

