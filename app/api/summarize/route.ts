/* SPDX-License-Identifier: MIT
 * Summarization API: Tier 1 (quick) from abstract; Tier 2 (deep) by fetching PDF (arXiv) and summarizing text.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Simple in-memory cache (TTL 7 days)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { ts: number; data: any }>();

function getCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return undefined; }
  return entry.data;
}
function setCache(key: string, data: any) { cache.set(key, { ts: Date.now(), data }); }

// Optional KV (Vercel KV / Upstash) for cross-instance persistence
const KV_TTL_SECONDS = 7 * 24 * 60 * 60;
const hasKV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
async function kvGet<T = any>(key: string): Promise<T | null> {
  if (!hasKV) return null;
  try {
    const mod: any = await import('@vercel/kv');
    const val = await mod.kv.get(key);
    return (val ?? null) as T | null;
  } catch {
    return null;
  }
}
async function kvSet<T = any>(key: string, value: T): Promise<void> {
  if (!hasKV) return;
  try {
    const mod: any = await import('@vercel/kv');
    await mod.kv.set(key, value, { ex: KV_TTL_SECONDS });
  } catch {
    // ignore
  }
}

// Basic English stopwords list for keywording
const STOPWORDS = new Set([
  'the','and','a','an','of','to','in','for','on','with','as','by','is','are','was','were','be','been','it','that','this','from','at','or','we','our','their','they','these','those','which','than','into','also','can','may','such','using','use','used','between','within','over','under','about','more','most','less','least','however','therefore','thus','both','each','many','much','very','based','results','result','paper','study','research','data','method','methods','conclusion','conclusions','introduction','discussion','analysis','analyses','show','shows','showed','present','presented','propose','proposed','approach','approaches','between','among'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sentenceSplit(text: string): string[] {
  const parts = text.replace(/\s+/g, ' ').split(/(?<=[\.!?])\s+(?=[A-Z0-9])/g);
  return parts.map(s => s.trim()).filter(s => s.length > 0);
}

function scoreSentences(text: string, maxTokens = 50000) {
  const truncated = text.slice(0, maxTokens);
  const sentences = sentenceSplit(truncated).slice(0, 100); // cap sentences
  const freq = new Map<string, number>();
  const sentenceTokens: string[][] = sentences.map(s => tokenize(s));
  for (const toks of sentenceTokens) {
    for (const t of toks) {
      if (STOPWORDS.has(t) || t.length < 3) continue;
      freq.set(t, (freq.get(t) || 0) + 1);
    }
  }
  const scores = sentences.map((s, i) => {
    const toks = sentenceTokens[i];
    const score = toks.reduce((acc, t) => acc + (freq.get(t) || 0), 0) / (toks.length || 1);
    return { i, s, score };
  });
  return { sentences, scores: scores.sort((a,b) => b.score - a.score) };
}

function summarizeText(text: string, n = 5) {
  const { sentences, scores } = scoreSentences(text);
  const top = scores.slice(0, n).sort((a,b) => a.i - b.i).map(x => x.s);
  const summary = top.join(' ');
  const tldr = sentenceSplit(summary).slice(0, 2).join(' ');
  // simple keywords
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const t of tokens) { if (!STOPWORDS.has(t) && t.length > 2) counts.set(t, (counts.get(t)||0)+1); }
  const tags = Array.from(counts.entries()).sort((a,b) => b[1]-a[1]).slice(0,3).map(x => x[0]);
  const readingTimeMinutes = Math.max(1, Math.round(tokens.length / 200));
  return { tldr, bullets: top.slice(0,5), tags, readingTimeMinutes, confidence: 'medium' };
}

function quickFromMeta(meta: { title?: string; abstract?: string; }) {
  const basis = [meta.title || '', meta.abstract || ''].filter(Boolean).join('. ');
  return summarizeText(basis || '');
}

function deriveArxivPdf(urlOrId: string): string | null {
  if (!urlOrId) return null;
  try {
    // accepted forms: https://arxiv.org/abs/XXXX, http://arxiv.org/abs/..., or raw id with arXiv: prefix
    let id = urlOrId;
    if (id.includes('arxiv.org')) {
      id = id.replace('http://','https://');
      const m = id.match(/arxiv\.org\/(abs|pdf)\/([^\s?#]+)(\.pdf)?/i);
      if (m && m[2]) id = m[2];
    }
    id = id.replace(/^arxiv:\s*/i,'');
    if (!id) return null;
    return `https://arxiv.org/pdf/${id}.pdf`;
  } catch { return null; }
}

