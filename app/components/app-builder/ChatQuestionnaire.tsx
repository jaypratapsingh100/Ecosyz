'use client';

import { useState, useEffect } from 'react';
import type { QuestionnaireData } from '@/app/types/app-builder';

const TOTAL_STEPS = 6;

// ──────────────────────────────────────────────
// Step 1: App category (visual, impactful)
// ──────────────────────────────────────────────
const APP_CATEGORIES = [
  { id: 'saas', label: 'SaaS App', desc: 'Web application with dashboard', icon: '☁️' },
  { id: 'landing', label: 'Landing Page', desc: 'Marketing / product page', icon: '🚀' },
  { id: 'portfolio', label: 'Portfolio', desc: 'Personal / agency showcase', icon: '🎨' },
  { id: 'ecommerce', label: 'E-commerce', desc: 'Online store', icon: '🛒' },
  { id: 'dashboard', label: 'Dashboard', desc: 'Admin / analytics panel', icon: '📊' },
  { id: 'blog', label: 'Blog / CMS', desc: 'Content publishing', icon: '📝' },
  { id: 'tool', label: 'Tool / Utility', desc: 'Calculator, converter, etc.', icon: '🔧' },
  { id: 'other', label: 'Other', desc: 'Something different', icon: '✨' },
];

// ──────────────────────────────────────────────
// Step 3: Features (context-aware per category)
// ──────────────────────────────────────────────
const COMMON_FEATURES = [
  'Navigation bar',
  'Hero section',
  'Footer',
  'Dark mode',
  'Contact form',
  'Responsive design',
];

const CATEGORY_FEATURES: Record<string, string[]> = {
  saas: ['Auth UI (Login/Signup)', 'User dashboard', 'Pricing table', 'Feature comparison', 'Notifications', 'Settings page', 'Charts / Analytics', 'Data tables'],
  landing: ['Hero + CTA', 'Testimonials', 'Feature grid', 'FAQ section', 'Newsletter signup', 'Video section', 'Stats counter', 'Pricing table'],
  portfolio: ['Project gallery', 'About section', 'Skills / Tech stack', 'Timeline', 'Testimonials', 'Resume download', 'Blog section'],
  ecommerce: ['Product grid', 'Shopping cart', 'Product detail page', 'Search + filters', 'Checkout flow', 'Reviews', 'Wishlist', 'Category navigation'],
  dashboard: ['Sidebar navigation', 'Charts / Analytics', 'Data tables', 'Cards / KPIs', 'User management', 'File upload', 'Notifications', 'Settings'],
  blog: ['Article list', 'Article detail', 'Categories / Tags', 'Search', 'Author profile', 'Comments', 'Newsletter'],
  tool: ['Input form', 'Results display', 'History / Recent', 'Export / Download', 'Settings', 'Sharing'],
  other: ['Cards / Grid layout', 'Search', 'Data tables', 'File upload', 'Image gallery', 'Notifications'],
};

