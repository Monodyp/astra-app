import { afterEach, expect, it, vi } from 'vitest';
import { verifyMembership } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('preserves a 503 HTTP status and parsed error JSON', async () => {
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(JSON.stringify({ error: 'MEMBER_SOURCE_UNAVAILABLE' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  await expect(verifyMembership('24-90001')).resolves.toEqual({
    status: 503,
    body: { error: 'MEMBER_SOURCE_UNAVAILABLE' },
  });
});

it('preserves HTTP status and raw text for a non-JSON proxy failure', async () => {
  vi.stubGlobal(
    'fetch',
    async () => new Response('Backend unavailable', { status: 502 })
  );
  await expect(verifyMembership('24-90001')).resolves.toEqual({
    status: 502,
    body: 'Backend unavailable',
  });
});

it('sends the typed SR code to the verification endpoint as JSON', async () => {
  const fetch = vi.fn(
    async () => new Response('{"isValid":true}', { status: 200 })
  );
  vi.stubGlobal('fetch', fetch);
  await expect(verifyMembership(' 24-00009 ')).resolves.toEqual({
    status: 200,
    body: { isValid: true },
  });
  expect(fetch).toHaveBeenCalledWith('/api/members/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"srCode":" 24-00009 "}',
  });
});

it('reports a network failure without inventing an HTTP status', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await expect(verifyMembership('24-90001')).rejects.toThrow('Failed to fetch');
});
