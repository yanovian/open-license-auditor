import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLicenseClassifier } from '../src/core/classification/license-classifier.js';
import { createMemoryCache } from '../src/core/cache/memory-cache.js';
import { listRepoFiles } from '../src/core/discovery/list-repo-files.js';
import { discoverManifests } from '../src/core/discovery/scan-repo.js';
import { createCargoPlugin } from '../src/core/plugins/cargo/cargo-plugin.js';
import { createComposerPlugin } from '../src/core/plugins/composer/composer-plugin.js';
import { createGoPlugin } from '../src/core/plugins/go/go-plugin.js';
import { createGradlePlugin } from '../src/core/plugins/gradle/gradle-plugin.js';
import { createMavenPlugin } from '../src/core/plugins/maven/maven-plugin.js';
import { createNpmPlugin } from '../src/core/plugins/npm/npm-plugin.js';
import { createNugetPlugin } from '../src/core/plugins/nuget/nuget-plugin.js';
import { createPipPlugin } from '../src/core/plugins/pip/pip-plugin.js';
import { createPluginRegistry } from '../src/core/plugins/registry.js';
import { createRubygemsPlugin } from '../src/core/plugins/rubygems/rubygems-plugin.js';
import { detectUnsupportedEcosystems } from '../src/core/discovery/unsupported-ecosystems.js';
import { buildPrComment } from '../src/core/reporting/pr-comment-builder.js';
import { buildReport } from '../src/core/reporting/report-builder.js';
import type { DependencyNode } from '../src/core/types/dependency-node.js';
import type { EcosystemId } from '../src/core/types/ecosystem-plugin.js';
import { createFakeDepsDevClient } from './fixtures/depsdev/fake-depsdev-client.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/full-repo');

function selfOnly(system: string, name: string, version: string) {
  return {
    nodes: [{ versionKey: { system, name, version }, relation: 'SELF' as const }],
    edges: [],
  };
}

function findByEcosystem(
  manifests: readonly {
    manifest: { ecosystem: EcosystemId };
    dependencies: readonly DependencyNode[];
  }[],
  ecosystem: EcosystemId,
) {
  return manifests.find((entry) => entry.manifest.ecosystem === ecosystem);
}

function flatten(nodes: readonly DependencyNode[]): DependencyNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

