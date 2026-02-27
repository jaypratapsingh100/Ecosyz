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
const LAYOUTS = ['Single-page scroll', 'Multi-section with nav', 'Sidebar layout', 'Grid-heavy', 'Card-based', 'Landing + blog'];
const GOALS = [
  'Get freelance/consulting clients',
  'Book sales or intro calls',
  'Showcase portfolio and case studies',
  'Collect email leads',
  'Promote a single product or offer',
];
const TONES = [
  'Friendly & conversational',
  'Confident & expert',
  'Minimal & direct',
  'Playful & energetic',
];

function buildPromptFromQuestionnaire(data: QuestionnaireData): string {
  const parts: string[] = [];
  if (data.appType) parts.push(data.appType as string);
  if (Array.isArray(data.requiredFeatures) && data.requiredFeatures.length > 0) {
    parts.push(`with ${(data.requiredFeatures as string[]).join(', ')}`);
  }
  if (data.designStyle) parts.push(`${data.designStyle as string} design`);
  const base = parts.join(' ');

  const detailParts: string[] = [];
  if (data.brandName) detailParts.push(`for the brand "${data.brandName as string}"`);
  if (data.targetAudience) detailParts.push(`for ${data.targetAudience as string}`);
  if (data.layoutStyle) detailParts.push(`layout: ${data.layoutStyle as string}`);
  if ((data as any).primaryGoal) detailParts.push(`primary goal: ${(data as any).primaryGoal as string}`);
  if ((data as any).tone) detailParts.push(`tone: ${(data as any).tone as string}`);
  const details = detailParts.length ? ` Focus on ${detailParts.join(', ')}.` : '';

  return base
    ? `Create a ${base}. Responsive, modern, production-ready UI.${details} Use strong, specific, conversion-focused copy and avoid generic placeholders.`
    : `Create a professional, conversion-focused marketing site. Responsive, modern design.${details} Use specific, realistic copy instead of placeholders.`;
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
  const [targetAudience, setTargetAudience] = useState((initialData?.targetAudience as string) || '');
  const [layoutStyle, setLayoutStyle] = useState((initialData?.layoutStyle as string) || '');
  const [brandName, setBrandName] = useState((initialData?.brandName as string) || '');
  const [primaryGoal, setPrimaryGoal] = useState((initialData?.primaryGoal as string) || '');
  const [tone, setTone] = useState((initialData?.tone as string) || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
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
        colorScheme:
          style?.toLowerCase().includes('dark') ? 'dark' : style?.toLowerCase().includes('light') ? 'light' : undefined,
        targetAudience: targetAudience || undefined,
        layoutStyle: layoutStyle || undefined,
        brandName: brandName || undefined,
        primaryGoal: primaryGoal || undefined,
        tone: tone || undefined,
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
        <span className="text-xs font-normal text-gray-500">
          — optional questionnaire to help the assistant understand your app
        </span>
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
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            {showAdvanced ? 'Hide detailed questionnaire' : 'Open detailed questionnaire'}
          </button>
          <span className="text-[11px] text-gray-500">Optional, but helps generate better apps</span>
        </div>
        {showAdvanced && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., B2B SaaS founders, local customers, job recruiters"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Primary goal of this site</label>
              <div className="flex flex-wrap gap-1.5">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setPrimaryGoal(primaryGoal === goal ? '' : goal)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      primaryGoal === goal
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Voice & tone</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(tone === t ? '' : t)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      tone === t
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Layout preference</label>
              <div className="flex flex-wrap gap-1.5">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => setLayoutStyle(layoutStyle === layout ? '' : layout)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                      layoutStyle === layout
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Brand or project name (optional)</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Open Idea, Ecosyz"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
        )}
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
