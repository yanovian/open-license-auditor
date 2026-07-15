import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import { createLockfileBackedPlugin } from '../../resolution/create-lockfile-plugin.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectGradleManifests, readResolvedPackages } from './gradle-lockfile-parser.js';

/**
 * `client` is injectable so tests never make a real network call. Gradle has no deps.dev
 * system of its own, but its dependencies are Maven coordinates, so license lookups reuse the
 * MAVEN system.
 */
export function createGradlePlugin(client?: DepsDevClient): EcosystemPlugin {
  return createLockfileBackedPlugin(
    {
      id: 'gradle',
      language: 'Java/Kotlin',
      system: 'MAVEN',
      detectManifests: detectGradleManifests,
      readResolvedPackages,
    },
    client,
  );
}
