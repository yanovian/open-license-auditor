import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectNugetManifests, readResolvedPackages } from './packages-lock-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/nuget');

describe('detectNugetManifests', () => {
  it('treats packages.lock.json itself as the manifest', () => {
    const manifests = detectNugetManifests(['packages.lock.json']);
    expect(manifests[0]?.ecosystem).toBe('nuget');
    expect(manifests[0]?.language).toBe('C#/.NET');
    expect(manifests[0]?.lockfileFilePath).toBe('packages.lock.json');
  });
});

describe('readResolvedPackages (nuget)', () => {
  it('flags Direct vs Transitive packages with their resolved version', async () => {
    const [manifest] = detectNugetManifests(['packages.lock.json']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const packages = await readResolvedPackages(manifest, FIXTURE_REPO_ROOT);

    expect(packages).toContainEqual({
      name: 'Newtonsoft.Json',
      version: '13.0.3',
      isDirect: true,
      dependsOn: [],
    });
    expect(packages).toContainEqual({
      name: 'Serilog',
      version: '2.10.0',
      isDirect: false,
      dependsOn: [],
    });
  });
});
