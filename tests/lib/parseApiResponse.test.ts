import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseApiResponse } from '../../lib/parseApiResponse';

describe('parseApiResponse', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('parses JSON response successfully', async () => {
    const res = new Response(JSON.stringify({ foo: 'bar' }), {
      status: 200,
      statusText: 'OK',
    });
    const result = await parseApiResponse<{ foo: string }>(res);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
    expect(result.data).toEqual({ foo: 'bar' });
    expect(result.raw).toBe('{"foo":"bar"}');
  });

  it('handles empty response body', async () => {
    const res = new Response('', { status: 200, statusText: 'OK' });
    const result = await parseApiResponse(res);
    expect(result.ok).toBe(true);
    expect(result.data).toBe(null);
    expect(result.raw).toBeFalsy(); // raw is undefined when text is empty (text || undefined)
  });

  it('handles invalid JSON by returning raw text', async () => {
    const res = new Response('not valid json', {
      status: 200,
      statusText: 'OK',
    });
    const result = await parseApiResponse(res);
    expect(result.data).toBe('not valid json');
    expect(console.warn).toHaveBeenCalled();
  });

  it('preserves error status', async () => {
    const res = new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      statusText: 'Unauthorized',
    });
    const result = await parseApiResponse(res);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.data).toEqual({ error: 'Unauthorized' });
  });
});
