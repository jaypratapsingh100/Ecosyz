/**
 * Multi-Provider LLM Load Balancer
 * 
 * Distributes requests across multiple free LLM providers to handle high loads
 * and provide redundancy. Optimized for 1000+ requests/hour.
 */

export type Provider = 'openai' | 'groq' | 'together' | 'huggingface' | 'deepseek' | 'azure-deepseek' | 'ollama' | 'openrouter' | 'perplexity' | 'cohere' | 'anthropic';

export interface ProviderConfig {
  name: Provider;
  priority: number; // Lower = higher priority
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  apiKey?: string;
  baseURL?: string;
  enabled: boolean;
}

export interface LoadBalancerStats {
  provider: Provider;
  requestsHandled: number;
  requestsFailed: number;
  lastUsed: Date;
  currentUsage: {
    requestsThisHour: number;
    requestsThisMinute: number;
  };
}

class LLMLoadBalancer {
  private providers: Map<Provider, ProviderConfig> = new Map();
  private stats: Map<Provider, LoadBalancerStats> = new Map();
  private requestHistory: Array<{ provider: Provider; timestamp: Date }> = [];

  constructor() {
    this.initializeProviders();
    this.startCleanupInterval();
  }

  /**
   * Initialize provider configurations with rate limits
   */
  private initializeProviders() {
    const providerConfigs: ProviderConfig[] = [
      {
        name: 'groq',
        priority: 1, // Highest priority
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerHour: 1800,
        },
        enabled: true,
      },
      {
        name: 'azure-deepseek',
        priority: 0, // Highest priority - use Azure DeepSeek first if available
        rateLimit: {
          requestsPerMinute: 60, // Higher limit since it's self-hosted
          requestsPerHour: 3600,
        },
        enabled: !!process.env.AZURE_DEEPSEEK_URL, // Only enabled if URL is set
      },
      {
        name: 'deepseek',
        priority: 2,
        rateLimit: {
          requestsPerMinute: 20,
          requestsPerHour: 1200,
        },
        enabled: true,
      },
      {
        name: 'openrouter',
        priority: 3,
        rateLimit: {
          requestsPerMinute: 15,
          requestsPerHour: 900,
        },
        enabled: true,
      },
      {
        name: 'together',
        priority: 4,
        rateLimit: {
          requestsPerMinute: 10,
          requestsPerHour: 600,
        },
        enabled: true,
      },
      {
        name: 'ollama',
        priority: 0, // Highest priority (unlimited)
        rateLimit: {
          requestsPerMinute: Infinity,
          requestsPerHour: Infinity,
        },
        enabled: true,
      },
      {
        name: 'huggingface',
        priority: 5,
        rateLimit: {
          requestsPerMinute: 5,
          requestsPerHour: 300,
        },
        enabled: true,
      },
    ];

