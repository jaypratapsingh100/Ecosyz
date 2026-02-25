'use client';

import { FormEvent, useState } from 'react';

type DeployResult = {
  url?: string;
  claimUrl?: string;
  deployError?: string;
  hint?: string;
};

export default function LinkedinWebsitePage() {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDeployResult(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setError('Please choose a PDF or text document to upload.');
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    if (title.trim()) {
      formData.append('projectTitle', title.trim());
    }
    formData.append('deploy', 'true');

    setLoading(true);
    setPreviewHtml(null);
    setFileName(file.name);

    try {
      const res = await fetch('/api/linkedin-website', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'Failed to generate website from document.',
        );
        return;
      }

      if (typeof data.html === 'string') {
        setPreviewHtml(data.html);
      } else {
        setError('API did not return HTML. Please try again.');
      }

      if (data.deployError) {
        setDeployResult({
          deployError: data.deployError,
          hint: data.hint,
        });
      } else if (data.url || data.claimUrl) {
        setDeployResult({
          url: data.url,
          claimUrl: data.claimUrl,
        });
      }
    } catch (err) {
      console.error('LinkedIn website generation error:', err);
      setError('Network error. Make sure the dev server is running and try again.');
    } finally {
      setLoading(false);
    }
  };

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
                LinkedIn → Website (Standalone Flow)
              </h1>
              <p className="text-[11px] text-gray-400">
                Upload a PDF (or text) and get a single‑page website plus a deployable Vercel link.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
            <span className="px-2 py-1 rounded-full border border-white/15 bg-white/5">
              Independent from App Builder
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="w-full lg:w-[360px] flex-shrink-0">
          <div className="bg-[#020617] border border-white/10 rounded-2xl p-4 shadow-xl shadow-emerald-500/5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold mb-1">1. Upload your document</h2>
              <p className="text-[11px] text-gray-400">
                This flow is separate from the main App Builder. It just reads your file and
                generates a previewable one‑page React site with navigation and placeholder images.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5 text-xs">
                <label className="block text-gray-300">Website title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Jane Doe · Product Designer"
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div className="space-y-1.5 text-xs">
                <label className="block text-gray-300">
                  PDF or text document
                  <span className="text-gray-500"> (resume / LinkedIn export)</span>
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf,application/pdf,.txt,.md,.markdown"
                  className="block w-full text-[11px] text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/90 file:text-gray-900 hover:file:bg-emerald-400/90"
                />
                <p className="text-[10px] text-gray-500">
                  PDF is parsed automatically. You get a preview and a live link on Vercel.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-900 text-xs font-semibold py-2.5 shadow-lg shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-gray-900/20 border-t-gray-900 rounded-full animate-spin" />
                    <span>Generating & deploying…</span>
                  </>
                ) : (
                  <>
                    <span>Generate & deploy to Vercel</span>
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
            {deployResult?.url && (
              <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-200">Live site (Vercel)</p>
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-emerald-300 hover:text-emerald-200 truncate"
                >
                  {deployResult.url}
                </a>
                {deployResult.claimUrl && (
                  <p className="text-[10px] text-gray-400">
                    <a
                      href={deployResult.claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      Claim & add to your Vercel account
                    </a>
                  </p>
                )}
              </div>
            )}
            {deployResult?.deployError && (
              <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <p>{deployResult.deployError}</p>
                {deployResult.hint && (
                  <p className="mt-1 text-gray-400">{deployResult.hint}</p>
                )}
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
              <li>Upload a PDF (or text); we extract text and build a single‑page site.</li>
              <li>Preview appears here; the site is deployed to Vercel and you get a live link.</li>
              <li>Separate from the main App Builder — no project in the database.</li>
            </ul>
          </div>
        </div>

        <div className="flex-1 min-h-[360px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 overflow-hidden relative">
          {!previewHtml && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/50">
                  <svg
                    className="w-6 h-6 text-gray-900"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h7v7H4z" />
                    <path d="M13 4h7v7h-7z" />
                    <path d="M4 13h7v7H4z" />
                    <path d="M17 17h.01" />
                    <path d="M13 13h7v7h-7z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-sm font-semibold mb-2">Preview will appear here</h2>
              <p className="text-[11px] text-gray-400 max-w-sm">
                Upload a document on the left to generate a modern single‑page React website with
                navigation and lots of placeholder imagery.
              </p>
            </div>
          )}

          {previewHtml && (
            <iframe
              srcDoc={previewHtml}
              title="LinkedIn Website Preview"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-3" />
              <p className="text-xs text-gray-200">Building preview…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

