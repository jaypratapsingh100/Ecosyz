# 🔄 Multi-Provider Load Balancer Implementation

## Overview

A smart load balancing system that distributes requests across multiple free LLM providers to handle high loads (1000+ requests/hour) with automatic failover and redundancy.

## 🎯 Features

- ✅ **Automatic Provider Selection** - Chooses best available provider
- ✅ **Rate Limit Management** - Tracks usage and prevents limit violations
- ✅ **Automatic Failover** - Switches providers if one hits limits
- ✅ **Load Distribution** - Distributes requests across providers
- ✅ **Statistics Tracking** - Monitors usage and performance
- ✅ **Priority-Based Routing** - Uses providers in priority order

## 🏗️ Architecture

### Components

1. **LoadBalancer Class** (`src/lib/llm-load-balancer.ts`)
   - Manages provider configurations
   - Tracks usage statistics
   - Selects best provider
   - Handles rate limiting

2. **API Integration** (`app/api/app-projects/[id]/chat/route.ts`)
   - Uses load balancer for provider selection
   - Implements automatic failover
   - Records request statistics

3. **Stats Endpoint** (`app/api/app-projects/[id]/chat/stats/route.ts`)
   - Provides usage statistics
   - Shows provider health
   - Recommends distribution

## 📊 Provider Priority & Limits

| Provider | Priority | Rate Limit/Hour | Rate Limit/Minute |
|----------|----------|----------------|-------------------|
| **Ollama** | 0 (Highest) | Unlimited | Unlimited |
| **Groq** | 1 | 1800 | 30 |
| **DeepSeek** | 2 | 1200 | 20 |
| **OpenRouter** | 3 | 900 | 15 |
| **Together AI** | 4 | 600 | 10 |
| **Hugging Face** | 5 | 300 | 5 |

## 🚀 How It Works

### 1. Request Flow

```
User Request
    ↓
Load Balancer checks available providers
    ↓
Selects provider based on:
  - Priority
  - Available capacity
  - User preference
    ↓
Makes API request
    ↓
Records success/failure
    ↓
Returns response
```

### 2. Failover Mechanism

```
Primary Provider (Groq)
    ↓
Rate Limit Hit (429 error)
    ↓
Load Balancer detects failure
    ↓
Selects next available provider
    ↓
Retries request
    ↓
Returns response
```

### 3. Load Distribution

For 1000 requests/hour:
- **Groq**: 60% (~600 requests/hour)
- **DeepSeek**: 30% (~300 requests/hour)
- **OpenRouter**: 10% (~100 requests/hour)

## 💻 Usage

### Automatic (Default)

The load balancer automatically selects the best provider:

```typescript
// In your API route
const loadBalancer = getLoadBalancer();
const provider = getProviderWithFallback(userProvider, userApiKey);

// Use provider for API call
const client = createClient(apiKey, provider, model);
```

### Manual Provider Selection

Users can still specify a provider:

```typescript
// User selects Groq in chat settings
const provider = 'groq';

// Load balancer respects user choice if available
const bestProvider = getProviderWithFallback(provider, apiKey);
```

### Get Statistics

```typescript
// Get load balancer stats
const stats = loadBalancer.getStats();

// Check specific provider
const groqStats = stats.get('groq');
console.log(`Groq: ${groqStats.requestsHandled} requests handled`);
```

## 📈 Monitoring

### Stats Endpoint

```bash
GET /api/app-projects/[id]/chat/stats
```

**Response:**
```json
{
  "stats": [
    {
      "provider": "groq",
      "requestsHandled": 450,
      "requestsFailed": 2,
      "currentUsage": {
        "requestsThisHour": 450,
        "requestsThisMinute": 8
      },
      "successRate": 99.56
    }
  ],
  "recommendedDistribution": [
    {
      "provider": "groq",
      "percentage": 60,
      "requestsPerHour": 600
    }
  ],
  "totalRequests": 1200,
  "totalFailures": 5
}
```

## 🔧 Configuration

### Environment Variables

```env
# Provider API Keys
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
TOGETHER_API_KEY=...
```

### Custom Rate Limits

Edit `src/lib/llm-load-balancer.ts`:

```typescript
{
  name: 'groq',
  priority: 1,
  rateLimit: {
    requestsPerMinute: 30,  // Adjust as needed
    requestsPerHour: 1800,  // Adjust as needed
  },
  enabled: true,
}
```

## 🎯 Benefits

### For 1000 Requests/Hour:

1. **Reliability**
   - Automatic failover if provider hits limits
   - Multiple providers = redundancy
   - No single point of failure

2. **Performance**
   - Uses fastest available provider
   - Distributes load efficiently
   - Prevents rate limit violations

3. **Cost**
   - All providers are free
   - No additional costs
   - Efficient resource usage

4. **Scalability**
   - Can handle 1000+ requests/hour
   - Easy to add more providers
   - Scales horizontally

## 📊 Example Scenarios

### Scenario 1: Normal Load (1000 req/hour)

```
Request 1-600: Groq (60%)
Request 601-900: DeepSeek (30%)
Request 901-1000: OpenRouter (10%)
```

### Scenario 2: Groq Hits Limit

```
Request 1-1800: Groq (hits limit)
Request 1801+: Automatic failover to DeepSeek
```

### Scenario 3: High Load (2000 req/hour)

```
Request 1-1800: Groq (max capacity)
Request 1801-3000: DeepSeek (1200 capacity)
Request 3001+: OpenRouter (fallback)
```

## 🔍 Monitoring & Debugging

### Check Provider Status

```typescript
const loadBalancer = getLoadBalancer();
const stats = loadBalancer.getStats();

stats.forEach((stat, provider) => {
  console.log(`${provider}:`);
  console.log(`  Handled: ${stat.requestsHandled}`);
  console.log(`  Failed: ${stat.requestsFailed}`);
  console.log(`  Usage/Hour: ${stat.currentUsage.requestsThisHour}`);
  console.log(`  Usage/Minute: ${stat.currentUsage.requestsThisMinute}`);
});
```

### Recommended Distribution

```typescript
const distribution = loadBalancer.getRecommendedDistribution();
// Returns optimal distribution for 1000 req/hour
```

## ✅ Testing

### Test Load Balancer

```bash
# Make multiple requests
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/app-projects/[id]/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Test request"}'
done

# Check stats
curl http://localhost:3000/api/app-projects/[id]/chat/stats
```

## 🎯 Summary

The load balancer provides:

- ✅ **Automatic provider selection**
- ✅ **Rate limit management**
- ✅ **Automatic failover**
- ✅ **Load distribution**
- ✅ **Statistics tracking**
- ✅ **1000+ requests/hour capacity**

**Your app can now handle 1000+ requests/hour reliably using free LLM providers!** 🚀

---

**Next Steps:**
1. Test the load balancer with your use case
2. Monitor statistics via `/chat/stats` endpoint
3. Adjust provider priorities as needed
4. Scale to more providers if needed


