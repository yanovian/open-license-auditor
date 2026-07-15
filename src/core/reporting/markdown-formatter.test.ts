import { describe, expect, it } from 'vitest';
import type { DependencyNode } from '../types/dependency-node.js';
import { assertNoEmDash, renderDependencyTree, renderTable } from './markdown-formatter.js';

function makeNode(overrides: Partial<DependencyNode> = {}): DependencyNode {
  return {
    key: 'npm:left-pad@1.3.0',
    name: 'left-pad',
    version: '1.3.0',
    ecosystem: 'npm',
    depth: 0,
    isDirect: true,
    license: { raw: 'MIT', canonicalId: 'MIT', source: 'depsdev' },
    classification: 'ok',
    children: [],
    sourceManifest: 'npm:package.json',
    ...overrides,
  };
}

describe('assertNoEmDash', () => {
  it('does not throw for plain text', () => {
    expect(() => assertNoEmDash('no problems here, all good')).not.toThrow();
  });

  it('throws when the text contains an em dash', () => {
    expect(() => assertNoEmDash('this has an em dash — right there')).toThrow();
  });
});

describe('renderTable', () => {
  it('renders a markdown table with a header separator row', () => {
    const table = renderTable(['Name', 'License'], [['left-pad', 'MIT']]);
    expect(table).toBe('| Name | License |\n| --- | --- |\n| left-pad | MIT |');
  });
});

describe('renderDependencyTree', () => {
  it('renders a flat list of direct dependencies', () => {
    const tree = renderDependencyTree([makeNode()]);
    expect(tree).toBe('- left-pad@1.3.0 (MIT)');
  });

  it('indents nested children under their parent', () => {
    const child = makeNode({ name: 'sub-dep', version: '0.1.0', depth: 1, isDirect: false });
    const parent = makeNode({ children: [child] });
    const tree = renderDependencyTree([parent]);
    expect(tree).toBe('- left-pad@1.3.0 (MIT)\n  - sub-dep@0.1.0 (MIT)');
  });

  it('falls back to the raw license string when there is no canonical id', () => {
    const node = makeNode({
      license: { raw: 'Some Custom License', canonicalId: null, source: 'depsdev' },
    });
    expect(renderDependencyTree([node])).toBe('- left-pad@1.3.0 (Some Custom License)');
  });
});
