import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMemoryCache } from '../../cache/memory-cache.js';
import { createComposerPlugin } from './composer-plugin.js';
import { detectComposerManifests } from './composer-lock-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/composer');

describe('createComposerPlugin', () => {
  it('builds a tree from composer.lock edges with license already embedded, no network call', async () => {
    const plugin = createComposerPlugin();
    const [manifest] = detectComposerManifests(['composer.json', 'composer.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const ctx = { repoRoot: FIXTURE_REPO_ROOT, cache: createMemoryCache() };
    const tree = await plugin.resolveDependencyGraph(manifest, ctx);

    expect(tree).toHaveLength(1);
    const monolog = tree[0];
    expect(monolog?.name).toBe('monolog/monolog');
    expect(monolog?.isDirect).toBe(true);
    expect(monolog?.license.canonicalId).toBe('MIT');

    const psrLog = monolog?.children[0];
    if (!psrLog) {
      throw new Error('expected monolog to have psr/log as a child');
    }
    expect(psrLog.name).toBe('psr/log');
    expect(psrLog.isDirect).toBe(false);
    expect(psrLog.license.canonicalId).toBe('MIT');

    // lookupLicense must return what resolveDependencyGraph already set, unchanged.
    const relookedUp = await plugin.lookupLicense(psrLog, ctx);
    expect(relookedUp).toEqual(psrLog.license);
  });

  it('excludes php and extension pseudo-packages from the direct dependency set', async () => {
    const plugin = createComposerPlugin();
    const [manifest] = detectComposerManifests(['composer.json', 'composer.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const ctx = { repoRoot: FIXTURE_REPO_ROOT, cache: createMemoryCache() };
    const tree = await plugin.resolveDependencyGraph(manifest, ctx);

    const names = tree.map((node) => node.name);
    expect(names).not.toContain('php');
    expect(names).not.toContain('ext-json');
  });
});
