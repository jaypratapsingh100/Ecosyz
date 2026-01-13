# Community Features Testing Guide

This guide will help you test all the community features that have been implemented.

## Prerequisites

1. **Database Migration**: First, apply the database migration:
   ```bash
   # For development
   npx prisma migrate dev
   
   # Or if you want to use the existing migration file
   npx prisma migrate deploy
   ```

2. **Start the Development Server**:
   ```bash
   npm run dev
   ```

3. **Have a Test User Account**: Make sure you're signed in to test authenticated features.

## Testing Checklist

### 1. Database Setup ✅

First, verify the database schema is updated:

```bash
# Check migration status
npm run db:status

# Open Prisma Studio to view data
npm run db:studio
```

### 2. Testing Community Groups

#### 2.1 Create a Group

**Via Frontend:**
1. Navigate to `/community`
2. Click on "Groups" tab
3. Click "Create Group" (you may need to add this button)
4. Fill in:
   - Name: "AI Research Group"
   - Description: "Discussing AI and machine learning"
   - Topics: ["AI", "Machine Learning", "Research"]
   - Make it Public: Yes

**Via API (using curl or Postman):**
```bash
# First, get your session cookie from browser DevTools
# Then test the API:

curl -X POST http://localhost:3000/api/community/groups \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "name": "Climate Innovation",
    "description": "Discussing climate solutions",
    "topics": ["climate", "sustainability"],
    "isPublic": true
  }'
```

#### 2.2 List Groups

**Via Frontend:**
- Navigate to `/community` → Groups tab
- You should see all public groups

**Via API:**
```bash
curl http://localhost:3000/api/community/groups
```

#### 2.3 Join a Group

**Via Frontend:**
- Click on a group card
- Click "Join Group" button

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/groups/GROUP_ID/join \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

#### 2.4 View Group Members

**Via API:**
```bash
curl http://localhost:3000/api/community/groups/GROUP_ID/members
```

### 3. Testing Discussions

#### 3.1 Create a Discussion in a Group

**Via Frontend:**
1. Navigate to a group detail page
2. Click "New Discussion"
3. Fill in title and content
4. Add tags if needed
5. Submit

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/discussions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Best practices for AI research",
    "content": "What are your thoughts on...",
    "groupId": "GROUP_ID",
    "tags": ["ai", "research"]
  }'
```

#### 3.2 Create a Discussion in a Workspace

**Via Frontend:**
1. Navigate to any workspace (`/workspaces/WORKSPACE_ID`)
2. Click on "Discussions" tab
3. Click "New Discussion"
4. Create a discussion

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/discussions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Project update",
    "content": "Here is what I found...",
    "workspaceId": "WORKSPACE_ID"
  }'
```

#### 3.3 Reply to a Discussion

**Via Frontend:**
- Open a discussion thread
- Click "Reply"
- Write your reply
- Submit

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/discussions/DISCUSSION_ID/replies \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "content": "Great point! I agree..."
  }'
```

### 4. Testing Events

#### 4.1 Create an Event

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/events \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "AI Workshop 2024",
    "description": "Learn about AI and machine learning",
    "startDate": "2024-12-15T10:00:00Z",
    "endDate": "2024-12-15T16:00:00Z",
    "location": "Online",
    "eventUrl": "https://zoom.us/...",
    "category": "workshop",
    "isPublic": true
  }'
```

#### 4.2 List Events

**Via Frontend:**
- Navigate to `/community` → Events tab
- Filter by status (upcoming/past)
- Filter by category

**Via API:**
```bash
# Upcoming events
curl "http://localhost:3000/api/community/events?status=upcoming"

# Past events
curl "http://localhost:3000/api/community/events?status=past"
```

#### 4.3 Register for an Event

**Via Frontend:**
- Click on an event
- Click "Register"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/events/EVENT_ID/register \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

#### 4.4 Cancel Registration

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/events/EVENT_ID/cancel \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### 5. Testing Challenges

#### 5.1 Create a Challenge

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/challenges \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "Build a Climate Solution",
    "description": "Create an innovative solution for climate change",
    "requirements": "Must be open source",
    "prize": "$1000",
    "startDate": "2024-12-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "category": "innovation",
    "status": "active"
  }'
```

#### 5.2 List Challenges

**Via Frontend:**
- Navigate to `/community` → Challenges tab
- Filter by status and category

**Via API:**
```bash
curl "http://localhost:3000/api/community/challenges?status=active"
```

#### 5.3 Submit to a Challenge

**Via Frontend:**
- Click on a challenge
- Click "Submit Entry"
- Fill in submission details

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/challenges/CHALLENGE_ID/submit \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "title": "My Climate Solution",
    "description": "This solution addresses...",
    "url": "https://github.com/username/project"
  }'
```

