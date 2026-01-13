# Testing Groq Integration Guide

This guide will help you test the Groq API integration in your App Builder.

## ✅ Prerequisites

- ✅ `GROQ_API_KEY` added to `.env` file
- ✅ Dev server running (or restart it to load new env variables)

## 🚀 Quick Test Steps

### Step 1: Restart Dev Server (Important!)

If your dev server is already running, restart it to load the new `GROQ_API_KEY`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm dev
```

**Why?** Environment variables are loaded when the server starts. If you added `GROQ_API_KEY` while the server was running, it won't be available until you restart.

---

### Step 2: Open App Builder

1. Navigate to: `http://localhost:3000/app-builder`
2. Make sure you're logged in (sign in if needed)

---

### Step 3: Create or Select a Project

1. If you don't have a project yet:
   - Click **"Create New Project"**
   - Choose a template (e.g., "React App")
   - Give it a name (e.g., "Test Project")
   - Click **Create**

2. If you have existing projects:
   - Select one from the dropdown

---

### Step 4: Test the Chat

1. **Open the Chat Panel:**
   - Look for the chat icon/panel on the right side
   - Click to open if it's collapsed

2. **Send a Test Message:**
   - Type: `"Create a simple React component that displays 'Hello from Groq!'"`
   - Press Enter or click Send

3. **What to Expect:**
   - ✅ Fast response (Groq is very fast!)
   - ✅ Code suggestions with explanations
   - ✅ No rate limit errors
   - ✅ Response should mention code generation

---

### Step 5: Verify It's Using Groq

**Option A: Check Browser Console**
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Look for any API errors or logs
4. Should see successful API calls (no 429 rate limit errors)

**Option B: Check Network Tab**
1. Open browser DevTools
2. Go to **Network** tab
3. Send a chat message
4. Look for request to `/api/app-projects/[id]/chat`
5. Check the response - should be successful

**Option C: Test Response Speed**
- Groq responses are typically **very fast** (1-3 seconds)
- If responses are instant, Groq is working!

---

## 🧪 Test Scenarios

### Test 1: Basic Code Generation
**Message:** `"Create a button component in React"`
**Expected:** Code snippet with React component

### Test 2: Code Modification
**Message:** `"Add a counter to the button that increments on click"`
**Expected:** Updated code with counter logic

### Test 3: Multiple Files
**Message:** `"Create a todo list app with a main component and a todo item component"`
**Expected:** Multiple file suggestions

### Test 4: Error Handling
**Message:** `"What's wrong with this code: const x = undefined; x.toString();"`
**Expected:** Explanation of the error and fix

---

## 🔍 Troubleshooting

### Issue: "Rate limit exceeded" error
**Solution:**
- Groq free tier has 30 requests/minute
- Wait 1-2 minutes and try again
- Check your Groq dashboard: https://console.groq.com/usage

### Issue: "Invalid API key" error
**Solution:**
1. Verify `GROQ_API_KEY` in `.env`:
   ```bash
   grep GROQ_API_KEY .env
   ```
2. Make sure key starts with `gsk_`
3. Restart dev server
4. Check for typos or extra spaces

### Issue: Still using OpenAI
**Solution:**
1. Check `.env` file has `GROQ_API_KEY` (not just `OPENAI_API_KEY`)
2. Restart dev server
3. Clear browser cache/localStorage
4. Check chat settings - make sure no API key is set there (let it use .env)

### Issue: No response / timeout
**Solution:**
1. Check internet connection
2. Verify Groq API status: https://status.groq.com/
3. Check browser console for errors
4. Try a simpler message

### Issue: Dev server not picking up env variable
**Solution:**
1. Make sure `.env` file is in project root (same level as `package.json`)
2. Restart dev server completely:
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```
3. Check `.env.local` doesn't override `.env`

---

## ✅ Success Indicators

You'll know Groq is working when:

1. ✅ **Fast responses** (1-3 seconds typically)
2. ✅ **No rate limit errors** (unless you exceed 30/min)
3. ✅ **Good code quality** (Groq models are excellent)
4. ✅ **No API key errors** in console
5. ✅ **Responses mention code** and file paths

---

## 🎯 Advanced Testing

### Test with Different Models

You can test different Groq models by setting them in chat settings:

1. Click ⚙️ icon in chat
2. Select **Groq** provider
3. Choose different models:
   - `llama-3.1-70b-versatile` (Best quality)
   - `llama-3.1-8b-instant` (Fastest)
   - `mixtral-8x7b-32768` (Long context)
   - `gemma2-9b-it` (Google's model)

### Test Rate Limits

Groq free tier: **30 requests/minute**

To test:
1. Send 30+ messages quickly
2. Should get rate limit error after 30
3. Wait 1 minute
4. Should work again

---

## 📊 Expected Performance

| Metric | Groq Free Tier |
|--------|----------------|
| **Response Time** | 1-3 seconds |
| **Rate Limit** | 30 requests/minute |
| **Model Quality** | Excellent (Llama 3.1 70B) |
| **Cost** | FREE |

---

## 🆘 Still Having Issues?

1. **Check logs:**
   ```bash
   # Look at terminal where dev server is running
   # Should see API calls and any errors
   ```

2. **Verify API key:**
   ```bash
   # Test API key directly (optional)
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer YOUR_GROQ_API_KEY"
   ```

3. **Check Groq dashboard:**
   - Visit: https://console.groq.com/usage
   - See your API usage and limits

4. **Review error messages:**
   - Check browser console
   - Check server terminal
   - Look for specific error codes

---

## 🎉 Next Steps

Once Groq is working:

1. **Build your app!** Use chat to generate code
2. **Experiment** with different prompts
3. **Create projects** and let AI help you code
4. **Share feedback** on response quality

---

## 📝 Quick Reference

**Environment Variable:**
```env
GROQ_API_KEY=gsk_your_key_here
```

**Restart Command:**
```bash
pnpm dev
```

**Test Message:**
```
Create a React component that displays "Hello from Groq!"
```

**Groq Console:**
https://console.groq.com/

---

**Happy Testing! 🚀**






