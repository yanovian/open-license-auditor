import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedPackage } from '../../resolution/lockfile-tree-builder.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

const PACKAGES_LOCK_FILENAME = 'packages.lock.json';

interface LockedPackageEntry {
  readonly type: 'Direct' | 'Transitive';
  readonly resolved?: string;
  readonly dependencies?: Record<string, string>;
}

interface PackagesLockShape {
  readonly dependencies?: Record<string, Record<string, LockedPackageEntry>>;
}

export function detectNugetManifests(repoFiles: readonly string[]): PackageManifest[] {
  return repoFiles
    .filter((filePath) => path.basename(filePath) === PACKAGES_LOCK_FILENAME)
    .map((lockfileFilePath) => ({
      id: manifestId('nuget', lockfileFilePath),
      ecosystem: 'nuget' as const,
      language: 'C#/.NET',
      manifestFilePath: lockfileFilePath,
      lockfileFilePath,
      rootPackageName: null,
      rootPackageVersion: null,
    }));
}

/**
 * packages.lock.json flags each package Direct or Transitive but, in most NuGet versions,
 * does not record which package depends on which; when a `dependencies` sub-object is present
 * it is used, otherwise every package is reported as a flat direct or transitive sibling. A
 * package appearing under more than one target framework is merged into one entry, preferring
 * Direct if any framework reports it that way.
 */
export function parsePackagesLock(fileContents: string): ResolvedPackage[] {
  const lockfile = JSON.parse(fileContents) as PackagesLockShape;
  const packagesByName = new Map<string, ResolvedPackage>();

  for (const frameworkPackages of Object.values(lockfile.dependencies ?? {})) {
    for (const [name, entry] of Object.entries(frameworkPackages)) {
      if (!entry.resolved) {
        continue;
      }
      const existing = packagesByName.get(name);
      packagesByName.set(name, {
        name,
        version: entry.resolved,
        isDirect: existing?.isDirect || entry.type === 'Direct',
        dependsOn: Object.keys(entry.dependencies ?? {}),
      });
    }
  }

  return [...packagesByName.values()];
}

export async function readResolvedPackages(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<ResolvedPackage[]> {
  const fileContents = await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8');
  return parsePackagesLock(fileContents);
}
