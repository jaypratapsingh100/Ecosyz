'use client';

import { useState } from 'react';
import type { QuestionnaireData } from '@/app/types/app-builder';

const TOTAL_STEPS = 8;

const APP_TYPES = [
  { label: 'Business / Corporate', icon: '🏢' },
  { label: 'Landing Page', icon: '🚀' },
  { label: 'E-commerce', icon: '🛒' },
  { label: 'Portfolio', icon: '🎨' },
  { label: 'Dashboard', icon: '📊' },
  { label: 'Todo / Task App', icon: '✅' },
  { label: 'Blog', icon: '📝' },
  { label: 'Tool / Utility', icon: '🔧' },
  { label: 'Agency / Startup', icon: '💡' },
  { label: 'SaaS / Web App', icon: '☁️' },
  { label: 'Other', icon: '✨' },
];

const FEATURES = [
  'Hero + CTA',
  'Navigation',
  'Footer',
  'Services / Features section',
  'Testimonials',
  'Contact Form',
  'Auth UI (Login/Signup)',
  'Dark mode',
  'Search',
  'Cards / Grid layout',
  'Pricing table',
  'Image gallery',
  'Blog / Articles',
  'User dashboard',
  'Data tables',
  'Charts / Analytics',
  'File upload',
  'Notifications',
];

const STYLES = [
  { label: 'Professional', desc: 'Clean, trustworthy' },
  { label: 'Modern', desc: 'Contemporary feel' },
  { label: 'Minimal', desc: 'Simple, focused' },
  { label: 'Gradient', desc: 'Vibrant gradients' },
  { label: 'Dark', desc: 'Dark theme' },
  { label: 'Light', desc: 'Light theme' },
  { label: 'Playful', desc: 'Fun, creative' },
  { label: 'Corporate', desc: 'Formal, business' },
];

const COLOR_SCHEMES = [
  { label: 'Emerald', color: '#10b981' },
  { label: 'Blue', color: '#3b82f6' },
  { label: 'Purple', color: '#8b5cf6' },
  { label: 'Rose', color: '#f43f5e' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'Cyan', color: '#06b6d4' },
  { label: 'Indigo', color: '#6366f1' },
  { label: 'Teal', color: '#14b8a6' },
];

const FRAMEWORKS = ['React', 'Vue', 'No preference'];

const TARGET_AUDIENCES = [
  'Consumers / General public',
  'Businesses / B2B',
  'Developers / Tech users',
  'Creators / Freelancers',
  'Students / Educators',
  'Enterprise',
  'Startups',
  'Other',
];

const PRIMARY_GOALS = [
  'Generate leads / signups',
  'Sell products / services',
  'Showcase portfolio / work',
  'Provide information / blog',
  'Manage tasks / productivity',
  'Collect feedback / surveys',
  'Build community',
  'Other',
];

