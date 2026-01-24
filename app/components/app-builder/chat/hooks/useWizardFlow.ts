/**
 * Custom hook for wizard flow logic
 */

import { useState, useRef, useEffect } from 'react';
import { generateBuildPromptFromQuestionnaire } from '@/app/lib/utils/buildPrompt';
import type { QuestionnaireData } from '@/app/types/app-builder';
import { WIZARD_QUESTIONS } from '@/app/lib/app-builder/wizard/questions';

export interface WizardQuestion {
  key: keyof QuestionnaireData | 'appDescription';
  question: string;
  placeholder?: string;
  type: 'text' | 'select' | 'multi-select';
  options?: Array<{ id: string; label: string; description?: string; color?: string }>;
  required: boolean;
}

// Convert shared questions to local format
const WIZARD_QUESTIONS_LOCAL: WizardQuestion[] = WIZARD_QUESTIONS.map(q => ({
  ...q,
  key: q.key as keyof QuestionnaireData | 'appDescription',
  options: q.options?.map(opt => ({
    ...opt,
    color: undefined,
  })),
}));

export interface UseWizardFlowProps {
  projectId?: string;
  projectTitle?: string;
  projectFramework?: string;
  startWizardMode?: boolean;
  onComplete?: (prompt: string, questionnaireData: QuestionnaireData, framework: string) => void;
}

export function useWizardFlow({
  projectId = '',
  projectTitle = 'My App',
  projectFramework = 'react',
  startWizardMode = false,
  onComplete,
}: UseWizardFlowProps) {
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState<Partial<QuestionnaireData & { appDescription: string }>>({});
  const [multiSelectSelections, setMultiSelectSelections] = useState<string[]>([]);
  const wizardInitRef = useRef<string | null>(null);
  const pendingPromptRef = useRef<{ prompt: string; questionnaireData: QuestionnaireData } | null>(null);

  // Sync wizard mode with prop
  useEffect(() => {
    if (!startWizardMode) {
      wizardInitRef.current = null;
      if (wizardMode) {
        setWizardMode(false);
        setWizardStep(0);
        setWizardAnswers({});
        setMultiSelectSelections([]);
      }
      return;
    }

    const wizardKey = projectId || 'new-project';
    if (wizardInitRef.current === wizardKey) {
      return;
    }
    wizardInitRef.current = wizardKey;

    setWizardMode(true);
    setWizardStep(0);
    setWizardAnswers({});
    setMultiSelectSelections([]);
  }, [startWizardMode, projectId, wizardMode]);

  const handleOptionSelect = (optionId: string) => {
    const currentQuestion = WIZARD_QUESTIONS_LOCAL[wizardStep];
    if (!currentQuestion) return;

    if (currentQuestion.type === 'multi-select') {
      const newSelections = multiSelectSelections.includes(optionId)
        ? multiSelectSelections.filter(id => id !== optionId)
        : [...multiSelectSelections, optionId];
      setMultiSelectSelections(newSelections);
    } else {
      // Single select - proceed immediately
      const option = currentQuestion.options?.find(opt => opt.id === optionId);
      const answer = option?.label || optionId;
      setTimeout(() => {
        processWizardAnswer(optionId, answer);
      }, 300);
    }
  };

  const processWizardAnswer = (answerId: string, answerLabel?: string) => {
    const currentQuestion = WIZARD_QUESTIONS_LOCAL[wizardStep];
    if (!currentQuestion) return;

    const newAnswers = { ...wizardAnswers };
    
    if (currentQuestion.type === 'multi-select') {
      newAnswers[currentQuestion.key] = multiSelectSelections as any;
      setMultiSelectSelections([]);
    } else {
      (newAnswers as any)[currentQuestion.key] = answerId;
    }
    
    setWizardAnswers(newAnswers);

    if (wizardStep < WIZARD_QUESTIONS_LOCAL.length - 1) {
      const nextStep = wizardStep + 1;
      setWizardStep(nextStep);
      setMultiSelectSelections([]);
      return { nextStep, nextQuestion: WIZARD_QUESTIONS_LOCAL[nextStep] };
    } else {
      buildAndSendWizardPrompt(newAnswers);
      return null;
    }
  };

  const handleMultiSelectContinue = () => {
    if (multiSelectSelections.length === 0) {
      const currentQuestion = WIZARD_QUESTIONS_LOCAL[wizardStep];
      if (currentQuestion?.required) {
        return { error: 'Please select at least one option to continue.' };
      }
    }
    return processWizardAnswer('', '');
  };

  const buildAndSendWizardPrompt = async (answers: Partial<QuestionnaireData & { appDescription: string }>) => {
    const questionnaireData: QuestionnaireData = {
      appType: answers.appType || 'other',
      mainPurpose: answers.appDescription || answers.mainPurpose || '',
      targetAudience: answers.targetAudience || 'general',
      technicalLevel: answers.technicalLevel || 'intermediate',
      designStyle: answers.designStyle || 'modern-minimal',
      colorScheme: answers.colorScheme || 'auto',
      layoutStyle: answers.layoutStyle || 'single-page',
      requiredSections: Array.isArray(answers.requiredSections) ? answers.requiredSections : [],
      specialFeatures: Array.isArray(answers.specialFeatures) ? answers.specialFeatures : [],
      contentReady: answers.contentReady || 'yes',
      brandName: answers.brandName || projectTitle,
      tagline: answers.tagline || '',
      keyPoints: answers.keyPoints || answers.appDescription || '',
      frameworkPreference: answers.frameworkPreference || 'react',
      mobileResponsiveness: answers.mobileResponsiveness || 'essential',
      performancePriority: answers.performancePriority || 'balanced',
    };
    
    const framework = questionnaireData.frameworkPreference || projectFramework || 'react';
    const prompt = generateBuildPromptFromQuestionnaire(questionnaireData, answers.brandName || projectTitle);
    
    // Dispatch wizard-complete event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wizard-complete', {
        detail: {
          projectId: projectId || null,
          framework,
          questionnaireData
        }
      }));
    }
    
    // Store prompt for later sending
    pendingPromptRef.current = { prompt, questionnaireData };
    
    // Exit wizard mode
    setWizardMode(false);
    setWizardStep(0);
    setWizardAnswers({});
    setMultiSelectSelections([]);
    
    // Call completion callback
    if (onComplete) {
      onComplete(prompt, questionnaireData, framework);
    }
  };

  return {
    wizardMode,
    wizardStep,
    wizardAnswers,
    multiSelectSelections,
    currentQuestion: WIZARD_QUESTIONS_LOCAL[wizardStep],
    questions: WIZARD_QUESTIONS_LOCAL,
    handleOptionSelect,
    processWizardAnswer,
    handleMultiSelectContinue,
    pendingPromptRef,
  };
}
