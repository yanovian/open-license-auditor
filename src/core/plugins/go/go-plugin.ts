import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import { createLockfileBackedPlugin } from '../../resolution/create-lockfile-plugin.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectGoManifests, readResolvedPackages } from './go-mod-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createGoPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createLockfileBackedPlugin(
    {
      id: 'go',
      language: 'Go',
      system: 'GO',
      detectManifests: detectGoManifests,
      readResolvedPackages,
    },
    client,
  );
}
