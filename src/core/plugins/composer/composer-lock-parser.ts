import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedPackage } from '../../resolution/lockfile-tree-builder.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

const NON_PACKAGE_REQUIRE_PREFIXES = ['php', 'ext-', 'lib-'];

interface ComposerJsonShape {
  readonly require?: Record<string, string>;
}

interface ComposerLockPackage {
  readonly name: string;
  readonly version: string;
  readonly license?: readonly string[];
  readonly require?: Record<string, string>;
}

interface ComposerLockShape {
  readonly packages?: readonly ComposerLockPackage[];
}

export function detectComposerManifests(repoFiles: readonly string[]): PackageManifest[] {
  const repoFileSet = new Set(repoFiles);

  return repoFiles
    .filter((filePath) => path.basename(filePath) === 'composer.json')
    .map((manifestFilePath) => {
      const lockfilePath = path.join(path.dirname(manifestFilePath), 'composer.lock');
      return {
        id: manifestId('composer', manifestFilePath),
        ecosystem: 'composer' as const,
        language: 'PHP',
        manifestFilePath,
        lockfileFilePath: repoFileSet.has(lockfilePath) ? lockfilePath : null,
        rootPackageName: null,
        rootPackageVersion: null,
      };
    });
}

function isRealPackageName(name: string): boolean {
  return !NON_PACKAGE_REQUIRE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export interface ComposerLockData {
  readonly packages: readonly ResolvedPackage[];
  readonly licenseByPackageKey: ReadonlyMap<string, string | null>;
}

/**
 * composer.lock lists every resolved package with its own `require` edges (a real graph, like
 * Gemfile.lock) and, unlike every other ecosystem here, already embeds each package's license
 * directly (Packagist requires composer.json to declare one), so no external call is needed
 * at all for Composer.
 */
export async function readComposerLockData(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<ComposerLockData> {
  if (!manifest.lockfileFilePath) {
    return { packages: [], licenseByPackageKey: new Map() };
  }

  const composerJson = JSON.parse(
    await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8'),
  ) as ComposerJsonShape;
  const composerLock = JSON.parse(
    await readFile(path.join(repoRoot, manifest.lockfileFilePath), 'utf8'),
  ) as ComposerLockShape;

  const directNames = new Set(Object.keys(composerJson.require ?? {}).filter(isRealPackageName));
  const lockedPackages = composerLock.packages ?? [];

  const packages: ResolvedPackage[] = lockedPackages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    isDirect: directNames.has(pkg.name),
    dependsOn: Object.keys(pkg.require ?? {}).filter(isRealPackageName),
  }));

  const licenseByPackageKey = new Map(
    lockedPackages.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg.license?.[0] ?? null]),
  );

  return { packages, licenseByPackageKey };
}
