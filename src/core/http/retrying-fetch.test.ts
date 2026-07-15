import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retryingFetch } from './retrying-fetch.js';

function makeResponse(status: number): Response {
  return new Response(null, { status });
}

describe('retryingFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns immediately on a non-retryable response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200));
    vi.stubGlobal('fetch', fetchMock);

    const result = await retryingFetch('https://example.test');

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on a 429 and succeeds once the server recovers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(200));
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = retryingFetch('https://example.test');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on a 409 conflict the same way as a 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(409))
      .mockResolvedValueOnce(makeResponse(200));
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = retryingFetch('https://example.test');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the max retries and returns the last response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(503));
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = retryingFetch('https://example.test');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('does not retry on a plain 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(404));
    vi.stubGlobal('fetch', fetchMock);

    const result = await retryingFetch('https://example.test');

    expect(result.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
