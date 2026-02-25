/**
 * Architect agent: plan + existing files → implementation steps (filepath, taskDescription, priority).
 * Breaks down the plan into actionable file-level tasks for the coder.
 */

import type { ArchitectTaskPlan, PlannerPlan } from '@/app/types/app-builder';

const ARCHITECT_SYSTEM = `You are a software architect. Given a project plan and existing files, output implementation steps as valid JSON only.
Output exactly this JSON shape, no other text:
{"implementationSteps":[{"filepath":"string","taskDescription":"string","priority":"high|medium|low"}]}
Rules: one entry per file to create or modify. filepath = e.g. src/App.jsx, src/components/Hero.jsx. taskDescription = clear one-line task. priority = high for entry/main files, medium for components, low for styles.`;

export function buildArchitectPrompt(plan: PlannerPlan, existingPaths: string[]): string {
  const planStr = JSON.stringify({
    name: plan.name,
    description: plan.description,
    techstack: plan.techstack,
    features: plan.features,
    files: plan.files,
  }, null, 2);
  let out = `Project plan:\n${planStr}`;
  if (existingPaths.length > 0) {
    out += `\n\nExisting files (extend or update): ${existingPaths.slice(0, 15).join(', ')}`;
  }
  return out + '\n\nRespond with valid JSON only (implementationSteps object).';
}

export function parseArchitectResponse(text: string): ArchitectTaskPlan | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*"implementationSteps"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const steps = (parsed as { implementationSteps?: unknown }).implementationSteps;
    if (!Array.isArray(steps)) return null;
    const implementationSteps = steps.map((s: unknown) => {
      const x = s as { filepath?: string; taskDescription?: string; priority?: string };
      return {
        filepath: typeof x.filepath === 'string' ? x.filepath : '',
        taskDescription: typeof x.taskDescription === 'string' ? x.taskDescription : '',
        priority: (x.priority === 'high' || x.priority === 'medium' || x.priority === 'low') ? x.priority : 'medium' as const,
      };
    }).filter((s) => s.filepath);
    return { implementationSteps };
  } catch {
    return null;
  }
}
