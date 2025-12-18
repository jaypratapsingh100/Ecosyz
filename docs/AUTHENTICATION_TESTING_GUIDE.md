# Authentication Testing Guide

This guide provides comprehensive testing instructions for all authentication functionalities in the Ecosyz application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Email/Password Authentication](#emailpassword-authentication)
3. [OAuth Authentication](#oauth-authentication)
4. [Password Reset Flow](#password-reset-flow)
5. [Session Management](#session-management)
6. [Account Management](#account-management)
7. [Error Scenarios](#error-scenarios)
8. [Integration Testing](#integration-testing)

---

## Prerequisites

### Environment Setup

1. **Ensure environment variables are configured:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Verify Supabase connection:**
   - Visit `/auth-test` page
   - Check browser console for any connection errors

---

## Email/Password Authentication

### 1. User Registration (Sign Up)

#### UI Testing

**Steps:**
1. Navigate to `/auth` page
2. Click "Don't have an account? Sign up"
3. Fill in the form:
   - **Name**: Test User
   - **Email**: test@example.com
   - **Password**: test123456 (minimum 6 characters)
4. Click "Create Account"

**Expected Results:**
- ✅ Success toast notification appears
- ✅ Redirects to `/app-builder` after 1 second
- ✅ User is logged in automatically
- ✅ User record created in Supabase
- ✅ User record synced to Prisma database

**Validation:**
- Check browser DevTools → Application → Cookies
- Should see `sb-access-token` and `sb-refresh-token` cookies
- Visit `/api/auth/session` to verify session

#### API Testing

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "message": "Account created successfully! You can now sign in.",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "emailConfirmed": false
  }
}
```

**Using Postman/Thunder Client:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (JSON):
  ```json
  {
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }
  ```

#### Edge Cases to Test

1. **Duplicate Email:**
   - Try signing up with the same email twice
   - Expected: Error message about email already existing

2. **Invalid Email Format:**
   - Enter: `invalid-email`
   - Expected: Validation error "Please enter a valid email address"

3. **Weak Password:**
   - Enter password less than 6 characters
   - Expected: Validation error "Password must be at least 6 characters"

4. **Missing Fields:**
   - Submit form without name (should work, uses email prefix)
   - Submit without email (should fail)
   - Submit without password (should fail)

---

### 2. User Login (Sign In)

#### UI Testing

**Steps:**
1. Navigate to `/auth` page
2. Ensure you're on "Sign In" tab (default)
3. Enter credentials:
   - **Email**: test@example.com
   - **Password**: test123456
4. Click "Sign In"

**Expected Results:**
- ✅ Success toast: "Welcome back!"
- ✅ Redirects to `/app-builder`
- ✅ Session cookies set
- ✅ User can access protected routes

**Validation:**
- Check cookies in DevTools
- Visit `/api/auth/session` - should return user data
- Visit `/auth-test` - should show authenticated status

#### API Testing

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

**Note:** The `-c cookies.txt` flag saves cookies for subsequent requests.

**Expected Response:**
```json
{
  "message": "Signed in successfully",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

**Using Browser Console:**
```javascript
fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123456'
  })
})
.then(r => r.json())
.then(console.log)
```

#### Edge Cases to Test

1. **Wrong Password:**
   - Enter correct email, wrong password
   - Expected: "Invalid email or password" error

2. **Non-existent Email:**
   - Enter email that doesn't exist
   - Expected: "Invalid email or password" or "No account found" error

3. **Empty Fields:**
   - Submit without email → Validation error
   - Submit without password → Validation error

4. **Email Not Confirmed (if enabled):**
   - If email confirmation is enabled in Supabase
   - Expected: "Please verify your email address" error

---

### 3. Sign Out

#### UI Testing

**Steps:**
1. While logged in, find sign out button/link
2. Click sign out

**Note:** The main auth page doesn't have a sign out button. You can:
- Use the test page: `/auth-test` has a sign out link
- Or call the API directly

#### API Testing

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/signout \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Signed out successfully"
}
```

**Using Browser Console:**
```javascript
fetch('/api/auth/signout', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

**Validation:**
- Check cookies - `sb-access-token` and `sb-refresh-token` should be deleted
- Visit `/api/auth/session` - should return 401 Unauthorized
- Visit `/auth-test` - should show "Not authenticated"

---

## OAuth Authentication

### 1. GitHub OAuth

#### UI Testing

**Steps:**
1. Navigate to `/auth` page
2. Click "Continue with GitHub" button
3. You'll be redirected to GitHub authorization page
4. Authorize the application
5. You'll be redirected back to `/auth/callback`
6. Then redirected to `/app-builder`

**Expected Results:**
- ✅ Redirects to GitHub login page
- ✅ After authorization, redirects back
- ✅ Session cookies set automatically
- ✅ User logged in

**Prerequisites:**
- GitHub OAuth app must be configured in Supabase
- Callback URL must match: `http://localhost:3000/auth/callback`

#### API Testing

**Direct URL Access:**
```bash
# Open in browser or use curl
curl -L http://localhost:3000/api/auth/github
```

**Expected:** Redirects to GitHub authorization URL

**Manual Flow:**
1. Visit `http://localhost:3000/api/auth/github`
2. Complete GitHub authorization
3. Check redirect to `/auth/callback`
4. Verify cookies are set
5. Verify redirect to `/app-builder`

---

### 2. Google OAuth

#### UI Testing

**Steps:**
1. Navigate to `/auth` page
2. Click "Continue with Google" button
3. You'll be redirected to Google authorization page
4. Select Google account and authorize
5. Redirected back to `/auth/callback`
6. Then redirected to `/app-builder`

**Expected Results:**
- ✅ Redirects to Google login page
- ✅ After authorization, redirects back
- ✅ Session cookies set automatically
- ✅ User logged in

**Prerequisites:**
- Google OAuth credentials configured in Supabase
- Callback URL: `http://localhost:3000/auth/callback`

#### API Testing

**Direct URL Access:**
```bash
curl -L http://localhost:3000/api/auth/google
```

**Expected:** Redirects to Google authorization URL

---

### OAuth Callback Testing

**Test Callback Handler:**
```bash
# Simulate callback with code (won't work without valid code)
curl "http://localhost:3000/auth/callback?code=test_code&state=test_state"
```

**Expected:** Redirects to `/auth?error=code_exchange_failed` (with invalid code)

**Note:** OAuth callbacks require valid authorization codes from providers, so full testing requires actual OAuth flow.

---

## Password Reset Flow

### 1. Request Password Reset

#### UI Testing

**Steps:**
1. Navigate to `/auth` page
2. Click "Forgot your password?" link
3. Enter email address
4. Click "Send Reset Link"

**Expected Results:**
- ✅ Success toast notification
- ✅ In development: Reset URL shown in toast (clickable)
- ✅ In production: Email sent with reset link
- ✅ Modal closes after success

#### API Testing

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response (Development):**
```json
{
  "message": "Password reset link generated, but email sending failed. Using direct URL for development.",
  "resetUrl": "http://localhost:3000/auth/reset-password?email=test@example.com&token=abc123..."
}
```

**Expected Response (Production):**
```json
{
  "message": "Password reset email sent successfully. Please check your inbox."
}
```

**Using Browser Console:**
```javascript
fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com' })
})
.then(r => r.json())
.then(console.log)
```

---

### 2. Validate Reset Token

#### API Testing

**Using cURL:**
```bash
curl "http://localhost:3000/api/auth/reset-password?email=test@example.com&token=your_token_here"
```

**Expected Response:**
```json
{
  "valid": true
}
```

**Or if invalid/expired:**
```json
{
  "valid": false
}
```

**Note:** Token expires after 1 hour (TOKEN_EXPIRY in utils.ts)

---

### 3. Reset Password Page

#### UI Testing

**Steps:**
1. Get reset URL from step 1 (or use direct URL)
2. Navigate to `/auth/reset-password?email=test@example.com&token=abc123`
3. Page should validate token automatically
4. If valid, show password reset form
5. Enter new password (min 6 characters)
6. Confirm password
7. Click "Update Password"

**Expected Results:**
- ✅ Token validated on page load
- ✅ If invalid: Error message shown
- ✅ If valid: Form displayed
- ✅ Password updated successfully
- ✅ Redirects to `/auth` page
- ✅ Success toast notification

**Direct URL Access:**
```
http://localhost:3000/auth/reset-password?email=test@example.com&token=your_token
```

---

### 4. Update Password

#### API Testing

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/update-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "valid_token_here",
    "password": "newpassword123"
  }'
```

**Expected Response:**
```json
{
  "message": "Password has been updated successfully",
  "success": true
}
```

**Note:** Password must be at least 8 characters for API (different from UI validation)

**Edge Cases:**
- Invalid token → 400 error
- Expired token → 400 error
- Password too short → 400 error
- Email mismatch → 400 error

---

## Session Management

### 1. Get Current Session

#### UI Testing

**Visit Test Page:**
- Navigate to `/auth-test`
- Shows authentication status
- Displays user information if logged in

#### API Testing

**Using cURL:**
```bash
curl http://localhost:3000/api/auth/session \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

**Expected Response (Authenticated):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "avatarUrl": null
  }
}
```

**Expected Response (Not Authenticated):**
```json
{
  "error": "Not authenticated"
}
```
Status: 401

**Using Browser Console:**
```javascript
fetch('/api/auth/session', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

---

### 2. Session Persistence Testing

**Test Steps:**
1. Log in via `/auth` page
2. Close browser tab
3. Open new tab
4. Visit `/api/auth/session`
5. Should still return user data (cookies persist)

**Test Cookie Expiry:**
- Access token: Expires based on Supabase session expiry
- Refresh token: 30 days expiry
- Check cookie expiration dates in DevTools

---

## Account Management

### 1. Delete Account

#### API Testing

**Using cURL:**
```bash
curl -X DELETE http://localhost:3000/api/auth/delete \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "User deleted successfully"
}
```

**Validation:**
- User deleted from Supabase
- User deleted from Prisma database
- Session invalidated
- Cannot login with deleted account

**Note:** This requires authentication (valid session cookies)

---

## Error Scenarios

### Test Invalid Credentials

```bash
# Wrong password
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}'

# Expected: 400 error with message
```

### Test Missing Fields

```bash
# Missing email
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"password": "test123456"}'

# Expected: 400 validation error
```

### Test Unauthenticated Requests

```bash
# Access protected endpoint without auth
curl http://localhost:3000/api/auth/session

# Expected: 401 Unauthorized
```

### Test Invalid Tokens

```bash
# Invalid reset token
curl "http://localhost:3000/api/auth/reset-password?email=test@example.com&token=invalid"

# Expected: {"valid": false}
```

---

## Integration Testing

### Complete User Flow Test

**Test Scenario: Full User Journey**

1. **Sign Up:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email": "newuser@test.com", "password": "password123", "name": "New User"}'
   ```

2. **Sign In:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signin \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -d '{"email": "newuser@test.com", "password": "password123"}'
   ```

3. **Check Session:**
   ```bash
   curl http://localhost:3000/api/auth/session -b cookies.txt
   ```

4. **Request Password Reset:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"email": "newuser@test.com"}'
   ```

5. **Reset Password (use token from step 4):**
   ```bash
   curl -X POST http://localhost:3000/api/auth/update-password \
     -H "Content-Type: application/json" \
     -d '{"email": "newuser@test.com", "token": "token_from_step_4", "password": "newpassword123"}'
   ```

6. **Sign In with New Password:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signin \
     -H "Content-Type: application/json" \
     -c cookies2.txt \
     -d '{"email": "newuser@test.com", "password": "newpassword123"}'
   ```

7. **Sign Out:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signout -b cookies2.txt
   ```

---

## Browser-Based Testing

### Using Browser DevTools

1. **Open DevTools (F12)**
2. **Go to Network tab**
3. **Perform actions in UI**
4. **Inspect API calls:**
   - Check request/response headers
   - Verify cookies are sent/received
   - Check response status codes
   - Verify response data

### Test Authentication State

**In Browser Console:**
```javascript
// Check if user is authenticated
fetch('/api/auth/session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    if (data.user) {
      console.log('✅ Authenticated:', data.user);
    } else {
      console.log('❌ Not authenticated');
    }
  });

// Check cookies
document.cookie.split(';').forEach(c => console.log(c.trim()));
```

---

## Automated Testing Script

Create a test script (`test-auth.sh`):

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
EMAIL="test$(date +%s)@example.com"
PASSWORD="test123456"

echo "🧪 Testing Authentication APIs"
echo "================================"

# 1. Sign Up
echo -e "\n1. Testing Sign Up..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Test User\"}")

echo "$SIGNUP_RESPONSE" | jq '.'

# 2. Sign In
echo -e "\n2. Testing Sign In..."
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$SIGNIN_RESPONSE" | jq '.'

# 3. Get Session
echo -e "\n3. Testing Session..."
SESSION_RESPONSE=$(curl -s "$BASE_URL/api/auth/session" \
  -b cookies.txt)

echo "$SESSION_RESPONSE" | jq '.'

# 4. Sign Out
echo -e "\n4. Testing Sign Out..."
SIGNOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signout" \
  -b cookies.txt)

echo "$SIGNOUT_RESPONSE" | jq '.'

echo -e "\n✅ Testing Complete!"
```

**Run the script:**
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## Testing Checklist

### Email/Password Auth
- [ ] Sign up with valid credentials
- [ ] Sign up with duplicate email (should fail)
- [ ] Sign up with invalid email format (should fail)
- [ ] Sign up with weak password (should fail)
- [ ] Sign in with valid credentials
- [ ] Sign in with wrong password (should fail)
- [ ] Sign in with non-existent email (should fail)
- [ ] Sign out successfully
- [ ] Session persists after page reload

### OAuth Auth
- [ ] GitHub OAuth redirects correctly
- [ ] Google OAuth redirects correctly
- [ ] OAuth callback handles success
- [ ] OAuth callback handles errors
- [ ] Session created after OAuth

### Password Reset
- [ ] Request reset with valid email
- [ ] Request reset with invalid email (should fail)
- [ ] Reset token validation works
- [ ] Reset password with valid token
- [ ] Reset password with invalid token (should fail)
- [ ] Reset password with expired token (should fail)

### Session Management
- [ ] Get session when authenticated
- [ ] Get session when not authenticated (401)
- [ ] Session cookies set correctly
- [ ] Session cookies deleted on sign out

### Error Handling
- [ ] Invalid input validation
- [ ] Network error handling
- [ ] Supabase service unavailable handling
- [ ] Proper error messages displayed

---

## Troubleshooting

### Common Issues

**1. "Authentication service unavailable"**
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify Supabase project is active (not paused)

**2. "Invalid login credentials"**
- Verify email/password combination
- Check if email confirmation is required
- Verify user exists in Supabase dashboard

**3. OAuth redirects not working**
- Check callback URL matches Supabase settings
- Verify OAuth app credentials in Supabase
- Check browser console for errors

**4. Cookies not persisting**
- Check cookie settings (httpOnly, secure, sameSite)
- Verify domain/path settings
- Check browser privacy settings

**5. Session not found**
- Verify cookies are being sent with requests
- Check cookie expiration dates
- Verify refresh token is valid

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Authentication Documentation](./authentication.md)
- [API Documentation](./api-documentation.md)

---

**Last Updated:** $(date)
**Tested With:** Next.js 14+, Supabase Auth, Prisma
