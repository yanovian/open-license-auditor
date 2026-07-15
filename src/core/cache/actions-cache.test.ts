import * as actionsCache from '@actions/cache';
import * as fsPromises from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createActionsCache } from './actions-cache.js';

vi.mock('@actions/cache', () => ({
  restoreCache: vi.fn(),
  saveCache: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

describe('createActionsCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts empty when there is no cache entry to restore', async () => {
    vi.mocked(actionsCache.restoreCache).mockResolvedValue(undefined);

    const cache = await createActionsCache();

    expect(await cache.get('some-key')).toBeUndefined();
  });

  it('restores previously cached entries', async () => {
    vi.mocked(actionsCache.restoreCache).mockResolvedValue('open-license-auditor-license-cache-v1');
    vi.mocked(fsPromises.readFile).mockResolvedValue(
      JSON.stringify({ 'npm:react@18.2.0': { raw: 'MIT' } }),
    );

    const cache = await createActionsCache();

    expect(await cache.get('npm:react@18.2.0')).toEqual({ raw: 'MIT' });
  });

  it('starts empty when the cache backend is unavailable, such as a local run', async () => {
    vi.mocked(actionsCache.restoreCache).mockRejectedValue(new Error('no backend'));

    const cache = await createActionsCache();

    expect(await cache.get('anything')).toBeUndefined();
  });

  it('does not attempt to save when nothing new was cached', async () => {
    vi.mocked(actionsCache.restoreCache).mockResolvedValue(undefined);
    const cache = await createActionsCache();

    await cache.save();

    expect(fsPromises.writeFile).not.toHaveBeenCalled();
    expect(actionsCache.saveCache).not.toHaveBeenCalled();
  });

  it('persists new entries on save', async () => {
    vi.mocked(actionsCache.restoreCache).mockResolvedValue(undefined);
    vi.mocked(actionsCache.saveCache).mockResolvedValue(1);
    const cache = await createActionsCache();
    await cache.set('npm:react@18.2.0', { raw: 'MIT' });

    await cache.save();

    expect(fsPromises.mkdir).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalled();
    expect(actionsCache.saveCache).toHaveBeenCalled();
  });

  it('does not throw if saving to the cache service fails', async () => {
    vi.mocked(actionsCache.restoreCache).mockResolvedValue(undefined);
    vi.mocked(actionsCache.saveCache).mockRejectedValue(new Error('cache service unavailable'));
    const cache = await createActionsCache();
    await cache.set('key', 'value');

    await expect(cache.save()).resolves.toBeUndefined();
  });
});
