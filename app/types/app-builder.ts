/**
 * Shared Type Definitions for App Builder
 * Used across wizard flow, IDE interface, and API routes
 */

export interface Project {
  id: string;
  title: string;
  type: string;
  framework?: string;
  description?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
  };
}

export interface ProjectFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
  isMain: boolean;
}

export interface AppIdea {
  description: string;
  features: string[];
  targetAudience: string;
  designStyle?: string;
}

export interface ProjectConfig {
  framework: 'react' | 'nextjs' | 'vue' | 'vanilla';
  language: 'javascript' | 'typescript';
  styling: 'tailwind' | 'css' | 'styled-components';
  additionalPackages: string[];
}

export interface GeneratedProject {
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

export type WizardStep = 'idea' | 'questionnaire' | 'configuration' | 'generation' | 'result';

export interface QuestionnaireData {
  appType: string;
  mainPurpose: string;
  targetAudience: string;
  technicalLevel: string;
  designStyle: string;
  colorScheme: string;
  layoutStyle: string;
  requiredSections: string[];
  specialFeatures: string[];
  contentReady: string;
  brandName: string;
  tagline: string;
  keyPoints: string;
  frameworkPreference: string;
  mobileResponsiveness: string;
  performancePriority: string;
}
