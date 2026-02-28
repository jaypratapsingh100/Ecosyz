import { NextRequest, NextResponse } from 'next/server';
import { createAIClient, hasAIClient } from '@/lib/ai/provider';
import { extractAgentResponse, type AgentFile } from '@/lib/app-builder/agentSchema';

async function extractTextFromFile(file: Blob, fileName?: string): Promise<string> {
  const type = (file as { type?: string }).type || '';
  const name = fileName || (file as { name?: string }).name || '';
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);

  if (isPdf) {
    try {
      const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string }>;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text } = await pdfParse(buffer);
      return text || '';
    } catch (e) {
      console.warn('[pdf-website] PDF parse failed, falling back to empty text:', e);
      return '';
    }
  }

  try {
    if (typeof (file as { text?: () => Promise<string> }).text === 'function') {
      return await (file as { text: () => Promise<string> }).text();
    }
  } catch {
    // ignore
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    if (!hasAIClient()) {
      return NextResponse.json(
        {
          error:
            'No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY to use this feature.',
        },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const questionnaireRaw = formData.get('questionnaire') as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'PDF document is required (field: file)' },
        { status: 400 },
      );
    }

    let questionnaire: Record<string, unknown> = {};
    if (questionnaireRaw) {
      try {
        questionnaire = JSON.parse(questionnaireRaw);
      } catch (e) {
        console.warn('[pdf-website] Failed to parse questionnaire JSON:', e);
      }
    }

    const rawText = await extractTextFromFile(file as Blob, (file as { name?: string }).name);
    const snippet = rawText ? rawText.slice(0, 10000) : '';

    const { client, model, provider } = createAIClient();

    const designVibe = (questionnaire.designVibe as string) || 'vibrant';
    const animationLevel = (questionnaire.animationLevel as string) || 'medium';
    const colorPalette = (questionnaire.colorPalette as string) || 'emerald-cyan';
    const customColors = (questionnaire.customColors as string) || '';

    const systemPrompt = [
      'You are a senior React UI engineer and motion designer. Your task is to generate a SINGLE-PAGE, VIBRANT, ANIMATED React website.',
      '',
      'CRITICAL — ANIMATIONS & VIBRANCY:',
      '- The site MUST feel alive: use CSS @keyframes, transitions, transforms, and gradients extensively.',
      `- Animation level: ${animationLevel}. For "subtle": fade-in, slide-up on scroll. For "medium": smooth transitions, hover effects, staggered reveals. For "high": parallax-like motion, glowing effects, gradient shifts, floating elements.`,
      `- Design vibe: ${designVibe}. Make it visually striking — gradients, glassmorphism, neon accents, or bold contrasts as appropriate.`,
      `- Color palette: ${colorPalette}${customColors ? ` (custom: ${customColors})` : ''}. Use rich, saturated colors. Avoid flat grays — prefer gradients, accent colors, and depth.`,
      '- Add CSS animations: fade-in, slide-up, scale-on-hover, gradient background animations, subtle pulse/glow on key elements.',
      '- Use transition on interactive elements (buttons, cards, links).',
      '- Consider: animated gradient backgrounds, staggered section reveals, hover scale/glow on cards, animated underlines on nav links.',
      '',
      'STRUCTURE:',
      '- Main component at src/App.jsx that default-exports App.',
      '- Global CSS at styles.css (no Tailwind, no @import).',
      '- Sections: Hero, About, Features, optional Testimonials, Contact — as <section> blocks with ids for anchor nav.',
      '- Sticky top nav with smooth scroll to sections.',
      '- Use only React + plain CSS. No external UI libraries. No React Router. Nav uses href="#about", etc.',
      '',
      'BROWSER RUNTIME (CRITICAL):',
      '- The code runs in a browser iframe with React and ReactDOM loaded via <script> tags. They are GLOBALS.',
      '- NEVER use require(), import, or any Node.js/CommonJS syntax. Use React and ReactDOM as global variables.',
      '- No npm packages, no Tailwind CDN, no external scripts. Plain React + CSS only.',
      '',
      'CONTENT:',
      '- Use the questionnaire and extracted PDF text to fill name, headline, summary, features, and contact.',
      '- If info is missing, use tasteful placeholders.',
      '- Experience/features as cards or timeline with hover animations.',
      '',
      'OUTPUT FORMAT (JSON ONLY):',
      '- Respond as JSON: { "files": [ { "path": string, "name": string, "content": string, "language": "jsx" | "css", "isMain": boolean } ], "summary": string }',
      '- Paths: "src/App.jsx" (isMain: true), "styles.css". Optionally extra components under "src/components/".',
      '- Do NOT include markdown fences, prose, or explanations. JSON ONLY.',
    ].join('\n');

    const prettyQuestionnaire = JSON.stringify(questionnaire, null, 2);
    const userPrompt = [
      'QUESTIONNAIRE:',
      prettyQuestionnaire || '(none)',
      '',
      'EXTRACTED PDF TEXT (may be truncated):',
      snippet || '(no text from document)',
      '',
      'TASK:',
      '1) Design a vibrant, animated one-page site that feels alive and modern.',
      '2) Include CSS keyframe animations, transitions, and gradient effects.',
      '3) Return JSON with files for src/App.jsx and styles.css.',
    ].join('\n');

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 8192,
      stream: false,
    });

    const content = completion.choices[0]?.message?.content || '';
    const parsed = extractAgentResponse(content);

    if (!parsed || !parsed.files || parsed.files.length === 0) {
      return NextResponse.json(
        {
          error: 'AI did not return any files in the expected format.',
          provider,
          model,
          raw: content.slice(0, 500),
        },
        { status: 500 },
      );
    }

    const files: AgentFile[] = parsed.files;

    return NextResponse.json({
      files,
      summary: parsed.summary || null,
      provider,
      model,
    });
  } catch (error) {
    console.error('[pdf-website] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate website with AI', message },
      { status: 500 },
    );
  }
}
