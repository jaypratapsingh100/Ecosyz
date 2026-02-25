'use client';

import { FormEvent, useMemo, useState } from 'react';

interface GeneratedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

type Step = 'form' | 'generating' | 'done';

export default function LinkedinWebsiteAIPage() {
  const [step, setStep] = useState<Step>('form');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Questionnaire fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [headline, setHeadline] = useState('');
  const [tone, setTone] = useState<'minimal' | 'professional' | 'playful' | 'bold'>('professional');
  const [primaryGoal, setPrimaryGoal] = useState<'portfolio' | 'job-search' | 'freelance' | 'other'>(
    'portfolio',
  );
  const [sections, setSections] = useState({
    about: true,
    experience: true,
    projects: true,
    contact: true,
    testimonials: false,
  });
  const [ctaText, setCtaText] = useState('Let’s work together');
  const [ctaLink, setCtaLink] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [website, setWebsite] = useState('');

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setGeneratedFiles([]);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setError('Please upload a PDF or text document.');
      return;
    }

    const file = fileInput.files[0];
    setFileName(file.name);
    setStep('generating');

    const questionnaire = {
      name,
      role,
      headline,
      tone,
      primaryGoal,
      sections,
      ctaText,
      ctaLink,
      location,
      keywords,
      socials: {
        linkedin,
        github,
        website,
      },
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('questionnaire', JSON.stringify(questionnaire));

    try {
      const res = await fetch('/api/linkedin-website/ai', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'AI failed to generate a website. Please try again.',
        );
        setStep('form');
        return;
      }

      const files = (data.files || []) as GeneratedFile[];
      if (!Array.isArray(files) || files.length === 0) {
        setError('AI did not return any files. Try adjusting your questionnaire or resume.');
        setStep('form');
        return;
      }

      setGeneratedFiles(files);
      const mainFile =
        files.find((f) => f.isMain) ||
        files.find((f) => f.path === 'src/App.jsx') ||
        files.find((f) => f.language === 'jsx');
      setSelectedPath(mainFile?.path || files[0].path);
      setStep('done');
    } catch (err) {
      console.error('[linkedin-website/ai] client error:', err);
      setError('Network error. Make sure the dev server is running and try again.');
      setStep('form');
    }
  };

  const appJsx = useMemo(
    () =>
      generatedFiles.find((f) => f.path === 'src/App.jsx')?.content ||
      generatedFiles.find((f) => f.isMain && f.language === 'jsx')?.content ||
      generatedFiles.find((f) => f.language === 'jsx')?.content ||
      '',
    [generatedFiles],
  );

  const stylesCss = useMemo(
    () =>
      generatedFiles.find((f) => f.path === 'styles.css')?.content ||
      generatedFiles.find((f) => f.language === 'css')?.content ||
      '',
    [generatedFiles],
  );

  const previewHtml = useMemo(() => {
    if (!appJsx) return '';
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name || headline || 'LinkedIn → AI Website'}</title>
    <style>${stylesCss || ''}</style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
${appJsx}
      const rootEl = document.getElementById('root');
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
    </script>
  </body>
</html>`;
    return html.replace(/<\/script>/gi, '<\\/script>');
  }, [appJsx, stylesCss, name, headline]);

  const selectedFile = useMemo(
    () => generatedFiles.find((f) => f.path === selectedPath) || null,
    [generatedFiles, selectedPath],
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <span className="text-xs font-bold tracking-tight text-gray-900">LW</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                LinkedIn → AI Website (Questionnaire Flow)
              </h1>
              <p className="text-[11px] text-gray-400">
                Upload a resume PDF, answer a few questions, and get an AI‑generated single‑page
                React site plus the exact files.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: questionnaire and upload */}
        <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
          <div className="bg-[#020617] border border-white/10 rounded-2xl p-4 shadow-xl shadow-emerald-500/5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold mb-1">1. Upload & basics</h2>
                <p className="text-[11px] text-gray-400">
                  This is a separate flow from the main App Builder. It uses Llama to turn your PDF
                  into a themed one‑page React site.
                </p>
              </div>
              <div className="space-y-1.5 text-xs">
                <label className="block text-gray-300">Resume / LinkedIn PDF</label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,application/pdf,.txt,.md,.markdown"
                  className="block w-full text-[11px] text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/90 file:text-gray-900 hover:file:bg-emerald-400/90"
                />
                <p className="text-[10px] text-gray-500">
                  PDF is parsed automatically. You can also use a plain‑text export.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs mt-2">
                <div>
                  <label className="block text-gray-300 mb-1">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sonu Yadav"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Role / title</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Full‑Stack Engineer"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Short headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Building fast, beautiful web apps"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Primary goal</label>
                  <select
                    value={primaryGoal}
                    onChange={(e) =>
                      setPrimaryGoal(e.target.value as typeof primaryGoal)
                    }
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="portfolio">Showcase portfolio</option>
                    <option value="job-search">Job search</option>
                    <option value="freelance">Freelance / clients</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as typeof tone)}
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="professional">Professional</option>
                    <option value="minimal">Minimal / clean</option>
                    <option value="bold">Bold / high‑contrast</option>
                    <option value="playful">Playful / friendly</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3 text-xs space-y-2">
                <p className="text-[11px] text-gray-300 font-semibold">Sections to include</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'about', label: 'About' },
                    { key: 'experience', label: 'Experience' },
                    { key: 'projects', label: 'Projects' },
                    { key: 'contact', label: 'Contact' },
                    { key: 'testimonials', label: 'Testimonials' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setSections((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof prev],
                        }))
                      }
                      className={`px-2.5 py-1 rounded-full border text-[11px] ${
                        sections[key as keyof typeof sections]
                          ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/15 bg-white/5 text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3 grid grid-cols-1 gap-2 text-xs">
                <div>
                  <label className="block text-gray-300 mb-1">Primary CTA text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. View my work or Book a call"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">CTA link (optional)</label>
                  <input
                    type="text"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="e.g. https://cal.com/you"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Location (optional)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore · Remote"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Keywords / skills (comma‑separated)</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. React, TypeScript, Node, UI engineering"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3 grid grid-cols-1 gap-2 text-xs">
                <p className="text-[11px] text-gray-300 font-semibold">Social links (optional)</p>
                <div>
                  <label className="block text-gray-300 mb-1">LinkedIn</label>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/you"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/you"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Personal site</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://your-domain.com"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={step === 'generating'}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 text-xs font-semibold py-2.5 shadow-lg shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {step === 'generating' ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-gray-900/20 border-t-gray-900 rounded-full animate-spin" />
                    <span>Asking Llama & building site…</span>
                  </>
                ) : (
                  <>
                    <span>Generate site with AI</span>
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {error}
              </div>
            )}
            {fileName && (
              <p className="mt-3 text-[11px] text-gray-400">
                Last uploaded: <span className="text-gray-200">{fileName}</span>
              </p>
            )}
          </div>

          <div className="mt-4 text-[11px] text-gray-400 space-y-1.5">
            <p className="font-semibold text-gray-300">How this flow works</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Upload a resume or LinkedIn PDF / text export.</li>
              <li>Fill the questionnaire to steer layout, tone, and sections.</li>
              <li>Llama generates React files; you see both preview and exact code.</li>
              <li>Separate from main App Builder — no project in Prisma.</li>
            </ul>
          </div>
        </div>

        {/* Right: files + preview */}
        <div className="flex-1 flex flex-col gap-3 min-h-[360px]">
          <div className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 overflow-hidden flex flex-col md:flex-row">
            {/* File list */}
            <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-white/10 bg-black/40">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-300">Files</span>
                <span className="text-[10px] text-gray-500">
                  {generatedFiles.length ? `${generatedFiles.length} file(s)` : 'None yet'}
                </span>
              </div>
              <div className="max-h-64 md:max-h-none overflow-y-auto text-[11px]">
                {generatedFiles.length === 0 ? (
                  <p className="px-3 py-3 text-gray-500">
                    Run the AI generation to see files like <span className="text-gray-300">src/App.jsx</span>{' '}
                    and <span className="text-gray-300">styles.css</span>.
                  </p>
                ) : (
                  <ul>
                    {generatedFiles.map((file) => (
                      <li key={file.path}>
                        <button
                          type="button"
                          onClick={() => setSelectedPath(file.path)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 border-b border-white/5 hover:bg-white/5 ${
                            selectedPath === file.path ? 'bg-emerald-500/10 text-emerald-200' : 'text-gray-200'
                          }`}
                        >
                          <span className="truncate">{file.path}</span>
                          <span className="text-[10px] text-gray-400 uppercase">
                            {file.language}
                            {file.isMain ? ' · main' : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Code viewer + preview */}
            <div className="flex-1 flex flex-col">
              <div className="h-44 md:h-56 border-b border-white/10 bg-black/40">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-300">
                    {selectedFile ? selectedFile.path : 'Generated code'}
                  </span>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(selectedFile.content)
                          .catch(() => undefined);
                      }}
                      className="text-[10px] px-2 py-1 rounded-full border border-white/15 text-gray-300 hover:bg-white/10"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div className="h-full overflow-auto text-[11px] font-mono bg-black/70 px-3 py-2 text-gray-200">
                  {selectedFile ? (
                    <pre className="whitespace-pre-wrap break-words">
                      {selectedFile.content}
                    </pre>
                  ) : (
                    <p className="text-gray-500">
                      After generation, the React files will appear here for you to inspect and copy.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex-1 relative">
                {!previewHtml && step !== 'generating' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm font-semibold mb-1">Preview will appear here</p>
                    <p className="text-[11px] text-gray-400 max-w-sm">
                      Once the AI finishes, you&apos;ll see a live one‑page React site rendered in this
                      frame.
                    </p>
                  </div>
                )}
                {previewHtml && (
                  <iframe
                    srcDoc={previewHtml}
                    title="AI LinkedIn Website Preview"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
                {step === 'generating' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                    <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
                    <p className="text-xs text-gray-200">Generating layout & content…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

