import { describe, expect, it } from 'vitest';
import { getSeedLicense } from './seed-cache.js';

describe('getSeedLicense', () => {
  it('returns the known license for a very common package', () => {
    expect(getSeedLicense('NPM', 'react')).toBe('MIT');
    expect(getSeedLicense('PYPI', 'requests')).toBe('Apache-2.0');
  });

  it('returns null for a package not in the seed table', () => {
    expect(getSeedLicense('NPM', 'some-obscure-package')).toBeNull();
  });

  it('does not cross-contaminate between ecosystems', () => {
    expect(getSeedLicense('CARGO', 'react')).toBeNull();
  });
});
