# Step-by-Step Guide: Testing All Community Features

Follow these steps in order to test all community features.

## Prerequisites Setup

### Step 1: Apply Database Migration

```bash
# Navigate to project directory
cd /Users/sonyyadav/Desktop/openIdeaFrontend/Ecosyz-search

# Check migration status
npm run db:status

# Apply the migration (choose one):
# Option A: Create new migration (development)
npx prisma migrate dev --name add_community_features

# Option B: Use existing migration file
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

**Expected Result**: Migration should complete successfully. You should see tables created in your database.

### Step 2: Start Development Server

```bash
# Start the server
npm run dev
```

**Expected Result**: Server starts on `http://localhost:3000` (or your configured port).

**Verify**: Open browser and go to `http://localhost:3000` - you should see the homepage.

---

## Part 1: Authentication Setup

### Step 3: Sign In or Create Account

1. **Navigate to Auth Page**
   - Go to: `http://localhost:3000/auth`
   - Or click "Sign In" in the header

2. **Sign In Options**:
   - **Option A**: Sign in with existing account (email/password)
   - **Option B**: Create new account
   - **Option C**: Sign in with GitHub/Google OAuth

3. **Verify Sign In**
   - You should be redirected to homepage or dashboard
   - Your name/avatar should appear in header

**✅ Checkpoint**: You are now authenticated and can test authenticated features.

---

## Part 2: Testing Community Groups

### Step 4: Navigate to Community Page

1. **Go to Community Page**
   - Click "Community" in navigation, OR
   - Direct URL: `http://localhost:3000/community`

2. **Verify Page Loads**
   - You should see tabs: Groups, Events, Challenges, Activity Feed
   - Groups tab should be active by default

**Expected Result**: Community page loads with Groups tab visible.

### Step 5: Create Your First Group

1. **Open Browser DevTools** (F12 or Right-click → Inspect)
   - Go to Network tab (to see API calls)
   - Go to Console tab (to see any errors)

2. **Create Group via Frontend** (if create button exists):
   - Look for "Create Group" or "+" button
   - Fill in the form:
     - **Name**: "AI Research Community"
     - **Description**: "A group for discussing AI and machine learning research"
     - **Topics**: Type "AI, Machine Learning, Research" (comma-separated)
     - **Public**: Check the box

3. **OR Create Group via API** (if no frontend button):
   - Open a new terminal
   - Get your session cookie from browser DevTools:
     - Application tab → Cookies → `sb-access-token`
     - Copy the value
   - Run this command (replace YOUR_TOKEN):
   ```bash
   curl -X POST http://localhost:3000/api/community/groups \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=YOUR_TOKEN" \
     -d '{
       "name": "AI Research Community",
       "description": "A group for discussing AI and machine learning research",
       "topics": ["AI", "Machine Learning", "Research"],
       "isPublic": true
     }'
   ```

**Expected Result**: 
- Group is created successfully
- You see success message or group appears in list
- Check Network tab - should see POST request to `/api/community/groups` with 201 status

**✅ Checkpoint**: Group created successfully.

### Step 6: View Groups List

1. **Refresh the Groups Tab**
   - Your new group should appear in the list
   - You should see: Group name, description, member count, discussion count

2. **Test Search Functionality**
   - Type "AI" in search box
   - Group should filter to show matching groups

3. **Test Topic Filter**
   - Select "AI" from topic dropdown
   - Group should appear

**Expected Result**: Group appears in list, search and filters work.

### Step 7: View Group Details

1. **Click on a Group Card**
   - Should navigate to group detail page (or open modal)
   - You should see: Full description, members list, discussions

2. **Verify Group Information**
   - Name matches what you created
   - Description is visible
   - Topics are displayed as tags

**Expected Result**: Group details page loads correctly.

### Step 8: Join a Group

1. **If Not Already Member**
   - Click "Join Group" button
   - Button should change to "Leave Group" or "Member"

2. **Verify Membership**
   - Check members list - your name should appear
   - Or check via API:
   ```bash
   curl http://localhost:3000/api/community/groups/GROUP_ID/members
   ```
   (Replace GROUP_ID with actual ID from browser URL or response)

**Expected Result**: You are now a member of the group.

---

## Part 3: Testing Discussions

### Step 9: Create a Discussion in a Group

1. **Navigate to Group Detail Page**
   - Click on your group from the list

2. **Create Discussion**
   - Look for "New Discussion" or "+" button
   - Fill in:
     - **Title**: "What are the latest trends in AI?"
     - **Content**: "I've been reading about transformer models. What do you think?"
     - **Tags**: "AI, Research" (optional)

3. **Submit Discussion**
   - Click "Create Discussion" or "Post"
   - Discussion should appear in the list

