/**
 * Planner agent: user prompt → structured project plan (name, description, techstack, features, files).
 * Mirrors Lovable-clone architecture: high-level conceptualization before implementation.
 */

import type { PlannerPlan } from '@/app/types/app-builder';
import type { QuestionnaireData } from '@/app/types/app-builder';

const PLANNER_SYSTEM = `You are a product planner. Given a user's app idea, output a structured project plan as valid JSON only.
Output exactly this JSON shape, no other text:
{"name":"string","description":"string","techstack":"string","features":["string"],"files":[{"path":"string","purpose":"string"}]}
Rules: name = short app name. description = 1-2 sentences. techstack = e.g. "React, Vite, CSS". features = list of main features. files = array of file paths and purpose (use paths like src/App.jsx, src/components/Hero.jsx, src/index.css).`;

export function buildPlannerPrompt(
  userMessage: string,
  questionnaire: QuestionnaireData | null
): string {
  let out = userMessage.trim();
  if (questionnaire && typeof questionnaire === 'object' && Object.keys(questionnaire).length > 0) {
    const parts: string[] = [];
    if (questionnaire.appType) parts.push(`App type: ${questionnaire.appType}`);
    if (questionnaire.projectGoal) parts.push(`Vision: ${questionnaire.projectGoal}`);
    if (questionnaire.targetAudience) parts.push(`Audience: ${questionnaire.targetAudience}`);
    if (questionnaire.primaryGoal) parts.push(`Primary goal: ${questionnaire.primaryGoal}`);
    if (questionnaire.designStyle) parts.push(`Style: ${questionnaire.designStyle}`);
    if (questionnaire.brandName) parts.push(`Brand: ${questionnaire.brandName}`);
    if (Array.isArray(questionnaire.requiredFeatures) && questionnaire.requiredFeatures.length > 0) {
      parts.push(`Features: ${(questionnaire.requiredFeatures as string[]).join(', ')}`);
    }
    if (parts.length > 0) out = `[Context: ${parts.join(' | ')}]\n\n${out}`;
  }
  return out + '\n\nRespond with valid JSON only (plan object).';
}

export function parsePlannerResponse(text: string): PlannerPlan | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*"files"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.name !== 'string' || !Array.isArray(o.files)) return null;
    const files = (o.files as Array<{ path?: string; purpose?: string }>).map((f) => ({
      path: typeof f.path === 'string' ? f.path : '',
      purpose: typeof f.purpose === 'string' ? f.purpose : '',
    })).filter((f) => f.path);
    return {
      name: String(o.name),
      description: typeof o.description === 'string' ? o.description : '',
      techstack: typeof o.techstack === 'string' ? o.techstack : 'React, Vite, CSS',
      features: Array.isArray(o.features) ? (o.features as string[]).filter((x) => typeof x === 'string') : [],
      files,
    };
  } catch {
    return null;
  }
}
