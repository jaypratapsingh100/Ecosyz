'use client';

import { useState } from 'react';
import type { QuestionnaireData } from '@/app/types/app-builder';

const TOTAL_STEPS = 5;

const APP_TYPE_CARDS = [
  { id: 'Business / Corporate', label: 'Business', icon: 'briefcase', description: 'Corporate or business website' },
  { id: 'Landing Page / SaaS', label: 'SaaS Landing', icon: 'rocket', description: 'Product landing page' },
  { id: 'Portfolio', label: 'Portfolio', icon: 'user', description: 'Personal or agency portfolio' },
  { id: 'E-commerce', label: 'E-commerce', icon: 'cart', description: 'Online store or product catalog' },
  { id: 'Dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Data dashboard or admin panel' },
  { id: 'Blog', label: 'Blog', icon: 'pen', description: 'Blog or content site' },
  { id: 'Todo / Task', label: 'Todo App', icon: 'check', description: 'Task management application' },
  { id: 'Other', label: 'Other', icon: 'code', description: 'Something else entirely' },
];

const FEATURE_CARDS = [
  { id: 'Hero + CTA', label: 'Hero + CTA', icon: 'star' },
  { id: 'Services', label: 'Services', icon: 'grid' },
  { id: 'Testimonials', label: 'Testimonials', icon: 'chat' },
  { id: 'Contact Form', label: 'Contact Form', icon: 'mail' },
  { id: 'Dark mode', label: 'Dark Mode', icon: 'moon' },
  { id: 'Navigation', label: 'Navigation', icon: 'menu' },
  { id: 'Footer', label: 'Footer', icon: 'list' },
  { id: 'Cards', label: 'Cards', icon: 'square' },
  { id: 'Search', label: 'Search', icon: 'search' },
  { id: 'Auth UI', label: 'Auth UI', icon: 'lock' },
  { id: 'Pricing', label: 'Pricing', icon: 'dollar' },
  { id: 'Gallery', label: 'Gallery', icon: 'image' },
];

const STYLE_CARDS = [
  { id: 'Dark', preview: 'from-slate-900 to-slate-800', textColor: 'text-white' },
  { id: 'Light', preview: 'from-white to-gray-100', textColor: 'text-gray-800' },
  { id: 'Gradient', preview: 'from-violet-600 to-cyan-500', textColor: 'text-white' },
  { id: 'Minimal', preview: 'from-gray-50 to-white', textColor: 'text-gray-600' },
  { id: 'Professional', preview: 'from-blue-900 to-blue-700', textColor: 'text-white' },
  { id: 'Modern', preview: 'from-emerald-400 to-cyan-400', textColor: 'text-gray-900' },
];

const COLOR_PRESETS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

function AppIcon({ name }: { name: string }) {
  const cls = 'w-5 h-5';
  switch (name) {
    case 'briefcase': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    );
    case 'rocket': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    );
    case 'user': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
    case 'cart': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
    case 'dashboard': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    );
    case 'pen': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    );
    case 'check': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
    case 'star': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    );
    case 'grid': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    );
    case 'chat': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
    case 'mail': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
    case 'moon': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    );
    case 'menu': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
    case 'list': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    );
    case 'square': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
      </svg>
    );
    case 'search': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
    case 'lock': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
    case 'dollar': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    case 'image': return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
    default: return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
}

function buildPromptFromQuestionnaire(data: QuestionnaireData): string {
  const parts: string[] = [];
  if (data.appType) parts.push(data.appType as string);
  if (data.appDescription) parts.push(`that ${data.appDescription as string}`);
  if (Array.isArray(data.requiredFeatures) && data.requiredFeatures.length > 0) {
    parts.push(`with ${(data.requiredFeatures as string[]).join(', ')}`);
  }
  if (data.designStyle) parts.push(`${data.designStyle as string} design`);
  if (data.brandName) parts.push(`for "${data.brandName as string}"`);
  if (data.tagline) parts.push(`(tagline: "${data.tagline as string}")`);
  if (data.primaryColor) parts.push(`primary color: ${data.primaryColor as string}`);

  const base = parts.join(' ');
  return base
    ? `Create a ${base}. Responsive, modern, production-ready.`
    : 'Create a professional web app. Responsive, modern design.';
}

