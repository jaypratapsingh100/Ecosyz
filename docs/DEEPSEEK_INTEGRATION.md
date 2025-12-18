# DeepSeek API Integration

## Overview
DeepSeek is now integrated as the default provider for automatic code generation. When users complete the questionnaire, the system will use DeepSeek to generate files automatically.

## Configuration

### Setting Up DeepSeek API Key

1. **Get API Key**: Sign up at https://platform.deepseek.com/api_keys
2. **Set in Chat Settings**:
   - Click the ⚙️ settings icon in the chat panel
   - Select "DeepSeek" as provider
   - Enter your API key
   - Select model: `deepseek-chat` or `deepseek-coder`
   - Click "Save"

3. **Or Set in Environment**:
   - Add to `.env.local`:
     ```
     DEEPSEEK_API_KEY=your_api_key_here
     ```

## How It Works

### Automatic File Generation Flow

1. **User completes questionnaire** with all requirements
2. **Project is created** with questionnaire data
3. **AI prompt is generated** from questionnaire
4. **DeepSeek API is called** automatically:
   - Uses DeepSeek provider (default)
   - Uses `deepseek-chat` model (best for code)
   - Sends comprehensive prompt with all requirements
5. **Files are created** automatically from AI response
6. **Files appear in editor** automatically
7. **Preview is generated** automatically

### File Format

AI generates files using this format:
```
```file:path/to/file.jsx
// File content here
```
```

Files are automatically:
- Created in database
- Displayed in File Explorer
- Available in Code Editor
- Included in Preview

## Features

### Auto-Refresh
- Files refresh automatically after generation (500ms, 1.5s, 3s delays)
- Preview refreshes automatically when files are created
- File Explorer listens for `files-updated` event

### Error Handling
- Network errors are caught and displayed
- API errors show helpful messages
- Failed file creations are logged

### Provider Priority
1. User's stored provider (from localStorage)
2. DeepSeek (default if no provider set)
3. Falls back to Groq if DeepSeek unavailable

## Testing

1. **Set DeepSeek API Key**:
   - Open Chat Settings (⚙️)
   - Select "DeepSeek"
   - Enter API key
   - Save

2. **Complete Questionnaire**:
   - Fill out all fields
   - Click "Complete"

3. **Verify**:
   - Project is created
   - Prompt appears in Chat
   - AI response appears
   - Files appear in File Explorer
   - Preview generates automatically

## Troubleshooting

### Issue: Files not appearing
**Check:**
- API key is set correctly
- DeepSeek API is accessible
- Check browser console for errors
- Check Network tab for API calls

### Issue: Preview not generating
**Check:**
- Files are created successfully
- Preview tab is open
- Check PreviewPanel console logs
- Try manual refresh button

### Issue: "Not authorized" error
**Fix:**
- Sign out and sign back in
- Ensure project belongs to your account
- Check server logs for details

## API Usage

### Request Format
```json
{
  "message": "Create a complete portfolio website...",
  "provider": "deepseek",
  "apiKey": "sk-...",
  "model": "deepseek-chat"
}
```

### Response Format
```json
{
  "response": "I'll create your portfolio website...",
  "filesCreated": [
    {
      "path": "src/App.jsx",
      "success": true
    }
  ]
}
```

## Best Practices

1. **Use DeepSeek for Code**: Best model for code generation
2. **Set API Key**: Required for DeepSeek to work
3. **Complete Questionnaire**: More details = better code
4. **Check Files**: Verify files are created correctly
5. **Test Preview**: Ensure preview works as expected
