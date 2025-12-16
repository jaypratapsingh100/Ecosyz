'use client';

export type Provider = 'openai' | 'groq' | 'together' | 'huggingface' | 'deepseek' | 'ollama' | 'openrouter' | 'perplexity' | 'cohere' | 'anthropic';

const STORAGE_KEY = 'ai_api_key';
const MODEL_STORAGE_KEY = 'ai_model';
const PROVIDER_STORAGE_KEY = 'ai_provider';

// Helper function to get API key from storage
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

// Helper function to get model from storage
export function getStoredModel(): string {
  if (typeof window === 'undefined') return 'meta-llama/llama-3.2-3b-instruct:free';
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  
  // Migrate old deprecated models to new defaults
  if (stored === 'llama-3.1-70b-versatile' || stored === 'llama-3.3-70b-versatile') {
    localStorage.setItem(MODEL_STORAGE_KEY, 'meta-llama/llama-3.2-3b-instruct:free');
    return 'meta-llama/llama-3.2-3b-instruct:free';
  }
  
  return stored || 'meta-llama/llama-3.2-3b-instruct:free';
}

// Helper function to get provider from storage
export function getStoredProvider(): Provider {
  if (typeof window === 'undefined') return 'openrouter';
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored && ['openai', 'groq', 'together', 'huggingface', 'deepseek', 'ollama', 'openrouter', 'perplexity', 'cohere', 'anthropic'].includes(stored)) {
    return stored as Provider;
  }
  return 'openrouter';
}

