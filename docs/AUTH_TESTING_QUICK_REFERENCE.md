# Authentication Testing - Quick Reference

## 🚀 Quick Start

### 1. Start Server
```bash
npm run dev
```

### 2. Test Pages
- **Main Auth Page**: http://localhost:3000/auth
- **Test Page**: http://localhost:3000/auth-test
- **Reset Password**: http://localhost:3000/auth/reset-password

---

## 📝 API Endpoints Quick Test

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"Test User"}'
```

### Sign In
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### Get Session
```bash
curl http://localhost:3000/api/auth/session -b cookies.txt
```

### Sign Out
```bash
curl -X POST http://localhost:3000/api/auth/signout -b cookies.txt
```

### Request Password Reset
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Update Password
```bash
curl -X POST http://localhost:3000/api/auth/update-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","token":"token_here","password":"newpass123"}'
```

### OAuth Initiation
- GitHub: http://localhost:3000/api/auth/github
- Google: http://localhost:3000/api/auth/google

---

## 🧪 Browser Console Testing

### Check Authentication Status
```javascript
fetch('/api/auth/session', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

### Sign In
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

### Sign Out
```javascript
fetch('/api/auth/signout', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

---

## ✅ Testing Checklist

### Basic Flow
- [ ] Sign up → Creates account
- [ ] Sign in → Sets cookies
- [ ] Get session → Returns user data
- [ ] Sign out → Clears cookies

### Password Reset
- [ ] Request reset → Gets token/email
- [ ] Validate token → Returns true/false
- [ ] Reset password → Updates password
- [ ] Sign in with new password → Works

### OAuth
- [ ] GitHub OAuth → Redirects correctly
- [ ] Google OAuth → Redirects correctly
- [ ] Callback → Sets session

### Error Cases
- [ ] Invalid credentials → Error message
- [ ] Missing fields → Validation error
- [ ] Invalid token → Error message
- [ ] Unauthenticated request → 401 error

---

## 🔍 Verify Cookies

**In Browser DevTools:**
1. Open Application tab
2. Go to Cookies → http://localhost:3000
3. Look for:
   - `sb-access-token` (should exist when logged in)
   - `sb-refresh-token` (should exist when logged in)

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Service unavailable" | Check Supabase env vars |
| "Invalid credentials" | Verify email/password |
| Cookies not set | Check browser settings |
| OAuth not working | Verify callback URL |

---

## 📚 Full Documentation

See [AUTHENTICATION_TESTING_GUIDE.md](./AUTHENTICATION_TESTING_GUIDE.md) for detailed testing instructions.
