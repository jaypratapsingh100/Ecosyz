import { NextRequest, NextResponse } from 'next/server';
import { createAIClient, hasAIClient } from '@/lib/ai/provider';
import { extractAgentResponse, type AgentFile } from '@/lib/app-builder/agentSchema';

async function extractTextFromFile(file: Blob, fileName?: string): Promise<string> {
  const type = (file as any).type || '';
  const name = fileName || (file as any).name || '';
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);

  if (isPdf) {
    try {
      const pdfParse = (await import('pdf-parse')).default as (buf: Buffer) => Promise<{ text: string }>;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text } = await pdfParse(buffer);
      return text || '';
    } catch (e) {
      console.warn('[linkedin-website/ai] PDF parse failed, falling back to empty text:', e);
      return '';
    }
  }

  try {
    if (typeof (file as any).text === 'function') {
      return await (file as any).text();
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
        { error: 'PDF or text document is required (field: file)' },
        { status: 400 },
      );
    }

    let questionnaire: Record<string, unknown> = {};
    if (questionnaireRaw) {
      try {
        questionnaire = JSON.parse(questionnaireRaw);
      } catch (e) {
        console.warn('[linkedin-website/ai] Failed to parse questionnaire JSON:', e);
      }
    }

    const rawText = await extractTextFromFile(file as Blob, (file as any).name);
    const snippet = rawText ? rawText.slice(0, 8000) : '';

    const { client, model, provider } = createAIClient();

    const systemPrompt = [
      'You are a senior React UI engineer and brand designer.',
      'Generate a SINGLE-PAGE React portfolio website with a top navigation bar and scrollable sections.',
      '',
      'STRUCTURE REQUIREMENTS:',
      '- Use a main component at src/App.jsx that default-exports App.',
      '- Use a global CSS file at styles.css (no Tailwind, no @import).',
      '- Use sections: Hero, About, Experience, Projects, Contact (and optional extras like Testimonials) as <section> blocks with ids matching the nav links.',
      '- Use a dark, modern, neon theme similar to code tools like Cursor/Replit: dark navy background, subtle gradients, glowing emerald/cyan accents, rounded cards.',
      '- Use only React + plain CSS. No external UI libraries. No React Router. Navigation uses anchor links (href=\"#about\", etc.).',
      '',
      'CONTENT REQUIREMENTS:',
      '- Use the questionnaire and resume/LinkedIn text to fill in name, headline, summary, experience, projects, and contact details.',
      '- If information is missing, use tasteful placeholders but keep them obviously editable.',
      '- Experience should be a short vertical timeline with roles and descriptions.',
      '- Projects should be cards with title, short description, and tech stack tags.',
      '',
      'OUTPUT FORMAT (VERY IMPORTANT):',
      '- Respond as JSON only matching this shape: { "files": [ { "path": string, "name": string, "content": string, "language": "jsx" | "tsx" | "css" | "html", "isMain": boolean } ], "summary": string }',
      '- paths should be limited to: "src/App.jsx", "styles.css", "index.html" (optional), and optionally extra components under "src/components/..." or CSS under "src/*.css".',
      '- Mark ONLY "src/App.jsx" as isMain: true.',
      '',
      'Do NOT include markdown fences, prose around the JSON, or explanations. JSON ONLY.',
    ].join('\n');

    const prettyQuestionnaire = JSON.stringify(questionnaire, null, 2);
    const userPrompt = [
      'QUESTIONNAIRE (structured):',
      prettyQuestionnaire || '(none provided)',
      '',
      'RESUME / LINKEDIN TEXT SNIPPET (may be truncated):',
      snippet || '(no text extracted from document)',
      '',
      'TASK:',
      '1) Infer a personal brand (headline, tone, primary CTA) from this information.',
      '2) Design a polished one-page site with a strong hero, clear sections, and visual hierarchy.',
      '3) Return JSON with files implementing src/App.jsx and styles.css as described.',
    ].join('\n');

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.45,
      max_tokens: 4096,
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
          raw: content,
        },
        { status: 500 },
      );
    }

    // For this flow, just return the normalized files; the client will decide how to preview.
    const files: AgentFile[] = parsed.files;

    return NextResponse.json({
      files,
      summary: parsed.summary || null,
      provider,
      model,
    });
  } catch (error) {
    console.error('[linkedin-website/ai] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate website with AI', message },
      { status: 500 },
    );
  }
}

