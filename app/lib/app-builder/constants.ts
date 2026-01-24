/**
 * Shared constants for App Builder functionality
 */

export const DEFAULT_FRAMEWORK = 'react';

export const SUPPORTED_FRAMEWORKS = ['react', 'nextjs', 'vue', 'html'] as const;

export type Framework = typeof SUPPORTED_FRAMEWORKS[number];

export const SIDEBAR_DEFAULT_WIDTH = 320;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 600;
