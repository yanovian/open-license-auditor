import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedPackage } from '../../resolution/lockfile-tree-builder.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

const REQUIRE_BLOCK_START = /^require\s*\($/;
const REQUIRE_BLOCK_END = /^\)$/;
const REQUIRE_LINE = /^(?:require\s+)?(\S+)\s+(v\S+)(\s+\/\/\s*indirect)?$/;

export function detectGoManifests(repoFiles: readonly string[]): PackageManifest[] {
  const repoFileSet = new Set(repoFiles);

  return repoFiles
    .filter((filePath) => path.basename(filePath) === 'go.mod')
    .map((manifestFilePath) => {
      const lockfilePath = path.join(path.dirname(manifestFilePath), 'go.sum');
      return {
        id: manifestId('go', manifestFilePath),
        ecosystem: 'go' as const,
        language: 'Go',
        manifestFilePath,
        lockfileFilePath: repoFileSet.has(lockfilePath) ? lockfilePath : null,
        rootPackageName: null,
        rootPackageVersion: null,
      };
    });
}

function parseRequireLine(line: string): ResolvedPackage | null {
  const match = REQUIRE_LINE.exec(line);
  const name = match?.[1];
  const version = match?.[2];
  if (!name || !version) {
    return null;
  }
  return { name, version, isDirect: !match?.[3], dependsOn: [] };
}

/**
 * go.mod's require block already carries fully resolved versions (written by `go mod tidy`)
 * and flags indirect modules with a `// indirect` comment. It does not record which module
 * pulls in which, so every module is reported as a flat direct or indirect entry rather than
 * nested under a specific parent, a known v1 limitation shared with a couple of other
 * ecosystems whose lockfiles don't record edges either.
 */
export function parseGoMod(fileContents: string): ResolvedPackage[] {
  const packages: ResolvedPackage[] = [];
  let insideRequireBlock = false;

  for (const rawLine of fileContents.split('\n')) {
    const line = rawLine.trim();

    if (REQUIRE_BLOCK_START.test(line)) {
      insideRequireBlock = true;
      continue;
    }
    if (insideRequireBlock && REQUIRE_BLOCK_END.test(line)) {
      insideRequireBlock = false;
      continue;
    }

    const isRequireCandidate = insideRequireBlock || line.startsWith('require ');
    const parsedPackage = isRequireCandidate ? parseRequireLine(line) : null;
    if (parsedPackage) {
      packages.push(parsedPackage);
    }
  }

  return packages;
}

export async function readResolvedPackages(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<ResolvedPackage[]> {
  const fileContents = await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8');
  return parseGoMod(fileContents);
}
