# Ecosyz Authentication API Testing Guide

This guide provides comprehensive curl commands to test all authentication and profile APIs.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The server will run on `http://localhost:3000` (or the port shown in the terminal)

## API Endpoints Testing

### 1. User Registration (Sign Up)

```bash
curl -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

### 2. User Authentication (Sign In)

```bash
curl -X POST "http://localhost:3000/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }' \
  -c cookies.txt
```

**Note:** The `-c cookies.txt` flag saves session cookies for subsequent requests.

### 3. Get Current Session

```bash
curl -X GET "http://localhost:3000/api/auth/session" \
  -b cookies.txt
```

### 4. Get User Profile

```bash
curl -X GET "http://localhost:3000/api/profile" \
  -b cookies.txt
```

### 5. Update User Profile

```bash
curl -X PUT "http://localhost:3000/api/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "displayName": "Updated Test User",
    "bio": "This is my updated bio",
    "preferences": {
      "theme": "dark",
      "language": "en-IN",
      "emailNotifications": true,
      "marketingEmails": false
    }
  }'
```

### 6. Upload/Update Avatar

```bash
curl -X PUT "http://localhost:3000/api/profile/avatar" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "avatarUrl": "https://example.com/my-avatar.jpg"
  }'
```

### 7. Sign Out

```bash
curl -X POST "http://localhost:3000/api/auth/signout" \
  -b cookies.txt
```

### 9. Delete User Account

```bash
curl -X DELETE "http://localhost:3000/api/auth/delete" \
  -b cookies.txt
```

**Note:** This endpoint requires authentication and will permanently delete the user account from both Supabase and the local database.

## Automated Testing Script

Run the comprehensive test script:

```bash
./test-auth-apis.sh
```

This script will:
- Test all endpoints in sequence
- Save cookies automatically
- Show responses for each API call
- Clean up cookies after testing

## Expected Responses

### Successful Sign Up
```json
{
  "user": {
    "id": "user-uuid",
    "email": "test@example.com",
    "user_metadata": {
      "name": "Test User"
    }
  }
}
```

### Successful Sign In
```json
{
  "user": {
    "id": "user-uuid",
    "email": "test@example.com"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

### Successful Profile Update
```json
{
  "id": "profile-uuid",
  "userId": "user-uuid",
  "displayName": "Updated Test User",
  "bio": "This is my updated bio",
  "preferences": {
    "theme": "dark",
    "language": "en-IN",
    "emailNotifications": true
  }
}
```

## Error Responses

### Authentication Required
```json
{
  "error": "Not authenticated"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "details": [...]
}
```

## Troubleshooting

1. **"Not authenticated" errors**: Make sure you're using `-b cookies.txt` and that the user is signed in
2. **Foreign key constraint errors**: The `ensureUserInDb` function should prevent these
3. **Port issues**: Check that the server is running on the correct port (usually 3001)
4. **Cookie issues**: Delete `cookies.txt` and sign in again if cookies become invalid

## Testing OAuth Providers

### Google OAuth
```bash
curl -X GET "http://localhost:3000/api/auth/google"
```

### GitHub OAuth
```bash
curl -X GET "http://localhost:3000/api/auth/github"
```

## Password Reset

### Request Password Reset
```bash
curl -X POST "http://localhost:3000/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### Update Password
```bash
curl -X POST "http://localhost:3000/api/auth/update-password" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "password": "newpassword123"
  }'
```