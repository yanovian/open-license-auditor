import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedPackage } from '../../resolution/lockfile-tree-builder.js';
import { manifestId, type PackageManifest } from '../../types/manifest.js';

const GEM_NAME_PATTERN = '[A-Za-z0-9_.-]+';
const SPEC_LINE = new RegExp(`^ {4}(${GEM_NAME_PATTERN}) \\(([^)]+)\\)$`);
const SPEC_DEPENDENCY_LINE = new RegExp(`^ {6}(${GEM_NAME_PATTERN})(?:\\s+\\(.*\\))?$`);
const TOP_LEVEL_DEPENDENCY_LINE = new RegExp(`^ {2}(${GEM_NAME_PATTERN})!?(?:\\s+\\(.*\\))?$`);

export function detectRubygemsManifests(repoFiles: readonly string[]): PackageManifest[] {
  const repoFileSet = new Set(repoFiles);

  return repoFiles
    .filter((filePath) => path.basename(filePath) === 'Gemfile')
    .map((manifestFilePath) => {
      const lockfilePath = path.join(path.dirname(manifestFilePath), 'Gemfile.lock');
      return {
        id: manifestId('rubygems', manifestFilePath),
        ecosystem: 'rubygems' as const,
        language: 'Ruby',
        manifestFilePath,
        lockfileFilePath: repoFileSet.has(lockfilePath) ? lockfilePath : null,
        rootPackageName: null,
        rootPackageVersion: null,
      };
    });
}

type ParserSection = 'none' | 'specs' | 'dependencies';

interface ParserState {
  section: ParserSection;
  currentSpecName: string | null;
}

function handleSpecsLine(
  line: string,
  specs: Map<string, { version: string; dependsOn: string[] }>,
  state: ParserState,
): void {
  const specMatch = SPEC_LINE.exec(line);
  if (specMatch) {
    const [, name, version] = specMatch;
    if (name && version) {
      specs.set(name, { version, dependsOn: [] });
      state.currentSpecName = name;
    }
    return;
  }

  const dependencyMatch = SPEC_DEPENDENCY_LINE.exec(line);
  const dependencyName = dependencyMatch?.[1];
  if (dependencyName && state.currentSpecName) {
    specs.get(state.currentSpecName)?.dependsOn.push(dependencyName);
  }
}

/**
 * Gemfile.lock's `specs:` block lists every resolved gem with its own dependencies indented
 * beneath it, a genuine dependency graph, and its `DEPENDENCIES` block lists what the
 * Gemfile itself declares directly.
 */
export function parseGemfileLock(fileContents: string): ResolvedPackage[] {
  const specs = new Map<string, { version: string; dependsOn: string[] }>();
  const directNames = new Set<string>();
  const state: ParserState = { section: 'none', currentSpecName: null };

  for (const line of fileContents.split('\n')) {
    if (line.trim() === 'specs:') {
      state.section = 'specs';
      state.currentSpecName = null;
      continue;
    }
    if (line === 'DEPENDENCIES') {
      state.section = 'dependencies';
      state.currentSpecName = null;
      continue;
    }
    if (line.length > 0 && !line.startsWith(' ')) {
      state.section = 'none';
      continue;
    }

    if (state.section === 'specs') {
      handleSpecsLine(line, specs, state);
    } else if (state.section === 'dependencies') {
      const match = TOP_LEVEL_DEPENDENCY_LINE.exec(line);
      if (match?.[1]) {
        directNames.add(match[1]);
      }
    }
  }

  return [...specs.entries()].map(([name, { version, dependsOn }]) => ({
    name,
    version,
    isDirect: directNames.has(name),
    dependsOn,
  }));
}

export async function readResolvedPackages(
  manifest: PackageManifest,
  repoRoot: string,
): Promise<ResolvedPackage[]> {
  if (!manifest.lockfileFilePath) {
    return [];
  }
  const fileContents = await readFile(path.join(repoRoot, manifest.lockfileFilePath), 'utf8');
  return parseGemfileLock(fileContents);
}
