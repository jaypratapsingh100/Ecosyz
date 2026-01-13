# How to Get Your Authentication Token

To test API endpoints that require authentication, you need to get your session token from the browser.

## Method 1: Using Browser DevTools (Easiest)

### Step 1: Sign In to Your Application

1. Open your browser and go to `http://localhost:3000`
2. Sign in with your account (email/password or OAuth)
3. Make sure you're successfully authenticated

### Step 2: Open Browser DevTools

- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
- **Safari**: Press `Cmd+Option+I` (Mac) - you may need to enable Developer menu first

### Step 3: Navigate to Application/Storage Tab

- **Chrome/Edge**: Click on "Application" tab
- **Firefox**: Click on "Storage" tab
- **Safari**: Click on "Storage" tab

### Step 4: Find Cookies

1. In the left sidebar, expand "Cookies"
2. Click on `http://localhost:3000` (or your domain)
3. Look for the cookie named `sb-access-token`
4. Copy the **Value** of this cookie

### Step 5: Use the Token

Replace `YOUR_TOKEN` in your curl command with the actual token value:

```bash
curl -X POST http://localhost:3000/api/community/groups \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"name": "Test Group", "isPublic": true}'
```

## Method 2: Using Browser Console (Alternative)

### Step 1: Open Console

Press `F12` and go to "Console" tab

### Step 2: Run JavaScript Command

```javascript
document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
```

This will print your token in the console. Copy it.

## Method 3: Using Network Tab

### Step 1: Open Network Tab

Press `F12` and go to "Network" tab

### Step 2: Make Any Authenticated Request

- Navigate to `/community` or any authenticated page
- Look for any API request in the Network tab

### Step 3: Inspect Request Headers

1. Click on any request
2. Go to "Headers" section
3. Look for "Cookie" header
4. Find `sb-access-token=...` and copy the value

## Quick Test Script

Create a helper script to get your token:

```bash
# get-token.sh
# This will extract the token from your browser cookies
# Note: This requires browser automation tools

# For now, use Method 1 (DevTools) - it's the easiest
```

## Example: Complete Workflow

1. **Sign in**: Go to `http://localhost:3000/auth` and sign in
2. **Get token**: Use DevTools → Application → Cookies → `sb-access-token`
3. **Copy token**: Copy the entire value (it's a long JWT string)
4. **Use in curl**:
   ```bash
   TOKEN="your-actual-token-here"
   
   curl -X POST http://localhost:3000/api/community/groups \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=$TOKEN" \
     -d '{
       "name": "My Test Group",
       "description": "A test group",
       "isPublic": true
     }'
   ```

## Important Notes

- **Token Expires**: Tokens expire after some time. If you get "Not authenticated" errors, sign in again and get a new token.
- **Secure**: Never share your token publicly or commit it to git.
- **Format**: The token is a JWT (JSON Web Token) - it's a long string starting with `eyJ...`

## Troubleshooting

### "Not authenticated" error
- Make sure you're signed in
- Get a fresh token (tokens expire)
- Check that you copied the entire token value

### Can't find the cookie
- Make sure you're signed in
- Check that cookies are enabled in your browser
- Try signing out and signing in again

### Token doesn't work
- Token might be expired - get a new one
- Make sure you're copying the entire token (it's usually very long)
- Check that the server is running






