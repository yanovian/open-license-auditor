import { createDepsDevBackedPlugin } from '../../depsdev/create-depsdev-plugin.js';
import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectCargoManifests, readDirectDependencies } from './cargo-manifest-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createCargoPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createDepsDevBackedPlugin(
    {
      id: 'cargo',
      language: 'Rust',
      system: 'CARGO',
      detectManifests: detectCargoManifests,
      readDirectDependencies,
    },
    client,
  );
}
