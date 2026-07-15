import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import { createLockfileBackedPlugin } from '../../resolution/create-lockfile-plugin.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectNugetManifests, readResolvedPackages } from './packages-lock-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createNugetPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createLockfileBackedPlugin(
    {
      id: 'nuget',
      language: 'C#/.NET',
      system: 'NUGET',
      detectManifests: detectNugetManifests,
      readResolvedPackages,
    },
    client,
  );
}
