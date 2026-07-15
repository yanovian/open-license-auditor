import type { Cache } from '../cache/cache.js';
import type { DependencyNode, LicenseInfo } from './dependency-node.js';
import type { PackageManifest } from './manifest.js';

export const ALL_ECOSYSTEM_IDS = [
  'npm',
  'pip',
  'cargo',
  'go',
  'maven',
  'gradle',
  'rubygems',
  'composer',
  'nuget',
] as const;

export type EcosystemId = (typeof ALL_ECOSYSTEM_IDS)[number];

export interface ResolutionContext {
  readonly repoRoot: string;
  readonly cache: Cache;
}

export interface EcosystemPlugin {
  readonly id: EcosystemId;
  readonly language: string;
  detectManifests(repoFiles: readonly string[]): PackageManifest[];
  resolveDependencyGraph(
    manifest: PackageManifest,
    ctx: ResolutionContext,
  ): Promise<DependencyNode[]>;
  lookupLicense(node: DependencyNode, ctx: ResolutionContext): Promise<LicenseInfo>;
}
