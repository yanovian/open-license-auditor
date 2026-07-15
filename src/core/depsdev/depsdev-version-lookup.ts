import { normalizeLicenseString } from '../classification/spdx-normalize.js';
import { withCache } from '../cache/cached-lookup.js';
import type { Cache } from '../cache/cache.js';
import { getSeedLicense } from '../cache/seed-cache.js';
import type { DependencyNode, LicenseInfo } from '../types/dependency-node.js';
import type { DepsDevClient } from './depsdev-client.js';
import type { DepsDevSystem } from './system-name-map.js';

/**
 * Shared license lookup used by every deps.dev-backed ecosystem plugin (all except Composer,
 * which reads its license straight out of composer.lock). A well-known package's license is
 * checked first against the bundled seed table (no cache or network needed at all); otherwise
 * results are cached per package version, since the same dependency commonly appears under
 * many different manifests.
 */
export async function lookupLicenseViaDepsDev(
  client: DepsDevClient,
  cache: Cache,
  system: DepsDevSystem,
  node: DependencyNode,
): Promise<LicenseInfo> {
  const seedLicense = getSeedLicense(system, node.name);
  if (seedLicense) {
    return {
      raw: seedLicense,
      canonicalId: normalizeLicenseString(seedLicense),
      source: 'depsdev',
    };
  }

  const cacheKey = `depsdev-license:${system}:${node.name}@${node.version}`;

  return withCache(cache, cacheKey, async () => {
    const response = await client.getVersion(system, node.name, node.version);
    const rawLicense = response.licenses?.[0] ?? null;

    return {
      raw: rawLicense,
      canonicalId: normalizeLicenseString(rawLicense),
      source: rawLicense ? 'depsdev' : 'unknown',
    } satisfies LicenseInfo;
  });
}
