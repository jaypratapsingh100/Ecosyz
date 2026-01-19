/**
 * GenerationStep Component - Third Step of GOBuild Wizard
 * 
 * Displays the AI code generation progress with:
 * - Visual progress indicators for each generation stage
 * - Real-time progress messages from the generation process
 * - Tech stack preview showing selected framework, language, styling
 * - Error handling with retry functionality
 * - Helpful tips during generation
 * 
 * Stages shown:
 * 1. Initializing
 * 2. Creating Project
 * 3. AI Generation (Azure DeepSeek)
 * 4. Saving Files to Platform
 * 5. Validating
 * 6. Complete
 */

'use client';

import { useEffect, useState } from 'react';

interface AppIdea {
  description: string;
  features: string[];
  targetAudience: string;
  designStyle?: string;
}

interface ProjectConfig {
  framework: 'react' | 'nextjs' | 'vue' | 'vanilla';
  language: 'javascript' | 'typescript';
  styling: 'tailwind' | 'css' | 'styled-components';
  additionalPackages: string[];
}

interface GenerationStepProps {
  idea: AppIdea;
  config: ProjectConfig;
  progress: string;
  isGenerating: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const GENERATION_STEPS = [
  { id: 'init', label: 'Initializing', icon: '🔧' },
  { id: 'project', label: 'Creating Project', icon: '📁' },
  { id: 'ai', label: 'AI Generation', icon: '🤖' },
  { id: 'files', label: 'Saving Files to Platform', icon: '💾' },
  { id: 'validate', label: 'Validating', icon: '✅' },
  { id: 'complete', label: 'Complete', icon: '🎉' },
];

export default function GenerationStep({ idea, config, progress, isGenerating, error, onRetry }: GenerationStepProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (progress.includes('Initializing')) setCurrentStepIndex(0);
    else if (progress.includes('Creating project') || progress.includes('project structure')) setCurrentStepIndex(1);
    else if (progress.includes('AI') || progress.includes('Generating code')) setCurrentStepIndex(2);
    else if (progress.includes('Files') || progress.includes('Finalizing')) setCurrentStepIndex(3);
    else if (progress.includes('Validating') || progress.includes('Error')) setCurrentStepIndex(4);
    else if (!isGenerating) setCurrentStepIndex(5);
  }, [progress, isGenerating]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-emerald-400/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Generating Your App</h2>
          <p className="text-gray-400 text-lg">
            Our AI is creating your application using Azure DeepSeek{dots}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-8">
          {GENERATION_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 border-2 border-emerald-400'
                    : isCompleted
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-white/5 border border-white/10 opacity-50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    isActive
                      ? 'bg-emerald-500 animate-pulse'
                      : isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-gray-700'
                  }`}
                >
                  {isCompleted ? '✓' : step.icon}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${isActive ? 'text-emerald-400' : isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>
                    {step.label}
                  </div>
                  {isActive && progress && (
                    <div className="text-sm text-gray-400 mt-1">{progress}</div>
                  )}
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tech Stack Preview */}
        <div className="bg-black/30 rounded-lg p-6 border border-white/10">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Tech Stack</h3>
          <div className="flex flex-wrap gap-3">
            <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
              {config.framework}
            </div>
            <div className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium">
              {config.language}
            </div>
            <div className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
              {config.styling}
            </div>
            {config.additionalPackages.length > 0 && (
              <div className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-lg text-sm font-medium">
                +{config.additionalPackages.length} packages
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <h4 className="text-red-400 font-semibold mb-1">Generation Failed</h4>
                <p className="text-red-300 text-sm mb-3">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-sm font-medium"
                  >
                    Retry Generation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {isGenerating && !error && (
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                💡 <strong>Tip:</strong> This process typically takes 30-60 seconds. The AI is generating all necessary files, 
                setting up dependencies, and creating a production-ready application structure.
              </p>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-sm text-emerald-400">
                💾 <strong>Files Storage:</strong> All generated files are automatically saved to your account on our platform. 
                You can access them anytime in the editor or download them later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
