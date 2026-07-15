import { createDepsDevClient, type DepsDevClient } from '../depsdev/depsdev-client.js';
import { lookupLicenseViaDepsDev } from '../depsdev/depsdev-version-lookup.js';
import type { DepsDevSystem } from '../depsdev/system-name-map.js';
import type { DependencyNode, LicenseInfo } from '../types/dependency-node.js';
import type { EcosystemId, EcosystemPlugin, ResolutionContext } from '../types/ecosystem-plugin.js';
import type { PackageManifest } from '../types/manifest.js';
import { buildDependencyTreeFromLockfile, type ResolvedPackage } from './lockfile-tree-builder.js';

export interface LockfilePluginDefinition {
  readonly id: EcosystemId;
  readonly language: string;
  readonly system: DepsDevSystem;
  detectManifests(repoFiles: readonly string[]): PackageManifest[];
  readResolvedPackages(manifest: PackageManifest, repoRoot: string): Promise<ResolvedPackage[]>;
}

/**
 * Shared implementation for every ecosystem that has no deps.dev dependency-graph endpoint
 * (Go, Gradle, RubyGems, NuGet): the full resolved package set comes from parsing the
 * lockfile locally, and only the per-package license lookup goes through deps.dev. Composer
 * is the one exception, its license comes straight out of composer.lock with no external
 * call at all, so it does not use this factory.
 */
export function createLockfileBackedPlugin(
  definition: LockfilePluginDefinition,
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
      const packages = await definition.readResolvedPackages(manifest, ctx.repoRoot);
      return buildDependencyTreeFromLockfile(packages, definition.id, manifest.id);
    },

    async lookupLicense(node: DependencyNode, ctx: ResolutionContext): Promise<LicenseInfo> {
      return lookupLicenseViaDepsDev(client, ctx.cache, definition.system, node);
    },
  };
}
