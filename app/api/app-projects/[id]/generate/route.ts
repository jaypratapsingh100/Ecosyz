import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import {
  REACT_PROJECT_PATHS,
  REACT_MAIN_JSX,
  REACT_FILE_CONTRACTS,
  type CanonicalReactFile,
} from '@/lib/app-builder/canonicalReact';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const STRUCTURE_PROMPT = `You are generating a single-page, professional marketing / dashboard React app.

You MUST return a JSON object with exactly one key "files", which is an array of file objects.
Each file must have: path, name, content, language, isMain (boolean).
Allowed paths ONLY: ${REACT_PROJECT_PATHS.join(', ')}.

File contracts:
- "index.html": HTML shell with a complete <head> and <body>. It MUST contain:
  - <div id="root"></div> as the React mount point.
  - <link rel="stylesheet" href="styles.css" />.
  - These script tags in this order at the end of <body>:
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="text/babel"> ... inline React code ... </script>
  - DO NOT use any <script src="...jsx"> tags. All React code must be inside the inline <script type="text/babel"> block.

- "styles.css": Global CSS only, no @import. Define a small design system with classes for:
  - Layout: .page, .hero, .section, .container, .grid, .card, .card-header, .card-body.
  - Typography: .h1, .h2, .subtitle, .muted, .badge.
  - Buttons: .btn, .btn-primary, .btn-outline, with hover and focus states.
  - Use modern, clean design: good spacing, consistent paddings/margins, subtle shadows, rounded corners.
  - Prefer class-based styling over inline styles.

- "src/App.jsx": A single default export React component (function App() { ... }).
  - It should import nothing (React is provided globally by the CDN).
  - It should use the same CSS classes defined in styles.css.
  - It should build a structured layout:
    - <header className="hero"> ... </header>
    - <main className="page">
        <section className="section">Hero with title, subtitle, primary/secondary buttons.</section>
        <section className="section">Features/services as 3–6 .card elements in a grid.</section>
        <section className="section">Portfolio or dashboard content (cards, table, or chart placeholder).</section>
        <section className="section">Pricing or call-to-action with 2–3 plans or a strong CTA.</section>
      </main>
    - <footer className="section">footer with links or copyright.</footer>
  - Use concise, realistic copy (1–2 sentences per paragraph). Avoid "Service 1/2/3" and long lorem ipsum.

Return VALID JSON ONLY (no markdown, no backticks, no extra commentary).
Example shape (simplified):
{
  "files": [
    { "path": "index.html", "name": "index.html", "content": "<!DOCTYPE html>...", "language": "html", "isMain": false },
    { "path": "styles.css", "name": "styles.css", "content": "body { ... }", "language": "css", "isMain": false },
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
    if (!REACT_PROJECT_PATHS.includes(o.path as 'index.html' | 'styles.css' | 'src/App.jsx')) continue;
    normalized.push({
      path: o.path as CanonicalReactFile['path'],
      name: typeof o.name === 'string' ? o.name : o.path.split('/').pop() || o.path,
      content: typeof o.content === 'string' ? o.content : '',
      language: typeof o.language === 'string' ? o.language : (o.path.endsWith('.jsx') ? 'jsx' : o.path.endsWith('.css') ? 'css' : 'html'),
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

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured. Set it in environment to generate apps.' },
        { status: 503 }
      );
    }

    const client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: GROQ_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
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
      '  <link rel="stylesheet" href="styles.css" />',
      '</head>',
      '<body>',
      '  <div id="root"></div>',
      '  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>',
      '  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>',
      '  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
      '  <script type="text/babel">',
      inlineAppCode,
      '',
      `    const root = ReactDOM.createRoot(document.getElementById('root'));`,
      `    root.render(React.createElement(${appName}));`,
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
