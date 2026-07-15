import { dependencyKey, type DependencyNode, type LicenseInfo } from '../types/dependency-node.js';
import type { EcosystemId } from '../types/ecosystem-plugin.js';

export interface ResolvedPackage {
  readonly name: string;
  readonly version: string;
  readonly isDirect: boolean;
  /** Names of other ResolvedPackage entries this one depends on. Empty when the lockfile
   * format does not record edges (go.mod, gradle.lockfile, most packages.lock.json). */
  readonly dependsOn: readonly string[];
}

interface TreeBuildContext {
  readonly packagesByName: ReadonlyMap<string, ResolvedPackage>;
  readonly ecosystem: EcosystemId;
  readonly sourceManifest: string;
}

interface TreePosition {
  readonly depth: number;
  readonly isDirect: boolean;
  readonly visitedPath: ReadonlySet<string>;
}

const UNKNOWN_LICENSE: LicenseInfo = { raw: null, canonicalId: null, source: 'unknown' };

function buildNode(
  context: TreeBuildContext,
  pkg: ResolvedPackage,
  position: TreePosition,
): DependencyNode {
  const { packagesByName, ecosystem, sourceManifest } = context;
  const nextVisitedPath = new Set(position.visitedPath).add(pkg.name);

  const children = pkg.dependsOn
    .filter((childName) => !position.visitedPath.has(childName))
    .map((childName) => packagesByName.get(childName))
    .filter((childPkg): childPkg is ResolvedPackage => childPkg !== undefined)
    .map((childPkg) =>
      buildNode(context, childPkg, {
        depth: position.depth + 1,
        isDirect: false,
        visitedPath: nextVisitedPath,
      }),
    );

  return {
    key: dependencyKey(ecosystem, pkg.name, pkg.version),
    name: pkg.name,
    version: pkg.version,
    ecosystem,
    depth: position.depth,
    isDirect: position.isDirect,
    license: UNKNOWN_LICENSE,
    classification: null,
    children,
    sourceManifest,
  };
}

function markNames(nodes: readonly DependencyNode[], names: Set<string>): void {
  for (const node of nodes) {
    names.add(node.name);
    markNames(node.children, names);
  }
}

/**
 * Builds a dependency forest from a lockfile's already-resolved package list. Used by every
 * ecosystem without a deps.dev dependency-graph endpoint (Go, Gradle, RubyGems, NuGet,
 * Composer). When a lockfile format encodes real edges between packages (Gemfile.lock,
 * composer.lock), those become real nesting. When it does not (go.mod, gradle.lockfile, most
 * packages.lock.json), every package is still included in the result, just as a flat sibling
 * flagged direct or indirect rather than nested under a specific parent: an honest reflection
 * of what the lockfile actually records, rather than a guessed structure.
 */
export function buildDependencyTreeFromLockfile(
  packages: readonly ResolvedPackage[],
  ecosystem: EcosystemId,
  sourceManifest: string,
): DependencyNode[] {
  const context: TreeBuildContext = {
    packagesByName: new Map(packages.map((pkg) => [pkg.name, pkg])),
    ecosystem,
    sourceManifest,
  };

  const roots = packages
    .filter((pkg) => pkg.isDirect)
    .map((pkg) => buildNode(context, pkg, { depth: 0, isDirect: true, visitedPath: new Set() }));

  const reachableNames = new Set<string>();
  markNames(roots, reachableNames);

  const orphanedIndirect = packages
    .filter((pkg) => !pkg.isDirect && !reachableNames.has(pkg.name))
    .map((pkg) => buildNode(context, pkg, { depth: 0, isDirect: false, visitedPath: new Set() }));

  return [...roots, ...orphanedIndirect];
}