#### 5.4 View Submissions

**Via API:**
```bash
curl http://localhost:3000/api/community/challenges/CHALLENGE_ID/submissions
```

### 6. Testing User Social Features

#### 6.1 Follow a User

**Via API:**
```bash
curl -X POST http://localhost:3000/api/community/users/USER_ID/follow \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

#### 6.2 Get User Followers

**Via API:**
```bash
curl http://localhost:3000/api/community/users/USER_ID/followers
```

#### 6.3 Get User Following

**Via API:**
```bash
curl http://localhost:3000/api/community/users/USER_ID/following
```

#### 6.4 Get User Activity Feed

**Via Frontend:**
- Navigate to `/community` → Activity Feed tab

**Via API:**
```bash
curl http://localhost:3000/api/community/users/USER_ID/activity
```

### 7. Testing Workspace Discussions

#### 7.1 Access Workspace Discussions

**Via Frontend:**
1. Navigate to any workspace: `/workspaces/WORKSPACE_ID`
2. Click on "Discussions" tab
3. You should see the discussions interface

#### 7.2 Create Discussion in Workspace

- Click "New Discussion"
- Fill in title and content
- Submit

### 8. Browser Testing Workflow

#### Complete User Journey Test:

1. **Sign In**
   - Go to `/auth` and sign in

2. **Create a Group**
   - Navigate to `/community`
   - Create a new group
   - Verify it appears in the list

3. **Join the Group**
   - Click on the group
   - Join it
   - Verify you're now a member

4. **Create a Discussion**
   - In the group, create a discussion
   - Add a reply to your discussion

5. **Create an Event**
   - Go to Events tab
   - Create an event
   - Register for it

6. **Create a Challenge**
   - Go to Challenges tab
   - Create a challenge
   - Submit an entry

7. **Test Workspace Discussions**
   - Go to a workspace
   - Switch to Discussions tab
   - Create a discussion

8. **View Activity Feed**
   - Go to Activity Feed tab
   - Verify your activities appear

## Testing with Browser DevTools

### 1. Check Network Requests

Open DevTools → Network tab:
- Verify API calls are successful (200 status)
- Check request/response payloads
- Look for any errors

### 2. Check Console for Errors

Open DevTools → Console:
- Look for JavaScript errors
- Check for API errors

### 3. Inspect Database

Use Prisma Studio:
```bash
npm run db:studio
```

Verify data is being created:
- Check `CommunityGroup` table
- Check `Discussion` table
- Check `Event` table
- Check `Challenge` table
- Check `Activity` table

## Common Issues & Solutions

### Issue: "Not authenticated" errors
**Solution**: Make sure you're signed in and cookies are being sent with requests.

### Issue: Migration errors
**Solution**: 
```bash
# Reset and reapply migrations (WARNING: deletes data)
npx prisma migrate reset

# Or apply migration manually
npx prisma migrate deploy
```

### Issue: Prisma client out of sync
**Solution**:
```bash
npx prisma generate
```

### Issue: Groups not showing
**Solution**: 
- Check if groups are marked as `isPublic: true`
- Verify the API is returning data
- Check browser console for errors

## Automated Testing (Future)

To add automated tests, create test files:

```typescript
// tests/community/groups.test.ts
import { describe, it, expect } from 'vitest';

describe('Community Groups API', () => {
  it('should create a group', async () => {
    // Test implementation
  });
  
  it('should list groups', async () => {
    // Test implementation
  });
});
```

Run tests:
```bash
npm test
```

## Quick Test Script

Create a simple test script to verify all endpoints:

```bash
#!/bin/bash
# test-community.sh

BASE_URL="http://localhost:3000"
# Add your auth token here
AUTH_TOKEN="YOUR_TOKEN"

echo "Testing Community Groups..."
curl -s "$BASE_URL/api/community/groups" | jq .

echo "Testing Events..."
curl -s "$BASE_URL/api/community/events" | jq .

echo "Testing Challenges..."
curl -s "$BASE_URL/api/community/challenges" | jq .
```

## Next Steps

1. ✅ Run database migration
2. ✅ Test each feature via frontend
3. ✅ Test API endpoints directly
4. ✅ Verify data in Prisma Studio
5. ✅ Test error cases (unauthorized, invalid data, etc.)
6. ✅ Test edge cases (empty lists, pagination, etc.)

## Need Help?

- Check browser console for errors
- Check server logs for API errors
- Use Prisma Studio to inspect database
- Review API route files for expected request/response formats






