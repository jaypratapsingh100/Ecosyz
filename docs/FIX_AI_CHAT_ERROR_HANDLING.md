# Fix: AI Chat Request Error Handling

## Problem
When auto-generating files from questionnaire, if the AI chat API request fails:
- Error shows empty object `{}` in console
- No useful error information displayed
- User doesn't know what went wrong

## Root Cause
- Error handling was using `.catch(() => ({}))` which returns empty object
- Not checking response content-type before parsing JSON
- Not handling non-JSON error responses
- Network errors not distinguished from API errors

## Solution Implemented

### 1. Improved Error Response Parsing
- Check `Content-Type` header before parsing JSON
- Handle non-JSON responses (text/html, text/plain)
- Extract error message from various response formats
- Include status code and status text in error data

### 2. Better Error Logging
- Log full error details including status code
- Include response status text
- Store structured error data in sessionStorage
- Distinguish between network errors and API errors

### 3. Network Error Handling
- Separate catch block for network/fetch errors
- Clear error messages for connection issues
- Include error type and stack trace for debugging

## Code Changes

### Before:
```typescript
} else {
  const errorData = await chatResponse.json().catch(() => ({}));
  console.error('❌ AI chat request failed:', errorData);
  sessionStorage.setItem(`auto-error-${project.id}`, JSON.stringify(errorData));
}
```

### After:
```typescript
} else {
  // Handle error response with better error parsing
  let errorData: any = {};
  let errorMessage = `Server error (${chatResponse.status})`;
  
  try {
    const contentType = chatResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await chatResponse.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } else {
      const text = await chatResponse.text();
      errorMessage = text || errorMessage;
      errorData = { error: errorMessage, status: chatResponse.status };
    }
  } catch (parseError) {
    errorData = { 
      error: errorMessage,
      status: chatResponse.status,
      statusText: chatResponse.statusText 
    };
  }
  
  console.error('❌ AI chat request failed:', {
    status: chatResponse.status,
    statusText: chatResponse.statusText,
    error: errorData,
  });
  
  sessionStorage.setItem(`auto-error-${project.id}`, JSON.stringify({
    error: errorMessage,
    status: chatResponse.status,
    details: errorData
  }));
}
```

## Error Types Handled

### 1. API Errors (400, 401, 403, 404, 429, 500)
- **401**: Not authenticated / Invalid API key
- **403**: Not authorized
- **404**: Project not found
- **429**: Rate limit exceeded
- **500**: Server error

### 2. Network Errors
- Connection refused
- Timeout
- CORS issues
- DNS resolution failures

### 3. Parsing Errors
- Non-JSON responses
- Empty responses
- Malformed JSON

## Expected Behavior

1. **API Error (e.g., 401)**:
   - Console: `❌ AI chat request failed: { status: 401, statusText: 'Unauthorized', error: {...} }`
   - sessionStorage: `{ error: 'Invalid API key...', status: 401, details: {...} }`
   - Chat UI: Shows error message to user

2. **Network Error**:
   - Console: `❌ Error calling AI chat: { error: {...}, message: 'Network error...' }`
   - sessionStorage: `{ error: 'Network error...', type: 'network_error', details: {...} }`
   - Chat UI: Shows network error message

3. **Rate Limit (429)**:
   - Console: Shows rate limit error with provider info
   - sessionStorage: Includes suggestion to switch providers
   - Chat UI: Shows helpful message with alternatives

## Testing

1. **Test API Key Error**:
   - Remove API key from environment
   - Complete questionnaire
   - Should see: "Invalid API key. Please check your API key in chat settings."

2. **Test Network Error**:
   - Stop server
   - Complete questionnaire
   - Should see: "Network error: Unable to connect to AI service"

3. **Test Rate Limit**:
   - Hit rate limit (if possible)
   - Should see: "Rate limit exceeded" with suggestions

## Troubleshooting

### Issue: Still seeing empty object `{}`
**Check:**
- Browser console for full error log
- Network tab for actual response
- Verify error handling code is updated

### Issue: Error not showing in chat UI
**Check:**
- AppChat component checks sessionStorage
- Error message format matches expected structure
- Chat component useEffect is running

### Issue: Wrong error message
**Check:**
- API route error format
- Error extraction logic
- Content-Type header

## Next Steps

If errors persist:
1. Check browser console for detailed logs
2. Check Network tab for API response
3. Verify API key is configured
4. Check server logs for backend errors
5. Verify AI provider is accessible





