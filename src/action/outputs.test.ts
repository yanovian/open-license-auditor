import * as core from '@actions/core';
import { describe, expect, it, vi } from 'vitest';
import type { DependencyNode } from '../core/types/dependency-node.js';
import type { AuditReport } from '../core/types/report.js';
import { applyFailOnThreshold, setActionOutputs } from './outputs.js';

vi.mock('@actions/core', () => ({
  setOutput: vi.fn(),
  setFailed: vi.fn(),
}));

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

function makeReport(dependencies: DependencyNode[]): AuditReport {
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
    skippedByConfig: [],
    unsupported: [],
  };
}

describe('setActionOutputs', () => {
  it('reports has-critical and has-warning based on the tree', () => {
    vi.clearAllMocks();
    const report = makeReport([makeNode({ classification: 'critical' })]);

    setActionOutputs(report, '/tmp/report.json');

    expect(core.setOutput).toHaveBeenCalledWith('has-critical', true);
    expect(core.setOutput).toHaveBeenCalledWith('has-warning', false);
    expect(core.setOutput).toHaveBeenCalledWith('report-path', '/tmp/report.json');
  });
});

describe('applyFailOnThreshold', () => {
  it('does nothing when failOn is none', () => {
    vi.clearAllMocks();
    const report = makeReport([makeNode({ classification: 'critical' })]);
    applyFailOnThreshold(report, 'none');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('fails when failOn is critical and a critical finding exists', () => {
    vi.clearAllMocks();
    const report = makeReport([makeNode({ classification: 'critical' })]);
    applyFailOnThreshold(report, 'critical');
    expect(core.setFailed).toHaveBeenCalled();
  });

  it('does not fail on a warning when failOn is critical', () => {
    vi.clearAllMocks();
    const report = makeReport([makeNode({ classification: 'warning' })]);
    applyFailOnThreshold(report, 'critical');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('fails on a warning when failOn is warning', () => {
    vi.clearAllMocks();
    const report = makeReport([makeNode({ classification: 'warning' })]);
    applyFailOnThreshold(report, 'warning');
    expect(core.setFailed).toHaveBeenCalled();
  });
});