function buildPromptFromQuestionnaire(data: QuestionnaireData): string {
  const parts: string[] = [];
  if (data.appType) parts.push(data.appType as string);
  if (data.targetAudience) parts.push(`for ${data.targetAudience as string}`);
  if (Array.isArray(data.requiredFeatures) && data.requiredFeatures.length > 0) {
    parts.push(`with ${(data.requiredFeatures as string[]).join(', ')}`);
  }
  if (data.designStyle) parts.push(`${data.designStyle as string} design`);
  if (data.colorScheme) parts.push(`using ${data.colorScheme as string} color scheme`);
  if (data.brandName) parts.push(`for brand "${data.brandName as string}"`);
  if (data.primaryGoal) parts.push(`(goal: ${data.primaryGoal as string})`);
  if (data.language) parts.push(`in ${data.language as string}`);
  if (data.frameworkPreference && data.frameworkPreference !== 'No preference') {
    parts.push(`using ${data.frameworkPreference as string}`);
  }
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
  const [projectGoal, setProjectGoal] = useState((initialData?.projectGoal as string) || '');
  const [targetAudience, setTargetAudience] = useState((initialData?.targetAudience as string) || '');
  const [primaryGoal, setPrimaryGoal] = useState((initialData?.primaryGoal as string) || '');
  const [features, setFeatures] = useState<string[]>(
    (initialData?.requiredFeatures as string[]) || (initialData?.specialFeatures as string[]) || []
  );
  const [designStyle, setDesignStyle] = useState((initialData?.designStyle as string) || '');
  const [colorScheme, setColorScheme] = useState((initialData?.colorScheme as string) || '');
  const [brandName, setBrandName] = useState((initialData?.brandName as string) || '');
  const [tagline, setTagline] = useState((initialData?.tagline as string) || '');
  const [language, setLanguage] = useState<'javascript' | 'typescript'>(
    (initialData?.language as 'javascript' | 'typescript') || 'typescript'
  );
  const [framework, setFramework] = useState((initialData?.frameworkPreference as string) || 'No preference');
  const [saving, setSaving] = useState(false);

  const toggleFeature = (f: string) =>
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const canNext = () => {
    if (step === 1) return appType !== '';
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const data: QuestionnaireData = {
        appType,
        projectGoal: projectGoal || undefined,
        targetAudience: targetAudience || undefined,
        primaryGoal: primaryGoal || undefined,
        requiredFeatures: features,
        specialFeatures: features,
        designStyle: designStyle || undefined,
        colorScheme: colorScheme || undefined,
        brandName: brandName || undefined,
        tagline: tagline || undefined,
        language,
        frameworkPreference: framework !== 'No preference' ? framework : undefined,
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
          <span>Detailed project setup</span>
          <span className="text-xs font-normal text-gray-500">— helps build better prompts</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/60 rounded-full transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: App Type */}
        {step === 1 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">What type of app are you building? <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 gap-1.5">
              {APP_TYPES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setAppType(t.label)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${
                    appType === t.label
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Project Goal / Vision */}
        {step === 2 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">What problem does your app solve? Describe your project vision. <span className="text-gray-600">(optional)</span></p>
            <textarea
              value={projectGoal}
              onChange={(e) => setProjectGoal(e.target.value)}
              placeholder="e.g., A SaaS dashboard for small businesses to track inventory and sales..."
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-300 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder-gray-600 outline-none transition-all resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Step 3: Target Audience */}
        {step === 3 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Who is your target audience? <span className="text-gray-600">(optional)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setTargetAudience(targetAudience === a ? '' : a)}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                    targetAudience === a
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Primary Goal */}
        {step === 4 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">What&apos;s the primary goal of your app? <span className="text-gray-600">(optional)</span></p>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setPrimaryGoal(primaryGoal === g ? '' : g)}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-all ${
                    primaryGoal === g
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Features */}
        {step === 5 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Which features do you need? <span className="text-gray-600">(optional, select all that apply)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {FEATURES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFeature(f)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    features.includes(f)
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Design & Branding */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Design style <span className="text-gray-600">(optional)</span></p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setDesignStyle(designStyle === s.label ? '' : s.label)}
                    className={`px-2 py-2 rounded-lg text-xs text-center transition-all ${
                      designStyle === s.label
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Primary color <span className="text-gray-600">(optional)</span></p>
              <div className="flex flex-wrap gap-2">
                {COLOR_SCHEMES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    title={c.label}
                    onClick={() => setColorScheme(colorScheme === c.label ? '' : c.label)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      colorScheme === c.label ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-[#0d1f1c] scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Brand / company name <span className="text-gray-600">(optional)</span></p>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme Inc"
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-300 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder-gray-600 outline-none transition-all"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Tagline or value proposition <span className="text-gray-600">(optional)</span></p>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g., Build faster, ship smarter"
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-300 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder-gray-600 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Step 7: Tech Preferences */}
        {step === 7 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Language</p>
              <div className="flex gap-2">
                {(['typescript', 'javascript'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                      language === lang
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    {lang === 'typescript' ? 'TypeScript' : 'JavaScript'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Framework preference</p>
              <div className="flex flex-wrap gap-1.5">
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => setFramework(fw)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      framework === fw
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Summary & Finish */}
        {step === 8 && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Your project summary</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {appType && <li>• App type: {appType}</li>}
                {projectGoal && <li>• Vision: {projectGoal.slice(0, 80)}{projectGoal.length > 80 ? '…' : ''}</li>}
                {targetAudience && <li>• Audience: {targetAudience}</li>}
                {primaryGoal && <li>• Goal: {primaryGoal}</li>}
                {features.length > 0 && <li>• Features: {features.join(', ')}</li>}
                {(designStyle || colorScheme) && <li>• Style: {[designStyle, colorScheme].filter(Boolean).join(', ')}</li>}
                {brandName && <li>• Brand: {brandName}</li>}
                {tagline && <li>• Tagline: {tagline}</li>}
                <li>• Tech: {language}, {framework}</li>
              </ul>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400/80 mb-1 uppercase tracking-wider">Generated prompt preview</p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {buildPromptFromQuestionnaire({
                  appType,
                  projectGoal: projectGoal || undefined,
                  targetAudience: targetAudience || undefined,
                  primaryGoal: primaryGoal || undefined,
                  requiredFeatures: features,
                  designStyle: designStyle || undefined,
                  colorScheme: colorScheme || undefined,
                  brandName: brandName || undefined,
                  tagline: tagline || undefined,
                  language,
                  frameworkPreference: framework !== 'No preference' ? framework : undefined,
                })}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-medium rounded-lg border border-white/10 transition-all"
            >
              ← Back
            </button>
          )}
          <button
            type="submit"
            disabled={!canNext() || saving}
            className="px-3 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving…' : step === TOTAL_STEPS ? 'Build it →' : 'Next →'}
          </button>
        </div>
      </form>
    </div>
  );
}