interface ChatQuestionnaireProps {
  projectId: string;
  initialData?: QuestionnaireData | null;
  onComplete: (data: QuestionnaireData, generatedPrompt?: string) => void;
  onSkip?: () => void;
}

export default function ChatQuestionnaire({
  projectId,
  initialData,
  onComplete,
  onSkip,
}: ChatQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [appType, setAppType] = useState((initialData?.appType as string) || '');
  const [appDescription, setAppDescription] = useState((initialData?.appDescription as string) || '');
  const [features, setFeatures] = useState<string[]>(
    (initialData?.requiredFeatures as string[]) || []
  );
  const [designStyle, setDesignStyle] = useState((initialData?.designStyle as string) || '');
  const [brandName, setBrandName] = useState((initialData?.brandName as string) || '');
  const [tagline, setTagline] = useState((initialData?.tagline as string) || '');
  const [primaryColor, setPrimaryColor] = useState((initialData?.primaryColor as string) || '#6366f1');
  const [saving, setSaving] = useState(false);

  const toggleFeature = (f: string) => {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const data: QuestionnaireData = {
        appType: appType || undefined,
        appDescription: appDescription.trim() || undefined,
        requiredFeatures: features,
        specialFeatures: features,
        designStyle: designStyle || undefined,
        colorScheme: designStyle?.toLowerCase().includes('dark') ? 'dark' : designStyle?.toLowerCase().includes('light') ? 'light' : undefined,
        brandName: brandName.trim() || undefined,
        tagline: tagline.trim() || undefined,
        primaryColor,
      };
      const res = await fetch(`/api/app-projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionnaireData: data }),
      });
      if (res.ok) onComplete(data, buildPromptFromQuestionnaire(data));
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ['App Type', 'Description', 'Features', 'Design Style', 'Brand'];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <p className="text-xs text-gray-400 mb-3">What kind of app are you building?</p>
            <div className="grid grid-cols-2 gap-2">
              {APP_TYPE_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setAppType(card.id);
                    setTimeout(() => setStep(2), 220);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    appType === card.id
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/10 bg-[#1a1a1a] hover:border-white/20'
                  }`}
                >
                  <div className={`mb-1.5 ${appType === card.id ? 'text-emerald-400' : 'text-gray-400'}`}>
                    <AppIcon name={card.icon} />
                  </div>
                  <div className={`text-xs font-medium ${appType === card.id ? 'text-emerald-300' : 'text-gray-300'}`}>{card.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <p className="text-xs text-gray-400 mb-3">What should your app do? <span className="text-gray-600">(optional)</span></p>
            <textarea
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="e.g., A fitness tracking app that lets users log workouts, track calories, and view progress charts..."
              rows={4}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none resize-none"
            />
          </div>
        );

      case 3:
        return (
          <div>
            <p className="text-xs text-gray-400 mb-3">Which sections do you need? <span className="text-gray-600">(select all that apply)</span></p>
            <div className="grid grid-cols-3 gap-1.5">
              {FEATURE_CARDS.map((card) => {
                const selected = features.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => toggleFeature(card.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all duration-200 ${
                      selected
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <AppIcon name={card.icon} />
                    </div>
                    <div className="text-[10px] font-medium leading-tight">{card.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <p className="text-xs text-gray-400 mb-3">Choose a visual style</p>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setDesignStyle(designStyle === card.id ? '' : card.id)}
                  className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                    designStyle === card.id
                      ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`h-14 bg-gradient-to-br ${card.preview}`} />
                  <div className={`px-3 py-1.5 bg-[#1a1a1a] text-xs font-medium ${designStyle === card.id ? 'text-emerald-300' : 'text-gray-400'}`}>
                    {card.id}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Brand name <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tagline <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g., Building the future, today"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Primary color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPrimaryColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full transition-all duration-150 ${
                      primaryColor === color ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-[#111]' : 'hover:scale-110'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 mb-4">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < step ? 'bg-emerald-400' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mb-3">Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}</p>

      {/* Step title */}
      <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
        <span>Setup wizard</span>
        <span className="text-xs font-normal text-gray-500">— helps build better prompts</span>
      </h3>

      {/* Step content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors"
            >
              ← Back
            </button>
          )}
          {onSkip && step === 1 && (
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-400 text-xs"
            >
              Skip
            </button>
          )}
        </div>

        <div>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/30 transition-colors"
            >
              {step === 1 && !appType ? 'Skip →' : 'Next →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Generate →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
