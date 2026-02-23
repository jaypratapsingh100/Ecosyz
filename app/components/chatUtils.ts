'use client';

export type Provider = 'openrouter';

const STORAGE_KEY = 'ai_api_key';
const MODEL_STORAGE_KEY = 'ai_model';
const PROVIDER_STORAGE_KEY = 'ai_provider';

// Hardcoded: Only OpenRouter + DeepSeek Chat (versioned model; deepseek/deepseek-coder no longer available)
const DEFAULT_PROVIDER: Provider = 'openrouter';
const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3-0324';

// Helper function to get API key from storage
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

// Helper function to get model from storage
export function getStoredModel(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  
  // Always use DeepSeek Coder
  if (stored !== DEFAULT_MODEL) {
    localStorage.setItem(MODEL_STORAGE_KEY, DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  
  return stored || DEFAULT_MODEL;
}

// Helper function to get provider from storage - Always OpenRouter
export function getStoredProvider(): Provider {
  if (typeof window === 'undefined') return DEFAULT_PROVIDER;
  // Always return OpenRouter
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored !== DEFAULT_PROVIDER) {
    localStorage.setItem(PROVIDER_STORAGE_KEY, DEFAULT_PROVIDER);
  }
  return DEFAULT_PROVIDER;
}

