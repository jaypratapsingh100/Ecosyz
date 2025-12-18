# Free AI Providers Setup Guide

This guide shows you how to use **FREE** AI providers for code generation in the App Builder. No credit card required!

## 🆓 Available Free Providers

### 1. **Groq (Fastest) ⚡**
- **Why choose Groq?**
  - ✅ Completely FREE
  - ✅ Extremely fast responses (faster than OpenAI)
  - ✅ High rate limits
  - ✅ No credit card required
  - ✅ OpenAI-compatible API

- **Setup Steps:**
  1. Go to https://console.groq.com/
  2. Sign up for a free account (no credit card needed)
  3. Navigate to **API Keys** section
  4. Click **Create API Key**
  5. Copy your API key (starts with `gsk_`)
  6. In App Builder, click the ⚙️ icon in chat
  7. Select **Groq** as provider
  8. Paste your API key
  9. Select a model (recommended: `llama-3.1-70b-versatile`)
  10. Click **Save Settings**

- **Available Models:**
  - `llama-3.1-70b-versatile` (Recommended - Best quality)
  - `llama-3.1-8b-instant` (Fastest)
  - `mixtral-8x7b-32768` (Good for long context)
  - `gemma2-9b-it` (Google's model)

- **Rate Limits:**
  - Free tier: 30 requests per minute
  - Very generous limits for personal use

---

### 2. **DeepSeek (Best for Code) 💻**
- **Why choose DeepSeek?**
  - ✅ Completely FREE
  - ✅ Excellent for code generation
  - ✅ Two specialized models:
    - `deepseek-chat` - General purpose
    - `deepseek-coder` - Optimized for code (Recommended!)
  - ✅ OpenAI-compatible API
  - ✅ Good rate limits

- **Setup Steps:**
  1. Go to https://platform.deepseek.com/
  2. Sign up for a free account (no credit card needed)
  3. Navigate to **API Keys** section
  4. Click **Create API Key**
  5. Copy your API key (starts with `sk-`)
  6. In App Builder, click the ⚙️ icon in chat
  7. Select **DeepSeek** as provider
  8. Paste your API key
  9. Select model: `deepseek-coder` (best for code)
  10. Click **Save Settings**

- **Available Models:**
  - `deepseek-coder` (Recommended - Best for code generation)
  - `deepseek-chat` (General purpose chat)

- **Best For:**
  - ✅ Frontend development (React, Next.js, etc.)
  - ✅ Backend development (Node.js, Express, etc.)
  - ✅ Full-stack applications
  - ✅ Code debugging and refactoring

- **Rate Limits:**
  - Free tier: Generous limits
  - Perfect for building applications

---

### 3. **Together AI**
- **Why choose Together AI?**
  - ✅ FREE tier available
  - ✅ Multiple open-source models
  - ✅ Good for experimentation

- **Setup Steps:**
  1. Go to https://api.together.xyz/
  2. Sign up for a free account
  3. Navigate to **API Keys**
  4. Create a new API key
  5. Copy your API key
  6. In App Builder chat settings, select **Together AI**
  7. Paste your API key
  8. Select a model (recommended: `meta-llama/Llama-3-8b-chat-hf`)
  9. Save settings

- **Available Models:**
  - `meta-llama/Llama-3-8b-chat-hf` (Fast, good quality)
  - `meta-llama/Llama-3-70b-chat-hf` (Better quality, slower)
  - `mistralai/Mixtral-8x7B-Instruct-v0.1` (Good alternative)

---

### 4. **Hugging Face**
- **Why choose Hugging Face?**
  - ✅ FREE tier available
  - ✅ Access to many open-source models
  - ✅ Great for research

- **Setup Steps:**
  1. Go to https://huggingface.co/
  2. Sign up for a free account
  3. Go to **Settings** → **Access Tokens**
  4. Create a new token (read permission is enough)
  5. Copy your token (starts with `hf_`)
  6. In App Builder chat settings, select **Hugging Face**
  7. Paste your token
  8. Select a model
  9. Save settings

- **Available Models:**
  - `meta-llama/Llama-3-8b-chat-hf`

---

## 🚀 Quick Start

### Option 1: DeepSeek (Best for Code Generation)

**Perfect for building frontend and backend apps:**

1. **Get API Key:**
   ```
   Visit: https://platform.deepseek.com/api_keys
   Sign up → Create API Key → Copy key
   ```

2.
   ```

2. **Configure in App Builder:**
   - Open App Builder
   - Click ⚙️ icon in chat panel
   - Select **DeepSeek** provider
   - Paste API key: `sk-...`
   - Model: `deepseek-coder` (best for code)
   - Click **Save**

3. **Start Building!**
   - Type: "Create a React todo app with add, delete, and complete"
   - Get complete, working code!

### Option 2: Groq (Fastest Responses)

**Best for speed:**

1. **Get API Key:**
   ```
   Visit: https://console.groq.com/keys
   Sign up → Create API Key → Copy key
   ```

2. **Configure in App Builder:**
   - Open App Builder
   - Click ⚙️ icon in chat panel
   - Select **Groq** provider
   - Paste API key: `gsk_...`
   - Model: `llama-3.3-70b-versatile`
   - Click **Save**

3. **Start Chatting!**
   - Type: "Create a React component for a todo list"
   - Get instant, free AI responses!

---

## 🔧 Environment Variable Setup (Optional)

You can also set API keys in your `.env` file:

```env
# DeepSeek (Best for Code - Free)
DEEPSEEK_API_KEY=sk-your_key_here

# Groq (Fastest - Free)
GROQ_API_KEY=gsk_your_key_here

# Or OpenAI (Paid)
OPENAI_API_KEY=sk-your_key_here
```

The backend will automatically use API keys in this priority:
1. `GROQ_API_KEY` (if set)
2. `DEEPSEEK_API_KEY` (if set)
3. `OPENAI_API_KEY` (if set)

---

## 📊 Provider Comparison

| Provider | Cost | Speed | Quality | Code Quality | Rate Limits | Setup Difficulty |
|----------|------|-------|---------|--------------|-------------|-----------------|
| **DeepSeek** | 🆓 Free | ⚡⚡ Fast | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Best | ✅ Good | ⭐ Easy |
| **Groq** | 🆓 Free | ⚡⚡⚡ Very Fast | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good | ✅ High | ⭐ Easy |
| Together AI | 🆓 Free | ⚡⚡ Fast | ⭐⭐⭐ Good | ⭐⭐⭐ Good | ✅ Medium | ⭐ Easy |
| Hugging Face | 🆓 Free | ⚡ Medium | ⭐⭐⭐ Good | ⭐⭐⭐ Good | ⚠️ Lower | ⭐⭐ Medium |
| OpenAI | 💳 Paid | ⚡⚡ Fast | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐⭐⭐ Best | ⚠️ Varies | ⭐ Easy |

---

## 🎯 Recommendations

### For Building Applications (Frontend/Backend):
- **DeepSeek** with `deepseek-coder` - Best for code generation, free, excellent quality

### For Speed:
- **Groq** with `llama-3.3-70b-versatile` - Fastest responses, free

### For Beginners:
- **Start with DeepSeek** - Best code quality, easy setup, completely free

### For Best Code Quality:
- **DeepSeek** with `deepseek-coder` - Optimized specifically for code generation

### For Budget-Conscious:
- **DeepSeek** or **Groq** - Both completely free with good limits

### For Production:
- **DeepSeek** - Excellent code quality, free
- Consider **OpenAI** if you need the absolute best quality and have budget

---

## ❓ Troubleshooting

### "Invalid API key" error
- Check that you copied the full API key
- For DeepSeek: Key should start with `sk-`
- For Groq: Key should start with `gsk_`
- For Hugging Face: Key should start with `hf_`
- Make sure there are no extra spaces

### "Rate limit exceeded"
- **Groq**: Wait 1-2 minutes, limits reset quickly
- **Together AI**: Check your usage dashboard
- **Hugging Face**: Free tier has lower limits, wait or upgrade

### API key not working
- Make sure you selected the correct provider in settings
- Try regenerating your API key
- Check that the API key is active in the provider's dashboard

### Slow responses
- **Groq** is usually fastest
- **DeepSeek** is fast for code generation
- Try switching to a smaller model (e.g., `llama-3.1-8b-instant` for Groq)
- Check your internet connection

---

## 🔐 Security Notes

- API keys are stored **locally in your browser** (localStorage)
- Keys are only sent to the AI provider's API
- Never share your API keys publicly
- If you commit code, make sure `.env` files are in `.gitignore`

---

## 📚 Additional Resources

- **Groq Documentation**: https://console.groq.com/docs
- **Together AI Docs**: https://docs.together.ai/
- **Hugging Face Docs**: https://huggingface.co/docs/api-inference

---

## ✅ Next Steps

1. **For Code Generation:** Choose **DeepSeek** with `deepseek-coder` model
2. **For Speed:** Choose **Groq** with `llama-3.3-70b-versatile` model
3. Get your free API key
4. Configure it in App Builder chat settings
5. Start building your frontend and backend apps with AI assistance!

**Happy coding! 🚀**

## 📚 Additional Resources

- **DeepSeek Guide**: See [DEEPSEEK_INTEGRATION.md](./DEEPSEEK_INTEGRATION.md) for detailed DeepSeek setup
- **Groq Documentation**: https://console.groq.com/docs
- **Together AI Docs**: https://docs.together.ai/
- **Hugging Face Docs**: https://huggingface.co/docs/api-inference

