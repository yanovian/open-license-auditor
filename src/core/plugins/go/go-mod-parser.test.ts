import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectGoManifests, parseGoMod, readResolvedPackages } from './go-mod-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/go');

describe('detectGoManifests', () => {
  it('pairs go.mod with a sibling go.sum', () => {
    const manifests = detectGoManifests(['go.mod', 'go.sum']);
    expect(manifests[0]?.ecosystem).toBe('go');
    expect(manifests[0]?.language).toBe('Go');
    expect(manifests[0]?.lockfileFilePath).toBe('go.sum');
  });
});

describe('parseGoMod', () => {
  it('reads both block-form and single-line require statements, flagging indirect ones', () => {
    const packages = parseGoMod(
      [
        'module example.com/fixture-app',
        '',
        'go 1.21',
        '',
        'require (',
        '\tgithub.com/pkg/errors v0.9.1',
        '\tgolang.org/x/text v0.14.0 // indirect',
        ')',
        '',
        'require github.com/stretchr/testify v1.9.0',
      ].join('\n'),
    );

    expect(packages).toContainEqual({
      name: 'github.com/pkg/errors',
      version: 'v0.9.1',
      isDirect: true,
      dependsOn: [],
    });
    expect(packages).toContainEqual({
      name: 'golang.org/x/text',
      version: 'v0.14.0',
      isDirect: false,
      dependsOn: [],
    });
    expect(packages).toContainEqual({
      name: 'github.com/stretchr/testify',
      version: 'v1.9.0',
      isDirect: true,
      dependsOn: [],
    });
  });
});

describe('readResolvedPackages (go)', () => {
  it('reads direct dependencies from the fixture go.mod', async () => {
    const [manifest] = detectGoManifests(['go.mod', 'go.sum']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const packages = await readResolvedPackages(manifest, FIXTURE_REPO_ROOT);
    expect(packages).toHaveLength(3);
    expect(packages.filter((pkg) => pkg.isDirect)).toHaveLength(2);
  });
});
