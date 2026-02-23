'use client';

export type Provider = 'groq';

const STORAGE_KEY = 'ai_api_key';
const MODEL_STORAGE_KEY = 'ai_model';
const PROVIDER_STORAGE_KEY = 'ai_provider';

// Hardcoded: Only Groq (Llama 3.3 70B)
const DEFAULT_PROVIDER: Provider = 'groq';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// Helper function to get API key from storage
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

// Helper function to get model from storage
export function getStoredModel(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL;
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  // Always use Groq default (API uses server-side GROQ_API_KEY and ignores client storage)
  if (stored !== DEFAULT_MODEL) {
    if (typeof window !== 'undefined') localStorage.setItem(MODEL_STORAGE_KEY, DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  return stored || DEFAULT_MODEL;
}

// Helper function to get provider from storage - Always Groq
export function getStoredProvider(): Provider {
  if (typeof window === 'undefined') return DEFAULT_PROVIDER;
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored !== DEFAULT_PROVIDER) {
    if (typeof window !== 'undefined') localStorage.setItem(PROVIDER_STORAGE_KEY, DEFAULT_PROVIDER);
  }
  return DEFAULT_PROVIDER;
}

