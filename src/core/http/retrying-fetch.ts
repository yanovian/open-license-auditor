import pLimit from 'p-limit';

const MAX_CONCURRENT_REQUESTS = 8;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 300;
const RETRYABLE_STATUS_CODES = new Set([409, 429, 500, 502, 503, 504]);

const concurrencyLimit = pLimit(MAX_CONCURRENT_REQUESTS);

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function backoffDelayMs(attempt: number): number {
  const exponential = BASE_DELAY_MS * 2 ** attempt;
  const jitter = Math.random() * BASE_DELAY_MS;
  return exponential + jitter;
}

/**
 * A fetch wrapper for calling external registries (deps.dev and friends) that keeps this tool
 * well-behaved under their rate limits: a global concurrency cap plus exponential backoff with
 * jitter on 409/429/5xx responses, so a burst of dependency lookups doesn't get the Action
 * throttled or blocked mid-run.
 */
export async function retryingFetch(url: string, init?: RequestInit): Promise<Response> {
  return concurrencyLimit(async () => {
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const response = await fetch(url, init);
      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }

      lastResponse = response;
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelayMs(attempt));
      }
    }

    return lastResponse as Response;
  });
}
