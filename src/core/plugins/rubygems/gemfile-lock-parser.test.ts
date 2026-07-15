import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDependencyTreeFromLockfile } from '../../resolution/lockfile-tree-builder.js';
import {
  detectRubygemsManifests,
  parseGemfileLock,
  readResolvedPackages,
} from './gemfile-lock-parser.js';

const FIXTURE_REPO_ROOT = path.resolve('tests/fixtures/rubygems');

describe('detectRubygemsManifests', () => {
  it('pairs Gemfile with a sibling Gemfile.lock', () => {
    const manifests = detectRubygemsManifests(['Gemfile', 'Gemfile.lock']);
    expect(manifests[0]?.ecosystem).toBe('rubygems');
    expect(manifests[0]?.language).toBe('Ruby');
    expect(manifests[0]?.lockfileFilePath).toBe('Gemfile.lock');
  });
});

describe('parseGemfileLock', () => {
  it('marks only Gemfile-declared gems as direct and preserves real dependency edges', () => {
    const packages = parseGemfileLock(
      [
        'GEM',
        '  remote: https://rubygems.org/',
        '  specs:',
        '    actionpack (7.0.4)',
        '      actionview (= 7.0.4)',
        '      rack (~> 2.0)',
        '    actionview (7.0.4)',
        '    rack (2.2.6)',
        '    rails (7.0.4)',
        '      actionpack (= 7.0.4)',
        '',
        'DEPENDENCIES',
        '  rails',
      ].join('\n'),
    );

    const rails = packages.find((pkg) => pkg.name === 'rails');
    expect(rails?.isDirect).toBe(true);
    expect(rails?.dependsOn).toEqual(['actionpack']);

    const actionpack = packages.find((pkg) => pkg.name === 'actionpack');
    expect(actionpack?.isDirect).toBe(false);
    expect(actionpack?.dependsOn).toEqual(['actionview', 'rack']);
  });
});

describe('readResolvedPackages + buildDependencyTreeFromLockfile (rubygems)', () => {
  it('builds a real nested tree from Gemfile.lock edges', async () => {
    const [manifest] = detectRubygemsManifests(['Gemfile', 'Gemfile.lock']);
    if (!manifest) {
      throw new Error('expected a manifest to be detected');
    }

    const packages = await readResolvedPackages(manifest, FIXTURE_REPO_ROOT);
    const tree = buildDependencyTreeFromLockfile(packages, 'rubygems', manifest.id);

    expect(tree).toHaveLength(1);
    const rails = tree[0];
    expect(rails?.name).toBe('rails');
    expect(rails?.isDirect).toBe(true);

    const actionpack = rails?.children[0];
    expect(actionpack?.name).toBe('actionpack');
    expect(actionpack?.isDirect).toBe(false);
    expect(actionpack?.depth).toBe(1);
    expect(actionpack?.children.map((child) => child.name).sort()).toEqual(['actionview', 'rack']);
  });
});
