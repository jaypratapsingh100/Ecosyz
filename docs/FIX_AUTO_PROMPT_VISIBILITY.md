# Fix: Auto-Generated Prompt Not Visible in Chat

## Problem
When questionnaire is completed and project is created:
1. Prompt is generated but not visible in chat UI
2. Prompt is not auto-filled in chat input
3. Files are not being generated
4. User cannot see what prompt was sent to AI

## Root Cause
- Prompt was being sent to API but not added to chat UI messages
- AppChat component didn't know about the auto-generated prompt
- No mechanism to display the prompt in the chat interface

## Solution Implemented

### 1. SessionStorage Communication
- Store prompt in `sessionStorage` when project is created
- AppChat component checks `sessionStorage` for auto-prompt
- Adds prompt to chat messages automatically
- Shows AI response when available

### 2. AppChat Auto-Loading
Added `useEffect` hook in AppChat that:
- Checks for `auto-prompt-${projectId}` in sessionStorage
- Adds user message with the prompt
- Adds AI response message when available
- Shows error message if generation failed
- Cleans up sessionStorage after displaying

### 3. Timing Fix
- Project is selected first
- Wait 1.5 seconds for chat to initialize
- Then send prompt to AI
- Store response in sessionStorage
- AppChat picks it up and displays

## Implementation Details

### ProjectManager.tsx
```typescript
// After project creation:
1. Select project: onSelectProject(project.id)
2. Wait 1.5s for chat to initialize
3. Generate prompt from questionnaire
4. Store in sessionStorage: `auto-prompt-${projectId}`
5. Send to AI chat API
6. Store response: `auto-response-${projectId}`
```

### AppChat.tsx
```typescript
// useEffect hook:
1. Check sessionStorage for auto-prompt
2. Verify it's recent (within 30 seconds)
3. Add user message with prompt
4. Add AI response message if available
5. Trigger files refresh
6. Clean up sessionStorage
```

## Expected Behavior

1. **User completes questionnaire**
2. **Project is created**
3. **Project is selected automatically**
4. **After 1.5 seconds:**
   - Prompt appears in chat as user message
   - AI starts generating response
   - Response appears in chat
   - Files are created automatically
5. **User sees:**
   - Full prompt in chat
   - AI response
   - Files being created
   - Progress in real-time

## Testing

1. Complete questionnaire with requirements
2. Click "Complete"
3. Project is created and selected
4. Open Chat tab
5. **Verify:**
   - Prompt appears as user message
   - AI response appears
   - Files are generated
   - All files match questionnaire requirements

## Troubleshooting

### Issue: Prompt not appearing
**Check:**
- Browser console for sessionStorage values
- Verify `auto-prompt-${projectId}` exists
- Check AppChat useEffect is running
- Verify projectId matches

### Issue: Files not generating
**Check:**
- AI API key is configured
- Chat API response in Network tab
- Verify `auto-response-${projectId}` in sessionStorage
- Check AI response for file creation results

### Issue: Duplicate messages
**Fix:**
- AppChat checks if message already exists before adding
- Uses unique IDs based on timestamp
- Cleans up sessionStorage after displaying

## Next Steps

If issues persist:
1. Check browser console for errors
2. Verify sessionStorage values
3. Check Network tab for chat API calls
4. Verify AI provider is working
5. Check if files are being created in database