**Expected Result**: Discussion created and visible in group.

**✅ Checkpoint**: Discussion created successfully.

### Step 10: View Discussion Thread

1. **Click on Discussion**
   - Should open discussion detail page
   - You should see: Title, content, author info, creation date

2. **Verify Discussion Content**
   - All text is displayed correctly
   - Tags are shown
   - Author information is visible

**Expected Result**: Discussion thread displays correctly.

### Step 11: Reply to Discussion

1. **Scroll to Replies Section**
   - Should see "Reply" button or reply form

2. **Add a Reply**
   - Click "Reply" button
   - Type: "I think transformer models are revolutionary!"
   - Click "Post Reply"

3. **Verify Reply Appears**
   - Reply should appear below original post
   - Reply count should increment
   - Your name should appear as author

**Expected Result**: Reply added successfully.

### Step 12: Test Workspace Discussions

1. **Navigate to Workspaces**
   - Go to: `http://localhost:3000/workspaces`
   - Click on any workspace (or create one if none exist)

2. **Switch to Discussions Tab**
   - Click "Discussions" tab (next to Resources tab)
   - Should see discussions interface

3. **Create Workspace Discussion**
   - Click "New Discussion"
   - Fill in:
     - **Title**: "Project Update"
     - **Content**: "Here's what I've been working on..."
   - Submit

4. **Verify Discussion**
   - Discussion appears in workspace discussions list
   - Can click to view full thread
   - Can add replies

**Expected Result**: Workspace discussions work correctly.

**✅ Checkpoint**: Both group and workspace discussions working.

---

## Part 4: Testing Events

### Step 13: Navigate to Events Tab

1. **Go to Community Page**
   - `http://localhost:3000/community`

2. **Click Events Tab**
   - Should see events interface
   - Filter options: Status (upcoming/past), Category

**Expected Result**: Events tab loads.

### Step 14: Create an Event

1. **Create Event via API** (frontend form may not exist yet):
   ```bash
   curl -X POST http://localhost:3000/api/community/events \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=YOUR_TOKEN" \
     -d '{
       "title": "AI Workshop 2024",
       "description": "Learn about AI and machine learning in this hands-on workshop",
       "startDate": "2024-12-20T10:00:00Z",
       "endDate": "2024-12-20T16:00:00Z",
       "location": "Online",
       "eventUrl": "https://zoom.us/j/123456789",
       "category": "workshop",
       "isPublic": true
     }'
   ```

2. **Verify Event Created**
   - Check Events tab - event should appear
   - Or verify via API:
   ```bash
   curl http://localhost:3000/api/community/events?status=upcoming
   ```

**Expected Result**: Event created and visible.

**✅ Checkpoint**: Event created successfully.

### Step 15: View Event Details

1. **Click on Event Card**
   - Should see event detail page
   - Information displayed: Title, description, date, location, registrations count

2. **Verify Event Information**
   - All details match what you created
   - Date formatted correctly
   - Location/URL visible

**Expected Result**: Event details display correctly.

### Step 16: Register for Event

1. **On Event Detail Page**
   - Click "Register" or "Join Event" button

2. **Verify Registration**
   - Button should change to "Registered" or "Cancel Registration"
   - Registration count should increment
   - Check via API:
   ```bash
   curl http://localhost:3000/api/community/events/EVENT_ID
   ```
   - Your user should appear in registrations list

**Expected Result**: Successfully registered for event.

### Step 17: Test Event Filters

1. **Filter by Status**
   - Select "Upcoming" - should show future events
   - Select "Past" - should show past events

2. **Filter by Category**
   - Select "workshop" - should filter events
   - Select "All Categories" - should show all

**Expected Result**: Filters work correctly.

---

## Part 5: Testing Challenges

### Step 18: Navigate to Challenges Tab

1. **Go to Community Page**
   - `http://localhost:3000/community`

2. **Click Challenges Tab**
   - Should see challenges interface
   - Filter options: Status, Category

**Expected Result**: Challenges tab loads.

### Step 19: Create a Challenge

1. **Create Challenge via API**:
   ```bash
   curl -X POST http://localhost:3000/api/community/challenges \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=YOUR_TOKEN" \
     -d '{
       "title": "Build a Climate Solution",
       "description": "Create an innovative open-source solution to address climate change",
       "requirements": "Must be open source, must include documentation",
       "prize": "$1000 cash prize",
       "startDate": "2024-12-01T00:00:00Z",
       "endDate": "2024-12-31T23:59:59Z",
       "category": "innovation",
       "status": "active"
     }'
   ```

2. **Verify Challenge Created**
   - Check Challenges tab - challenge should appear
   - Status should show as "active"
   - End date should be visible

**Expected Result**: Challenge created successfully.

