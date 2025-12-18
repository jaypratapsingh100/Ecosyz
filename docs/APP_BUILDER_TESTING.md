# App Builder Testing Guide

## Prerequisites

### 1. Database Migration
First, ensure your database schema is up to date:

```bash
# Generate Prisma client (already done)
pnpm prisma generate

# Create migration (if needed)
pnpm prisma migrate dev --name add_app_builder_models

# Or if you need to sync without migrations
pnpm prisma db push
```

### 2. Environment Variables
Ensure you have the following in your `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` (optional) - For AI features (users can also provide their own)

### 3. Start Development Server
```bash
pnpm dev
```

## Testing Steps

### Step 1: Access App Builder
1. Navigate to `http://localhost:3000/app-builder`
2. You should see the App Builder interface with:
   - Left sidebar: Project Manager (empty initially)
   - Center: Welcome message
   - Right: Empty (will show chat/preview when project selected)

### Step 2: Create a Project
1. Click the **"+ New"** button in the Project Manager sidebar
2. Fill in:
   - **Project Name**: e.g., "My First App"
   - **Template**: Select "React App"
   - **Workspace** (optional): Select a workspace if you have any
3. Click **"Create"**
4. The project should appear in the sidebar
5. The project should automatically open with files loaded

### Step 3: Test File Explorer
1. After creating a project, you should see files in the File Explorer (middle left)
2. Click on different files to open them in the editor
3. Verify file tree structure:
   - Folders can be expanded/collapsed
   - Files show with icons
   - Main file is marked with ★

### Step 4: Test Code Editor
1. Select a file from the File Explorer
2. The Monaco Editor should load in the center panel
3. Try editing code:
   - Type some code
   - Verify syntax highlighting works
   - Check auto-save (should save after 1 second of inactivity)
4. Verify editor features:
   - Line numbers
   - Minimap
   - Syntax highlighting

### Step 5: Test AI Chat
1. Click on the **"Chat"** tab in the right panel
2. Configure API key (if not already done):
   - Click the settings icon in chat header
   - Enter your OpenAI API key
   - Select model (e.g., gpt-4o, gpt-3.5-turbo)
   - Click "Save Settings"
3. Test chat functionality:
   - Type: "Add a button that says 'Click me'"
   - Press Enter or click Send
   - Wait for AI response
   - Verify response includes code suggestions
4. Test context awareness:
   - Ask: "What files are in this project?"
   - AI should reference project files
   - Ask: "Modify the App component to add a counter"
   - AI should understand current file structure

### Step 6: Test Preview (Web Projects)
1. For React/Next.js/Web projects, click the **"Preview"** tab
2. Click **"Refresh"** button to generate preview
3. Verify:
   - Preview loads in iframe
   - Code changes reflect in preview (after refresh)
   - No console errors

### Step 7: Test File Operations
1. **Create File via Chat**:
   - In chat, ask: "Create a new file called utils.js with a helper function"
   - Verify file appears in File Explorer
2. **Delete File**:
   - Hover over a file in File Explorer
   - Click the X button that appears
   - Confirm deletion
   - Verify file is removed

### Step 8: Test Project Management
1. **Create Multiple Projects**:
   - Create projects with different templates
   - Verify all appear in sidebar
2. **Switch Between Projects**:
   - Click different projects
   - Verify files and editor update
3. **Delete Project**:
   - Click delete button on a project
   - Confirm deletion
   - Verify project is removed

### Step 9: Test Workspace Integration
1. Create a workspace (if you don't have one):
   - Go to `/workspaces`
   - Create a new workspace
2. Create a project linked to workspace:
   - In App Builder, create new project
   - Select workspace from dropdown
   - Verify project is created
3. Check workspace:
   - Go to `/workspaces/[workspace-id]`
   - Verify project appears (if implemented in workspace view)

## Testing Checklist

### Core Functionality
- [ ] Can create new project
- [ ] Can select project template
- [ ] Project files load correctly
- [ ] File Explorer displays files
- [ ] Code Editor opens files
- [ ] Code Editor saves changes
- [ ] Can switch between files
- [ ] Can delete files
- [ ] Can delete projects

### AI Features
- [ ] Chat interface loads
- [ ] Can configure API key
- [ ] Can send messages
- [ ] AI responds with code suggestions
- [ ] AI understands project context
- [ ] AI can reference current files
- [ ] Chat history persists

### Preview Features
- [ ] Preview tab appears for web projects
- [ ] Preview generates HTML
- [ ] Preview displays in iframe
- [ ] Refresh button works
- [ ] Preview updates with code changes

### Integration
- [ ] Navigation link works
- [ ] Authentication required
- [ ] Workspace linking works
- [ ] Error handling works

## Common Issues & Solutions

### Issue: "Not authenticated" errors
**Solution**: 
- Ensure you're logged in
- Check `/api/auth/session` returns user data
- Verify cookies are set

### Issue: Database errors
**Solution**:
```bash
# Regenerate Prisma client
pnpm prisma generate

# Push schema changes
pnpm prisma db push

# Or create migration
pnpm prisma migrate dev
```

### Issue: Monaco Editor not loading
**Solution**:
- Check browser console for errors
- Verify `@monaco-editor/react` is installed
- Clear browser cache
- Restart dev server

### Issue: AI Chat not responding
**Solution**:
- Verify OpenAI API key is set
- Check API key is valid
- Try different model (gpt-3.5-turbo is cheaper)
- Check network tab for API errors

### Issue: Preview not generating
**Solution**:
- Ensure project has files
- Check main file is set (isMain: true)
- Verify project type is "web" or "fullstack"
- Check browser console for errors

### Issue: Files not saving
**Solution**:
- Check network tab for API errors
- Verify project ID is correct
- Check file permissions
- Ensure user is authenticated

## API Testing

### Test Project API
```bash
# List projects
curl http://localhost:3000/api/app-projects \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Create project
curl -X POST http://localhost:3000/api/app-projects \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"title":"Test Project","type":"web","framework":"react"}'
```

### Test File API
```bash
# List files
curl http://localhost:3000/api/app-projects/PROJECT_ID/files \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Create file
curl -X POST http://localhost:3000/api/app-projects/PROJECT_ID/files \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"path":"test.js","name":"test.js","content":"console.log(\"test\");","language":"javascript"}'
```

## Performance Testing

1. **Load Time**: Check initial page load
2. **Editor Performance**: Test with large files (1000+ lines)
3. **Chat Response Time**: Measure AI response time
4. **Preview Generation**: Time preview generation
5. **File Operations**: Test with many files (50+)

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (responsive design)

## Security Testing

- [ ] Verify authentication required for all APIs
- [ ] Test file path validation (prevent directory traversal)
- [ ] Verify user can only access their own projects
- [ ] Test workspace permission checks
- [ ] Verify API key is stored securely (localStorage)

## Next Steps After Testing

1. Fix any bugs found
2. Add error boundaries for better error handling
3. Add loading states where missing
4. Improve error messages
5. Add unit tests for critical functions
6. Add integration tests for API routes


