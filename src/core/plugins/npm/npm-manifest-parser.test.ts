import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectNpmManifests, readDirectDependencies } from './npm-manifest-parser.js';

describe('detectNpmManifests', () => {
  it('picks package-lock.json when it is present', () => {
    const manifests = detectNpmManifests(['package.json', 'package-lock.json', 'yarn.lock']);
    expect(manifests[0]?.lockfileFilePath).toBe('package-lock.json');
  });

  it('picks pnpm-lock.yaml when there is no package-lock.json', () => {
    const manifests = detectNpmManifests(['package.json', 'pnpm-lock.yaml']);
    expect(manifests[0]?.lockfileFilePath).toBe('pnpm-lock.yaml');
  });

  it('picks yarn.lock when neither of the others is present', () => {
    const manifests = detectNpmManifests(['package.json', 'yarn.lock']);
    expect(manifests[0]?.lockfileFilePath).toBe('yarn.lock');
  });
});

describe('readDirectDependencies (npm lockfile)', () => {
  it('resolves versions from package-lock.json', async () => {
    const repoRoot = path.resolve('tests/fixtures/npm');
    const [manifest] = detectNpmManifests(['package.json', 'package-lock.json']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, repoRoot);
    expect(dependencies).toContainEqual({ name: 'tiny-pad', version: '1.3.0' });
  });
});

describe('readDirectDependencies (pnpm-lock.yaml)', () => {
  it('resolves versions and strips peer-influenced suffixes', async () => {
    const repoRoot = path.resolve('tests/fixtures/npm-pnpm');
    const [manifest] = detectNpmManifests(['package.json', 'pnpm-lock.yaml']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, repoRoot);

    expect(dependencies).toContainEqual({ name: 'tiny-pad', version: '1.3.0' });
    expect(dependencies).toContainEqual({ name: 'some-test-tool', version: '2.0.0' });
  });
});

describe('readDirectDependencies (yarn.lock classic v1)', () => {
  it('resolves the version matching the exact declared descriptor', async () => {
    const repoRoot = path.resolve('tests/fixtures/npm-yarn');
    const [manifest] = detectNpmManifests(['package.json', 'yarn.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, repoRoot);
    expect(dependencies).toEqual([{ name: 'tiny-pad', version: '1.3.0' }]);
  });
});

describe('readDirectDependencies (yarn.lock berry v2+)', () => {
  it('resolves the npm: protocol descriptor from the real-YAML lockfile', async () => {
    const repoRoot = path.resolve('tests/fixtures/npm-yarn-berry');
    const [manifest] = detectNpmManifests(['package.json', 'yarn.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, repoRoot);
    expect(dependencies).toEqual([{ name: 'tiny-pad', version: '1.3.0' }]);
  });
});

describe('readDirectDependencies (pnpm-lock.yaml legacy v5)', () => {
  it('resolves versions from the pre-importers layout and strips underscore peer suffixes', async () => {
    const repoRoot = path.resolve('tests/fixtures/npm-pnpm-legacy');
    const [manifest] = detectNpmManifests(['package.json', 'pnpm-lock.yaml']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, repoRoot);

    expect(dependencies).toContainEqual({ name: 'tiny-pad', version: '1.3.0' });
    expect(dependencies).toContainEqual({ name: 'some-test-tool', version: '2.0.0' });
  });
});
