import { describe, expect, it } from 'vitest';
import { createMemoryCache } from '../cache/memory-cache.js';
import type { DependencyNode } from '../types/dependency-node.js';
import { dependencyKey } from '../types/dependency-node.js';
import { lookupLicenseViaDepsDev } from './depsdev-version-lookup.js';
import { createFakeDepsDevClient } from '../../../tests/fixtures/depsdev/fake-depsdev-client.js';

function depNode(name: string, version: string): DependencyNode {
  return {
    key: dependencyKey('npm', name, version),
    name,
    version,
    ecosystem: 'npm',
    depth: 0,
    isDirect: true,
    license: { raw: null, canonicalId: null, source: 'unknown' },
    classification: null,
    children: [],
    sourceManifest: 'package.json',
  };
}

describe('lookupLicenseViaDepsDev', () => {
  it('caches only the raw license string, not the derived canonicalId', async () => {
    const client = createFakeDepsDevClient({
      versions: { 'NPM:some-lib@1.0.0': { licenses: ['BlueOak-1.0.0'] } },
    });
    const cache = createMemoryCache();

    // Simulate a cache entry written before "BlueOak-1.0.0" was a recognized alias: only the
    // raw string was ever persisted, so today's normalization logic still runs on every call.
    await cache.set('depsdev-license-raw:NPM:some-lib@1.0.0', 'BlueOak-1.0.0');

    const result = await lookupLicenseViaDepsDev(
      client,
      cache,
      'NPM',
      depNode('some-lib', '1.0.0'),
    );

    expect(result.raw).toBe('BlueOak-1.0.0');
    expect(result.canonicalId).toBe('BlueOak-1.0.0');
  });

  it('does not call the client again once the raw license is cached', async () => {
    let callCount = 0;
    const client = createFakeDepsDevClient({});
    const cache = createMemoryCache();
    const originalGetVersion = client.getVersion.bind(client);
    client.getVersion = async (...args) => {
      callCount += 1;
      return originalGetVersion(...args);
    };

    const node = depNode('untracked-lib', '2.0.0');
    await lookupLicenseViaDepsDev(client, cache, 'NPM', node);
    await lookupLicenseViaDepsDev(client, cache, 'NPM', node);

    expect(callCount).toBe(1);
  });
});
