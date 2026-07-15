import type { Cache } from './cache.js';

/** Per-run, in-memory cache. The first layer checked before any persistent cache. */
export function createMemoryCache(): Cache {
  const store = new Map<string, unknown>();

  return {
    async get<T>(key: string): Promise<T | undefined> {
      return store.get(key) as T | undefined;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
  };
}