// ──────────────────────────────────────────────
// Step 4: Design styles (with visual descriptions)
// ──────────────────────────────────────────────
const DESIGN_STYLES = [
  { id: 'modern-minimal', label: 'Modern Minimal', desc: 'Clean whitespace, subtle shadows, muted tones', preview: 'bg-gray-50 border-gray-200' },
  { id: 'bold-colorful', label: 'Bold & Colorful', desc: 'Vibrant gradients, strong contrast, energetic', preview: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { id: 'professional', label: 'Professional', desc: 'Corporate, trustworthy, structured layout', preview: 'bg-blue-50 border-blue-200' },
  { id: 'creative', label: 'Creative', desc: 'Unique layouts, animations, artistic flair', preview: 'bg-gradient-to-r from-emerald-400 to-cyan-400' },
  { id: 'dark', label: 'Dark Mode', desc: 'Dark background, glowing accents, modern feel', preview: 'bg-gray-900 border-gray-700' },
  { id: 'glassmorphism', label: 'Glassmorphism', desc: 'Frosted glass, blur effects, layered depth', preview: 'bg-white/20 backdrop-blur border-white/30' },
];

const COLOR_PALETTES = [
  { label: 'Emerald', colors: ['#10b981', '#059669', '#d1fae5'] },
  { label: 'Blue', colors: ['#3b82f6', '#2563eb', '#dbeafe'] },
  { label: 'Purple', colors: ['#8b5cf6', '#7c3aed', '#ede9fe'] },
  { label: 'Rose', colors: ['#f43f5e', '#e11d48', '#ffe4e6'] },
  { label: 'Amber', colors: ['#f59e0b', '#d97706', '#fef3c7'] },
  { label: 'Cyan', colors: ['#06b6d4', '#0891b2', '#cffafe'] },
  { label: 'Indigo', colors: ['#6366f1', '#4f46e5', '#e0e7ff'] },
  { label: 'Slate', colors: ['#475569', '#334155', '#f1f5f9'] },
];

// ──────────────────────────────────────────────
// Prompt builder
// ──────────────────────────────────────────────
function buildPromptFromQuestionnaire(data: QuestionnaireData): string {
  const parts: string[] = [];

  const category = APP_CATEGORIES.find((c) => c.id === data.appType);
  if (category) parts.push(`a ${category.label}`);
  else if (data.appType) parts.push(data.appType as string);

  if (data.projectGoal) parts.push(`— ${data.projectGoal}`);

  if (Array.isArray(data.requiredFeatures) && data.requiredFeatures.length > 0) {
    parts.push(`Features: ${(data.requiredFeatures as string[]).join(', ')}.`);
  }

  const style = DESIGN_STYLES.find((s) => s.id === data.designStyle);
  if (style) parts.push(`${style.label} design style.`);
  if (data.colorScheme) parts.push(`${data.colorScheme} color scheme.`);
  if (data.brandName) parts.push(`Brand: "${data.brandName}".`);
  if (data.tagline) parts.push(`Tagline: "${data.tagline}".`);

  const base = parts.length > 0
    ? `Build ${parts[0]}. ${parts.slice(1).join(' ')}`
    : 'Build a professional web application.';

  return `${base} Make it responsive, modern, and production-ready with Tailwind CSS.`;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
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
  const [features, setFeatures] = useState<string[]>(
    (initialData?.requiredFeatures as string[]) || (initialData?.specialFeatures as string[]) || []
  );
  const [designStyle, setDesignStyle] = useState((initialData?.designStyle as string) || '');
  const [colorScheme, setColorScheme] = useState((initialData?.colorScheme as string) || '');
  const [brandName, setBrandName] = useState((initialData?.brandName as string) || '');
  const [tagline, setTagline] = useState((initialData?.tagline as string) || '');
  const [saving, setSaving] = useState(false);

  const toggleFeature = (f: string) =>
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  // Sync initialData
  useEffect(() => {
    if (!initialData) return;
    if (initialData.projectGoal) setProjectGoal((prev) => prev || (initialData.projectGoal as string) || '');
    if (initialData.appType) setAppType((prev) => prev || (initialData.appType as string) || '');
    if (initialData.requiredFeatures?.length || initialData.specialFeatures?.length) {
      setFeatures((prev) => prev.length ? prev : (initialData.requiredFeatures as string[]) || (initialData.specialFeatures as string[]) || []);
    }
    if (initialData.designStyle) setDesignStyle((prev) => prev || (initialData.designStyle as string) || '');
    if (initialData.colorScheme) setColorScheme((prev) => prev || (initialData.colorScheme as string) || '');
    if (initialData.brandName) setBrandName((prev) => prev || (initialData.brandName as string) || '');
    if (initialData.tagline) setTagline((prev) => prev || (initialData.tagline as string) || '');
  }, [initialData]);

  // Available features depend on selected app type
  const availableFeatures = [
    ...COMMON_FEATURES,
    ...(CATEGORY_FEATURES[appType] || CATEGORY_FEATURES['other']),
  ];

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
      // Map designStyle to themePreset for the AI prompt pipeline
      const STYLE_TO_THEME: Record<string, string> = {
        'modern-minimal': 'modern-minimal',
        'professional': 'corporate-clean',
        'bold-colorful': 'bold-vibrant',
        'creative': 'bold-vibrant',
        'dark': 'dark-elegance',
        'glassmorphism': 'dark-elegance',
      };
      const data: QuestionnaireData = {
        appType,
        projectGoal: projectGoal || undefined,
        requiredFeatures: features,
        specialFeatures: features,
        designStyle: designStyle || undefined,
        themePreset: designStyle ? STYLE_TO_THEME[designStyle] || undefined : undefined,
        colorScheme: colorScheme || undefined,
        brandName: brandName || undefined,
        tagline: tagline || undefined,
        language: 'javascript',
        frameworkPreference: 'React',
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

  const buildCurrentData = (): QuestionnaireData => ({
    appType,
    projectGoal: projectGoal || undefined,
    requiredFeatures: features,
    designStyle: designStyle || undefined,
    colorScheme: colorScheme || undefined,
    brandName: brandName || undefined,
    tagline: tagline || undefined,
    language: 'javascript',
    frameworkPreference: 'React',
  });

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-emerald-400">
          Project Setup
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {step}/{TOTAL_STEPS}
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
        {/* ── Step 1: What are you building? ── */}
        {step === 1 && (
          <div>
            <p className="text-xs text-gray-400 mb-3">What are you building? <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {APP_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAppType(c.id)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                    appType === c.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  <span className="text-lg mt-0.5">{c.icon}</span>
                  <div>
                    <div className="text-xs font-medium">{c.label}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Describe your app ── */}
        {step === 2 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">
              Describe your app in one sentence <span className="text-gray-600">(optional but improves results)</span>
            </p>
            <textarea
              value={projectGoal}
              onChange={(e) => setProjectGoal(e.target.value)}
              placeholder={
                appType === 'saas'
                  ? 'e.g., A project management dashboard for remote teams with kanban boards and time tracking'
                  : appType === 'ecommerce'
                  ? 'e.g., A modern clothing store with product filtering, cart, and smooth checkout'
                  : appType === 'portfolio'
                  ? 'e.g., A creative developer portfolio with project showcase and animated transitions'
                  : 'e.g., Describe what your app does, who it\'s for, and what makes it unique...'
              }
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-white/5 text-gray-300 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder-gray-600 outline-none transition-all resize-none"
              rows={3}
            />
          </div>
        )}

        {/* ── Step 3: Key features ── */}
        {step === 3 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Select the features you need <span className="text-gray-600">(optional)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {availableFeatures.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFeature(f)}
                  className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                    features.includes(f)
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                  }`}
                >
                  {features.includes(f) && <span className="mr-1">&#10003;</span>}
                  {f}
                </button>
              ))}
            </div>
            {features.length > 0 && (
              <p className="text-[10px] text-gray-600 mt-2">{features.length} feature{features.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}

        {/* ── Step 4: Design preference + color ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Design style <span className="text-gray-600">(optional)</span></p>
              <div className="grid grid-cols-2 gap-2">
                {DESIGN_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDesignStyle(designStyle === s.id ? '' : s.id)}
                    className={`px-3 py-2.5 rounded-lg text-left transition-all ${
                      designStyle === s.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15 hover:text-gray-300'
                    }`}
                  >
                    <div className="text-xs font-medium">{s.label}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Color scheme <span className="text-gray-600">(optional)</span></p>
              <div className="flex flex-wrap gap-3">
                {COLOR_PALETTES.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    title={p.label}
                    onClick={() => setColorScheme(colorScheme === p.label ? '' : p.label)}
                    className={`flex items-center gap-1 transition-all rounded-lg px-2 py-1.5 ${
                      colorScheme === p.label
                        ? 'ring-2 ring-emerald-500/60 ring-offset-1 ring-offset-[#0d1f1c] bg-white/10'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex -space-x-1">
                      {p.colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400 ml-1">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Brand details ── */}
        {step === 5 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Brand details <span className="text-gray-600">(optional, helps personalize the output)</span></p>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">App / Brand name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme Inc"
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-300 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder-gray-600 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Tagline or value prop</label>
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

        {/* ── Step 6: Summary & Generate ── */}
        {step === 6 && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Project Summary</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {appType && <li>Type: {APP_CATEGORIES.find((c) => c.id === appType)?.label || appType}</li>}
                {projectGoal && <li>Description: {projectGoal.slice(0, 100)}{projectGoal.length > 100 ? '...' : ''}</li>}
                {features.length > 0 && <li>Features: {features.slice(0, 5).join(', ')}{features.length > 5 ? ` +${features.length - 5} more` : ''}</li>}
                {designStyle && <li>Style: {DESIGN_STYLES.find((s) => s.id === designStyle)?.label || designStyle}</li>}
                {colorScheme && <li>Color: {colorScheme}</li>}
                {brandName && <li>Brand: {brandName}</li>}
                {!appType && !projectGoal && <li className="text-gray-600 italic">No details provided — the AI will create a general web app</li>}
              </ul>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400/80 mb-1 uppercase tracking-wider">AI will receive</p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {buildPromptFromQuestionnaire(buildCurrentData())}
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
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!canNext() || saving}
            className="px-4 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving...' : step === TOTAL_STEPS ? 'Generate App' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
}
