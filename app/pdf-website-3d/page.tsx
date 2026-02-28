'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface GeneratedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isMain: boolean;
}

type Step = 'form' | 'generating' | 'done';

export default function PdfWebsite3dPage() {
  const [step, setStep] = useState<Step>('form');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [documentTitle, setDocumentTitle] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState<'portfolio' | 'product' | 'resume' | 'whitepaper' | 'other'>('portfolio');
  const [designVibe, setDesignVibe] = useState<'immersive' | 'neon' | 'minimal' | 'cosmic' | 'bold'>('immersive');
  const [colorPalette, setColorPalette] = useState<'emerald-cyan' | 'purple-pink' | 'sunset' | 'ocean' | 'forest' | 'custom'>('emerald-cyan');
  const [sections, setSections] = useState({
    hero: true,
    about: true,
    features: true,
    testimonials: false,
    contact: true,
  });
  const [customColors, setCustomColors] = useState('');

  const [aiOptions, setAiOptions] = useState<{
    groqAvailable: boolean;
    openRouterAvailable: boolean;
    anyAvailable?: boolean;
    models: { groq: { id: string; label: string }[]; openrouter: { id: string; label: string }[] };
  } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'openrouter'>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/app-projects/ai-options')
      .then((r) => r.json())
      .then((data) => {
        setAiOptions(data);
        if (data.groqAvailable) {
          setSelectedProvider('groq');
        } else if (data.openRouterAvailable) {
          setSelectedProvider('openrouter');
          setSelectedModel(data.models.openrouter[0]?.id || '');
        }
      })
      .catch(() => {});
  }, []);

  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    url?: string;
    claimUrl?: string;
    deployError?: string;
    hint?: string;
  } | null>(null);

  const handleDeploy = async () => {
    if (!previewHtml) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await fetch('/api/pdf-website-3d/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: previewHtml,
          title: documentTitle || '3D Portfolio',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeployResult({ url: data.url, claimUrl: data.claimUrl });
      } else {
        setDeployResult({
          deployError: data.error || 'Deployment failed',
          hint: data.hint,
        });
      }
    } catch (err) {
      console.error('[pdf-website-3d] deploy error:', err);
      setDeployResult({
        deployError: 'Network error. Make sure the dev server is running.',
      });
    } finally {
      setDeploying(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setGeneratedFiles([]);
    setDeployResult(null);
    setAiProvider(null);
    setAiModel(null);
    setProjectId(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setError('Please upload a PDF document.');
      return;
    }

    const file = fileInput.files[0];
    setFileName(file.name);
    setStep('generating');

    const questionnaire = {
      documentTitle: documentTitle || undefined,
      primaryGoal,
      designVibe,
      colorPalette,
      sections,
      customColors: customColors || undefined,
      userProvider: selectedProvider,
      userModel: selectedProvider === 'openrouter' ? (selectedModel || undefined) : undefined,
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('questionnaire', JSON.stringify(questionnaire));

    try {
      const res = await fetch('/api/pdf-website-3d', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'AI failed to generate your 3D website. Please try again.',
        );
        setStep('form');
        return;
      }

      const files = (data.files || []) as GeneratedFile[];
      if (!Array.isArray(files) || files.length === 0) {
        setError('AI did not return any files. Try adjusting your questionnaire.');
        setStep('form');
        return;
      }

      setGeneratedFiles(files);
      if (data.provider) setAiProvider(data.provider);
      if (data.model) setAiModel(data.model);
      if (data.projectId) setProjectId(data.projectId);
      const mainFile =
        files.find((f) => f.isMain) ||
        files.find((f) => f.path === 'src/App.jsx') ||
        files.find((f) => f.language === 'jsx');
      setSelectedPath(mainFile?.path || files[0].path);
      setStep('done');
    } catch (err) {
      console.error('[pdf-website-3d] client error:', err);
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
    let code = appJsx
      .replace(/export\s+default\s+function\s+App\b/g, 'function App')
      .replace(/export\s+default\s+class\s+App\b/g, 'class App')
      .replace(/export\s+default\s+App\s*;?\s*$/gm, '')
      .replace(/export\s+default\s+App\s*;?\s*/g, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/\bimport\s+.*?from\s+['"].*?['"]\s*;?\s*/g, '')
      .replace(/\b(const|var)\s+(\{[^}]*\}|\w+)\s*=\s*require\s*\([^)]+\)\s*;?\s*/g, '')
      .replace(/<\/script>/gi, '<\\/script>');
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${(documentTitle || '3D Portfolio').replace(/</g, '&lt;')}</title>
    <style>${(stylesCss || '').replace(/<\/style>/gi, '</ style>')}</style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/three@0.125.0/build/three.min.js"></script>
    <script src="https://unpkg.com/three@0.125.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body style="margin:0;min-height:100vh;background:#0a0a0f;">
    <div id="root" style="min-height:100vh;"></div>
    <script type="text/babel">
      const { useState, useEffect, useRef } = React || {};
      const THREE = window.THREE;
${code}
      const rootEl = document.getElementById('root');
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(typeof App !== 'undefined' ? App : function(){ return React.createElement('div',{style:{padding:20,color:'#fff'}},'App not found'); }));
    </script>
  </body>
</html>`;
    return html;
  }, [appJsx, stylesCss, documentTitle]);

  const selectedFile = useMemo(
    () => generatedFiles.find((f) => f.path === selectedPath) || null,
    [generatedFiles, selectedPath],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen text-white pb-16">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt=""
              fill
              className="object-cover object-right opacity-30"
              quality={100}
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-emerald-400/20 to-transparent opacity-80 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 lg:py-12">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center lg:text-left"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
                  PDF → 3D Portfolio
                </span>
              </h1>
              <p className="text-sm sm:text-base text-teal-100/90">
                Upload a PDF and get an immersive 3D portfolio website. Floating cards, orbit controls, deploy to Vercel.
              </p>
              <Link
                href="/pdf-website"
                className="inline-block mt-2 text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                Prefer 2D animated? Try PDF → Website →
              </Link>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full lg:w-[400px] flex-shrink-0 space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl glass-card glass-border p-5 border-emerald-400/20"
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-xs">1</span>
                        Upload PDF
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Resume, portfolio doc, or whitepaper. We extract text and build a 3D site.
                      </p>
                    </div>
                    <motion.div whileHover={{ scale: 1.01 }} className="relative">
                      <input
                        type="file"
                        name="file"
                        accept=".pdf,application/pdf"
                        className="block w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-emerald-500 file:to-cyan-500 file:text-white hover:file:from-emerald-400 hover:file:to-cyan-400 file:transition-all"
                      />
                    </motion.div>

                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <h2 className="text-sm font-semibold flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300 text-xs">2</span>
                        Questionnaire
                      </h2>

                      {aiOptions?.anyAvailable && (aiOptions.groqAvailable || aiOptions.openRouterAvailable) && (
                        <div className="space-y-2">
                          <label className="block text-gray-300 mb-1">AI provider</label>
                          <div className="flex flex-wrap gap-2">
                            {aiOptions.groqAvailable && (
                              <button
                                type="button"
                                onClick={() => { setSelectedProvider('groq'); setSelectedModel(aiOptions.models.groq[0]?.id || ''); }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                  selectedProvider === 'groq' ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200' : 'border-white/15 bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                Groq (Llama)
                              </button>
                            )}
                            {aiOptions.openRouterAvailable && (
                              <button
                                type="button"
                                onClick={() => { setSelectedProvider('openrouter'); setSelectedModel(aiOptions.models.openrouter[0]?.id ?? ''); }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                  selectedProvider === 'openrouter' ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200' : 'border-white/15 bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                OpenRouter (DeepSeek)
                              </button>
                            )}
                          </div>
                          {selectedProvider === 'openrouter' && aiOptions.models.openrouter.length > 1 && (
                            <div className="pt-1">
                              <label className="block text-[11px] text-gray-400 mb-1">Model</label>
                              <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full rounded-lg glass glass-border px-3 py-2 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              >
                                {aiOptions.models.openrouter.map((m) => (
                                  <option key={m.id} value={m.id}>{m.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 text-xs">
                        <div>
                          <label className="block text-gray-300 mb-1">Document / site title</label>
                          <input
                            type="text"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            placeholder="e.g. My 3D Portfolio"
                            className="w-full rounded-lg glass glass-border px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Primary goal</label>
                          <select
                            value={primaryGoal}
                            onChange={(e) => setPrimaryGoal(e.target.value as typeof primaryGoal)}
                            className="w-full rounded-lg glass glass-border px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          >
                            <option value="portfolio">Portfolio / showcase</option>
                            <option value="product">Product / service</option>
                            <option value="resume">Resume / CV</option>
                            <option value="whitepaper">Whitepaper / report</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">3D vibe</label>
                          <select
                            value={designVibe}
                            onChange={(e) => setDesignVibe(e.target.value as typeof designVibe)}
                            className="w-full rounded-lg glass glass-border px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          >
                            <option value="immersive">Immersive & spatial</option>
                            <option value="neon">Neon / cyberpunk</option>
                            <option value="minimal">Minimal & clean</option>
                            <option value="cosmic">Cosmic / galaxy</option>
                            <option value="bold">Bold & high-contrast</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Color palette</label>
                          <select
                            value={colorPalette}
                            onChange={(e) => setColorPalette(e.target.value as typeof colorPalette)}
                            className="w-full rounded-lg glass glass-border px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          >
                            <option value="emerald-cyan">Emerald + cyan</option>
                            <option value="purple-pink">Purple + pink</option>
                            <option value="sunset">Sunset (orange/pink)</option>
                            <option value="ocean">Ocean (blue/teal)</option>
                            <option value="forest">Forest (green/emerald)</option>
                            <option value="custom">Custom (describe below)</option>
                          </select>
                        </div>
                        {colorPalette === 'custom' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                            <label className="block text-gray-300 mb-1">Custom colors</label>
                            <input
                              type="text"
                              value={customColors}
                              onChange={(e) => setCustomColors(e.target.value)}
                              placeholder="e.g. gold, navy, coral"
                              className="w-full rounded-lg glass glass-border px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div className="pt-2">
                        <p className="text-[11px] text-gray-400 font-semibold mb-2">Sections to include</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'hero', label: 'Hero' },
                            { key: 'about', label: 'About' },
                            { key: 'features', label: 'Features' },
                            { key: 'testimonials', label: 'Testimonials' },
                            { key: 'contact', label: 'Contact' },
                          ].map(({ key, label }) => (
                            <motion.button
                              key={key}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSections((prev) => ({ ...prev, [key]: !prev[key as keyof typeof sections] }))}
                              className={`px-3 py-1.5 rounded-full border text-[11px] transition-colors ${
                                sections[key as keyof typeof sections]
                                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                                  : 'border-white/15 bg-white/5 text-gray-400'
                              }`}
                            >
                              {label}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={step === 'generating'}
                      whileHover={step !== 'generating' ? { scale: 1.02 } : {}}
                      whileTap={step !== 'generating' ? { scale: 0.98 } : {}}
                      className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold py-3 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-emerald-400/30"
                    >
                      {step === 'generating' ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          <span>Generating 3D website…</span>
                        </>
                      ) : (
                        <>
                          <span>Generate 3D portfolio</span>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </motion.button>
                  </form>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {fileName && (
                    <p className="mt-3 text-xs text-gray-400">
                      Last uploaded: <span className="text-gray-200">{fileName}</span>
                    </p>
                  )}
                  {(aiProvider || aiModel) && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      AI: {aiProvider || '—'} / {aiModel || '—'}
                    </p>
                  )}

                  {previewHtml && step === 'done' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                      <motion.button
                        type="button"
                        onClick={handleDeploy}
                        disabled={deploying}
                        whileHover={!deploying ? { scale: 1.02 } : {}}
                        whileTap={!deploying ? { scale: 0.98 } : {}}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-sm font-semibold py-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deploying ? (
                          <>
                            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full" />
                            <span>Deploying to Vercel…</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Deploy to Vercel</span>
                          </>
                        )}
                      </motion.button>
                      {deployResult?.url && (
                        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2">
                          <p className="text-xs font-semibold text-emerald-200">Live site</p>
                          <a href={deployResult.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-emerald-300 hover:text-emerald-200 truncate">
                            {deployResult.url}
                          </a>
                          {deployResult.claimUrl && (
                            <a href={deployResult.claimUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 hover:underline">
                              Claim & add to your Vercel account
                            </a>
                          )}
                        </div>
                      )}
                      {deployResult?.deployError && (
                        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          <p>{deployResult.deployError}</p>
                          {deployResult.hint && <p className="mt-1 text-gray-400">{deployResult.hint}</p>}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-xs text-gray-400 space-y-1.5">
                  <p className="font-semibold text-gray-300">How it works</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Upload a PDF; we extract text.</li>
                    <li>AI generates a 3D portfolio with floating cards and orbit controls.</li>
                    <li>Drag to rotate the camera. Deploy to Vercel for a live link.</li>
                  </ul>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex-1 flex flex-col gap-3 min-h-[500px]"
              >
                <div className="flex-1 rounded-2xl glass-card glass-border overflow-hidden flex flex-col md:flex-row border-emerald-400/20">
                  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/40">
                    <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-300">Generated files</span>
                      <span className="text-[10px] text-gray-500">{generatedFiles.length ? `${generatedFiles.length} file(s)` : '—'}</span>
                    </div>
                    <div className="max-h-48 md:max-h-none overflow-y-auto text-xs">
                      {generatedFiles.length === 0 ? (
                        <p className="px-3 py-4 text-gray-500">
                          Generate to see <span className="text-emerald-300">src/App.jsx</span> and <span className="text-cyan-300">styles.css</span>.
                        </p>
                      ) : (
                        <ul>
                          {generatedFiles.map((file, i) => (
                            <motion.li key={file.path} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                              <button
                                type="button"
                                onClick={() => setSelectedPath(file.path)}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 border-b border-white/5 hover:bg-white/5 transition-colors ${
                                  selectedPath === file.path ? 'bg-emerald-500/20 text-emerald-200' : 'text-gray-200'
                                }`}
                              >
                                <span className="truncate">{file.path}</span>
                                <span className="text-[10px] text-gray-400 uppercase">{file.language}</span>
                              </button>
                            </motion.li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-[420px]">
                    <div className="h-40 md:h-48 border-b border-white/10 bg-black/50">
                      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-300 truncate">{selectedFile ? selectedFile.path : 'Code'}</span>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(selectedFile.content).catch(() => undefined)}
                            className="text-[10px] px-2 py-1 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                      <div className="h-full overflow-auto text-[11px] font-mono bg-black/70 px-3 py-2 text-gray-200">
                        {selectedFile ? <pre className="whitespace-pre-wrap break-words">{selectedFile.content}</pre> : <p className="text-gray-500">Generated 3D React and CSS will appear here.</p>}
                      </div>
                    </div>
                    <div className="flex-1 relative min-h-[360px] flex flex-col">
                      {!previewHtml && step !== 'generating' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center mb-3"
                          >
                            <svg className="w-7 h-7 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                              <path d="M2 17l10 5 10-5" />
                            </svg>
                          </motion.div>
                          <p className="text-sm font-semibold mb-1">3D preview will appear here</p>
                          <p className="text-xs text-gray-400 max-w-sm">
                            Your immersive 3D portfolio will render in this frame after generation.
                          </p>
                        </div>
                      )}
                      {previewHtml && (
                        <iframe
                          srcDoc={previewHtml}
                          title="3D Portfolio Preview"
                          className="w-full flex-1 min-h-[320px] border-0 bg-[#0a0a0f]"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      )}
                      <AnimatePresence>
                        {step === 'generating' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                              className="w-12 h-12 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full mb-3"
                            />
                            <p className="text-xs text-gray-200">Building your 3D portfolio…</p>
                            <p className="text-[10px] text-gray-500 mt-1">AI is crafting the 3D scene</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
        </section>
      </main>
      <Footer />
    </div>
  );
}
