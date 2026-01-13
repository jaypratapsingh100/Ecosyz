# Debug: Preview Not Rendering

## 🔍 Diagnostic Steps

### Step 1: Check Browser Console
Open browser console (F12) and look for:

**Expected Logs:**
```
🔄 PreviewPanel: Project ID changed, generating preview: [project-id]
🔍 PreviewPanel: Generating preview for project: [project-id]
📡 PreviewPanel: Calling preview API...
📡 PreviewPanel: API response status: 200 OK
📥 PreviewPanel: API response received: { status: 'success', hasOutput: true, ... }
✅ PreviewPanel: Setting preview HTML, length: [number]
✅ PreviewPanel: Preview HTML set successfully
Preview iframe loaded successfully
```

**If You See Errors:**
- `401 Unauthorized` → Authentication issue
- `404 Not Found` → Project doesn't exist
- `403 Forbidden` → Not authorized to access project
- `500 Internal Server Error` → Server-side error

### Step 2: Check Preview Tab
1. Click on **Preview** tab (not Chat tab)
2. Look for:
   - Loading spinner → Preview is generating
   - Error message → Check error details
   - Blank screen → Check console for errors
   - "Click Refresh" → Click Refresh button

### Step 3: Check Authentication
**If you see 401 errors:**
1. Check if you're logged in
2. Check browser cookies (should have `sb-access-token`)
3. Try logging out and back in
4. Check `/api/auth/session` endpoint

### Step 4: Check Project Files
1. Verify project has files:
   - Should have `App.jsx` or `App.js`
   - Should have `index.js`
   - Check File Explorer panel

2. Check file content:
   - Open `App.jsx` in editor
   - Verify it has valid React component
   - Check for syntax errors

### Step 5: Manual Preview Generation
1. Click **Refresh** button in Preview panel
2. Check console for logs
3. Check Network tab for API call:
   - URL: `/api/app-projects/[id]/preview`
   - Method: POST
   - Status: Should be 200
   - Response: Should have `output` field with HTML

## 🐛 Common Issues & Fixes

### Issue 1: 401 Authentication Error
**Symptoms:**
- Console shows `401 Unauthorized`
- Preview shows error message

**Fix:**
- Log in again
- Check if session expired
- Verify cookies are being sent

### Issue 2: Empty Preview Response
**Symptoms:**
- API returns 200 but no `output` field
- Console shows "No preview output received"

**Possible Causes:**
- Project has no files
- Files are invalid
- Preview generation failed silently

**Fix:**
- Check if project has files
- Verify App.jsx exists and is valid
- Check server logs for errors

### Issue 3: Preview Tab Not Showing
**Symptoms:**
- Preview tab exists but shows blank
- No loading spinner

**Fix:**
- Click Preview tab (not Chat tab)
- Click Refresh button
- Check console for errors

### Issue 4: Iframe Not Loading
**Symptoms:**
- Preview HTML is set but iframe is blank
- Console shows "Preview iframe loaded successfully" but nothing renders

**Possible Causes:**
- CSP blocking scripts
- JavaScript errors in preview
- React not loading

**Fix:**
- Check browser console inside iframe (right-click → Inspect)
- Look for JavaScript errors
- Check Network tab for failed CDN loads

## 🔧 Debugging Commands

### Check Project Status
```javascript
// In browser console
fetch('/api/app-projects/[project-id]')
  .then(r => r.json())
  .then(console.log);
```

### Check Preview API
```javascript
// In browser console
fetch('/api/app-projects/[project-id]/preview', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### Check Files
```javascript
// In browser console
fetch('/api/app-projects/[project-id]/files')
  .then(r => r.json())
  .then(console.log);
```

## 📊 What to Check

1. **Authentication**: Are you logged in?
2. **Project ID**: Is project ID correct?
3. **Files**: Does project have files?
4. **App.jsx**: Is App.jsx valid?
5. **Preview Tab**: Are you on Preview tab?
6. **Console**: What errors are shown?
7. **Network**: Is API call successful?

## ✅ Quick Fixes

1. **Refresh Preview**: Click Refresh button
2. **Switch Tabs**: Go to Preview tab (not Chat)
3. **Check Console**: Look for error messages
4. **Re-login**: Log out and back in
5. **Check Files**: Verify project has App.jsx

## 🎯 Expected Behavior

When working correctly:
1. Select project → Preview auto-generates
2. Switch to Preview tab → See rendered app
3. Files update → Preview auto-refreshes
4. Click Refresh → Preview regenerates

If any step fails, check console logs for details!
