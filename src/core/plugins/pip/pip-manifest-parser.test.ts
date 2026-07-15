import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectPipManifests, readDirectDependencies } from './pip-manifest-parser.js';

const REQUIREMENTS_ROOT = path.resolve('tests/fixtures/pip-requirements');
const POETRY_ROOT = path.resolve('tests/fixtures/pip-poetry');
const UV_ROOT = path.resolve('tests/fixtures/pip-uv');

describe('detectPipManifests', () => {
  it('treats requirements.txt as a manifest with no lockfile needed', () => {
    const manifests = detectPipManifests(['requirements.txt']);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.lockfileFilePath).toBeNull();
  });

  it('only treats pyproject.toml as a manifest when a sibling poetry.lock exists', () => {
    const withLock = detectPipManifests(['pyproject.toml', 'poetry.lock']);
    expect(withLock).toHaveLength(1);
    expect(withLock[0]?.lockfileFilePath).toBe('poetry.lock');

    const withoutLock = detectPipManifests(['pyproject.toml']);
    expect(withoutLock).toHaveLength(0);
  });

  it('also treats pyproject.toml as a manifest when a sibling uv.lock exists', () => {
    const manifests = detectPipManifests(['pyproject.toml', 'uv.lock']);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.lockfileFilePath).toBe('uv.lock');
  });
});

describe('readDirectDependencies (pip)', () => {
  it('parses pinned requirements.txt lines and skips unpinned ones', async () => {
    const [manifest] = detectPipManifests(['requirements.txt']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, REQUIREMENTS_ROOT);

    expect(dependencies).toContainEqual({ name: 'requests', version: '2.31.0' });
    expect(dependencies).toContainEqual({ name: 'flask', version: '3.0.3' });
    expect(dependencies.some((dependency) => dependency.name === 'unpinned-package')).toBe(false);
  });

  it('resolves poetry dependencies case-insensitively against poetry.lock', async () => {
    const [manifest] = detectPipManifests(['pyproject.toml', 'poetry.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, POETRY_ROOT);

    expect(dependencies).toEqual([{ name: 'Django', version: '5.0.6' }]);
  });

  it('resolves uv dependencies from PEP 621 project.dependencies against uv.lock', async () => {
    const [manifest] = detectPipManifests(['pyproject.toml', 'uv.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, UV_ROOT);

    expect(dependencies).toContainEqual({ name: 'requests', version: '2.31.0' });
    expect(dependencies).toContainEqual({ name: 'flask', version: '3.0.3' });
  });
});
