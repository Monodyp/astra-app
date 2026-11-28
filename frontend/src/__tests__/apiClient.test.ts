import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, apiFetch, ApiError, buildUrl } from '../lib/apiClient.js';
import * as firebase from '../lib/firebase.js';

describe('apiClient (FT-13)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('builds full URL with clean endpoints and query params', () => {
    const url = buildUrl('/members/search', { q: 'John Doe', page: 1 });
    expect(url).toContain('/members/search?q=John+Doe&page=1');
  });

  it('automatically injects Bearer token from firebase getIdToken', async () => {
    vi.spyOn(firebase, 'getIdToken').mockResolvedValueOnce('mock-jwt-token');

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const result = await apiClient<{ success: boolean }>('/auth/me');
    expect(result).toEqual({ success: true });

    const calledHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(calledHeaders.get('Authorization')).toBe('Bearer mock-jwt-token');
  });

  it('skips token injection when skipAuth is true', async () => {
    const tokenSpy = vi.spyOn(firebase, 'getIdToken');

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'public' }),
    });
    global.fetch = mockFetch;

    await apiClient('/public/health', { skipAuth: true });
    expect(tokenSpy).not.toHaveBeenCalled();

    const calledHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(calledHeaders.has('Authorization')).toBe(false);
  });

  it('apiFetch preserves HTTP status code (200 vs 201)', async () => {
    vi.spyOn(firebase, 'getIdToken').mockResolvedValueOnce(null);

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'voucher-1', claimed: true }),
    });
    global.fetch = mockFetch;

    const response = await apiFetch<{ id: string; claimed: boolean }>('/perks/1/redeem', {
      method: 'POST',
    });

    expect(response.status).toBe(201);
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ id: 'voucher-1', claimed: true });
  });

  it('throws ApiError with HTTP status and parsed error payload on failure', async () => {
    vi.spyOn(firebase, 'getIdToken').mockResolvedValueOnce(null);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Member not found' }),
    });
    global.fetch = mockFetch;

    await expect(apiClient('/members/99999')).rejects.toThrow(ApiError);
    await expect(apiClient('/members/99999')).rejects.toMatchObject({
      status: 404,
      message: 'Member not found',
    });
  });

  it('retries once with force refreshed token on 401 Unauthorized', async () => {
    const tokenSpy = vi
      .spyOn(firebase, 'getIdToken')
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Token expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ profile: 'valid' }),
      });
    global.fetch = mockFetch;

    const result = await apiClient<{ profile: string }>('/members/me');
    expect(result).toEqual({ profile: 'valid' });
    expect(tokenSpy).toHaveBeenCalledTimes(2);
    expect(tokenSpy).toHaveBeenNthCalledWith(2, true); // forceRefresh = true
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
