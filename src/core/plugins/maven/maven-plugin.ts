import { createDepsDevBackedPlugin } from '../../depsdev/create-depsdev-plugin.js';
import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectMavenManifests, readDirectDependencies } from './maven-manifest-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createMavenPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createDepsDevBackedPlugin(
    {
      id: 'maven',
      language: 'Java',
      system: 'MAVEN',
      detectManifests: detectMavenManifests,
      readDirectDependencies,
    },
    client,
  );
}
