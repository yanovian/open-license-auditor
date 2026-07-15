import * as actionsCache from '@actions/cache';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Cache } from './cache.js';

const CACHE_DIR = '.open-license-auditor-cache';
const CACHE_FILE_PATH = path.join(CACHE_DIR, 'license-cache.json');
const CACHE_KEY_PREFIX = 'open-license-auditor-license-cache-v1';

export interface PersistentCache extends Cache {
  /** Writes the accumulated cache back so future runs can restore it. */
  save(): Promise<void>;
}

async function restoreStore(): Promise<Map<string, unknown>> {
  try {
    const restoredKey = await actionsCache.restoreCache([CACHE_DIR], CACHE_KEY_PREFIX, [
      CACHE_KEY_PREFIX,
    ]);
    if (!restoredKey) {
      return new Map();
    }
    const fileContents = await readFile(CACHE_FILE_PATH, 'utf8');
    return new Map(Object.entries(JSON.parse(fileContents) as Record<string, unknown>));
  } catch {
    // No cache backend available (e.g. running outside a real Action), or a corrupt cache
    // entry. Either way, starting empty is safe; it just costs the network calls this run.
    return new Map();
  }
}

/**
 * A license lookup cache backed by the GitHub Actions cache service, persisted across
 * workflow runs. Its own Map already serves as the in-run memory cache, so this is the only
 * Cache implementation needed when persistence is enabled; createMemoryCache is used instead
 * when it is not.
 */
export async function createActionsCache(): Promise<PersistentCache> {
  const store = await restoreStore();

  return {
    async get<T>(key: string): Promise<T | undefined> {
      return store.get(key) as T | undefined;
    },
    async set<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async save(): Promise<void> {
      if (store.size === 0) {
        return;
      }
      try {
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(CACHE_FILE_PATH, JSON.stringify(Object.fromEntries(store)), 'utf8');
        const uniqueSaveKey = `${CACHE_KEY_PREFIX}-${process.env.GITHUB_RUN_ID ?? Date.now()}`;
        await actionsCache.saveCache([CACHE_DIR], uniqueSaveKey);
      } catch {
        // Saving is a best-effort optimization for next run; never fail the audit over it.
      }
    },
  };
}
