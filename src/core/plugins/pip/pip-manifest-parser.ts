import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { DirectDependency } from '../../depsdev/create-depsdev-plugin.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

const REQUIREMENTS_FILENAME = 'requirements.txt';
const PYPROJECT_FILENAME = 'pyproject.toml';
const POETRY_LOCK_FILENAME = 'poetry.lock';
const UV_LOCK_FILENAME = 'uv.lock';
const PINNED_REQUIREMENT_PATTERN = /^([A-Za-z0-9._-]+)\s*==\s*([A-Za-z0-9.\-+!]+)/;
const PEP508_NAME_PATTERN = /^([A-Za-z0-9][A-Za-z0-9._-]*)/;

interface PyprojectShape {
  readonly tool?: { readonly poetry?: { readonly dependencies?: Record<string, unknown> } };
  readonly project?: { readonly dependencies?: readonly string[] };
}

interface LockedPackage {
  readonly name: string;
  readonly version: string;
}

interface PackageLockShape {
  readonly package?: readonly LockedPackage[];
}

/** PyPI treats -, _, and . as equivalent in package names (PEP 503). */
function normalizePyPiName(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

function buildManifest(manifestFilePath: string, lockfileFilePath: string | null): PackageManifest {
  return {
    id: manifestId('pip', manifestFilePath),
    ecosystem: 'pip',
    language: 'Python',
    manifestFilePath,
    lockfileFilePath,
    rootPackageName: null,
    rootPackageVersion: null,
  };
}

/**
 * A pyproject.toml is only treated as a manifest when a sibling poetry.lock or uv.lock exists:
 * without one of those there is no reliable resolved-version source for its dependencies.
 */
export function detectPipManifests(repoFiles: readonly string[]): PackageManifest[] {
  const repoFileSet = new Set(repoFiles);
  const manifests: PackageManifest[] = [];

  for (const filePath of repoFiles) {
    const filename = path.basename(filePath);

    if (filename === REQUIREMENTS_FILENAME) {
      manifests.push(buildManifest(filePath, null));
    } else if (filename === PYPROJECT_FILENAME) {
      const lockfilePath = findSiblingLockfile(filePath, repoFileSet);
      if (lockfilePath) {
        manifests.push(buildManifest(filePath, lockfilePath));
      }
    }
  }

  return manifests;
}

function findSiblingLockfile(
  manifestFilePath: string,
  repoFileSet: ReadonlySet<string>,
): string | null {
  const manifestDir = path.dirname(manifestFilePath);
  return (
    [POETRY_LOCK_FILENAME, UV_LOCK_FILENAME]
      .map((lockfileName) => path.join(manifestDir, lockfileName))
      .find((candidate) => repoFileSet.has(candidate)) ?? null
  );
}

function parsePinnedRequirements(fileContents: string): DirectDependency[] {
  return fileContents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line): DirectDependency | null => {
      const match = PINNED_REQUIREMENT_PATTERN.exec(line);
      const name = match?.[1];
      const version = match?.[2];
      return name && version ? { name, version } : null;
    })
    .filter((dependency): dependency is DirectDependency => dependency !== null);
}

function pep508PackageName(requirementString: string): string | null {
  return PEP508_NAME_PATTERN.exec(requirementString.trim())?.[1] ?? null;
}

/** Poetry declares dependencies as a `[tool.poetry.dependencies]` table. */
function declaredPoetryNames(pyproject: PyprojectShape): string[] {
  return Object.keys(pyproject.tool?.poetry?.dependencies ?? {}).filter(
    (name) => name.toLowerCase() !== 'python',
  );
}

/** uv follows PEP 621: `[project.dependencies]` is a list of requirement strings. */
function declaredUvNames(pyproject: PyprojectShape): string[] {
  return (pyproject.project?.dependencies ?? [])
    .map(pep508PackageName)
    .filter((name): name is string => name !== null);
}

function resolveAgainstLockedPackages(
  declaredNames: readonly string[],
  lockedPackages: readonly LockedPackage[],
): DirectDependency[] {
  return declaredNames
    .map((name): DirectDependency | null => {
      const normalizedName = normalizePyPiName(name);
      const lockedPackage = lockedPackages.find(
        (pkg) => normalizePyPiName(pkg.name) === normalizedName,
      );
      return lockedPackage ? { name, version: lockedPackage.version } : null;
    })
    .filter((dependency): dependency is DirectDependency => dependency !== null);
}

async function readPyprojectDependencies(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<DirectDependency[]> {
  if (!manifest.lockfileFilePath) {
    return [];
  }

  const pyproject = parseToml(
    await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8'),
  ) as PyprojectShape;
  const lockfile = parseToml(
    await readFile(path.join(repoRoot, manifest.lockfileFilePath), 'utf8'),
  ) as PackageLockShape;

  const isUv = path.basename(manifest.lockfileFilePath) === UV_LOCK_FILENAME;
  const declaredNames = isUv ? declaredUvNames(pyproject) : declaredPoetryNames(pyproject);

  return resolveAgainstLockedPackages(declaredNames, lockfile.package ?? []);
}

/**
 * requirements.txt pins (name==version) are already an exact resolved version, no lockfile
 * needed. Unpinned requirements without a poetry.lock or uv.lock cannot be fully resolved and
 * are reported as having no resolvable direct dependencies, a known v1 limitation.
 */
export async function readDirectDependencies(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<DirectDependency[]> {
  if (path.basename(manifest.manifestFilePath) === REQUIREMENTS_FILENAME) {
    const fileContents = await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8');
    return parsePinnedRequirements(fileContents);
  }

  return readPyprojectDependencies(manifest, repoRoot);
}
