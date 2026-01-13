# Fix: "Invalid login credentials" Error

## Problem
When trying to sign in, you get an "Invalid login credentials" error.

## Common Causes

1. **Wrong email or password** - Most common cause
2. **Account doesn't exist** - Need to sign up first
3. **Email not confirmed** - Account created but email not verified
4. **Supabase configuration issue** - Missing or incorrect environment variables

## Solutions

### Solution 1: Verify Your Credentials
- Double-check your email address (check for typos)
- Make sure you're using the correct password
- Try resetting your password if you're unsure

### Solution 2: Sign Up First
If you don't have an account:
1. Click "Don't have an account? Sign up"
2. Create a new account with your email and password
3. Then try signing in

### Solution 3: Check Email Confirmation
If you just signed up:
1. Check your email inbox for a confirmation email
2. Click the confirmation link
3. Then try signing in again

### Solution 4: Reset Your Password
1. Click "Forgot your password?" on the sign-in page
2. Enter your email address
3. Check your email for reset instructions
4. Follow the link to reset your password
5. Sign in with your new password

### Solution 5: Check Supabase Configuration
If you're a developer and this is a configuration issue:

1. **Check environment variables:**
   ```bash
   # Make sure these are set in .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Verify Supabase project:**
   - Go to your Supabase dashboard
   - Check that your project is active
   - Verify the URL and keys match your .env.local

3. **Check Supabase Auth settings:**
   - Go to Authentication → Settings
   - Make sure email authentication is enabled
   - Check if email confirmation is required

## Improved Error Messages

The error handling has been improved to show more helpful messages:

- **"Invalid email or password"** - Wrong credentials
- **"No account found with this email address"** - Need to sign up first
- **"Please verify your email address"** - Email confirmation needed
- **"Too many login attempts"** - Rate limited, wait a few minutes

## Testing

1. **Try signing up:**
   - Use a new email address
   - Create an account
   - Sign in with those credentials

2. **Try OAuth (GitHub/Google):**
   - Click "Continue with GitHub" or "Continue with Google"
   - This bypasses email/password issues

3. **Check browser console:**
   - Open DevTools → Console
   - Look for detailed error messages
   - Check Network tab for API responses

## Still Having Issues?

1. **Clear browser cache and cookies**
2. **Try in incognito/private mode**
3. **Check if Supabase service is down**
4. **Contact support with:**
   - Your email address (if safe to share)
   - Error message from console
   - Steps you've tried

## For Developers

### Debug Steps:
1. Check server logs for detailed errors
2. Verify Supabase client is initialized:
   ```typescript
   // Check if supabase is null
   console.log('Supabase:', supabase);
   ```
3. Test Supabase connection:
   ```bash
   # In Supabase dashboard → SQL Editor
   SELECT * FROM auth.users LIMIT 1;
   ```
4. Check authentication logs in Supabase dashboard

### Common Configuration Issues:
- Missing `NEXT_PUBLIC_SUPABASE_URL`
- Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Wrong Supabase project URL
- Email confirmation disabled but required
- Rate limiting enabled





