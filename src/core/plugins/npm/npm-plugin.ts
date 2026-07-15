import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import { createDepsDevBackedPlugin } from '../../depsdev/create-depsdev-plugin.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectNpmManifests, readDirectDependencies } from './npm-manifest-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createNpmPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createDepsDevBackedPlugin(
    {
      id: 'npm',
      language: 'JavaScript/TypeScript',
      system: 'NPM',
      detectManifests: detectNpmManifests,
      readDirectDependencies,
    },
    client,
  );
}