    providerConfigs.forEach(config => {
      this.providers.set(config.name, config);
      this.stats.set(config.name, {
        provider: config.name,
        requestsHandled: 0,
        requestsFailed: 0,
        lastUsed: new Date(0),
        currentUsage: {
          requestsThisHour: 0,
          requestsThisMinute: 0,
        },
      });
    });
  }

  /**
   * Get the best available provider based on capacity and priority
   */
  getBestProvider(userProvider?: Provider, userApiKey?: string): Provider | null {
    // If user specified a provider, use it if available
    if (userProvider && this.providers.has(userProvider)) {
      const config = this.providers.get(userProvider)!;
      if (config.enabled && this.hasCapacity(userProvider)) {
        return userProvider;
      }
    }

    // Sort providers by priority and capacity
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.enabled)
      .filter(p => this.hasCapacity(p.name))
      .sort((a, b) => {
        // First sort by priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Then by available capacity
        const aCapacity = this.getAvailableCapacity(a.name);
        const bCapacity = this.getAvailableCapacity(b.name);
        return bCapacity - aCapacity;
      });

    if (availableProviders.length === 0) {
      return null; // No providers available
    }

    return availableProviders[0].name;
  }

  /**
   * Check if provider has available capacity
   */
  private hasCapacity(provider: Provider): boolean {
    const config = this.providers.get(provider);
    if (!config) return false;

    const stats = this.stats.get(provider);
    if (!stats) return false;

    // Ollama has unlimited capacity
    if (config.rateLimit.requestsPerHour === Infinity) {
      return true;
    }

    // Check hourly limit
    if (stats.currentUsage.requestsThisHour >= config.rateLimit.requestsPerHour * 0.9) {
      return false; // Using 90%+ of capacity
    }

    // Check minute limit
    if (stats.currentUsage.requestsThisMinute >= config.rateLimit.requestsPerMinute * 0.9) {
      return false; // Using 90%+ of capacity
    }

    return true;
  }

  /**
   * Get available capacity for a provider
   */
  private getAvailableCapacity(provider: Provider): number {
    const config = this.providers.get(provider);
    const stats = this.stats.get(provider);
    
    if (!config || !stats) return 0;

    if (config.rateLimit.requestsPerHour === Infinity) {
      return Infinity;
    }

    const used = stats.currentUsage.requestsThisHour;
    const limit = config.rateLimit.requestsPerHour;
    return Math.max(0, limit - used);
  }

  /**
   * Record a request to a provider
   */
  recordRequest(provider: Provider, success: boolean) {
    const stats = this.stats.get(provider);
    if (!stats) return;

    const now = new Date();
    stats.lastUsed = now;
    
    if (success) {
      stats.requestsHandled++;
      stats.currentUsage.requestsThisHour++;
      stats.currentUsage.requestsThisMinute++;
    } else {
      stats.requestsFailed++;
    }

    // Record in history
    this.requestHistory.push({ provider, timestamp: now });

    // Clean old history (keep last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    this.requestHistory = this.requestHistory.filter(
      r => r.timestamp > oneHourAgo
    );
  }

  /**
   * Get statistics for all providers
   */
  getStats(): Map<Provider, LoadBalancerStats> {
    return new Map(this.stats);
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: Provider): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(provider: Provider, enabled: boolean) {
    const config = this.providers.get(provider);
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * Update provider API key
   */
  setProviderApiKey(provider: Provider, apiKey: string) {
    const config = this.providers.get(provider);
    if (config) {
      config.apiKey = apiKey;
    }
  }

  /**
   * Cleanup interval to reset minute counters
   */
  private startCleanupInterval() {
    // Reset minute counters every minute
    setInterval(() => {
      this.stats.forEach((stats) => {
        stats.currentUsage.requestsThisMinute = 0;
      });
    }, 60 * 1000);

    // Reset hour counters every hour
    setInterval(() => {
      this.stats.forEach((stats) => {
        stats.currentUsage.requestsThisHour = 0;
      });
    }, 60 * 60 * 1000);
  }

  /**
   * Get recommended provider distribution for 1000 requests/hour
   */
  getRecommendedDistribution(): Array<{ provider: Provider; percentage: number; requestsPerHour: number }> {
    const distribution = [
      { provider: 'groq' as Provider, percentage: 60, requestsPerHour: 600 },
      { provider: 'deepseek' as Provider, percentage: 30, requestsPerHour: 300 },
      { provider: 'openrouter' as Provider, percentage: 10, requestsPerHour: 100 },
    ];

    return distribution.filter(d => {
      const config = this.providers.get(d.provider);
      return config && config.enabled;
    });
  }
}

// Singleton instance
let loadBalancerInstance: LLMLoadBalancer | null = null;

export function getLoadBalancer(): LLMLoadBalancer {
  if (!loadBalancerInstance) {
    loadBalancerInstance = new LLMLoadBalancer();
  }
  return loadBalancerInstance;
}

/**
 * Helper function to get best provider with fallback
 */
export function getProviderWithFallback(
  userProvider?: Provider,
  userApiKey?: string
): Provider {
  const balancer = getLoadBalancer();
  
  // Try user's preferred provider first
  if (userProvider) {
    const provider = balancer.getBestProvider(userProvider, userApiKey);
    if (provider) return provider;
  }

  // Get best available provider
  const bestProvider = balancer.getBestProvider();
  if (bestProvider) return bestProvider;

  // Fallback to OpenRouter (free models available)
  return 'openrouter';
}


