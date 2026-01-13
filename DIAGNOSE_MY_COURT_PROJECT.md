# Diagnose "my court" Project - Not Rendering

## 🔍 Quick Diagnostic Steps

### Step 1: Check Authentication
Open browser console (F12) and run:
```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('Auth status:', data);
    if (!data.user) {
      console.error('❌ Not authenticated - please log in');
    } else {
      console.log('✅ Authenticated as:', data.user.email);
    }
  });
```

**If you see "Not authenticated":**
- Log out and log back in
- Check if cookies are enabled
- Check if session expired

---

### Step 2: Check Project Status
In browser console, run:
```javascript
// First, get your projects to find the ID
fetch('/api/app-projects')
  .then(r => r.json())
  .then(projects => {
    const myCourt = projects.find(p => p.title.toLowerCase().includes('my court') || p.title.toLowerCase().includes('court'));
    if (myCourt) {
      console.log('✅ Found project:', myCourt);
      console.log('Project ID:', myCourt.id);
      console.log('Files count:', myCourt._count?.files || 'unknown');
      
      // Now check files
      return fetch(`/api/app-projects/${myCourt.id}/files`);
    } else {
      console.log('❌ Project "my court" not found');
      console.log('Available projects:', projects.map(p => p.title));
    }
  })
  .then(res => res?.json())
  .then(files => {
    if (files) {
      console.log('📁 Project files:', files.length);
      console.log('Files:', files.map(f => f.path));
      
      const appFile = files.find(f => f.path.includes('App') && !f.path.includes('index'));
      if (appFile) {
        console.log('✅ App file found:', appFile.path);
        console.log('Content length:', appFile.content.length);
      } else {
        console.log('❌ No App.jsx/App.js file found!');
      }
    }
  });
```

---

### Step 3: Check Preview Generation
In browser console, run:
```javascript
// Get project ID first (from Step 2)
const projectId = 'YOUR_PROJECT_ID_HERE'; // Replace with actual ID

fetch(`/api/app-projects/${projectId}/preview`, { method: 'POST' })
  .then(r => {
    console.log('Preview API status:', r.status, r.statusText);
    return r.json();
  })
  .then(data => {
    console.log('Preview API response:', {
      status: data.status,
      hasOutput: !!data.output,
      outputLength: data.output?.length || 0,
      error: data.error,
      errorDetails: data.errorDetails
    });
    
    if (data.output && data.output.length > 0) {
      console.log('✅ Preview HTML generated successfully');
      console.log('HTML preview (first 500 chars):', data.output.substring(0, 500));
    } else {
      console.error('❌ No preview output:', data);
    }
  });
```

---

### Step 4: Check Preview Panel
1. **Make sure you're on Preview tab** (not Chat tab)
2. **Click Refresh button** in Preview panel
3. **Check console** for these logs:
   ```
   🔄 PreviewPanel: Project ID changed, generating preview: [id]
   🔍 PreviewPanel: Generating preview for project: [id]
   📡 PreviewPanel: Calling preview API...
   📡 PreviewPanel: API response status: 200 OK
   ✅ PreviewPanel: Setting preview HTML, length: [number]
   ```

---

## 🐛 Common Issues for "my court" Project

### Issue 1: 401 Authentication Error
**Symptom**: Console shows `401 Unauthorized`

**Fix**:
1. Log out completely
2. Log back in
3. Try preview again

### Issue 2: Project Not Found
**Symptom**: Console shows `404 Not Found`

**Fix**:
- Check if project name is exactly "my court" (case-sensitive)
- Check if project exists in Projects list
- Try selecting project again

### Issue 3: No Files
**Symptom**: Project has 0 files

**Fix**:
- Use AI chat to generate files
- Check if files were created successfully
- Verify files appear in File Explorer

### Issue 4: App.jsx Issues
**Symptom**: App file exists but preview is blank

**Fix**:
- Open App.jsx in editor
- Check for syntax errors (unbalanced braces, etc.)
- Verify it has `export default App`
- Check console for JavaScript errors in preview iframe

### Issue 5: Preview Tab Not Active
**Symptom**: Preview not showing

**Fix**:
- **Click Preview tab** (not Chat tab)
- Preview only renders when Preview tab is active
- Click Refresh button after switching tabs

---

## ✅ Quick Checklist

- [ ] Are you logged in? (Check top right profile icon)
- [ ] Is "my court" project selected? (Highlighted in green in Projects list)
- [ ] Are you on **Preview tab**? (Not Chat tab)
- [ ] Does project have files? (Check File Explorer)
- [ ] Does App.jsx exist? (Check File Explorer)
- [ ] Clicked Refresh button? (In Preview panel)
- [ ] Checked browser console? (F12 → Console tab)
- [ ] Checked Network tab? (F12 → Network → Look for preview API call)

---

## 🎯 Most Likely Issues

Based on the errors you showed:

1. **401 Authentication** → Log in again
2. **Not on Preview tab** → Click Preview tab
3. **Preview not generated** → Click Refresh button

---

## 📝 What to Share

If still not working, share:
1. Browser console logs (F12 → Console)
2. Network tab for `/api/app-projects/[id]/preview` call
3. Screenshot of Preview tab
4. Whether you're logged in

This will help identify the exact issue!
