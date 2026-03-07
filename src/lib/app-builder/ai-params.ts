/**
 * Centralized AI parameters for deterministic generation.
 *
 * Standardizes temperature and sampling params across all pipeline stages
 * (planner, architect, coder, fix-loop) so output is consistent.
 */

export const AI_PARAMS = {
  temperature: 0.3,
  top_p: 0.95,
  frequency_penalty: 0,
  presence_penalty: 0,
} as const;

export type PipelineStage = 'planner' | 'architect' | 'coder' | 'fix';

/**
 * Get AI parameters for a specific pipeline stage.
 * - Planner: slightly more creative (0.4) for brainstorming
 * - Coder: balanced (0.3) for reliable code generation
 * - Fix: very deterministic (0.2) for precise corrections
 */
export function getStageParams(stage: PipelineStage): {
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
} {
  switch (stage) {
    case 'planner':
      return { ...AI_PARAMS, temperature: 0.4 };
    case 'fix':
      return { ...AI_PARAMS, temperature: 0.2 };
    case 'architect':
    case 'coder':
    default:
      return { ...AI_PARAMS };
  }
}
