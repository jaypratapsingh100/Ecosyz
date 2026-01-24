'use client';

import { useState } from 'react';
import type { QuestionnaireData } from '../../types/app-builder';

interface QuestionnaireWizardProps {
  onComplete: (data: QuestionnaireData) => void;
  onSkip?: () => void;
  initialData?: Partial<QuestionnaireData>;
}

const APP_TYPES = [
  { id: 'portfolio', label: 'Portfolio/Personal Website', icon: '🎨' },
  { id: 'business', label: 'Business Website', icon: '💼' },
  { id: 'ecommerce', label: 'E-commerce Store', icon: '🛒' },
  { id: 'saas', label: 'SaaS Application', icon: '⚙️' },
  { id: 'blog', label: 'Blog/Content Site', icon: '📝' },
  { id: 'landing', label: 'Landing Page', icon: '🚀' },
  { id: 'other', label: 'Other', icon: '🔧' },
];

const MAIN_PURPOSES = [
  'Showcase work/portfolio',
  'Sell products/services',
  'Generate leads',
  'Share information/blog',
  'Build a web application',
  'Other',
];

const TARGET_AUDIENCES = [
  { id: 'general', label: 'General Public' },
  { id: 'b2b', label: 'Businesses (B2B)' },
  { id: 'b2c', label: 'Consumers (B2C)' },
  { id: 'developers', label: 'Developers/Technical' },
  { id: 'students', label: 'Students/Educational' },
  { id: 'other', label: 'Other' },
];

const DESIGN_STYLES = [
  { id: 'modern-minimal', label: 'Modern & Minimal', description: 'Clean, simple, focused' },
  { id: 'bold-colorful', label: 'Bold & Colorful', description: 'Vibrant, energetic, eye-catching' },
  { id: 'professional', label: 'Professional & Corporate', description: 'Trustworthy, formal, business-like' },
  { id: 'creative', label: 'Creative & Artistic', description: 'Unique, expressive, innovative' },
  { id: 'clean-simple', label: 'Clean & Simple', description: 'Minimal, uncluttered, elegant' },
];

const COLOR_SCHEMES = [
  { id: 'blue', label: 'Professional Blue', color: '#3B82F6' },
  { id: 'orange-red', label: 'Energetic Orange/Red', color: '#F97316' },
  { id: 'green-teal', label: 'Calm Green/Teal', color: '#10B981' },
  { id: 'purple', label: 'Elegant Purple', color: '#8B5CF6' },
  { id: 'gray-black', label: 'Neutral Gray/Black', color: '#1F2937' },
  { id: 'custom', label: 'Custom Colors', color: '#666' },
  { id: 'auto', label: 'Auto (AI Chooses)', color: '#9CA3AF' },
];

const LAYOUT_STYLES = [
  { id: 'single-page', label: 'Single Page (Scroll)', description: 'All content on one page' },
  { id: 'multi-page', label: 'Multi-page Navigation', description: 'Separate pages with navigation' },
  { id: 'dashboard', label: 'Dashboard/App Layout', description: 'Application interface' },
  { id: 'blog', label: 'Blog/Content Layout', description: 'Content-focused layout' },
  { id: 'landing', label: 'Landing Page Layout', description: 'Single focused page' },
];

const SECTIONS = [
  { id: 'hero', label: 'Home/Hero Section' },
  { id: 'about', label: 'About/Bio' },
  { id: 'portfolio', label: 'Portfolio/Projects' },
  { id: 'services', label: 'Services/Features' },
  { id: 'contact', label: 'Contact Form' },
  { id: 'blog', label: 'Blog/News' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'team', label: 'Team/About Us' },
];

const SPECIAL_FEATURES = [
  { id: 'contact-form', label: 'Contact Form' },
  { id: 'newsletter', label: 'Email Newsletter Signup' },
  { id: 'social', label: 'Social Media Links' },
  { id: 'gallery', label: 'Image Gallery' },
  { id: 'video', label: 'Video Integration' },
  { id: 'maps', label: 'Maps Integration' },
  { id: 'chat', label: 'Chat Widget' },
  { id: 'analytics', label: 'Analytics Integration' },
];