**✅ Checkpoint**: Challenge created.

### Step 20: View Challenge Details

1. **Click on Challenge Card**
   - Should see challenge detail page
   - Information: Title, description, requirements, prize, dates, submissions count

2. **Verify Challenge Information**
   - All details displayed correctly
   - Status badge visible
   - Dates formatted correctly

**Expected Result**: Challenge details display correctly.

### Step 21: Submit to Challenge

1. **On Challenge Detail Page**
   - Click "Submit Entry" or "Submit" button

2. **Fill Submission Form**
   - **Title**: "My Climate Solution"
   - **Description**: "This solution addresses carbon emissions by..."
   - **URL**: "https://github.com/username/project" (optional)

3. **Submit**
   - Click "Submit" button
   - Should see success message

4. **Verify Submission**
   - Submission count should increment
   - Check via API:
   ```bash
   curl http://localhost:3000/api/community/challenges/CHALLENGE_ID/submissions
   ```
   - Your submission should appear in list

**Expected Result**: Successfully submitted to challenge.

### Step 22: View Challenge Submissions

1. **On Challenge Detail Page**
   - Scroll to submissions section
   - Should see list of all submissions

2. **Verify Submissions Display**
   - Your submission appears
   - Other users' submissions visible (if any)
   - Submission details visible: title, description, author, date

**Expected Result**: Submissions list displays correctly.

---

## Part 6: Testing User Social Features

### Step 23: View User Profile

1. **Get Your User ID**
   - Check browser DevTools → Application → Cookies
   - Or check API response from any endpoint
   - Or use: `http://localhost:3000/api/auth/session`

2. **View User Profile via API**:
   ```bash
   curl http://localhost:3000/api/community/users/YOUR_USER_ID
   ```

3. **Verify Profile Data**
   - User information displayed
   - Counts: followers, following, discussions, groups, events, submissions

**Expected Result**: User profile data retrievable.

### Step 24: Follow Another User

**Note**: You'll need a second user account for this test.

1. **Create Second Account** (if needed)
   - Open incognito/private window
   - Sign up with different email
   - Note the user ID

2. **Follow User**
   ```bash
   curl -X POST http://localhost:3000/api/community/users/OTHER_USER_ID/follow \
     -H "Cookie: sb-access-token=YOUR_TOKEN"
   ```

3. **Verify Following**
   ```bash
   curl http://localhost:3000/api/community/users/YOUR_USER_ID/following
   ```
   - Other user should appear in following list

**Expected Result**: Successfully following another user.

### Step 25: View Followers

1. **Get Followers List**:
   ```bash
   curl http://localhost:3000/api/community/users/YOUR_USER_ID/followers
   ```

2. **Verify Followers**
   - List of users following you
   - User information displayed correctly

**Expected Result**: Followers list retrievable.

---

## Part 7: Testing Activity Feed

### Step 26: View Activity Feed

1. **Navigate to Activity Feed Tab**
   - Go to: `http://localhost:3000/community`
   - Click "Activity Feed" tab

2. **Verify Activities Display**
   - Should see list of activities
   - Activities from you and users you follow
   - Activity types: group_created, discussion_created, event_registered, etc.

**Expected Result**: Activity feed displays activities.

### Step 27: Verify Activity Types

Check that different activity types appear:
- ✅ Group created
- ✅ Group joined
- ✅ Discussion created
- ✅ Reply added
- ✅ Event registered
- ✅ Challenge submitted
- ✅ User followed

**Expected Result**: All activity types tracked and displayed.

---

## Part 8: Database Verification

### Step 28: Verify Data in Database

1. **Open Prisma Studio**:
   ```bash
   npm run db:studio
   ```

2. **Check Each Table**:
   - **CommunityGroup**: Should see your groups
   - **GroupMember**: Should see memberships
   - **Discussion**: Should see discussions
   - **DiscussionReply**: Should see replies
   - **Event**: Should see events
   - **EventRegistration**: Should see registrations
   - **Challenge**: Should see challenges
   - **ChallengeSubmission**: Should see submissions
   - **UserFollow**: Should see follow relationships
   - **Activity**: Should see activity records

**Expected Result**: All data properly stored in database.

---

## Part 9: Error Testing

### Step 29: Test Unauthorized Access

1. **Test Without Authentication**
   - Open incognito window (not signed in)
   - Try to create a group via API:
   ```bash
   curl -X POST http://localhost:3000/api/community/groups \
     -H "Content-Type: application/json" \
     -d '{"name": "Test"}'
   ```
   - Should get 401 Unauthorized

**Expected Result**: Unauthorized requests are rejected.

### Step 30: Test Invalid Data

