import { describe, expect, it } from 'vitest';
import type { DependencyNode } from '../types/dependency-node.js';
import type { AuditReport } from '../types/report.js';
import { buildPrComment } from './pr-comment-builder.js';

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

function makeReport(
  dependencies: DependencyNode[],
  coverage: Partial<Pick<AuditReport, 'skippedByConfig' | 'unsupported'>> = {},
): AuditReport {
  return {
    generatedAt: '2026-07-15T00:00:00.000Z',
    manifests: [
      {
        manifest: {
          id: 'npm:package.json',
          ecosystem: 'npm',
          language: 'JavaScript/TypeScript',
          manifestFilePath: 'package.json',
          lockfileFilePath: 'package-lock.json',
          rootPackageName: null,
          rootPackageVersion: null,
        },
        dependencies,
      },
    ],
    skippedByConfig: coverage.skippedByConfig ?? [],
    unsupported: coverage.unsupported ?? [],
  };
}

describe('buildPrComment', () => {
  it('ends with the Open License Auditor footer, linking to the marketplace and the docs', () => {
    const report = makeReport([makeNode()]);
    const comment = buildPrComment(report, 'both');
    const lines = comment.trim().split('\n');

    expect(lines[lines.length - 1]).toContain(
      '[Open License Auditor](https://github.com/marketplace/actions/open-license-auditor)',
    );
    expect(lines[lines.length - 1]).toContain(
      '[license classification guide](https://github.com/yanovian/open-license-auditor/blob/master/_docs/license-classification.md)',
    );
  });

  it('reports no problems and includes the disclaimer when everything is ok', () => {
    const report = makeReport([makeNode()]);
    const comment = buildPrComment(report, 'both');

    expect(comment).toContain('No problems found.');
    expect(comment).toContain('automated check');
    expect(comment).not.toContain('Full dependency map');
  });

  it('lists problems directly and includes a collapsed full dependency map', () => {
    const gplLib = makeNode({
      key: 'npm:gpl-lib@2.0.0',
      name: 'gpl-lib',
      version: '2.0.0',
      license: { raw: 'GPL-3.0', canonicalId: 'GPL-3.0', source: 'depsdev' },
      classification: 'critical',
    });
    const report = makeReport([makeNode(), gplLib]);

    const comment = buildPrComment(report, 'both');

    expect(comment).toContain('Found 1 problem that need a look.');
    expect(comment).toContain('gpl-lib');
    expect(comment).toContain('critical');
    expect(comment).toContain('<details>');
    expect(comment).toContain('<summary>Full dependency map</summary>');
    expect(comment).toContain('left-pad@1.3.0 (MIT)');
  });

  it('filters the problem list by severityFilter', () => {
    const warningNode = makeNode({
      key: 'npm:mpl-lib@1.0.0',
      name: 'mpl-lib',
      version: '1.0.0',
      license: { raw: 'MPL-2.0', canonicalId: 'MPL-2.0', source: 'depsdev' },
      classification: 'warning',
    });
    const criticalNode = makeNode({
      key: 'npm:gpl-lib@2.0.0',
      name: 'gpl-lib',
      version: '2.0.0',
      license: { raw: 'GPL-3.0', canonicalId: 'GPL-3.0', source: 'depsdev' },
      classification: 'critical',
    });
    const report = makeReport([warningNode, criticalNode]);

    const criticalOnly = buildPrComment(report, 'critical');
    const problemSection = criticalOnly.split('<details>')[0] ?? '';
    expect(problemSection).toContain('gpl-lib');
    expect(problemSection).not.toContain('mpl-lib');
    // The full dependency map always shows everything, regardless of the filter.
    expect(criticalOnly).toContain('mpl-lib');

    const none = buildPrComment(report, 'none');
    expect(none).toContain('No problems found.');
  });

  it('drops the full map and adds a notice when the comment would exceed the size limit', () => {
    const manyDependencies = Array.from({ length: 3000 }, (_unused, index) =>
      makeNode({
        key: `npm:package-${index}@1.0.0`,
        name: `package-${index}`,
        version: '1.0.0',
      }),
    );
    const gplLib = makeNode({
      key: 'npm:gpl-lib@2.0.0',
      name: 'gpl-lib',
      version: '2.0.0',
      license: { raw: 'GPL-3.0', canonicalId: 'GPL-3.0', source: 'depsdev' },
      classification: 'critical',
    });
    const report = makeReport([gplLib, ...manyDependencies]);

    const comment = buildPrComment(report, 'both');

    expect(comment.length).toBeLessThan(65536);
    expect(comment).toContain('gpl-lib');
    expect(comment).not.toContain('<details>');
    expect(comment).toContain('too large to include here');
  });

  it('adds a Not checked section when something was skipped by config, even with no problems', () => {
    const report = makeReport([makeNode()], {
      skippedByConfig: [{ ecosystem: 'rubygems', language: 'Ruby', manifestFilePath: 'Gemfile' }],
    });

    const comment = buildPrComment(report, 'both');

    expect(comment).toContain('No problems found.');
    expect(comment).toContain('### Not checked');
    expect(comment).toContain('Ruby (`Gemfile`) was skipped');
    expect(comment).toContain('disabled in your config');
  });

  it('adds a Not checked section for unsupported ecosystems alongside a problem list', () => {
    const gplLib = makeNode({
      key: 'npm:gpl-lib@2.0.0',
      name: 'gpl-lib',
      license: { raw: 'GPL-3.0', canonicalId: 'GPL-3.0', source: 'depsdev' },
      classification: 'critical',
    });
    const report = makeReport([gplLib], {
      unsupported: [
        {
          language: 'Swift',
          packageManager: 'Swift Package Manager',
          manifestFilePath: 'Package.swift',
        },
      ],
    });

    const comment = buildPrComment(report, 'both');

    expect(comment).toContain('### Not checked');
    expect(comment).toContain('Swift (Swift Package Manager) is not yet supported');
    expect(comment).toContain('Package.swift');
  });

  it('omits the Not checked section entirely when everything was supported and enabled', () => {
    const report = makeReport([makeNode()]);
    const comment = buildPrComment(report, 'both');
    expect(comment).not.toContain('Not checked');
  });

  it('never contains an em dash', () => {
    const report = makeReport([
      makeNode({
        classification: 'critical',
        license: { raw: 'GPL-3.0', canonicalId: 'GPL-3.0', source: 'depsdev' },
      }),
    ]);
    const comment = buildPrComment(report, 'both');
    expect(comment).not.toContain('—');
  });
});
