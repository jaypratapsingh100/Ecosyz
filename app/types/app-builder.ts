// Minimal type definitions for the app builder chat and scaffolds.
// The original detailed types file was removed; this stub restores the
// module path expected by older routes without changing runtime behavior.

export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
  timestamp?: string | Date;
}

export interface ChatRequestBody {
  message: string;
  currentFile?: string;
  /** User-selected AI provider: groq | openrouter (enables OpenRouter DeepSeek Coder, etc.) */
  userProvider?: 'groq' | 'openrouter';
  /** User-selected model id (e.g. deepseek/deepseek-coder, llama-3.3-70b-versatile) */
  userModel?: string;
  userApiKey?: string;
  questionnaireData?: unknown;
}

/** Planner agent output: high-level project plan */
export interface PlannerPlan {
  name: string;
  description: string;
  techstack: string;
  features: string[];
  files: { path: string; purpose: string }[];
}

/** Architect agent output: implementation steps per file */
export interface ArchitectTaskPlan {
  implementationSteps: {
    filepath: string;
    taskDescription: string;
    priority?: 'high' | 'medium' | 'low';
  }[];
}

/** Coder agent state (per-step progress) */
export interface CoderState {
  currentStepIndex: number;
  completedSteps: string[];
  lastError?: string;
}

/** Central state for the Planner → Architect → Coder pipeline */
export type GenerationStatus =
  | 'idle'
  | 'planning'
  | 'architecting'
  | 'coding'
  | 'validating'
  | 'done'
  | 'error';

export interface AppProjectState {
  userPrompt: string;
  plan?: PlannerPlan | null;
  taskPlan?: ArchitectTaskPlan | null;
  coderState?: CoderState | null;
  status: GenerationStatus;
  lastError?: string | null;
}

export interface DatabaseError extends Error {
  code?: string;
}

export interface QuestionnaireData {
  appType?: string;
  projectGoal?: string;
  targetAudience?: string;
  primaryGoal?: string;
  requiredFeatures?: string[];
  specialFeatures?: string[];
  designStyle?: string;
  colorScheme?: string;
  layoutStyle?: string;
  brandName?: string;
  tagline?: string;
  language?: 'javascript' | 'typescript';
  frameworkPreference?: string;
  [key: string]: unknown;
}

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language?: string | null;
  isMain?: boolean;
}

