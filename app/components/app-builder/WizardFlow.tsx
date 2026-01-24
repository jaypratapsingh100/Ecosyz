'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import IdeaInputStep from './wizard/IdeaInputStep';
import QuestionnaireWizard from './QuestionnaireWizard';
import ConfigurationStep from './wizard/ConfigurationStep';
import GenerationStep from './wizard/GenerationStep';
import ResultStep from './wizard/ResultStep';
import GenerationLoader from './GenerationLoader';
import { generateBuildPromptFromQuestionnaire, generateBuildPromptFromWizard } from '../../lib/utils/buildPrompt';
import type { AppIdea, ProjectConfig, GeneratedProject, QuestionnaireData, WizardStep } from '../../types/app-builder';

interface WizardFlowProps {
  onComplete: (projectId: string) => void;
  onClose: () => void;
  initialDescription?: string;
}

export default function WizardFlow({ onComplete, onClose, initialDescription }: WizardFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('idea');
  const [appIdea, setAppIdea] = useState<AppIdea | null>(null);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationStartedRef = useRef(false);

  // Load initial description from URL params or prop
  useEffect(() => {
    const description = initialDescription || searchParams.get('description');
    if (description && !appIdea) {
      // Pre-populate idea if description is provided
      // The IdeaInputStep will handle loading it from localStorage
    }
  }, [initialDescription, searchParams, appIdea]);

  const handleIdeaSubmit = (idea: AppIdea) => {
    setAppIdea(idea);
    setCurrentStep('questionnaire');
  };

  const handleQuestionnaireComplete = (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    setCurrentStep('configuration');
  };

  const handleQuestionnaireSkip = () => {
    setQuestionnaireData(null);
    setCurrentStep('configuration');
  };

  const handleConfigSubmit = (config: ProjectConfig) => {
    setProjectConfig(config);
    setCurrentStep('generation');
  };

  // Auto-trigger generation when both idea and config are ready
  useEffect(() => {
    if (
      currentStep === 'generation' &&
      appIdea &&
      projectConfig &&
      !isGenerating &&
      !generatedProject &&
      !generationStartedRef.current
    ) {
      generationStartedRef.current = true;
      startGeneration(appIdea, projectConfig);
    }
  }, [currentStep, appIdea, projectConfig, isGenerating, generatedProject]);

  const startGeneration = async (idea: AppIdea, config: ProjectConfig) => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress('Initializing project...');

    try {
      const projectTitle =
        questionnaireData?.brandName?.trim() || idea.description.substring(0, 50) || 'My App';

      const mergedQuestionnaireData: Record<string, any> = questionnaireData
        ? {
            ...questionnaireData,
            idea: idea.description,
            features: idea.features,
            targetAudience: idea.targetAudience,
            designStyle: questionnaireData.designStyle || idea.designStyle,
            framework: config.framework,
            language: config.language,
            styling: config.styling,
            additionalPackages: config.additionalPackages,
          }
        : {
            idea: idea.description,
            features: idea.features,
            targetAudience: idea.targetAudience,
            designStyle: idea.designStyle,
            framework: config.framework,
            language: config.language,
            styling: config.styling,
            additionalPackages: config.additionalPackages,
          };

      // Step 1: Create project record in database
      setGenerationProgress('Creating project structure...');
      const projectResponse = await fetch('/api/app-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          description: idea.description,
          type: 'web',
          framework: config.framework,
          questionnaireData: mergedQuestionnaireData,
        }),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({ error: 'Failed to create project' }));
        throw new Error(errorData.error || 'Failed to create project');
      }

      const project = await projectResponse.json();
      setGenerationProgress('Connecting to AI (Azure DeepSeek)...');

      // Step 2: Generate code using Azure DeepSeek AI
      setGenerationProgress('Generating code with AI...');
      const message = questionnaireData
        ? `${generateBuildPromptFromQuestionnaire(questionnaireData, projectTitle)}\n\n**Technical Stack (must follow):**\n- Framework: ${config.framework}\n- Language: ${config.language}\n- Styling: ${config.styling}\n${config.additionalPackages.length ? `- Additional Packages: ${config.additionalPackages.join(', ')}` : ''}\n\nAlso incorporate the original app idea description:\n${idea.description}`
        : generateBuildPromptFromWizard(idea, config);

      const chatResponse = await fetch(`/api/app-projects/${project.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
        }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({ error: 'Failed to generate code' }));
        throw new Error(errorData.error || 'Failed to generate code. Please try again.');
      }

      const chatResult = await chatResponse.json();
      setGenerationProgress('Saving files to your account...');

      // Step 3: Wait for files to be saved to database
      let attempts = 0;
      let files: any[] = [];
      while (attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const filesResponse = await fetch(`/api/app-projects/${project.id}/files`);
        if (filesResponse.ok) {
          files = await filesResponse.json();
          if (files.length > 0) {
            setGenerationProgress(`Files saved successfully! (${files.length} files stored)`);
            break;
          }
        }
        attempts++;
        setGenerationProgress(`Saving files to platform... (attempt ${attempts + 1}/5)`);
      }

      if (files.length === 0) {
        setGenerationProgress('Fetching saved files from your account...');
        const filesResponse = await fetch(`/api/app-projects/${project.id}/files`);
        if (filesResponse.ok) {
          files = await filesResponse.json();
          if (files.length > 0) {
            setGenerationProgress(`Files retrieved from your account (${files.length} files)`);
          }
        }
      }

      setGenerationProgress('Finalizing and verifying file storage...');
      setGeneratedProject({
        id: project.id,
        title: project.title,
        files: files || [],
      });

      setCurrentStep('result');
      setIsGenerating(false);
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationError(error.message || 'An unexpected error occurred. Please try again.');
      setGenerationProgress(`Error: ${error.message || 'Generation failed'}`);
      setIsGenerating(false);
    }
  };

  const handleBackToStart = () => {
    setCurrentStep('idea');
    setAppIdea(null);
    setQuestionnaireData(null);
    setProjectConfig(null);
    setGeneratedProject(null);
    setIsGenerating(false);
    setGenerationProgress('');
    setGenerationError(null);
    generationStartedRef.current = false;
  };

  const handleViewInEditor = () => {
    if (generatedProject) {
      onComplete(generatedProject.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] overflow-y-auto">
      <div className="min-h-screen flex flex-col relative">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-20"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-radial from-cyan-400/10 to-transparent opacity-60 blur-3xl"></div>
        </div>

        {/* Close button */}
        <div className="relative z-10 pt-4 px-4 flex justify-end">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            aria-label="Close wizard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="relative z-10 pt-4 pb-4">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center gap-4 mb-8">
              {[
                { key: 'idea', label: 'Idea', icon: '💡' },
                { key: 'questionnaire', label: 'Details', icon: '📝' },
                { key: 'configuration', label: 'Configure', icon: '⚙️' },
                { key: 'generation', label: 'Generate', icon: '🚀' },
                { key: 'result', label: 'Result', icon: '✨' },
              ].map((step, index) => {
                const stepKeys: WizardStep[] = ['idea', 'questionnaire', 'configuration', 'generation', 'result'];
                const currentIndex = stepKeys.indexOf(currentStep);
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;

                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-gray-900 scale-110 shadow-lg shadow-emerald-500/50'
                            : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {isCompleted && !isActive ? '✓' : step.icon}
                      </div>
                      <span
                        className={`mt-2 text-sm font-medium ${
                          isActive ? 'text-emerald-400' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < 4 && (
                      <div
                        className={`w-16 h-1 mx-2 transition-all ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="relative z-10 flex-1 pb-12">
          <div className="max-w-5xl mx-auto px-4">
            {currentStep === 'idea' && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              >
                <IdeaInputStep onSubmit={handleIdeaSubmit} />
              </Suspense>
            )}
            {currentStep === 'questionnaire' && appIdea && (
              <div className="py-6 text-center text-gray-400">
                <p className="text-sm">Complete the questionnaire to refine your app before we generate it.</p>
              </div>
            )}
            {currentStep === 'configuration' && appIdea && (
              <ConfigurationStep
                idea={appIdea}
                onSubmit={handleConfigSubmit}
                onBack={() => setCurrentStep('questionnaire')}
              />
            )}
            {currentStep === 'generation' && appIdea && projectConfig && (
              <GenerationStep
                idea={appIdea}
                config={projectConfig}
                progress={generationProgress}
                isGenerating={isGenerating}
                error={generationError}
                onRetry={() => {
                  setGenerationError(null);
                  generationStartedRef.current = false;
                  startGeneration(appIdea, projectConfig);
                }}
              />
            )}
            {currentStep === 'result' && generatedProject && (
              <ResultStep
                project={generatedProject}
                onBackToStart={handleBackToStart}
                onViewInEditor={handleViewInEditor}
              />
            )}
          </div>
        </div>
      </div>

      {/* Questionnaire modal (fixed overlay) */}
      {currentStep === 'questionnaire' && appIdea && (
        <QuestionnaireWizard
          onComplete={handleQuestionnaireComplete}
          onSkip={handleQuestionnaireSkip}
          initialData={{
            targetAudience: appIdea.targetAudience || '',
            designStyle: appIdea.designStyle || '',
            frameworkPreference: 'react',
            mobileResponsiveness: 'essential',
            performancePriority: 'balanced',
          }}
        />
      )}

      {/* Generation Loader Overlay */}
      <GenerationLoader
        isActive={isGenerating}
        message={`Generating ${generatedProject?.title || 'your app'}...`}
        onComplete={() => {
          console.log('Generation complete!');
        }}
      />
    </div>
  );
}
