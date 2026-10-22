import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, currentAccessToken, setAccessToken } from './api.js';

describe('API session restoration', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    setAccessToken(null);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ accessToken: 'fresh-access-token' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('shares one rotating refresh request between simultaneous session restoration effects', async () => {
    await Promise.all([api.refresh(), api.refresh()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(currentAccessToken()).toBe('fresh-access-token');
  });

  it('refreshes an expired operator access token once and retries the protected request', async () => {
    setAccessToken('expired-access-token');
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ accessToken: 'fresh-access-token' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer fresh-access-token') {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ statusCode: 401, message: 'Credenciais inválidas.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(api.alerts()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(currentAccessToken()).toBe('fresh-access-token');
  });
});
