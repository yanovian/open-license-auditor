import type { PackageManifest } from '../types/manifest.js';
import type { PluginRegistry } from '../plugins/registry.js';

/** Asks every registered ecosystem plugin to find its own manifests among the repo's files. */
export function discoverManifests(
  repoFiles: readonly string[],
  registry: PluginRegistry,
): PackageManifest[] {
  return registry.getAll().flatMap((plugin) => plugin.detectManifests(repoFiles));
}
