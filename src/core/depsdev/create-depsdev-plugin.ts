import type { DependencyNode, LicenseInfo } from '../types/dependency-node.js';
import type { EcosystemId, EcosystemPlugin, ResolutionContext } from '../types/ecosystem-plugin.js';
import type { PackageManifest } from '../types/manifest.js';
import { createDepsDevClient, type DepsDevClient } from './depsdev-client.js';
import { buildDependencyTreeFromDepsDev } from './depsdev-graph-adapter.js';
import { lookupLicenseViaDepsDev } from './depsdev-version-lookup.js';
import type { DepsDevSystem } from './system-name-map.js';

export interface DirectDependency {
  readonly name: string;
  readonly version: string;
}

export interface DepsDevPluginDefinition {
  readonly id: EcosystemId;
  readonly language: string;
  readonly system: DepsDevSystem;
  detectManifests(repoFiles: readonly string[]): PackageManifest[];
  readDirectDependencies(manifest: PackageManifest, repoRoot: string): Promise<DirectDependency[]>;
}

/**
 * Shared implementation for every ecosystem whose full transitive graph can be resolved via
 * deps.dev's GetDependencies endpoint (npm, Cargo, Maven, PyPI). Each such plugin only supplies
 * manifest detection and direct-dependency parsing; graph resolution and license lookup are
 * identical across all four and live here once, so adding one of these ecosystems is just a
 * parser plus a few lines wiring it into this factory.
 */
export function createDepsDevBackedPlugin(
  definition: DepsDevPluginDefinition,
  client: DepsDevClient = createDepsDevClient(),
): EcosystemPlugin {
  return {
    id: definition.id,
    language: definition.language,

    detectManifests(repoFiles: readonly string[]): PackageManifest[] {
      return definition.detectManifests(repoFiles);
    },

    async resolveDependencyGraph(
      manifest: PackageManifest,
      ctx: ResolutionContext,
    ): Promise<DependencyNode[]> {
      const directDependencies = await definition.readDirectDependencies(manifest, ctx.repoRoot);

      return Promise.all(
        directDependencies.map((dependency) =>
          buildDependencyTreeFromDepsDev({
            client,
            cache: ctx.cache,
            system: definition.system,
            ecosystem: definition.id,
            rootName: dependency.name,
            rootVersion: dependency.version,
            sourceManifest: manifest.id,
          }),
        ),
      );
    },

    async lookupLicense(node: DependencyNode, ctx: ResolutionContext): Promise<LicenseInfo> {
      return lookupLicenseViaDepsDev(client, ctx.cache, definition.system, node);
    },
  };
}
