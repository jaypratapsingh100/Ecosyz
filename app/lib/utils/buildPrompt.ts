/**
 * Build Prompt Generator
 * Generates prompts from questionnaire data
 */

import type { QuestionnaireData } from '@/app/types/app-builder';

/**
 * Generate comprehensive build prompt from questionnaire data
 */
export function generateBuildPromptFromQuestionnaire(
  questionnaireData: QuestionnaireData | any,
  projectTitle: string
): string {
  const sections = questionnaireData.requiredSections || [];
  const features = questionnaireData.specialFeatures || [];
  const designStyle = questionnaireData.designStyle || 'modern-minimal';
  const colorScheme = questionnaireData.colorScheme || 'auto';
  const layoutStyle = questionnaireData.layoutStyle || 'single-page';
  const brandName = questionnaireData.brandName || projectTitle;
  const tagline = questionnaireData.tagline || '';
  const keyPoints = questionnaireData.keyPoints || '';
  const appType = questionnaireData.appType || 'web app';
  const targetAudience = questionnaireData.targetAudience || 'general';

  let prompt = `Create a complete, production-ready ${appType} application with the following specifications:\n\n`;

  // Branding
  prompt += `**Brand & Content:**\n`;
  prompt += `- Brand Name: ${brandName}\n`;
  if (tagline) prompt += `- Tagline: ${tagline}\n`;
  if (keyPoints) prompt += `- Key Points to Highlight: ${keyPoints}\n`;
  prompt += `- Target Audience: ${targetAudience}\n\n`;

  // Design Requirements
  prompt += `**Design Requirements:**\n`;
  prompt += `- Design Style: ${designStyle}\n`;
  prompt += `- Color Scheme: ${colorScheme}\n`;
  prompt += `- Layout Style: ${layoutStyle}\n\n`;

  // Required Sections
  if (sections.length > 0) {
    prompt += `**Required Sections (create components for ALL of these):**\n`;
    sections.forEach((section: string) => {
      prompt += `- ${section}\n`;
    });
    prompt += `\n`;
  }

  // Special Features
  if (features.length > 0) {
    prompt += `**Special Features (implement ALL of these):**\n`;
    features.forEach((feature: string) => {
      prompt += `- ${feature}\n`;
    });
    prompt += `\n`;
  }

  // Instructions
  prompt += `**CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:**\n`;
  prompt += `1. Create ALL required sections as separate React component files\n`;
  prompt += `2. Use the EXACT design style "${designStyle}" throughout\n`;
  prompt += `3. Use the EXACT color scheme "${colorScheme}" - apply these colors in CSS\n`;
  prompt += `4. Implement the "${layoutStyle}" layout style\n`;
  prompt += `5. Implement ALL special features listed above\n`;
  prompt += `6. Make it fully responsive and mobile-friendly\n`;
  prompt += `7. Use modern, professional code with proper structure\n`;
  prompt += `8. Include proper styling (create CSS files or use inline styles)\n`;
  prompt += `9. Create a complete App.jsx that imports and renders ALL components\n`;
  prompt += `10. Create index.js that renders the App component\n`;
  prompt += `11. Make it production-ready and polished\n\n`;

  prompt += `**FILE GENERATION REQUIREMENTS - CRITICAL:**\n`;
  prompt += `- Generate ALL files in ONE response - do not split across multiple messages\n`;
  prompt += `- Use the \`\`\`file:path/to/file.jsx\` format for EACH file\n`;
  prompt += `- Create separate component files for: ${sections.length > 0 ? sections.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('.jsx, ') + '.jsx' : 'Hero, About, Services, Contact, etc.'}\n`;
  prompt += `- MUST include: App.jsx (imports ALL components), index.js (renders App), App.css (or component CSS files)\n`;
  prompt += `- Each component should be a complete, functional React component\n`;
  prompt += `- DO NOT ask questions - generate ALL files immediately in this response\n`;
  prompt += `- Use the exact file format: \`\`\`file:src/ComponentName.jsx\`\n\n`;

  prompt += `🚨 START GENERATING NOW - Create the complete application with ALL files in ONE response! 🚨\n`;
  prompt += `Remember: Generate ALL components, App.jsx, index.js, and CSS files NOW.`;

  return prompt;
}
