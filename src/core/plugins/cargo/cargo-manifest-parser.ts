import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { DirectDependency } from '../../depsdev/create-depsdev-plugin.js';
import { MANIFEST_FILENAMES } from '../../discovery/manifest-patterns.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

interface CargoTomlShape {
  readonly dependencies?: Record<string, unknown>;
  readonly ['dev-dependencies']?: Record<string, unknown>;
}

interface CargoLockPackage {
  readonly name: string;
  readonly version: string;
}

interface CargoLockShape {
  readonly package?: readonly CargoLockPackage[];
}

export function detectCargoManifests(repoFiles: readonly string[]): PackageManifest[] {
  const { manifest: manifestFilename, lockfiles } = MANIFEST_FILENAMES.cargo;
  const repoFileSet = new Set(repoFiles);

  return repoFiles
    .filter((filePath) => path.basename(filePath) === manifestFilename)
    .map((manifestFilePath) => buildManifest(manifestFilePath, lockfiles, repoFileSet));
}

function buildManifest(
  manifestFilePath: string,
  lockfileNames: readonly string[],
  repoFileSet: ReadonlySet<string>,
): PackageManifest {
  const manifestDir = path.dirname(manifestFilePath);
  const lockfileFilePath =
    lockfileNames
      .map((lockfileName) => path.join(manifestDir, lockfileName))
      .find((candidate) => repoFileSet.has(candidate)) ?? null;

  return {
    id: manifestId('cargo', manifestFilePath),
    ecosystem: 'cargo',
    language: 'Rust',
    manifestFilePath,
    lockfileFilePath,
    rootPackageName: null,
    rootPackageVersion: null,
  };
}

/** Path and git dependencies have no deps.dev-resolvable version, so they are skipped. */
function isUnresolvableDependency(value: unknown): boolean {
  return typeof value === 'object' && value !== null && ('path' in value || 'git' in value);
}

/**
 * Direct dependency names come from Cargo.toml; their exact resolved versions come from
 * Cargo.lock. If a crate name appears more than once in the lockfile (a rare semver-breaking
 * duplicate), the first match is used, a known v1 limitation.
 */
export async function readDirectDependencies(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<DirectDependency[]> {
  if (!manifest.lockfileFilePath) {
    return [];
  }

  const cargoToml = parseToml(
    await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8'),
  ) as CargoTomlShape;
  const cargoLock = parseToml(
    await readFile(path.join(repoRoot, manifest.lockfileFilePath), 'utf8'),
  ) as CargoLockShape;

  const declaredNames = Object.entries({
    ...cargoToml.dependencies,
    ...cargoToml['dev-dependencies'],
  })
    .filter(([, value]) => !isUnresolvableDependency(value))
    .map(([name]) => name);

  const lockedPackages = cargoLock.package ?? [];

  return declaredNames
    .map((name): DirectDependency | null => {
      const lockedPackage = lockedPackages.find((pkg) => pkg.name === name);
      return lockedPackage ? { name, version: lockedPackage.version } : null;
    })
    .filter((dependency): dependency is DirectDependency => dependency !== null);
}