async function deriveOpenAlexPdf(idOrUrl: string, signal?: AbortSignal): Promise<string | null> {
  if (!idOrUrl) return null;
  try {
    // Accept forms like https://openalex.org/W.... or https://api.openalex.org/works/W...
    let workId = '';
    const m = idOrUrl.match(/openalex\.org\/(W\w+)/i) || idOrUrl.match(/api\.openalex\.org\/works\/(W\w+)/i);
    if (m && m[1]) workId = m[1];
    if (!workId) return null;
    const apiUrl = `https://api.openalex.org/works/${workId}?select=id,primary_location,best_oa_location,open_access`;
    const res = await fetch(apiUrl, { signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const cand = data?.best_oa_location?.pdf_url
      || data?.best_oa_location?.url_for_pdf
      || data?.primary_location?.pdf_url
      || data?.open_access?.oa_url;
    if (typeof cand === 'string' && /\.pdf(\b|$)/i.test(cand)) return cand;
    // If not clearly a .pdf, try HEAD to confirm content-type
    if (typeof cand === 'string') {
      try {
        const head = await fetch(cand, { method: 'HEAD', redirect: 'follow', signal });
        const ctype = head.headers.get('content-type') || '';
        if (ctype.includes('application/pdf')) return cand;
      } catch {}
    }
    return null;
  } catch { return null; }
}

async function deriveZenodoPdf(urlOrId: string, signal?: AbortSignal): Promise<string | null> {
  if (!urlOrId) return null;
  try {
    // Expect https://zenodo.org/records/{id}
    let recId = '';
    const m = urlOrId.match(/zenodo\.org\/records\/(\d+)/i);
    if (m && m[1]) recId = m[1];
    if (!recId) return null;
    const apiUrl = `https://zenodo.org/api/records/${recId}`;
    const res = await fetch(apiUrl, { signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const files: any[] = Array.isArray(data?.files) ? data.files : [];
    const pdfFile = files.find(f => (f?.mimetype?.includes('pdf')) || /\.pdf$/i.test(f?.key || ''));
    const cand = pdfFile?.links?.download || pdfFile?.links?.self || null;
    if (typeof cand === 'string') return cand;
    return null;
  } catch { return null; }
}

async function deriveGenericPdf(url?: string, signal?: AbortSignal): Promise<string | null> {
  if (!url) return null;
  if (/\.pdf(\b|$)/i.test(url)) return url;
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow', signal });
    const ctype = head.headers.get('content-type') || '';
    if (ctype.includes('application/pdf')) return url;
  } catch {}
  return null;
}

async function fetchPdfText(pdfUrl: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(pdfUrl, { signal });
  if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  // pdf-parse dynamic import to avoid bundling issues
  const pdfParse = (await import('pdf-parse')).default as any;
  const data = await pdfParse(Buffer.from(arrayBuf));
  return String(data.text || '');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, source, title, abstract, url, mode }: { id?: string; source?: string; title?: string; abstract?: string; url?: string; mode?: 'quick'|'deep' } = body || {};
  if (!id && !title) return NextResponse.json({ error: 'Missing id or title' }, { status: 400 });
  const key = `${id || title}:${mode || 'quick'}`;
  // 1) Try KV first
  const kvCached = await kvGet<any>(key);
  if (kvCached) {
    // seed memory cache
    setCache(key, kvCached);
    return NextResponse.json({ ...kvCached, fromCache: true, cache: 'kv' }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' } });
  }
  // 2) Fallback to memory cache
  const cached = getCache(key);
  if (cached) return NextResponse.json({ ...cached, fromCache: true, cache: 'memory' }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' } });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    let result: any | null = null;
    let modeUsed: 'quick' | 'deep' = (mode === 'deep' ? 'deep' : 'quick');
    if (mode === 'deep') {
      let pdfUrl: string | null = null;
      if (source === 'arxiv') pdfUrl = deriveArxivPdf(url || id || '');
      else if (source === 'openalex') pdfUrl = await deriveOpenAlexPdf(url || id || '', controller.signal);
      else if (source === 'zenodo') pdfUrl = await deriveZenodoPdf(url || id || '', controller.signal);
      if (!pdfUrl) pdfUrl = await deriveGenericPdf(url, controller.signal);
      if (pdfUrl) {
        try {
          const text = await fetchPdfText(pdfUrl, controller.signal);
          const cleaned = text.replace(/\s+/g, ' ').slice(0, 200000); // cap to 200k chars
          result = summarizeText(cleaned, 6);
        } catch (e) {
          result = null; // fallback below
        }
      }
    }
    if (!result) {
      // Tier 1 quick summary from abstract/title
      result = quickFromMeta({ title, abstract });
      modeUsed = 'quick';
    }
    const payload = { ...result, modeUsed };
    setCache(key, payload);
    await kvSet(key, payload);
    return NextResponse.json({ ...payload, fromCache: false, cache: 'none' }, { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Summarization failed' }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
 
// Server-Sent Events (SSE) streaming endpoint via GET
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || undefined;
  const source = searchParams.get('source') || undefined;
  const title = searchParams.get('title') || undefined;
  const abstract = searchParams.get('abstract') || undefined;
  const url = searchParams.get('url') || undefined;
  const mode = (searchParams.get('mode') as 'quick'|'deep'|null) || 'quick';
  const key = `${id || title || 'unknown'}:${mode}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      function send(event: string, data: any) {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }
      function close() { controller.close(); }
      try {
        // KV first
        const kvCached = await kvGet<any>(key);
        if (kvCached) {
          setCache(key, kvCached);
          send('meta', { fromCache: true, cache: 'kv', modeUsed: kvCached.modeUsed || mode });
          // stream fields
          if (kvCached.tldr) send('tldr', kvCached.tldr);
          if (Array.isArray(kvCached.bullets)) send('bullets', kvCached.bullets);
          if (Array.isArray(kvCached.tags)) send('tags', kvCached.tags);
          send('done', { ok: true });
          close();
          return;
        }
        // Memory cache
        const memCached = getCache(key);
        if (memCached) {
          send('meta', { fromCache: true, cache: 'memory', modeUsed: memCached.modeUsed || mode });
          if (memCached.tldr) send('tldr', memCached.tldr);
          if (Array.isArray(memCached.bullets)) send('bullets', memCached.bullets);
          if (Array.isArray(memCached.tags)) send('tags', memCached.tags);
          send('done', { ok: true });
          close();
          return;
        }
        // Fresh generation
        send('meta', { fromCache: false, cache: 'none', modeRequested: mode });
        let result: any | null = null;
        let modeUsed: 'quick'|'deep' = (mode === 'deep' ? 'deep' : 'quick');
        try {
          if (mode === 'deep') {
            let pdfUrl: string | null = null;
            if (source === 'arxiv') pdfUrl = deriveArxivPdf(url || id || '');
            else if (source === 'openalex') pdfUrl = await deriveOpenAlexPdf(url || id || '');
            else if (source === 'zenodo') pdfUrl = await deriveZenodoPdf(url || id || '');
            if (!pdfUrl) pdfUrl = await deriveGenericPdf(url || undefined);
            if (pdfUrl) {
              const text = await fetchPdfText(pdfUrl);
              const cleaned = text.replace(/\s+/g, ' ').slice(0, 200000);
              result = summarizeText(cleaned, 6);
            }
          }
        } catch (e) {
          // fall back
          result = null;
        }
        if (!result) {
          result = quickFromMeta({ title, abstract });
          modeUsed = 'quick';
        }
        const payload = { ...result, modeUsed };
        setCache(key, payload);
        await kvSet(key, payload);
        // stream results
        send('meta', { fromCache: false, cache: 'none', modeUsed });
        if (payload.tldr) send('tldr', payload.tldr);
        if (Array.isArray(payload.bullets)) send('bullets', payload.bullets);
        if (Array.isArray(payload.tags)) send('tags', payload.tags);
        send('done', { ok: true });
        close();
      } catch (e: any) {
        const msg = e?.message || 'Summarization failed';
        send('error', { message: msg });
        close();
      }
    }
  });
  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
 
