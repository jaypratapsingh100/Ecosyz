# Fix: Preview Not Visible in App Builder

## Problem
The Preview tab was not visible or not working in the app builder.

## Root Cause
The Preview tab was conditionally rendered only for projects with type 'web' or 'fullstack', which meant it wouldn't show for other project types.

## Solutions Applied

### 1. Made Preview Tab Always Visible
- Changed condition from `project?.type === 'web' || project?.type === 'fullstack'` to `selectedProjectId`
- Preview tab now shows for all projects when a project is selected

### 2. Improved Preview Panel
- Removed restriction that blocked preview for non-web projects
- Added warning message for non-web/fullstack projects instead of blocking
- Auto-generates preview when project is selected
- Better error handling and loading states

### 3. Enhanced User Experience
- Preview automatically generates when switching to preview mode
- Clear error messages if preview fails
- Loading indicator while generating preview
- Refresh button to regenerate preview

## How to Use Preview

1. **Select a Project:**
   - Choose a project from the left sidebar
   - The Preview tab will appear in the right panel

2. **Click Preview Tab:**
   - Click the "Preview" tab next to "Chat" and "Deploy"
   - Preview will automatically generate

3. **Refresh Preview:**
   - Click the "Refresh" button to regenerate preview after making changes
   - Preview updates when you modify files

4. **Fullscreen Mode:**
   - Click the fullscreen icon to view preview in fullscreen
   - Press "Exit Fullscreen" to return

## Troubleshooting

### Preview Tab Not Showing
- Make sure you've selected a project from the sidebar
- Check browser console for errors
- Refresh the page

### Preview Not Loading
1. **Check Console:**
   - Open browser DevTools → Console
   - Look for error messages

2. **Check Network Tab:**
   - Open DevTools → Network
   - Look for `/api/app-projects/[id]/preview` request
   - Check if it's failing

3. **Try Refresh:**
   - Click the "Refresh" button in preview panel
   - Check if error message appears

### Common Issues

**Issue: "Failed to generate preview"**
- Check if project has files
- Verify API endpoint is working
- Check server logs for errors

**Issue: Preview shows blank page**
- Make sure project has a main file (App.jsx, index.html, etc.)
- Check if files have valid content
- Try refreshing the preview

**Issue: Preview not updating**
- Click "Refresh" button after making changes
- Check if files are saved
- Verify API is returning updated content

## Technical Details

### Preview API Endpoint
- **URL:** `/api/app-projects/[id]/preview`
- **Method:** POST
- **Response:** HTML content for preview

### Preview Panel Component
- Located at: `app/components/app-builder/PreviewPanel.tsx`
- Uses iframe with `srcDoc` to render HTML
- Auto-generates preview on project selection
- Supports fullscreen mode

## Next Steps

If preview still doesn't work:
1. Check browser console for specific errors
2. Verify API endpoint is accessible
3. Check server logs for preview generation errors
4. Ensure project files are valid