1. **Test Missing Required Fields**
   ```bash
   curl -X POST http://localhost:3000/api/community/groups \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=YOUR_TOKEN" \
     -d '{}'
   ```
   - Should get 400 Bad Request with validation error

2. **Test Invalid Data Types**
   ```bash
   curl -X POST http://localhost:3000/api/community/groups \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-access-token=YOUR_TOKEN" \
     -d '{"name": 123, "isPublic": "yes"}'
   ```
   - Should get validation error

**Expected Result**: Invalid data is rejected with proper error messages.

### Step 31: Test Duplicate Operations

1. **Try to Join Group Twice**
   - Join a group
   - Try to join again
   - Should get error: "Already a member"

2. **Try to Register for Event Twice**
   - Register for event
   - Try to register again
   - Should get error: "Already registered"

**Expected Result**: Duplicate operations are prevented.

---

## Part 10: UI/UX Testing

### Step 32: Test Responsive Design

1. **Test on Different Screen Sizes**
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

2. **Verify Layout**
   - Cards stack properly on mobile
   - Navigation works on all sizes
   - Forms are usable on mobile

**Expected Result**: UI is responsive and usable on all devices.

### Step 33: Test Loading States

1. **Check Loading Indicators**
   - Create slow network in DevTools (Network tab → Throttling)
   - Navigate between pages
   - Verify loading spinners/messages appear

**Expected Result**: Loading states display correctly.

### Step 34: Test Error Messages

1. **Trigger Errors**
   - Try invalid operations
   - Check error messages display
   - Verify error messages are user-friendly

**Expected Result**: Error messages are clear and helpful.

---

## Final Checklist

### ✅ All Features Tested:

- [ ] Database migration applied
- [ ] Authentication working
- [ ] Groups: Create, List, View, Join
- [ ] Discussions: Create in groups, Create in workspaces, Reply
- [ ] Events: Create, List, Register, Cancel
- [ ] Challenges: Create, List, Submit, View submissions
- [ ] User Social: Follow, View followers/following
- [ ] Activity Feed: View activities
- [ ] Workspace Discussions: Create, View, Reply
- [ ] Error handling: Unauthorized, Invalid data, Duplicates
- [ ] UI/UX: Responsive, Loading states, Error messages
- [ ] Database: All data stored correctly

---

## Troubleshooting

### Issue: "Not authenticated" errors
**Solution**: Make sure you're signed in and cookies are enabled.

### Issue: Migration errors
**Solution**: 
```bash
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate dev
```

### Issue: API returns 500 errors
**Solution**: 
- Check server terminal for error messages
- Verify database connection
- Check Prisma client is generated: `npx prisma generate`

### Issue: Components not rendering
**Solution**:
- Check browser console for errors
- Verify all imports are correct
- Check if API endpoints are responding

### Issue: Data not appearing
**Solution**:
- Check Network tab - are API calls successful?
- Verify data in Prisma Studio
- Check filters/search terms

---

## Next Steps After Testing

1. **Fix any bugs found**
2. **Add missing features** (if any)
3. **Improve error messages** (if needed)
4. **Add loading states** (if missing)
5. **Optimize performance** (if slow)
6. **Add tests** (automated testing)

---

## Quick Reference: API Endpoints

```
GET    /api/community/groups
POST   /api/community/groups
GET    /api/community/groups/[id]
PUT    /api/community/groups/[id]
DELETE /api/community/groups/[id]
POST   /api/community/groups/[id]/join
POST   /api/community/groups/[id]/leave
GET    /api/community/groups/[id]/members

GET    /api/community/discussions
POST   /api/community/discussions
GET    /api/community/discussions/[id]
PUT    /api/community/discussions/[id]
DELETE /api/community/discussions/[id]
POST   /api/community/discussions/[id]/replies
PUT    /api/community/discussions/[id]/replies/[replyId]
DELETE /api/community/discussions/[id]/replies/[replyId]

GET    /api/community/events
POST   /api/community/events
GET    /api/community/events/[id]
PUT    /api/community/events/[id]
DELETE /api/community/events/[id]
POST   /api/community/events/[id]/register
POST   /api/community/events/[id]/cancel

GET    /api/community/challenges
POST   /api/community/challenges
GET    /api/community/challenges/[id]
PUT    /api/community/challenges/[id]
POST   /api/community/challenges/[id]/submit
GET    /api/community/challenges/[id]/submissions

GET    /api/community/users/[id]
POST   /api/community/users/[id]/follow
POST   /api/community/users/[id]/unfollow
GET    /api/community/users/[id]/followers
GET    /api/community/users/[id]/following
GET    /api/community/users/[id]/activity

GET    /api/community/activity
```

---

**Happy Testing! 🚀**

If you encounter any issues, check the troubleshooting section or review the error messages in browser console and server logs.


