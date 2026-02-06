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
  // Additional fields are ignored by older routes but kept for compatibility.
  userApiKey?: string;
  userModel?: string;
  userProvider?: string;
  questionnaireData?: unknown;
}

export interface DatabaseError extends Error {
  code?: string;
}

export interface QuestionnaireData {
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

