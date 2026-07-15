import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectGradleManifests, readResolvedPackages } from './gradle-lockfile-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/gradle');

describe('detectGradleManifests', () => {
  it('pairs build.gradle with a sibling gradle.lockfile', () => {
    const manifests = detectGradleManifests(['build.gradle', 'gradle.lockfile']);
    expect(manifests[0]?.ecosystem).toBe('gradle');
    expect(manifests[0]?.language).toBe('Java/Kotlin');
    expect(manifests[0]?.lockfileFilePath).toBe('gradle.lockfile');
  });

  it('also detects build.gradle.kts', () => {
    const manifests = detectGradleManifests(['build.gradle.kts', 'gradle.lockfile']);
    expect(manifests).toHaveLength(1);
  });
});

describe('readResolvedPackages (gradle)', () => {
  it('resolves every locked coordinate and flags the ones declared directly', async () => {
    const [manifest] = detectGradleManifests(['build.gradle', 'gradle.lockfile']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const packages = await readResolvedPackages(manifest, FIXTURE_REPO_ROOT);

    expect(packages).toHaveLength(3);
    const guava = packages.find((pkg) => pkg.name === 'com.google.guava:guava');
    expect(guava?.version).toBe('31.1-jre');
    expect(guava?.isDirect).toBe(true);

    const opentest4j = packages.find((pkg) => pkg.name === 'org.opentest4j:opentest4j');
    expect(opentest4j?.isDirect).toBe(false);
  });
});
