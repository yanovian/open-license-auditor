import type {
  DepsDevClient,
  DepsDevDependenciesResponse,
  DepsDevVersionResponse,
} from '../../../src/core/depsdev/depsdev-client.js';
import type { DepsDevSystem } from '../../../src/core/depsdev/system-name-map.js';

type ResponseKey = `${DepsDevSystem}:${string}@${string}`;

function keyFor(system: DepsDevSystem, name: string, version: string): ResponseKey {
  return `${system}:${name}@${version}`;
}

/** An in-memory DepsDevClient double, keyed by exact system/name/version, for tests. */
export function createFakeDepsDevClient(fixtures: {
  readonly dependencies?: Record<string, DepsDevDependenciesResponse>;
  readonly versions?: Record<string, DepsDevVersionResponse>;
}): DepsDevClient {
  return {
    async getDependencies(system, name, version) {
      return fixtures.dependencies?.[keyFor(system, name, version)] ?? {};
    },
    async getVersion(system, name, version) {
      return fixtures.versions?.[keyFor(system, name, version)] ?? {};
    },
  };
}
