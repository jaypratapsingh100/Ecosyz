/**
 * ConfigurationStep Component - Second Step of GOBuild Wizard
 * 
 * Allows users to configure their project's tech stack:
 * - Framework: React, Next.js, Vue.js, or Vanilla JS
 * - Language: JavaScript or TypeScript
 * - Styling: Tailwind CSS, CSS Modules, or Styled Components
 * - Additional Packages: Optional npm packages (axios, react-router, etc.)
 * 
 * Shows a summary of the user's app idea at the top
 * Submits configuration to parent component to proceed to generation step
 */

'use client';

import { useState } from 'react';
import type { AppIdea, ProjectConfig } from '../../../types/app-builder';

interface ConfigurationStepProps {
  idea: AppIdea;
  onSubmit: (config: ProjectConfig) => void;
  onBack: () => void;
}

const FRAMEWORKS = [
  { id: 'react' as const, name: 'React', icon: '⚛️', description: 'Popular UI library for building interactive interfaces' },
  { id: 'nextjs' as const, name: 'Next.js', icon: '▲', description: 'Full-stack React framework with SSR and routing' },
  { id: 'vue' as const, name: 'Vue.js', icon: '🟢', description: 'Progressive framework for building user interfaces' },
  { id: 'vanilla' as const, name: 'Vanilla JS', icon: '📦', description: 'Pure JavaScript without frameworks' },
];

const LANGUAGES = [
  { id: 'javascript' as const, name: 'JavaScript', icon: '🟨' },
  { id: 'typescript' as const, name: 'TypeScript', icon: '🔷', description: 'Type-safe JavaScript' },
];

const STYLING_OPTIONS = [
  { id: 'tailwind' as const, name: 'Tailwind CSS', icon: '🎨', description: 'Utility-first CSS framework' },
  { id: 'css' as const, name: 'CSS Modules', icon: '💅', description: 'Scoped CSS modules' },
  { id: 'styled-components' as const, name: 'Styled Components', icon: '💄', description: 'CSS-in-JS solution' },
];

const COMMON_PACKAGES = [
  'axios', 'react-router', 'zustand', 'react-query', 'framer-motion',
  'date-fns', 'lodash', 'react-hook-form', 'zod', 'recharts',
];

export default function ConfigurationStep({ idea, onSubmit, onBack }: ConfigurationStepProps) {
  const [framework, setFramework] = useState<ProjectConfig['framework']>('react');
  const [language, setLanguage] = useState<ProjectConfig['language']>('javascript');
  const [styling, setStyling] = useState<ProjectConfig['styling']>('tailwind');
  const [additionalPackages, setAdditionalPackages] = useState<string[]>([]);
  const [customPackage, setCustomPackage] = useState('');

  const togglePackage = (pkg: string) => {
    setAdditionalPackages(prev =>
      prev.includes(pkg) ? prev.filter(p => p !== pkg) : [...prev, pkg]
    );
  };

  const addCustomPackage = () => {
    if (customPackage.trim() && !additionalPackages.includes(customPackage.trim())) {
      setAdditionalPackages([...additionalPackages, customPackage.trim()]);
      setCustomPackage('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      framework,
      language,
      styling,
      additionalPackages,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Configure Your Project</h2>
          <p className="text-gray-400 text-lg">
            Choose your tech stack and preferences. We'll use these to generate your app.
          </p>
        </div>

        {/* Idea Summary */}
        <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-sm text-emerald-400 font-medium mb-1">Your Idea:</p>
          <p className="text-gray-300 text-sm">{idea.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Framework Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Framework <span className="text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  type="button"
                  onClick={() => setFramework(fw.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    framework === fw.id
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{fw.icon}</span>
                    <span className={`font-bold ${framework === fw.id ? 'text-emerald-400' : 'text-white'}`}>
                      {fw.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{fw.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Language <span className="text-emerald-400">*</span>
            </label>
            <div className="flex gap-4">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    language === lang.id
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-400/20'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 justify-center">
                    <span className="text-2xl">{lang.icon}</span>
                    <span className={`font-bold ${language === lang.id ? 'text-emerald-400' : 'text-white'}`}>
                      {lang.name}
                    </span>
                  </div>
                  {lang.description && (
                    <p className="text-sm text-gray-400 mt-2 text-center">{lang.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Styling Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Styling Solution <span className="text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              {STYLING_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setStyling(style.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    styling === style.id
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-400/20'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl mb-2">{style.icon}</div>
                  <div className={`font-bold text-sm mb-1 ${styling === style.id ? 'text-emerald-400' : 'text-white'}`}>
                    {style.name}
                  </div>
                  <p className="text-xs text-gray-400">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Packages */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Additional Packages (Optional)
            </label>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMMON_PACKAGES.map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => togglePackage(pkg)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      additionalPackages.includes(pkg)
                        ? 'bg-emerald-500 text-gray-900'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {pkg} {additionalPackages.includes(pkg) && '✓'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPackage}
                  onChange={(e) => setCustomPackage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomPackage())}
                  placeholder="Add custom package (e.g., react-icons)"
                  className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                />
                <button
                  type="button"
                  onClick={addCustomPackage}
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-8 py-4 border border-white/20 hover:border-white/40 text-white font-medium rounded-lg transition-all backdrop-blur-sm"
            >
              ← Back
            </button>
            <button
              type="submit"
              className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-bold text-lg rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02]"
            >
              Generate App 🚀
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
