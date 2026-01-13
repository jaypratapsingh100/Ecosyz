# OpenRouter Rate Limits Guide

## 🔍 How to Check Your OpenRouter Rate Limits

### 1. Check via OpenRouter Dashboard
1. Go to: **https://openrouter.ai/settings/credits**
2. Log in to your OpenRouter account
3. Check your current plan and limits:
   - **Free Tier**: ~10 requests/minute
   - **Paid Plans**: Higher limits based on your subscription

### 2. Check via API Response Headers
When making API calls, OpenRouter returns rate limit information in response headers:
- `x-ratelimit-limit`: Maximum requests allowed
- `x-ratelimit-remaining`: Requests remaining in current window
- `x-ratelimit-reset`: Unix timestamp when limit resets
- `x-ratelimit-used`: Number of requests used

### 3. Check Server Logs
When you get a 500 error, check your server console logs. The enhanced error logging will show:
```
=== CHAT API ERROR ===
OpenRouter Rate Limit Info: {
  'x-ratelimit-limit': '...',
  'x-ratelimit-remaining': '...',
  'x-ratelimit-reset': '...',
  'x-ratelimit-used': '...'
}
```

## 🚨 Common Rate Limit Scenarios

### Scenario 1: 429 Too Many Requests
**Error:** `HTTP 429: Rate limit exceeded`

**Solutions:**
1. Wait for the rate limit window to reset
2. Upgrade your OpenRouter plan
3. Reduce request frequency
4. Use a different provider (Groq has higher free limits)

### Scenario 2: 402 Payment Required (Credit Limit)
**Error:** `HTTP 402: Credit limit exceeded`

**Solutions:**
1. Add credits to your OpenRouter account
2. Reduce `max_tokens` in requests
3. Upgrade to a paid plan

### Scenario 3: 500 Internal Server Error
**Possible Causes:**
- Rate limit exceeded (but error not properly handled)
- Invalid API key
- Model unavailable
- Network issues

**Debugging Steps:**
1. Check server console logs for detailed error
2. Verify API key is correct
3. Check OpenRouter status: https://status.openrouter.ai
4. Try a simple test request

## 🔧 Debugging Rate Limit Issues

### Step 1: Check Server Logs
Look for these log entries:
```bash
# In your terminal where you run `npm run dev` or `pnpm dev`
=== CHAT API ERROR ===
Error details: { ... }
OpenRouter Rate Limit Info: { ... }
```

### Step 2: Test API Key Directly
```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Step 3: Check Your Account Status
1. Visit: https://openrouter.ai/settings/credits
2. Check:
   - Current credits balance
   - Rate limit tier
   - Usage statistics

### Step 4: Monitor Rate Limits in Code
The enhanced error handling now logs rate limit headers. Check your server console when errors occur.

## 📊 Rate Limit Tiers

### Free Tier
- **Requests:** ~10/minute
- **Credits:** Limited free credits
- **Daily Credits:** Some free credits may be available (check your dashboard)
- **Best for:** Testing and light usage

### Paid Tiers
- **Higher rate limits** based on subscription
- **More credits** available
- **Priority support**

## 🎁 Daily Free Credits (If Available)

### How Daily Credits Work
OpenRouter may offer daily free credits to users, but this varies by account type and promotional offers.

### Checking for Daily Credits
1. **Visit Dashboard:** https://openrouter.ai/settings/credits
2. **Check Balance:** Look at your current balance
3. **View Usage:** Click "View Usage" to see credit history
4. **Check Promotions:** Look for any promotional messages or offers

### When Credits Reset
- **Daily Reset:** If available, credits typically reset at midnight UTC
- **Check Dashboard:** Your dashboard will show when credits reset
- **Automatic:** Credits are added automatically if you're eligible

### Eligibility for Daily Credits
- **New Users:** May receive promotional credits
- **Active Users:** Some tiers may include daily credits
- **Promotional Offers:** Check for special promotions

### Important Notes
- **Not Guaranteed:** Daily credits are not guaranteed for all users
- **Varies by Plan:** Different plans have different credit allocations
- **Check Dashboard:** Always check your dashboard for current status
- **May Require Purchase:** Some models may still require purchased credits even with free credits

## 🛠️ Current Implementation

### Rate Limit Detection
The chat API now:
- ✅ Detects 429 errors
- ✅ Logs rate limit headers
- ✅ Shows reset time in error messages
- ✅ Provides upgrade links

### Error Messages
When rate limited, users see:
- Clear error message
- Reset time (if available)
- Link to upgrade account
- Suggestions for alternatives

## 💡 Tips to Avoid Rate Limits

1. **Reduce Request Frequency**
   - Don't send multiple requests rapidly
   - Add delays between requests if needed

2. **Reduce Token Usage**
   - Lower `max_tokens` (currently set to 2000)
   - Shorter prompts when possible

3. **Use Caching**
   - Cache responses for similar queries
   - Avoid redundant API calls

4. **Monitor Usage**
   - Check OpenRouter dashboard regularly
   - Set up usage alerts if available

5. **Upgrade When Needed**
   - Free tier is great for testing
   - Upgrade for production use

## 🔗 Useful Links

- **OpenRouter Dashboard:** https://openrouter.ai/settings/credits
- **OpenRouter Status:** https://status.openrouter.ai
- **OpenRouter Docs:** https://openrouter.ai/docs
- **Upgrade Account:** https://openrouter.ai/settings/credits

## 📝 Next Steps

If you're hitting rate limits frequently:
1. ✅ Check your current usage in dashboard
2. ✅ Consider upgrading your plan
3. ✅ Implement request throttling
4. ✅ Add caching layer
5. ✅ Monitor error logs for patterns

---

**Last Updated:** Current Session
**Status:** Enhanced error logging and rate limit detection implemented

