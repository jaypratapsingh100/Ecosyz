import { NextRequest, NextResponse } from 'next/server';
import { createAIClient, hasAIClient } from '@/lib/ai/provider';
import { extractAgentResponse, type AgentFile } from '@/lib/app-builder/agentSchema';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';

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
      console.warn('[pdf-website-3d] PDF parse failed, falling back to empty text:', e);
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
        console.warn('[pdf-website-3d] Failed to parse questionnaire JSON:', e);
      }
    }

    const rawText = await extractTextFromFile(file as Blob, (file as { name?: string }).name);
    const snippet = rawText ? rawText.slice(0, 50000) : '';

    const userProvider = questionnaire.userProvider as 'groq' | 'openrouter' | undefined;
    const userModel = questionnaire.userModel as string | undefined;
    const { client, model, provider } = createAIClient({
      userProvider: userProvider || undefined,
      userModel: userModel || undefined,
    });

    const designVibe = (questionnaire.designVibe as string) || 'immersive';
    const colorPalette = (questionnaire.colorPalette as string) || 'emerald-cyan';
    const customColors = (questionnaire.customColors as string) || '';

    const systemPrompt = [
      'You are a senior React and Three.js engineer. Your task is to generate a SINGLE-PAGE 3D IMMERSIVE portfolio website using React and Three.js.',
      '',
      'CRITICAL — 3D RUNTIME:',
      '- The code runs in a browser iframe. React, ReactDOM, and THREE are GLOBAL variables (no import/require).',
      '- THREE.OrbitControls is available globally (from three.js examples).',
      '- Use React useRef and useEffect to create and manage the Three.js scene. No external npm packages.',
      '',
      '3D SCENE REQUIREMENTS:',
      '- Create a WebGLRenderer, PerspectiveCamera, Scene. Add OrbitControls for mouse-drag camera rotation.',
      '- Add ambient + directional lights for depth.',
      '- Create floating "section cards" as THREE.Mesh with PlaneGeometry. Each card represents a section (Hero, About, Features, Contact).',
      '- For text on cards: use THREE.CanvasTexture. Create a canvas, draw text with fillText, then new THREE.CanvasTexture(canvas). Use MeshBasicMaterial or MeshStandardMaterial with this texture.',
      '- Position cards in 3D space (e.g. in a circle, grid, or floating arrangement). Use meaningful positions like [x, y, z].',
      '- Optional: add subtle floating animation (e.g. slight y-axis oscillation in the animation loop).',
      '',
      `DESIGN:`,
      `- Vibe: ${designVibe}. Make the 3D space feel immersive — consider particle effects, gradient backgrounds, or depth.`,
      `- Colors: ${colorPalette}${customColors ? ` (custom: ${customColors})` : ''}. Use rich colors for materials and card backgrounds.`,
      '',
      'STRUCTURE:',
      '- Main component at src/App.jsx that default-exports App.',
      '- Global CSS at styles.css for any overlay UI (e.g. loading, nav hints). Minimal — most styling is in 3D.',
      '- App renders a div with ref for the canvas. In useEffect: create scene, camera, renderer, controls, meshes. Start animation loop. Cleanup on unmount.',
      '',
      'BROWSER RUNTIME (CRITICAL):',
      '- NEVER use require(), import, or any Node.js/CommonJS syntax.',
      '- Use React, ReactDOM, THREE as globals. OrbitControls is THREE.OrbitControls (or window.THREE.OrbitControls).',
      '- No npm packages. Plain React + Three.js only.',
      '',
      'CONTENT:',
      '- Use the questionnaire and extracted PDF text to fill name, headline, summary, features, and contact on the section cards.',
      '- When the PDF has substantial content, create multiple cards with key info. Do NOT summarize heavily.',
      '- If info is missing, use tasteful placeholders.',
      '',
      'OUTPUT FORMAT (JSON ONLY):',
      '- Respond as JSON: { "files": [ { "path": string, "name": string, "content": string, "language": "jsx" | "css", "isMain": boolean } ], "summary": string }',
      '- Paths: "src/App.jsx" (isMain: true), "styles.css".',
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
      '1) Design a 3D immersive portfolio with floating section cards in Three.js.',
      '2) Use CanvasTexture for text on each card. Position cards in 3D space.',
      '3) Include OrbitControls for camera interaction.',
      '4) Return JSON with files for src/App.jsx and styles.css.',
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
    const documentTitle = (questionnaire.documentTitle as string)?.trim() || '3D Portfolio';

    let projectId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        await ensureUserInDb(user);
        const prismaUser = await prisma.user.findUnique({
          where: { supabaseId: user.id },
        });
        if (prismaUser) {
          const project = await prisma.appProject.create({
            data: {
              title: documentTitle,
              description: parsed.summary || '3D immersive portfolio generated from PDF.',
              framework: 'react',
              appType: 'pdf-website-3d',
              ownerId: prismaUser.id,
              previewVersion: 'v2',
            },
          });
          await prisma.appFile.createMany({
            data: files.map((f) => ({
              projectId: project.id,
              path: f.path,
              name: f.name,
              content: f.content ?? '',
              language: (f.language as string) ?? (f.path.endsWith('.css') ? 'css' : 'jsx'),
              isMain: f.isMain ?? f.path.includes('App.jsx'),
            })),
          });
          projectId = project.id;
        }
      }
    } catch (dbErr) {
      console.warn('[pdf-website-3d] Failed to save project to database:', dbErr);
    }

    return NextResponse.json({
      files,
      summary: parsed.summary || null,
      provider,
      model,
      projectId: projectId ?? undefined,
    });
  } catch (error) {
    console.error('[pdf-website-3d] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate 3D website with AI', message },
      { status: 500 },
    );
  }
}
