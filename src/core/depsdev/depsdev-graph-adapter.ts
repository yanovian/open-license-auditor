import { withCache } from '../cache/cached-lookup.js';
import type { Cache } from '../cache/cache.js';
import { dependencyKey, type DependencyNode } from '../types/dependency-node.js';
import type { EcosystemId } from '../types/ecosystem-plugin.js';
import type {
  DepsDevClient,
  DepsDevDependencyEdge,
  DepsDevDependencyNode,
} from './depsdev-client.js';
import type { DepsDevSystem } from './system-name-map.js';

export interface DepsDevGraphRequest {
  readonly client: DepsDevClient;
  readonly cache: Cache;
  readonly system: DepsDevSystem;
  readonly ecosystem: EcosystemId;
  readonly rootName: string;
  readonly rootVersion: string;
  readonly sourceManifest: string;
}

interface TreeBuildContext {
  readonly nodes: readonly DepsDevDependencyNode[];
  readonly childrenByParent: ReadonlyMap<number, readonly number[]>;
  readonly ecosystem: EcosystemId;
  readonly sourceManifest: string;
}

function buildChildIndex(
  edges: readonly DepsDevDependencyEdge[],
): ReadonlyMap<number, readonly number[]> {
  const childrenByParent = new Map<number, number[]>();
  for (const edge of edges) {
    const children = childrenByParent.get(edge.fromNode) ?? [];
    children.push(edge.toNode);
    childrenByParent.set(edge.fromNode, children);
  }
  return childrenByParent;
}

function toDependencyNode(
  context: TreeBuildContext,
  nodeIndex: number,
  depth: number,
  visitedPath: ReadonlySet<number>,
): DependencyNode {
  const { nodes, childrenByParent, ecosystem, sourceManifest } = context;
  const depsDevNode = nodes[nodeIndex];
  if (!depsDevNode) {
    throw new Error(`deps.dev response referenced a node index (${nodeIndex}) that does not exist`);
  }

  const { name, version } = depsDevNode.versionKey;
  const nextVisitedPath = new Set(visitedPath).add(nodeIndex);
  const childIndices = childrenByParent.get(nodeIndex) ?? [];

  const children = childIndices
    .filter((childIndex) => !visitedPath.has(childIndex))
    .map((childIndex) => toDependencyNode(context, childIndex, depth + 1, nextVisitedPath));

  return {
    key: dependencyKey(ecosystem, name, version),
    name,
    version,
    ecosystem,
    depth,
    isDirect: depth === 0,
    license: { raw: null, canonicalId: null, source: 'unknown' },
    classification: null,
    children,
    sourceManifest,
  };
}

function leafNode(
  ecosystem: EcosystemId,
  name: string,
  version: string,
  sourceManifest: string,
): DependencyNode {
  return {
    key: dependencyKey(ecosystem, name, version),
    name,
    version,
    ecosystem,
    depth: 0,
    isDirect: true,
    license: { raw: null, canonicalId: null, source: 'unknown' },
    classification: null,
    children: [],
    sourceManifest,
  };
}

/**
 * Builds a full transitive dependency tree, rooted at one already-published direct dependency,
 * from deps.dev's GetDependencies response. Only npm, Cargo, Maven, and PyPI support this
 * endpoint; other ecosystems build their tree locally from a lockfile instead (see
 * resolution/lockfile-tree-builder.ts). The scanned repo's own manifest is never queried
 * directly, since it is typically unpublished and deps.dev has no record of it: this is called
 * once per direct dependency, not once per manifest.
 */
export async function buildDependencyTreeFromDepsDev(
  request: DepsDevGraphRequest,
): Promise<DependencyNode> {
  const { client, cache, system, ecosystem, rootName, rootVersion, sourceManifest } = request;
  const cacheKey = `depsdev-graph:${system}:${rootName}@${rootVersion}`;
  const response = await withCache(cache, cacheKey, () =>
    client.getDependencies(system, rootName, rootVersion),
  );

  const nodes = response.nodes ?? [];
  const childrenByParent = buildChildIndex(response.edges ?? []);
  const selfIndex = nodes.findIndex((node) => node.relation === 'SELF');

  if (selfIndex === -1) {
    // deps.dev has no record of this exact version; report it as a leaf with no known children.
    return leafNode(ecosystem, rootName, rootVersion, sourceManifest);
  }

  const context: TreeBuildContext = { nodes, childrenByParent, ecosystem, sourceManifest };
  return toDependencyNode(context, selfIndex, 0, new Set());
}