export default function QuestionnaireWizard({ onComplete, onSkip, initialData }: QuestionnaireWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>({
    appType: initialData?.appType || '',
    mainPurpose: initialData?.mainPurpose || '',
    targetAudience: initialData?.targetAudience || '',
    technicalLevel: initialData?.technicalLevel || '',
    designStyle: initialData?.designStyle || '',
    colorScheme: initialData?.colorScheme || '',
    layoutStyle: initialData?.layoutStyle || '',
    requiredSections: initialData?.requiredSections || [],
    specialFeatures: initialData?.specialFeatures || [],
    contentReady: initialData?.contentReady || '',
    brandName: initialData?.brandName || '',
    tagline: initialData?.tagline || '',
    keyPoints: initialData?.keyPoints || '',
    frameworkPreference: initialData?.frameworkPreference || 'react',
    mobileResponsiveness: initialData?.mobileResponsiveness || 'essential',
    performancePriority: initialData?.performancePriority || 'balanced',
  });

  const totalSteps = 6;

  const updateData = (field: keyof QuestionnaireData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'requiredSections' | 'specialFeatures', itemId: string) => {
    setData((prev) => {
      const current = prev[field] || [];
      const updated = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, [field]: updated };
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(data);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.appType && data.mainPurpose;
      case 2:
        return data.targetAudience && data.technicalLevel;
      case 3:
        return data.designStyle && data.colorScheme && data.layoutStyle;
      case 4:
        return data.requiredSections.length > 0;
      case 5:
        return true; // Optional fields
      case 6:
        return true; // Optional fields
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-xl">Project Questionnaire</h2>
              <p className="text-gray-400 text-sm mt-1">
                Help us understand your vision to build the perfect app
              </p>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
              >
                Skip
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-all ${
                  idx + 1 <= currentStep
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2 text-center">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: App Type & Purpose */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">
                  1. What type of app are you building?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {APP_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => updateData('appType', type.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        data.appType === type.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-2xl mb-2">{type.icon}</div>
                      <div className="text-white text-sm font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  2. What's the main purpose?
                </label>
                <div className="space-y-2">
                  {MAIN_PURPOSES.map((purpose) => (
                    <button
                      key={purpose}
                      onClick={() => updateData('mainPurpose', purpose)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.mainPurpose === purpose
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0a0a0a] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {purpose}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Target Audience */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">
                  3. Who is your target audience?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TARGET_AUDIENCES.map((audience) => (
                    <button
                      key={audience.id}
                      onClick={() => updateData('targetAudience', audience.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        data.targetAudience === audience.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-white text-sm font-medium">{audience.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  4. What's their technical level?
                </label>
                <div className="space-y-2">
                  {['Non-technical', 'Somewhat technical', 'Very technical'].map((level) => (
                    <button
                      key={level}
                      onClick={() => updateData('technicalLevel', level.toLowerCase())}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.technicalLevel === level.toLowerCase()
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0a0a0a] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Design Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">
                  5. What design style do you prefer?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DESIGN_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => updateData('designStyle', style.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        data.designStyle === style.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-white text-sm font-medium mb-1">{style.label}</div>
                      <div className="text-gray-400 text-xs">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  6. Color scheme preference?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => updateData('colorScheme', scheme.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        data.colorScheme === scheme.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full mb-2"
                        style={{ backgroundColor: scheme.color }}
                      />
                      <div className="text-white text-xs font-medium">{scheme.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  7. Layout style?
                </label>
                <div className="space-y-2">
                  {LAYOUT_STYLES.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => updateData('layoutStyle', layout.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.layoutStyle === layout.id
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-white text-sm font-medium">{layout.label}</div>
                      <div className="text-gray-400 text-xs mt-1">{layout.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Features & Sections */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">
                  8. What sections/pages do you need? (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => toggleArrayItem('requiredSections', section.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        data.requiredSections.includes(section.id)
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-white text-sm">{section.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  9. Special features needed? (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIAL_FEATURES.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => toggleArrayItem('specialFeatures', feature.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        data.specialFeatures.includes(feature.id)
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/10 bg-[#0a0a0a] hover:border-white/20'
                      }`}
                    >
                      <div className="text-white text-sm">{feature.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Content & Branding */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">
                  10. Do you have content ready?
                </label>
                <div className="space-y-2">
                  {['Yes, I have all content', 'Partial content', 'No, generate placeholder content'].map((option) => (
                    <button
                      key={option}
                      onClick={() => updateData('contentReady', option)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.contentReady === option
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0a0a0a] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  11. Brand/Company name (Optional)
                </label>
                <input
                  type="text"
                  value={data.brandName}
                  onChange={(e) => updateData('brandName', e.target.value)}
                  placeholder="Your brand or company name"
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  12. Tagline or main message (Optional)
                </label>
                <input
                  type="text"
                  value={data.tagline}
                  onChange={(e) => updateData('tagline', e.target.value)}
                  placeholder="Your main message or tagline"
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  13. Key points to highlight (Optional)
                </label>
                <textarea
                  value={data.keyPoints}
                  onChange={(e) => updateData('keyPoints', e.target.value)}
                  placeholder="List key points, features, or messages you want to emphasize..."
                  rows={4}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 6: Technical Preferences */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">
                  14. Framework preference?
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'react', label: 'React (Recommended)' },
                    { id: 'nextjs', label: 'Next.js' },
                    { id: 'vue', label: 'Vue.js' },
                    { id: 'html', label: 'Plain HTML/CSS/JS' },
                    { id: 'auto', label: 'Auto (AI chooses)' },
                  ].map((framework) => (
                    <button
                      key={framework.id}
                      onClick={() => updateData('frameworkPreference', framework.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.frameworkPreference === framework.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0a0a0a] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {framework.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  15. Mobile responsiveness?
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'essential', label: 'Essential (Mobile-first)' },
                    { id: 'important', label: 'Important' },
                    { id: 'not-priority', label: 'Not a priority' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => updateData('mobileResponsiveness', option.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.mobileResponsiveness === option.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0a0a0a] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-3">
                  16. Performance priority?
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'maximum', label: 'Maximum performance' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'features', label: 'Features over performance' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => updateData('performancePriority', option.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        data.performancePriority === option.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0a0a0a] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={currentStep === totalSteps ? handleComplete : handleNext}
            disabled={!canProceed()}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {currentStep === totalSteps ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}





