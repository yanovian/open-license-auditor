import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DirectDependency } from '../../depsdev/create-depsdev-plugin.js';
import { MANIFEST_FILENAMES } from '../../discovery/manifest-patterns.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';
import { resolvePnpmLockVersions } from './pnpm-lock-parser.js';
import { isYarnBerryLockfile, resolveYarnBerryVersions } from './yarn-berry-lock-parser.js';
import { resolveYarnLockVersions } from './yarn-lock-parser.js';

interface PackageJsonShape {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

interface PackageLockJsonShape {
  readonly packages?: Record<string, { readonly version?: string }>;
}

export function detectNpmManifests(repoFiles: readonly string[]): PackageManifest[] {
  const { manifest: manifestFilename, lockfiles } = MANIFEST_FILENAMES.npm;
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
    id: manifestId('npm', manifestFilePath),
    ecosystem: 'npm',
    language: 'JavaScript/TypeScript',
    manifestFilePath,
    lockfileFilePath,
    rootPackageName: null,
    rootPackageVersion: null,
  };
}

async function readPackageJsonDependencies(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<Map<string, string>> {
  const packageJson = await readJsonFile<PackageJsonShape>(
    path.join(repoRoot, manifest.manifestFilePath),
  );
  return new Map(Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies }));
}

async function resolveFromPackageLockJson(
  manifest: PackageManifest,
  repoRoot: string,
  lockfileContents: string,
): Promise<DirectDependency[]> {
  const declaredNames = [...(await readPackageJsonDependencies(manifest, repoRoot)).keys()];
  const packageLock = JSON.parse(lockfileContents) as PackageLockJsonShape;

  return declaredNames
    .map((name): DirectDependency | null => {
      const resolvedVersion = packageLock.packages?.[`node_modules/${name}`]?.version;
      return resolvedVersion ? { name, version: resolvedVersion } : null;
    })
    .filter((dependency): dependency is DirectDependency => dependency !== null);
}

async function resolveFromYarnLock(
  manifest: PackageManifest,
  repoRoot: string,
  lockfileContents: string,
): Promise<DirectDependency[]> {
  const declaredDependencies = await readPackageJsonDependencies(manifest, repoRoot);
  return isYarnBerryLockfile(lockfileContents)
    ? resolveYarnBerryVersions(lockfileContents, declaredDependencies)
    : resolveYarnLockVersions(lockfileContents, declaredDependencies);
}

/**
 * Direct dependencies with their resolved (exact) versions. A resolved version is required
 * because deps.dev can only look up a dependency that has actually been published, not a
 * semver range, so each supported lockfile format (npm, pnpm, yarn classic v1, yarn berry
 * v2+) is parsed to recover it. Manifests without any recognized lockfile cannot be fully
 * resolved and are reported as having no resolvable direct dependencies.
 */
export async function readDirectDependencies(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<DirectDependency[]> {
  if (!manifest.lockfileFilePath) {
    return [];
  }

  const lockfileName = path.basename(manifest.lockfileFilePath);
  const lockfileContents = await readFile(path.join(repoRoot, manifest.lockfileFilePath), 'utf8');

  if (lockfileName === 'pnpm-lock.yaml') {
    return resolvePnpmLockVersions(lockfileContents);
  }

  if (lockfileName === 'yarn.lock') {
    return resolveFromYarnLock(manifest, repoRoot, lockfileContents);
  }

  return resolveFromPackageLockJson(manifest, repoRoot, lockfileContents);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}