describe('full repo integration (all nine ecosystems)', () => {
  it('discovers exactly one manifest per ecosystem with no cross-contamination', async () => {
    const registry = createPluginRegistry();
    const fakeClient = createFakeDepsDevClient({});
    registry.register(createNpmPlugin(fakeClient));
    registry.register(createCargoPlugin(fakeClient));
    registry.register(createMavenPlugin(fakeClient));
    registry.register(createPipPlugin(fakeClient));
    registry.register(createGoPlugin(fakeClient));
    registry.register(createGradlePlugin(fakeClient));
    registry.register(createRubygemsPlugin(fakeClient));
    registry.register(createNugetPlugin(fakeClient));
    registry.register(createComposerPlugin());

    const repoFiles = await listRepoFiles(FIXTURE_REPO_ROOT);
    const manifests = discoverManifests(repoFiles, registry);
    const ecosystems = manifests.map((manifest) => manifest.ecosystem).sort();

    expect(ecosystems).toEqual(
      ['cargo', 'composer', 'go', 'gradle', 'maven', 'npm', 'nuget', 'pip', 'rubygems'].sort(),
    );
  });

  it('builds a correct license report across every ecosystem in one pass', async () => {
    const fakeClient = createFakeDepsDevClient({
      dependencies: {
        'NPM:tiny-pad@1.3.0': selfOnly('NPM', 'tiny-pad', '1.3.0'),
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
        'CARGO:serde@1.0.203': selfOnly('CARGO', 'serde', '1.0.203'),
        'CARGO:proptest@1.4.0': selfOnly('CARGO', 'proptest', '1.4.0'),
        'MAVEN:com.google.guava:guava@33.2.1-jre': selfOnly(
          'MAVEN',
          'com.google.guava:guava',
          '33.2.1-jre',
        ),
        'PYPI:requests@2.31.0': selfOnly('PYPI', 'requests', '2.31.0'),
        'PYPI:flask@3.0.3': selfOnly('PYPI', 'flask', '3.0.3'),
      },
      versions: {
        'NPM:tiny-pad@1.3.0': { licenses: ['MIT'] },
        'NPM:gpl-lib@2.0.0': { licenses: ['GPL-3.0'] },
        'NPM:sub-dep@0.1.0': { licenses: ['ISC'] },
        'CARGO:serde@1.0.203': { licenses: ['MIT'] },
        'CARGO:proptest@1.4.0': { licenses: ['MIT'] },
        'MAVEN:com.google.guava:guava@33.2.1-jre': { licenses: ['Apache-2.0'] },
        'PYPI:requests@2.31.0': { licenses: ['Apache-2.0'] },
        'PYPI:flask@3.0.3': { licenses: ['BSD-3-Clause'] },
        'GO:github.com/pkg/errors@v0.9.1': { licenses: ['BSD-2-Clause'] },
        'GO:golang.org/x/text@v0.14.0': { licenses: ['BSD-3-Clause'] },
        'GO:github.com/stretchr/testify@v1.9.0': { licenses: ['MIT'] },
        'MAVEN:com.google.guava:guava@31.1-jre': { licenses: ['Apache-2.0'] },
        'MAVEN:org.junit.jupiter:junit-jupiter-api@5.9.1': { licenses: ['EPL-2.0'] },
        'MAVEN:org.opentest4j:opentest4j@1.2.0': { licenses: ['MIT'] },
        'RUBYGEMS:rails@7.0.4': { licenses: ['MIT'] },
        'RUBYGEMS:actionpack@7.0.4': { licenses: ['MIT'] },
        'RUBYGEMS:actionview@7.0.4': { licenses: ['MIT'] },
        'RUBYGEMS:rack@2.2.6': { licenses: ['MIT'] },
      },
    });

    const registry = createPluginRegistry();
    registry.register(createNpmPlugin(fakeClient));
    registry.register(createCargoPlugin(fakeClient));
    registry.register(createMavenPlugin(fakeClient));
    registry.register(createPipPlugin(fakeClient));
    registry.register(createGoPlugin(fakeClient));
    registry.register(createGradlePlugin(fakeClient));
    registry.register(createRubygemsPlugin(fakeClient));
    registry.register(createNugetPlugin(fakeClient));
    registry.register(createComposerPlugin());

    const repoFiles = await listRepoFiles(FIXTURE_REPO_ROOT);
    const manifests = discoverManifests(repoFiles, registry);
    const ctx = { repoRoot: FIXTURE_REPO_ROOT, cache: createMemoryCache() };
    const classifier = createLicenseClassifier();

    const report = await buildReport(manifests, { registry, ctx, classifier });

    const npmReport = findByEcosystem(report.manifests, 'npm');
    expect(
      flatten(npmReport?.dependencies ?? []).find((n) => n.name === 'gpl-lib')?.classification,
    ).toBe('critical');

    const cargoReport = findByEcosystem(report.manifests, 'cargo');
    expect(
      flatten(cargoReport?.dependencies ?? [])
        .map((n) => n.name)
        .sort(),
    ).toEqual(['proptest', 'serde']);

    const mavenReport = findByEcosystem(report.manifests, 'maven');
    expect(flatten(mavenReport?.dependencies ?? [])[0]?.license.canonicalId).toBe('Apache-2.0');

    const pipReport = findByEcosystem(report.manifests, 'pip');
    expect(
      flatten(pipReport?.dependencies ?? [])
        .map((n) => n.name)
        .sort(),
    ).toEqual(['flask', 'requests']);

    const goReport = findByEcosystem(report.manifests, 'go');
    const goNodes = flatten(goReport?.dependencies ?? []);
    expect(goNodes).toHaveLength(3);
    expect(goNodes.find((n) => n.name === 'golang.org/x/text')?.isDirect).toBe(false);

    const gradleReport = findByEcosystem(report.manifests, 'gradle');
    const gradleNodes = flatten(gradleReport?.dependencies ?? []);
    expect(gradleNodes.find((n) => n.name === 'org.opentest4j:opentest4j')?.isDirect).toBe(false);

    const rubygemsReport = findByEcosystem(report.manifests, 'rubygems');
    const rubygemsNodes = flatten(rubygemsReport?.dependencies ?? []);
    expect(rubygemsNodes.find((n) => n.name === 'rails')?.depth).toBe(0);
    expect(rubygemsNodes.find((n) => n.name === 'rack')?.depth).toBe(2);

    // Newtonsoft.Json and Serilog are both in the bundled seed table, no fake response needed.
    const nugetReport = findByEcosystem(report.manifests, 'nuget');
    const nugetNodes = flatten(nugetReport?.dependencies ?? []);
    expect(nugetNodes.find((n) => n.name === 'Newtonsoft.Json')?.license.canonicalId).toBe('MIT');
    expect(nugetNodes.find((n) => n.name === 'Serilog')?.license.canonicalId).toBe('Apache-2.0');

    // Composer needs no external call at all, its license comes straight from composer.lock.
    const composerReport = findByEcosystem(report.manifests, 'composer');
    const composerNodes = flatten(composerReport?.dependencies ?? []);
    expect(composerNodes.find((n) => n.name === 'monolog/monolog')?.license.canonicalId).toBe(
      'MIT',
    );
    expect(composerNodes.find((n) => n.name === 'psr/log')?.license.canonicalId).toBe('MIT');
  });

  it('reports a disabled ecosystem and an unsupported ecosystem in the PR comment', async () => {
    const fakeClient = createFakeDepsDevClient({});
    const registry = createPluginRegistry();
    registry.register(createNpmPlugin(fakeClient));
    registry.register(createCargoPlugin(fakeClient));
    registry.register(createMavenPlugin(fakeClient));
    registry.register(createPipPlugin(fakeClient));
    registry.register(createGoPlugin(fakeClient));
    registry.register(createGradlePlugin(fakeClient));
    registry.register(createRubygemsPlugin(fakeClient));
    registry.register(createNugetPlugin(fakeClient));
    registry.register(createComposerPlugin());

    const repoFiles = await listRepoFiles(FIXTURE_REPO_ROOT);
    const allManifests = discoverManifests(repoFiles, registry);

    // Simulate the user disabling rubygems in their config: every other manifest still gets
    // checked, rubygems' Gemfile is detected but excluded from resolution.
    const enabledManifests = allManifests.filter((manifest) => manifest.ecosystem !== 'rubygems');
    const rubygemsManifest = allManifests.find((manifest) => manifest.ecosystem === 'rubygems');
    if (!rubygemsManifest) {
      throw new Error('expected the rubygems manifest to be detected before filtering');
    }

    const unsupported = detectUnsupportedEcosystems(repoFiles);
    expect(unsupported).toEqual([
      {
        language: 'Swift',
        packageManager: 'Swift Package Manager',
        manifestFilePath: 'Package.swift',
      },
    ]);

    const ctx = { repoRoot: FIXTURE_REPO_ROOT, cache: createMemoryCache() };
    const classifier = createLicenseClassifier();
    const report = await buildReport(enabledManifests, {
      registry,
      ctx,
      classifier,
      coverage: {
        skippedByConfig: [
          {
            ecosystem: 'rubygems',
            language: rubygemsManifest.language,
            manifestFilePath: rubygemsManifest.manifestFilePath,
          },
        ],
        unsupported,
      },
    });

    expect(report.manifests.some((entry) => entry.manifest.ecosystem === 'rubygems')).toBe(false);

    const comment = buildPrComment(report, 'both');
    expect(comment).toContain('### Not checked');
    expect(comment).toContain('Ruby (`Gemfile`) was skipped');
    expect(comment).toContain('Swift (Swift Package Manager) is not yet supported');
    expect(comment).toContain('Package.swift');
  });
});
