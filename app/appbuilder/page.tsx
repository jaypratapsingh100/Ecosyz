'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';
import IdeaInputStep from '../components/appbuilder/IdeaInputStep';
import ConfigurationStep from '../components/appbuilder/ConfigurationStep';
import GenerationStep from '../components/appbuilder/GenerationStep';
import ResultStep from '../components/appbuilder/ResultStep';

type Step = 'idea' | 'configuration' | 'generation' | 'result';

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

interface GeneratedProject {
  id: string;
  title: string;
  files: Array<{
    id: string;
    path: string;
    name: string;
    content: string;
    language?: string;
  }>;
}

export default function AppBuilderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('idea');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [appIdea, setAppIdea] = useState<AppIdea | null>(null);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationStartedRef = useRef(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        setIsAuthenticated(response.ok);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleIdeaSubmit = (idea: AppIdea) => {
    setAppIdea(idea);
    setCurrentStep('configuration');
  };

  const handleConfigSubmit = (config: ProjectConfig) => {
    setProjectConfig(config);
    setCurrentStep('generation');
  };

  // Trigger generation when both idea and config are ready
  useEffect(() => {
    if (currentStep === 'generation' && appIdea && projectConfig && !isGenerating && !generatedProject && !generationStartedRef.current) {
      generationStartedRef.current = true;
      startGeneration(appIdea, projectConfig);
    }
  }, [currentStep, appIdea, projectConfig, isGenerating, generatedProject]);

  const startGeneration = async (idea: AppIdea, config: ProjectConfig) => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress('Initializing project...');

    try {
      // Create project
      setGenerationProgress('Creating project structure...');
      const projectResponse = await fetch('/api/app-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.description.substring(0, 50) || 'My App',
          description: idea.description,
          type: 'web',
          framework: config.framework,
          questionnaireData: {
            idea: idea.description,
            features: idea.features,
            targetAudience: idea.targetAudience,
            designStyle: idea.designStyle,
            framework: config.framework,
            language: config.language,
            styling: config.styling,
            additionalPackages: config.additionalPackages,
          },
        }),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({ error: 'Failed to create project' }));
        throw new Error(errorData.error || 'Failed to create project');
      }

      const project = await projectResponse.json();
      setGenerationProgress('Connecting to AI (Azure DeepSeek)...');

      // Generate code using Azure DeepSeek
      setGenerationProgress('Generating code with AI...');
      const chatResponse = await fetch(`/api/app-projects/${project.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: generateBuildPrompt(idea, config),
        }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => ({ error: 'Failed to generate code' }));
        throw new Error(errorData.error || 'Failed to generate code. Please try again.');
      }

      const chatResult = await chatResponse.json();
      setGenerationProgress('Saving files to your account...');

      // Wait a bit for files to be saved to database, then fetch them
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
        // If no files were generated, at least show the scaffold files
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

  const generateBuildPrompt = (idea: AppIdea, config: ProjectConfig): string => {
    return `Create a complete ${config.framework} application with the following requirements:

**App Description:**
${idea.description}

**Key Features:**
${idea.features.map(f => `- ${f}`).join('\n')}

**Target Audience:**
${idea.targetAudience}

**Technical Stack:**
- Framework: ${config.framework}
- Language: ${config.language}
- Styling: ${config.styling}
${config.additionalPackages.length > 0 ? `- Additional Packages: ${config.additionalPackages.join(', ')}` : ''}

**Design Style:** ${idea.designStyle || 'Modern and clean'}

Please generate a complete, production-ready application with:
1. Proper file structure
2. All necessary dependencies
3. Modern UI/UX design
4. Responsive layout
5. Clean, well-commented code
6. Best practices and patterns

Generate all files needed for a fully functional application.`;
  };

  const handleBackToStart = () => {
    setCurrentStep('idea');
    setAppIdea(null);
    setProjectConfig(null);
    setGeneratedProject(null);
    setIsGenerating(false);
    setGenerationProgress('');
    setGenerationError(null);
    generationStartedRef.current = false;
  };

  const handleViewInEditor = () => {
    if (generatedProject) {
      router.push(`/app-builder?project=${generatedProject.id}`);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Auth required
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <section className="relative overflow-hidden flex-1 flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
          </div>
          <div className="relative z-10 w-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="mb-6">
                <svg className="w-24 h-24 text-emerald-400/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Authentication Required</h2>
              <p className="text-teal-100/90 mb-8 text-lg">Please sign in to use GOBuild</p>
              <p className="text-gray-400 mb-8 text-sm">Build amazing applications with AI-powered code generation</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/auth')}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-lg hover:scale-105"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-3 border border-white/20 hover:border-white/40 text-white font-medium rounded-lg transition-all backdrop-blur-sm"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-1 relative overflow-hidden">
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

        {/* Step indicator */}
        <div className="relative z-10 pt-8 pb-4">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center gap-4 mb-8">
              {[
                { key: 'idea', label: 'Idea', icon: '💡' },
                { key: 'configuration', label: 'Configure', icon: '⚙️' },
                { key: 'generation', label: 'Generate', icon: '🚀' },
                { key: 'result', label: 'Result', icon: '✨' },
              ].map((step, index) => {
                const stepKeys: Step[] = ['idea', 'configuration', 'generation', 'result'];
                const currentIndex = stepKeys.indexOf(currentStep);
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                const isAccessible = index <= currentIndex || isCompleted;

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
                    {index < 3 && (
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
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }>
                <IdeaInputStep onSubmit={handleIdeaSubmit} />
              </Suspense>
            )}
            {currentStep === 'configuration' && appIdea && (
              <ConfigurationStep
                idea={appIdea}
                onSubmit={handleConfigSubmit}
                onBack={() => setCurrentStep('idea')}
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
      </main>
    </div>
  );
}
