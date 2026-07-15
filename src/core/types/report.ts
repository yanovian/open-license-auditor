import type { DependencyNode } from './dependency-node.js';
import type { EcosystemId } from './ecosystem-plugin.js';
import type { PackageManifest } from './manifest.js';

export interface ManifestReport {
  readonly manifest: PackageManifest;
  readonly dependencies: readonly DependencyNode[];
}

/** A supported ecosystem's manifest that was found but not checked because it is disabled in
 * the user's config, so the reader knows a gap is intentional rather than a bug. */
export interface SkippedByConfigNote {
  readonly ecosystem: EcosystemId;
  readonly language: string;
  readonly manifestFilePath: string;
}

/** A package manager this tool has no plugin for at all, detected by a well-known marker
 * file, so the reader knows it was never possible to check rather than silently ignored. */
export interface UnsupportedEcosystemNote {
  readonly language: string;
  readonly packageManager: string;
  readonly manifestFilePath: string;
}

export interface AuditReport {
  readonly generatedAt: string;
  readonly manifests: readonly ManifestReport[];
  readonly skippedByConfig: readonly SkippedByConfigNote[];
  readonly unsupported: readonly UnsupportedEcosystemNote[];
}
