import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectCargoManifests, readDirectDependencies } from './cargo-manifest-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/cargo');

describe('detectCargoManifests', () => {
  it('pairs Cargo.toml with a sibling Cargo.lock', () => {
    const manifests = detectCargoManifests(['Cargo.toml', 'Cargo.lock', 'src/main.rs']);

    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.ecosystem).toBe('cargo');
    expect(manifests[0]?.language).toBe('Rust');
    expect(manifests[0]?.manifestFilePath).toBe('Cargo.toml');
    expect(manifests[0]?.lockfileFilePath).toBe('Cargo.lock');
  });

  it('leaves lockfileFilePath null when there is no Cargo.lock', () => {
    const manifests = detectCargoManifests(['Cargo.toml']);
    expect(manifests[0]?.lockfileFilePath).toBeNull();
  });
});

describe('readDirectDependencies (cargo)', () => {
  it('resolves versions from Cargo.lock and skips path dependencies', async () => {
    const [manifest] = detectCargoManifests(['Cargo.toml', 'Cargo.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, FIXTURE_REPO_ROOT);

    expect(dependencies).toContainEqual({ name: 'serde', version: '1.0.203' });
    expect(dependencies).toContainEqual({ name: 'proptest', version: '1.4.0' });
    expect(dependencies.some((dependency) => dependency.name === 'local-lib')).toBe(false);
  });
});
