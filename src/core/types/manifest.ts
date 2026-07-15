import type { EcosystemId } from './ecosystem-plugin.js';

export interface PackageManifest {
  readonly id: string;
  readonly ecosystem: EcosystemId;
  readonly language: string;
  readonly manifestFilePath: string;
  readonly lockfileFilePath: string | null;
  readonly rootPackageName: string | null;
  readonly rootPackageVersion: string | null;
}

export function manifestId(ecosystem: EcosystemId, manifestFilePath: string): string {
  return `${ecosystem}:${manifestFilePath}`;
}
