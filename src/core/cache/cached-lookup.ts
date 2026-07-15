import type { Cache } from './cache.js';

/**
 * Shared read-through cache helper: every ecosystem plugin's license lookup (and the deps.dev
 * graph adapter's dependency-tree lookup) goes through this so a cache hit skips the network
 * call entirely, regardless of which registry or endpoint would have been called.
 */
export async function withCache<T>(
  cache: Cache,
  cacheKey: string,
  computeValue: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const value = await computeValue();
  await cache.set(cacheKey, value);
  return value;
}
