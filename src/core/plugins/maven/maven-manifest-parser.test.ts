import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectMavenManifests, readDirectDependencies } from './maven-manifest-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/maven');

describe('detectMavenManifests', () => {
  it('detects pom.xml with no lockfile (Maven has none)', () => {
    const manifests = detectMavenManifests(['pom.xml', 'src/Main.java']);

    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.ecosystem).toBe('maven');
    expect(manifests[0]?.language).toBe('Java');
    expect(manifests[0]?.lockfileFilePath).toBeNull();
  });
});

describe('readDirectDependencies (maven)', () => {
  it('reads dependencies with a literal version and skips property/parent-managed versions', async () => {
    const [manifest] = detectMavenManifests(['pom.xml']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const dependencies = await readDirectDependencies(manifest, FIXTURE_REPO_ROOT);

    expect(dependencies).toEqual([{ name: 'com.google.guava:guava', version: '33.2.1-jre' }]);
  });
});
