import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { createAIClient, hasAIClient } from '@/lib/ai/provider';
import {
  REACT_MAIN_JSX,
  isAllowedPath,
  type CanonicalReactFile,
} from '@/lib/app-builder/canonicalReact';

const STRUCTURE_PROMPT = `You are generating a BEAUTIFUL, production-quality React app with stunning visual design.

You MUST return a JSON object with exactly one key "files", which is an array of file objects.
Each file must have: path, name, content, language, isMain (boolean).
Allowed paths: index.html, styles.css, src/App.jsx, src/components/*.jsx

TECH STACK (mandatory):
- React 18 via CDN (no imports — use React.useState, React.useEffect globally)
- Tailwind CSS via CDN (ALL styling via Tailwind classes — minimal custom CSS)
- Lucide icons via CDN: <i data-lucide="icon-name" class="w-5 h-5"></i>
- Google Fonts: Inter is pre-loaded

VISUAL REQUIREMENTS:
- Dark theme: bg-slate-950 or bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
- Glassmorphism cards: bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6
- Gradient text: bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent
- Gradient buttons: from-violet-600 to-indigo-600 hover:shadow-violet-500/25 rounded-full px-8 py-4
- Fixed navbar with backdrop-blur-xl and border-b border-white/5
- Always include: Navbar + Hero + Features (3+ icon cards) + CTA + Footer

File contracts:
- "index.html": MUST contain:
  - <script src="https://cdn.tailwindcss.com"></script> in <head>
  - <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  - <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  - <div id="root" class="bg-slate-950"></div>
  - React 18 + ReactDOM + Babel CDN scripts at end of <body>
  - Inline <script type="text/babel"> with App component + root.render() + lucide.createIcons()

- "styles.css": Minimal reset only (Tailwind handles everything else):
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; }

- "src/App.jsx": Main component. No imports. Use React.useState, React.useEffect.
  Guard all .map() with (arr || []).map(). Call lucide.createIcons() in useEffect.

Return VALID JSON ONLY (no markdown, no backticks, no extra commentary).
Example shape:
{
  "files": [
    { "path": "index.html", "name": "index.html", "content": "<!DOCTYPE html>...", "language": "html", "isMain": false },
    { "path": "styles.css", "name": "styles.css", "content": "...", "language": "css", "isMain": false },
    { "path": "src/App.jsx", "name": "App.jsx", "content": "function App() { ... }\\nexport default App;", "language": "jsx", "isMain": true }
  ]
}`;

function extractJsonFromResponse(text: string): { files: CanonicalReactFile[] } | null {
  const trimmed = text.trim();
  // Try raw JSON first
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Try to extract from markdown code block
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/\{[\s\S]*\}/);
    const jsonStr = match ? (match[1] ?? match[0]).trim() : trimmed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { files?: unknown }).files)) {
    return null;
  }
  const files = (parsed as { files: unknown[] }).files;
  const normalized: CanonicalReactFile[] = [];
  for (const f of files) {
    if (!f || typeof f !== 'object' || typeof (f as { path?: unknown }).path !== 'string') continue;
    const o = f as { path: string; name?: string; content?: string; language?: string; isMain?: boolean };
    if (!isAllowedPath(o.path)) continue;
    normalized.push({
      path: o.path,
      name: typeof o.name === 'string' ? o.name : o.path.split('/').pop() || o.path,
      content: typeof o.content === 'string' ? o.content : '',
      language: typeof o.language === 'string' ? o.language : (o.path.endsWith('.jsx') ? 'jsx' : o.path.endsWith('.tsx') ? 'tsx' : o.path.endsWith('.css') ? 'css' : 'html'),
      isMain: o.path === REACT_MAIN_JSX,
    });
  }
  return normalized.length ? { files: normalized } : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: { files: { orderBy: { path: 'asc' } } },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      );
    }

    if (!hasAIClient()) {
      return NextResponse.json(
        { error: 'No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in environment.' },
        { status: 503 }
      );
    }

    const { client, model } = createAIClient();

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: STRUCTURE_PROMPT,
        },
        {
          role: 'user',
          content: `Generate a React app for: ${description}. Return the JSON object with the "files" array only.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const result = extractJsonFromResponse(content);
    if (!result || result.files.length === 0) {
      console.error('Generate: could not parse files from AI response', content.slice(0, 500));
      return NextResponse.json(
        { error: 'AI did not return valid files. Try a clearer description.' },
        { status: 422 }
      );
    }

    // Build a self-contained index.html from the App.jsx the model returned.
    const appFile = result.files.find((f) => f.path === REACT_MAIN_JSX);
    if (!appFile || !appFile.content.trim()) {
      return NextResponse.json(
        { error: 'AI response did not include a valid src/App.jsx file.' },
        { status: 422 }
      );
    }

    // Strip `export default ...` from inline version; keep original in App.jsx for IDE/export.
    const inlineAppCode = appFile.content.replace(/export\s+default\s+\w+\s*;?/gi, '').trim();
    const nameMatch = inlineAppCode.match(/function\s+([A-Za-z0-9_]+)/);
    const appName = nameMatch?.[1] || 'App';

    const indexHtmlContent = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `  <title>${project.title || 'My React App'}</title>`,
      '  <script src="https://cdn.tailwindcss.com"></script>',
      '  <link rel="preconnect" href="https://fonts.googleapis.com">',
      '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
      '  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>',
      '  <link rel="stylesheet" href="styles.css" />',
      '</head>',
      '<body class="bg-slate-950 text-white">',
      '  <div id="root"></div>',
      '  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>',
      '  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>',
      '  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
      '  <script type="text/babel">',
      inlineAppCode,
      '',
      `    const root = ReactDOM.createRoot(document.getElementById('root'));`,
      `    root.render(React.createElement(${appName}));`,
      `    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 50);`,
      '  </script>',
      '</body>',
      '</html>',
    ].join('\n');

    // Ensure we always have a canonical index.html entry that matches our template.
    const existingIndex = result.files.find((f) => f.path === 'index.html');
    if (existingIndex) {
      existingIndex.content = indexHtmlContent;
      existingIndex.name = 'index.html';
      existingIndex.language = 'html';
      existingIndex.isMain = false;
    } else {
      result.files.push({
        path: 'index.html',
        name: 'index.html',
        content: indexHtmlContent,
        language: 'html',
        isMain: false,
      });
    }

    for (const f of result.files) {
      await prisma.appFile.upsert({
        where: {
          projectId_path: { projectId: id, path: f.path },
        },
        update: {
          name: f.name,
          content: f.content,
          language: f.language,
          isMain: f.isMain,
        },
        create: {
          projectId: id,
          path: f.path,
          name: f.name,
          content: f.content,
          language: f.language,
          isMain: f.isMain,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filesCreated: result.files.map((f) => f.path),
      message: `Created ${result.files.length} file(s). Check the preview and Code tab.`,
    });
  } catch (error) {
    console.error('Generate error:', error);
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
