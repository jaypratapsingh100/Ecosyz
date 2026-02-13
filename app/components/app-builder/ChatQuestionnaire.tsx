'use client';

import { useState } from 'react';
import type { QuestionnaireData } from '@/app/types/app-builder';

const APP_TYPES = [
  'Professional Business Website',
  'Business / Corporate',
  'Landing Page',
  'Agency / Startup',
  'E-commerce',
  'Portfolio',
  'Todo / Task',
  'Dashboard',
  'Blog',
  'Tool',
  'Other',
];
const FEATURES = [
  'Hero + CTA',
  'Services',
  'Testimonials',
  'Contact Form',
  'Dark mode',
  'Navigation',
  'Footer',
  'Cards',
  'Search',
  'Auth UI',
];
const STYLES = ['Professional', 'Modern', 'Minimal', 'Gradient', 'Dark', 'Light'];

function buildPromptFromQuestionnaire(data: QuestionnaireData): string {
  const parts: string[] = [];
  if (data.appType) parts.push(data.appType as string);
  if (Array.isArray(data.requiredFeatures) && data.requiredFeatures.length > 0) {
    parts.push(`with ${(data.requiredFeatures as string[]).join(', ')}`);
  }
  if (data.designStyle) parts.push(`${data.designStyle as string} design`);
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
  const [appType, setAppType] = useState((initialData?.appType as string) || '');
  const [features, setFeatures] = useState<string[]>(
    (initialData?.requiredFeatures as string[]) || (initialData?.specialFeatures as string[]) || []
  );
  const [style, setStyle] = useState((initialData?.designStyle as string) || (initialData?.colorScheme as string) || '');
  const [saving, setSaving] = useState(false);

  const toggleFeature = (f: string) => {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appType.trim()) return;
    setSaving(true);
    try {
      const data: QuestionnaireData = {
        appType: appType.trim(),
        requiredFeatures: features,
        specialFeatures: features,
        designStyle: style || undefined,
        colorScheme: style?.toLowerCase().includes('dark') ? 'dark' : style?.toLowerCase().includes('light') ? 'light' : undefined,
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

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4">
      <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
        <span>Quick setup</span>
        <span className="text-xs font-normal text-gray-500">— helps build better prompts</span>
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">App type</label>
          <select
            value={appType}
            onChange={(e) => setAppType(e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Select...</option>
            {APP_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Features</label>
          <div className="flex flex-wrap gap-1.5">
            {FEATURES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFeature(f)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  features.includes(f)
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                    : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Style</label>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(style === s ? '' : s)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  style === s
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                    : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!appType.trim() || saving}
            className="px-3 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/40 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & use'}
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-400 text-xs"
            >
              Skip
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
