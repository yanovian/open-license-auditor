import type { DependencyNode } from '../types/dependency-node.js';

/** Collects every distinct dependency (by key) across a forest, first occurrence wins. */
export function flattenUniqueNodes(trees: readonly DependencyNode[]): DependencyNode[] {
  const seen = new Map<string, DependencyNode>();

  function visit(nodes: readonly DependencyNode[]): void {
    for (const node of nodes) {
      if (!seen.has(node.key)) {
        seen.set(node.key, node);
      }
      visit(node.children);
    }
  }

  visit(trees);
  return [...seen.values()];
}

/** True if any distinct dependency in the forest matches the predicate. */
export function someNode(
  trees: readonly DependencyNode[],
  predicate: (node: DependencyNode) => boolean,
): boolean {
  return flattenUniqueNodes(trees).some(predicate);
}

/**
 * Rebuilds a forest bottom-up, applying `transform` to each node after its children have
 * already been transformed. DependencyNode is immutable, so updates (filling in a license,
 * then later a classification) happen by producing a new tree rather than mutating one.
 */
export function mapTree(
  trees: readonly DependencyNode[],
  transform: (node: DependencyNode) => DependencyNode,
): DependencyNode[] {
  return trees.map((node) => {
    const children = mapTree(node.children, transform);
    return transform({ ...node, children });
  });
}
