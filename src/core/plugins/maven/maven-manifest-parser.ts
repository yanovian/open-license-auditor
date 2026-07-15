import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { DirectDependency } from '../../depsdev/create-depsdev-plugin.js';
import { MANIFEST_FILENAMES } from '../../discovery/manifest-patterns.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

interface PomDependency {
  readonly groupId?: string;
  readonly artifactId?: string;
  readonly version?: string;
}

interface PomShape {
  readonly project?: {
    readonly dependencies?: {
      readonly dependency?: readonly PomDependency[];
    };
  };
}

const xmlParser = new XMLParser({ isArray: (tagName) => tagName === 'dependency' });

export function detectMavenManifests(repoFiles: readonly string[]): PackageManifest[] {
  const { manifest: manifestFilename } = MANIFEST_FILENAMES.maven;

  return repoFiles
    .filter((filePath) => path.basename(filePath) === manifestFilename)
    .map((manifestFilePath) => ({
      id: manifestId('maven', manifestFilePath),
      ecosystem: 'maven' as const,
      language: 'Java',
      manifestFilePath,
      lockfileFilePath: null,
      rootPackageName: null,
      rootPackageVersion: null,
    }));
}

function hasLiteralVersion(version: string | undefined): version is string {
  return typeof version === 'string' && version.length > 0 && !version.includes('${');
}

/**
 * Only dependencies with a literal <version> in the pom.xml itself are resolved. Versions
 * inherited from a parent pom or a <properties> placeholder are a known v1 limitation, since
 * resolving those fully would require actually invoking Maven.
 */
export async function readDirectDependencies(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<DirectDependency[]> {
  const xmlContents = await readFile(path.join(repoRoot, manifest.manifestFilePath), 'utf8');
  const pom = xmlParser.parse(xmlContents) as PomShape;
  const dependencies = pom.project?.dependencies?.dependency ?? [];

  return dependencies
    .filter(
      (dependency): dependency is Required<PomDependency> =>
        Boolean(dependency.groupId) &&
        Boolean(dependency.artifactId) &&
        hasLiteralVersion(dependency.version),
    )
    .map((dependency) => ({
      name: `${dependency.groupId}:${dependency.artifactId}`,
      version: dependency.version,
    }));
}
