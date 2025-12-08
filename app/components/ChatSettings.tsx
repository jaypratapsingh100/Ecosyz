'use client';

import { useState, useEffect } from 'react';
import { type Provider } from './chatUtils';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'ai_api_key';
const MODEL_STORAGE_KEY = 'ai_model';
const PROVIDER_STORAGE_KEY = 'ai_provider';

// Export utility functions to get stored values
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function getStoredModel(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(MODEL_STORAGE_KEY);
}

export function getStoredProvider(): Provider {
  if (typeof window === 'undefined') return 'groq';
  return (localStorage.getItem(PROVIDER_STORAGE_KEY) || 'groq') as Provider;
}

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  together: ['meta-llama/Llama-3-8b-chat-hf', 'meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
  huggingface: ['meta-llama/Llama-3-8b-chat-hf'],
};

const PROVIDER_DEFAULTS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3-8b-chat-hf',
  huggingface: 'meta-llama/Llama-3-8b-chat-hf',
};

export default function ChatSettings({ isOpen, onClose }: ChatSettingsProps) {
  const [provider, setProvider] = useState<Provider>('groq'); // Default to Groq (free)
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load saved settings
      const savedProvider = (localStorage.getItem(PROVIDER_STORAGE_KEY) || 'groq') as Provider;
      const savedKey = localStorage.getItem(STORAGE_KEY) || '';
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) || PROVIDER_DEFAULTS[savedProvider];
      setProvider(savedProvider);
      setApiKey(savedKey);
      setModel(savedModel);
      setSaved(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Update model when provider changes
    const defaultModel = PROVIDER_DEFAULTS[provider];
    if (!PROVIDER_MODELS[provider].includes(model)) {
      setModel(defaultModel);
    }
  }, [provider]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
      localStorage.setItem(STORAGE_KEY, apiKey.trim());
      localStorage.setItem(MODEL_STORAGE_KEY, model);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    } else {
      // Clear if empty
      localStorage.removeItem(PROVIDER_STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MODEL_STORAGE_KEY);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    }
  };

  const handleClear = () => {
    setProvider('groq');
    setApiKey('');
    setModel('llama-3.3-70b-versatile');
    localStorage.removeItem(PROVIDER_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MODEL_STORAGE_KEY);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-semibold text-lg">Chat Settings</h2>
            <p className="text-gray-400 text-xs mt-1">Configure your OpenAI API key</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-emerald-200 text-xs font-medium mb-1">✨ Free AI Providers Available!</p>
                <p className="text-emerald-300/80 text-xs leading-relaxed">
                  Use <strong>Groq</strong> (recommended) or <strong>Together AI</strong> for free, fast AI responses. 
                  Your API key is stored locally and never sent to our servers except for API calls.
                </p>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all text-sm"
            >
              <option value="groq">🆓 Groq (FREE - Recommended)</option>
              <option value="together">🆓 Together AI (FREE)</option>
              <option value="huggingface">🆓 Hugging Face (FREE)</option>
              <option value="openai">💳 OpenAI (Paid)</option>
            </select>
            <p className="text-gray-500 text-xs mt-2">
              {provider === 'groq' && 'Get free API key: https://console.groq.com/keys'}
              {provider === 'together' && 'Get free API key: https://api.together.xyz/'}
              {provider === 'huggingface' && 'Get free API key: https://huggingface.co/settings/tokens'}
              {provider === 'openai' && 'Get API key: https://platform.openai.com/api-keys'}
            </p>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'groq' ? 'gsk_...' : provider === 'together' ? 'Your Together API key' : provider === 'huggingface' ? 'hf_...' : 'sk-...'}
                className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L12 12m-5.71-5.71L12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all text-sm"
            >
              {PROVIDER_MODELS[provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-xs mt-2">
              Select the model for {provider === 'groq' ? 'Groq' : provider === 'together' ? 'Together AI' : provider === 'huggingface' ? 'Hugging Face' : 'OpenAI'}.
            </p>
          </div>

          {/* Success Message */}
          {saved && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-300 text-sm">Settings saved!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


