import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import the middleware directly
import { middleware } from '@/middleware';

function buildRequest(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe('middleware', () => {
  describe('protected routes — unauthenticated', () => {
    const protectedPaths = [
      '/studio',
      '/workspaces',
      '/profile',
      '/problems-and-ideas',
      '/chat',
      '/ai-news/saved',
    ];

    protectedPaths.forEach((path) => {
      it(`redirects ${path} to /auth with redirect param`, () => {
        const res = middleware(buildRequest(path));
        expect(res.status).toBe(307);
        const location = res.headers.get('location') || '';
        const url = new URL(location);
        expect(url.pathname).toBe('/auth');
        expect(url.searchParams.get('redirect')).toBe(path);
      });
    });

    it('preserves query params in redirect', () => {
      const res = middleware(buildRequest('/studio?project=abc'));
      const location = res.headers.get('location') || '';
      const url = new URL(location);
      expect(url.searchParams.get('redirect')).toBe('/studio?project=abc');
    });

    it('redirects sub-routes of protected paths', () => {
      const res = middleware(buildRequest('/workspaces/123'));
      expect(res.status).toBe(307);
      const location = res.headers.get('location') || '';
      const url = new URL(location);
      expect(url.pathname).toBe('/auth');
      expect(url.searchParams.get('redirect')).toBe('/workspaces/123');
    });
  });

  describe('protected routes — authenticated', () => {
    it('allows access when sb-access-token cookie exists', () => {
      const res = middleware(buildRequest('/studio', { 'sb-access-token': 'some-token' }));
      // Should not redirect (status is not 307)
      expect(res.status).not.toBe(307);
    });

    it('allows /workspaces when authenticated', () => {
      const res = middleware(buildRequest('/workspaces', { 'sb-access-token': 'tok' }));
      expect(res.status).not.toBe(307);
    });
  });

  describe('public routes', () => {
    const publicPaths = ['/', '/community', '/search', '/about', '/auth', '/docs'];

    publicPaths.forEach((path) => {
      it(`allows ${path} without auth`, () => {
        const res = middleware(buildRequest(path));
        // Should not redirect to /auth
        const location = res.headers.get('location') || '';
        if (location) {
          const url = new URL(location);
          expect(url.pathname).not.toBe('/auth');
        }
      });
    });
  });

  describe('anonymous session cookie', () => {
    it('sets anon_session cookie when missing', () => {
      const res = middleware(buildRequest('/'));
      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).toContain('anon_session');
    });

    it('does not replace a valid anon_session cookie', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const res = middleware(buildRequest('/', { 'anon_session': validUUID }));
      const setCookie = res.headers.get('set-cookie') || '';
      // Should NOT set a new cookie since existing one is valid
      expect(setCookie).not.toContain('anon_session');
    });
  });

  describe('asset paths', () => {
    it('skips _next paths', () => {
      const res = middleware(buildRequest('/_next/static/chunk.js'));
      expect(res.status).toBe(200);
    });

    it('skips favicon paths', () => {
      const res = middleware(buildRequest('/favicon.ico'));
      expect(res.status).toBe(200);
    });
  });
});
