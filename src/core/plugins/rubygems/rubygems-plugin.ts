import type { DepsDevClient } from '../../depsdev/depsdev-client.js';
import { createLockfileBackedPlugin } from '../../resolution/create-lockfile-plugin.js';
import type { EcosystemPlugin } from '../../types/ecosystem-plugin.js';
import { detectRubygemsManifests, readResolvedPackages } from './gemfile-lock-parser.js';

/** `client` is injectable so tests never make a real network call. */
export function createRubygemsPlugin(client?: DepsDevClient): EcosystemPlugin {
  return createLockfileBackedPlugin(
    {
      id: 'rubygems',
      language: 'Ruby',
      system: 'RUBYGEMS',
      detectManifests: detectRubygemsManifests,
      readResolvedPackages,
    },
    client,
  );
}
