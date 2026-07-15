import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedPackage } from '../../resolution/lockfile-tree-builder.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

const LOCKFILE_ENTRY_PATTERN = /^([^:=]+):([^:=]+):([^=]+)=/;
const DIRECT_DEPENDENCY_PATTERN =
  /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor)[\s(]+['"]([^'":]+:[^'":]+)/g;

const BUILD_GRADLE_FILENAMES = ['build.gradle', 'build.gradle.kts'];

export function detectGradleManifests(repoFiles: readonly string[]): PackageManifest[] {
  const repoFileSet = new Set(repoFiles);

  return repoFiles
    .filter((filePath) => BUILD_GRADLE_FILENAMES.includes(path.basename(filePath)))
    .map((manifestFilePath) => {
      const lockfilePath = path.join(path.dirname(manifestFilePath), 'gradle.lockfile');
      return {
        id: manifestId('gradle', manifestFilePath),
        ecosystem: 'gradle' as const,
        language: 'Java/Kotlin',
        manifestFilePath,
        lockfileFilePath: repoFileSet.has(lockfilePath) ? lockfilePath : null,
        rootPackageName: null,
        rootPackageVersion: null,
      };
    });
}

function isSkippableLockfileLine(line: string): boolean {
  return line.startsWith('#') || line.trim() === '' || line.startsWith('empty=');
}

function parseLockfileLine(line: string): ResolvedPackage | null {
  const match = LOCKFILE_ENTRY_PATTERN.exec(line);
  const group = match?.[1];
  const artifact = match?.[2];
  const version = match?.[3];
  if (!group || !artifact || !version) {
    return null;
  }
  return { name: `${group}:${artifact}`, version, isDirect: false, dependsOn: [] };
}

/**
 * gradle.lockfile only supports the modern single-file dependency-locking format (one
 * `group:artifact:version=configurations` line per entry); older per-configuration lockfile
 * layouts are not supported in v1.
 */
function parseGradleLockfile(fileContents: string): ResolvedPackage[] {
  const packages: ResolvedPackage[] = [];

  for (const line of fileContents.split('\n')) {
    const parsedPackage = isSkippableLockfileLine(line) ? null : parseLockfileLine(line);
    if (parsedPackage) {
      packages.push(parsedPackage);
    }
  }

  return packages;
}

/**
 * gradle.lockfile records no direct/transitive distinction and no dependency edges at all, so
 * direct dependency coordinates are best-effort extracted from build.gradle(.kts) via a regex
 * over common configuration functions, just to flag which resolved entries are direct; the
 * resolved version for every entry, direct or not, comes from the lockfile itself.
 */
function extractDirectCoordinates(buildScriptContents: string): Set<string> {
  const coordinates = new Set<string>();
  for (const match of buildScriptContents.matchAll(DIRECT_DEPENDENCY_PATTERN)) {
    const coordinate = match[1];
    if (coordinate) {
      coordinates.add(coordinate);
    }
  }
  return coordinates;
}

export async function readResolvedPackages(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<ResolvedPackage[]> {
  if (!manifest.lockfileFilePath) {
    return [];
  }

  const buildScriptContents = await readFile(
    path.join(repoRoot, manifest.manifestFilePath),
    'utf8',
  );
  const lockfileContents = await readFile(path.join(repoRoot, manifest.lockfileFilePath), 'utf8');

  const directCoordinates = extractDirectCoordinates(buildScriptContents);
  return parseGradleLockfile(lockfileContents).map((pkg) => ({
    ...pkg,
    isDirect: directCoordinates.has(pkg.name),
  }));
}
