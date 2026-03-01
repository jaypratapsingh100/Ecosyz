'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

type DeployResult = {
  url?: string;
  claimUrl?: string;
  deployError?: string;
  hint?: string;
};

type ProductInput = { name: string; description: string; price: string };

const DEFAULT_PRODUCTS: ProductInput[] = [
  { name: 'Product 1', description: '', price: '999' },
  { name: 'Product 2', description: '', price: '1499' },
  { name: 'Product 3', description: '', price: '799' },
  { name: 'Product 4', description: '', price: '1299' },
  { name: 'Product 5', description: '', price: '599' },
  { name: 'Product 6', description: '', price: '1899' },
];

export default function InstagramStorePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [products, setProducts] = useState<ProductInput[]>(DEFAULT_PRODUCTS);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);

  const handleStep1 = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const url = (form.elements.namedItem('instagramUrl') as HTMLInputElement)?.value?.trim();
    const name = (form.elements.namedItem('storeName') as HTMLInputElement)?.value?.trim() || 'My Store';
    if (!url) {
      setError('Please enter your Instagram profile or shop link.');
      return;
    }
    setError(null);
    setInstagramUrl(url);
    setStoreName(name);
    setStep(2);
  };

  const handleStep2 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDeployResult(null);

    const validProducts = products
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        description: (p.description || '').trim().slice(0, 120),
        price: parseInt(p.price, 10) || 0,
      }))
      .filter((p) => p.price >= 0);

    if (validProducts.length === 0) {
      setError('Add at least one product with name and price.');
      return;
    }

    const formData = new FormData();
    formData.append('instagramUrl', instagramUrl);
    formData.append('storeName', storeName);
    formData.append('deploy', 'true');
    formData.append('products', JSON.stringify(validProducts));

    setLoading(true);
    setPreviewHtml(null);

    try {
      const res = await fetch('/api/instagram-store', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'Failed to generate Instagram store.',
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
      console.error('Instagram store generation error:', err);
      setError('Network error. Make sure the dev server is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = (i: number, field: keyof ProductInput, value: string) => {
    setProducts((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addProduct = () => {
    setProducts((prev) => [...prev, { name: '', description: '', price: '' }]);
  };

  const removeProduct = (i: number) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((_, j) => j !== i));
  };

  const loadThemeProducts = async () => {
    try {
      const params = new URLSearchParams({ storeName, instagramUrl });
      const res = await fetch(`/api/instagram-store/products?${params}`);
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.products)) {
        setProducts(
          data.products.map((p: { name: string; description?: string; price: number }) => ({
            name: p.name,
            description: p.description || '',
            price: String(p.price),
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/40">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2A3 3 0 1 0 12 15a3 3 0 0 0 0-6zm5.25-2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                Instagram → E‑Store
              </h1>
              <p className="text-[11px] text-gray-400">
                Paste your Instagram link and get a ready-to-deploy e‑store with product grid and cart.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
            <span className="px-2 py-1 rounded-full border border-white/15 bg-white/5">
              Standalone flow — not part of App Builder
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="w-full lg:w-[360px] flex-shrink-0">
          <div className="bg-[#020617] border border-white/10 rounded-2xl p-4 shadow-xl shadow-pink-500/5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                {step}
              </span>
              <h2 className="text-sm font-semibold">
                {step === 1 ? 'Store details' : 'Products'}
              </h2>
            </div>

            {step === 1 ? (
              <form onSubmit={handleStep1} className="space-y-3">
                <p className="text-[11px] text-gray-400 mb-3">
                  Enter your Instagram profile. Theme & colors are chosen automatically.
                </p>
                <div className="space-y-1.5 text-xs">
                  <label className="block text-gray-300">Instagram URL</label>
                  <input
                    type="url"
                    name="instagramUrl"
                    defaultValue={instagramUrl}
                    placeholder="https://instagram.com/your_shop"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="block text-gray-300">Store name</label>
                  <input
                    type="text"
                    name="storeName"
                    defaultValue={storeName}
                    placeholder="My Store"
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 via-red-500 to-amber-500 text-white text-xs font-semibold py-2.5 shadow-lg shadow-pink-500/40"
                >
                  Next: Add products
                </button>
              </form>
            ) : (
              <form onSubmit={handleStep2} className="space-y-3">
                <p className="text-[11px] text-gray-400 mb-3">
                  Add products. Brief description optional.
                </p>
                <button
                  type="button"
                  onClick={loadThemeProducts}
                  className="mb-2 w-full rounded-lg border border-white/20 py-1.5 text-[11px] text-gray-400 hover:text-gray-300"
                >
                  Use theme suggestions
                </button>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {products.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/10 bg-black/30 p-2 space-y-1.5"
                    >
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Product name"
                          value={p.name}
                          onChange={(e) => updateProduct(i, 'name', e.target.value)}
                          className="flex-1 rounded bg-black/40 border border-white/15 px-2 py-1.5 text-[11px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => removeProduct(i)}
                          disabled={products.length <= 1}
                          className="rounded p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-30"
                          aria-label="Remove"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Brief description (optional)"
                        value={p.description}
                        onChange={(e) => updateProduct(i, 'description', e.target.value)}
                        className="w-full rounded bg-black/40 border border-white/15 px-2 py-1.5 text-[11px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                      />
                      <input
                        type="number"
                        placeholder="Price (₹)"
                        value={p.price}
                        onChange={(e) => updateProduct(i, 'price', e.target.value)}
                        min={0}
                        className="w-full rounded bg-black/40 border border-white/15 px-2 py-1.5 text-[11px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addProduct}
                  className="w-full rounded-lg border border-dashed border-white/20 py-2 text-[11px] text-gray-400 hover:text-gray-300"
                >
                  + Add product
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-lg border border-white/20 py-2 text-xs text-gray-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 via-red-500 to-amber-500 text-white text-xs font-semibold py-2.5 shadow-lg shadow-pink-500/40 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Generate
                      </>
                    ) : (
                      'Generate & deploy'
                    )}
                  </button>
                </div>
              </form>
            )}
            {error && (
              <div className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {error}
              </div>
            )}
            {deployResult?.url && (
              <div className="mt-3 rounded-xl border border-pink-500/40 bg-pink-500/10 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-pink-200">Live site (Vercel)</p>
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-pink-300 hover:text-pink-200 truncate"
                >
                  {deployResult.url}
                </a>
                {deployResult.claimUrl && (
                  <p className="text-[10px] text-gray-400">
                    <a
                      href={deployResult.claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 hover:underline"
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
          </div>

          <div className="mt-4 text-[11px] text-gray-400 space-y-1.5">
            <p className="font-semibold text-gray-300">How this flow works</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Step 1: Instagram URL + store name. Theme & colors auto.</li>
              <li>Step 2: Add products (name, description, price).</li>
              <li>Generate & deploy to Vercel with a live link.</li>
              <li>Separate from App Builder — no project in the database.</li>
            </ul>
          </div>

          <div className="mt-4">
            <Link
              href="/studio"
              className="text-[11px] text-pink-400 hover:text-pink-300"
            >
              ← Back to Studio
            </Link>
          </div>
        </div>

        <div className="flex-1 min-h-[360px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 overflow-hidden relative">
          {!previewHtml && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 via-red-500 to-amber-500 flex items-center justify-center shadow-xl shadow-pink-500/50">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm4.5 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-sm font-semibold mb-2">Preview will appear here</h2>
              <p className="text-[11px] text-gray-400 max-w-sm">
                Enter your Instagram URL on the left to generate a custom e‑store with product grid,
                cart, and Instagram links. Deploy to Vercel in one click.
              </p>
            </div>
          )}

          {previewHtml && (
            <iframe
              srcDoc={previewHtml}
              title="Instagram Store Preview"
              className="w-full h-full min-h-[500px] border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <div className="w-10 h-10 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin mb-3" />
              <p className="text-xs text-gray-200">Building your store…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
