import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeDepsDevClient } from '../../../tests/fixtures/depsdev/fake-depsdev-client.js';
import { createLicenseClassifier } from '../classification/license-classifier.js';
import { createMemoryCache } from '../cache/memory-cache.js';
import { discoverManifests } from '../discovery/scan-repo.js';
import { listRepoFiles } from '../discovery/list-repo-files.js';
import { createNpmPlugin } from '../plugins/npm/npm-plugin.js';
import { createPluginRegistry } from '../plugins/registry.js';
import type { DependencyNode } from '../types/dependency-node.js';
import { buildReport } from './report-builder.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/npm');

function findNode(nodes: readonly DependencyNode[], name: string): DependencyNode | undefined {
  for (const node of nodes) {
    if (node.name === name) {
      return node;
    }
    const found = findNode(node.children, name);
    if (found) {
      return found;
    }
  }
  return undefined;
}

describe('buildReport (npm end-to-end)', () => {
  it('discovers, resolves, licenses, and classifies a full npm dependency tree', async () => {
    const fakeClient = createFakeDepsDevClient({
      dependencies: {
        'NPM:tiny-pad@1.3.0': {
          nodes: [
            { versionKey: { system: 'NPM', name: 'tiny-pad', version: '1.3.0' }, relation: 'SELF' },
          ],
          edges: [],
        },
        'NPM:gpl-lib@2.0.0': {
          nodes: [
            { versionKey: { system: 'NPM', name: 'gpl-lib', version: '2.0.0' }, relation: 'SELF' },
            {
              versionKey: { system: 'NPM', name: 'sub-dep', version: '0.1.0' },
              relation: 'DIRECT',
            },
          ],
          edges: [{ fromNode: 0, toNode: 1 }],
        },
      },
      versions: {
        'NPM:tiny-pad@1.3.0': { licenses: ['MIT'] },
        'NPM:gpl-lib@2.0.0': { licenses: ['GPL-3.0'] },
        'NPM:sub-dep@0.1.0': { licenses: ['ISC'] },
      },
    });

    const registry = createPluginRegistry();
    registry.register(createNpmPlugin(fakeClient));

    const repoFiles = await listRepoFiles(FIXTURE_REPO_ROOT);
    const manifests = discoverManifests(repoFiles, registry);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.manifestFilePath).toBe('package.json');
    expect(manifests[0]?.lockfileFilePath).toBe('package-lock.json');

    const ctx = { repoRoot: FIXTURE_REPO_ROOT, cache: createMemoryCache() };
    const classifier = createLicenseClassifier();

    const report = await buildReport(manifests, { registry, ctx, classifier });

    expect(report.manifests).toHaveLength(1);
    const firstManifestReport = report.manifests[0];
    if (!firstManifestReport) {
      throw new Error('expected exactly one manifest report');
    }
    const { dependencies } = firstManifestReport;

    const tinyPad = findNode(dependencies, 'tiny-pad');
    expect(tinyPad?.isDirect).toBe(true);
    expect(tinyPad?.license.canonicalId).toBe('MIT');
    expect(tinyPad?.classification).toBe('ok');

    const gplLib = findNode(dependencies, 'gpl-lib');
    expect(gplLib?.isDirect).toBe(true);
    expect(gplLib?.license.canonicalId).toBe('GPL-3.0');
    expect(gplLib?.classification).toBe('critical');

    const subDep = findNode(dependencies, 'sub-dep');
    expect(subDep?.isDirect).toBe(false);
    expect(subDep?.depth).toBe(1);
    expect(subDep?.license.canonicalId).toBe('ISC');
    expect(subDep?.classification).toBe('ok');
  });
});
