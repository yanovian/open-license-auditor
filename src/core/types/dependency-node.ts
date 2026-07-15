import type { EcosystemId } from './ecosystem-plugin.js';

export type Classification = 'ok' | 'warning' | 'critical';

export type LicenseSource = 'depsdev' | 'lockfile-metadata' | 'unknown';

export interface LicenseInfo {
  readonly raw: string | null;
  readonly canonicalId: string | null;
  readonly source: LicenseSource;
}

export interface DependencyNode {
  readonly key: string;
  readonly name: string;
  readonly version: string;
  readonly ecosystem: EcosystemId;
  readonly depth: number;
  readonly isDirect: boolean;
  readonly license: LicenseInfo;
  readonly classification: Classification | null;
  readonly children: readonly DependencyNode[];
  readonly sourceManifest: string;
}

export function dependencyKey(ecosystem: EcosystemId, name: string, version: string): string {
  return `${ecosystem}:${name}@${version}`;
}
