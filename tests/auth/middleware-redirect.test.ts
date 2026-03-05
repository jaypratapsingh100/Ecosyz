import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

function buildRequest(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

function getRedirectUrl(res: ReturnType<typeof middleware>): URL | null {
  const location = res.headers.get('location');
  if (!location) return null;
  return new URL(location);
}

describe('middleware — redirect parameter flow', () => {
  it('preserves full query string: /studio?project=abc&view=code', () => {
    const res = middleware(buildRequest('/studio?project=abc&view=code'));
    expect(res.status).toBe(307);
    const url = getRedirectUrl(res)!;
    expect(url.pathname).toBe('/auth');
    expect(url.searchParams.get('redirect')).toBe('/studio?project=abc&view=code');
  });

  it('preserves nested path: /workspaces/123/edit', () => {
    const res = middleware(buildRequest('/workspaces/123/edit'));
    expect(res.status).toBe(307);
    const url = getRedirectUrl(res)!;
    expect(url.searchParams.get('redirect')).toBe('/workspaces/123/edit');
  });

  it('redirects /chat to /auth?redirect=%2Fchat', () => {
    const res = middleware(buildRequest('/chat'));
    expect(res.status).toBe(307);
    const url = getRedirectUrl(res)!;
    expect(url.pathname).toBe('/auth');
    expect(url.searchParams.get('redirect')).toBe('/chat');
  });

  it('redirects /ai-news/saved correctly', () => {
    const res = middleware(buildRequest('/ai-news/saved'));
    expect(res.status).toBe(307);
    const url = getRedirectUrl(res)!;
    expect(url.searchParams.get('redirect')).toBe('/ai-news/saved');
  });

  it('redirects /problems-and-ideas correctly', () => {
    const res = middleware(buildRequest('/problems-and-ideas'));
    expect(res.status).toBe(307);
    const url = getRedirectUrl(res)!;
    expect(url.searchParams.get('redirect')).toBe('/problems-and-ideas');
  });

  it('does NOT redirect /auth (prevents infinite loop)', () => {
    const res = middleware(buildRequest('/auth'));
    // Should not redirect to /auth again
    const url = getRedirectUrl(res);
    if (url) {
      expect(url.pathname).not.toBe('/auth');
    } else {
      // No redirect — passes through
      expect(res.status).not.toBe(307);
    }
  });

  it('allows /studio with valid sb-access-token cookie', () => {
    const res = middleware(buildRequest('/studio', { 'sb-access-token': 'valid-token-123' }));
    expect(res.status).not.toBe(307);
  });

  it('allows /workspaces/deep/path with auth cookie', () => {
    const res = middleware(buildRequest('/workspaces/deep/path', { 'sb-access-token': 'tok' }));
    expect(res.status).not.toBe(307);
  });

  it('does not redirect public routes like /community', () => {
    const res = middleware(buildRequest('/community'));
    const url = getRedirectUrl(res);
    if (url) {
      expect(url.pathname).not.toBe('/auth');
    }
  });

  it('does not redirect /search', () => {
    const res = middleware(buildRequest('/search'));
    const url = getRedirectUrl(res);
    if (url) {
      expect(url.pathname).not.toBe('/auth');
    }
  });
});
