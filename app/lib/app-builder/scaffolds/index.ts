/**
 * Scaffold templates index - exports all scaffold templates
 */

import type { ScaffoldFile } from './react';
import { reactScaffold } from './react';
import { nextjsScaffold } from './nextjs';
import { vueScaffold } from './vue';
import { htmlScaffold } from './html';
import type { Framework } from '../constants';

export type { ScaffoldFile };

export const scaffoldTemplates: Record<Framework | 'html', ScaffoldFile[]> = {
  react: reactScaffold,
  nextjs: nextjsScaffold,
  vue: vueScaffold,
  html: htmlScaffold,
};

/**
 * Get scaffold files for a given framework
 */
export function getScaffoldFiles(framework: string): ScaffoldFile[] {
  return scaffoldTemplates[framework as Framework] || scaffoldTemplates.react;
}
