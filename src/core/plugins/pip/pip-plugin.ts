import { createDepsDevBackedPlugin } from '../../depsdev/create-depsdev-plugin.js';
import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectPipManifests, readDirectDependencies } from './pip-manifest-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createPipPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createDepsDevBackedPlugin(
    {
      id: 'pip',
      language: 'Python',
      system: 'PYPI',
      detectManifests: detectPipManifests,
      readDirectDependencies,
    },
    client,
  );
}
