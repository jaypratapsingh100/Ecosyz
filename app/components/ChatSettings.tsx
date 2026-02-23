'use client';

import { useState, useEffect } from 'react';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'ai_api_key';
const MODEL_STORAGE_KEY = 'ai_model';
const PROVIDER_STORAGE_KEY = 'ai_provider';

// Hardcoded: Only Groq (Llama 3.3 70B)
const PROVIDER = 'groq';
const MODEL = 'llama-3.3-70b-versatile';

// Export utility functions to get stored values
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function getStoredModel(): string {
  if (typeof window === 'undefined') return MODEL;
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  // Migrate old OpenRouter/DeepSeek model IDs to Groq default
  if (!stored || stored.includes('deepseek') || stored.includes('openrouter')) {
    if (typeof window !== 'undefined') localStorage.setItem(MODEL_STORAGE_KEY, MODEL);
    return MODEL;
  }
  return stored || MODEL;
}

export function getStoredProvider(): string {
  if (typeof window === 'undefined') return PROVIDER;
  // Always return Groq (hardcoded)
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored !== PROVIDER) {
    localStorage.setItem(PROVIDER_STORAGE_KEY, PROVIDER);
  }
  return PROVIDER;
}

export default function ChatSettings({ isOpen, onClose }: ChatSettingsProps) {
  // Hardcoded: Only Groq — API key from environment variable GROQ_API_KEY
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSaved(false);
    }
  }, [isOpen]);

  const handleClose = () => {
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
            <p className="text-gray-400 text-xs mt-1">
              Using Groq
            </p>
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
                <p className="text-emerald-200 text-xs font-medium mb-1">
                  Llama 3.3 70B – Best analysis quality
                </p>
                <p className="text-emerald-300/80 text-xs leading-relaxed">
                  Using <strong>Groq</strong> with <strong>Llama 3.3 70B Versatile</strong> – fast inference and strong answers for resource analysis. API key is configured from environment variable (<code className="text-emerald-200">GROQ_API_KEY</code>).
                </p>
              </div>
            </div>
          </div>

          {/* Provider Display - Fixed */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              AI Provider
            </label>
            <div className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-gray-300 text-sm">
              Groq
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Using API key from environment variable
            </p>
          </div>

          {/* Model Display - Fixed */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Model
            </label>
            <div className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-gray-300 text-sm">
              Llama 3.3 70B Versatile (Best for Resource Analysis)
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Optimized for comprehensive analysis, detailed answers, and resource understanding.
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
              onClick={handleClose}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


