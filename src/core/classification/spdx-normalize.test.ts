import { describe, expect, it } from 'vitest';
import { normalizeLicenseString } from './spdx-normalize.js';

describe('normalizeLicenseString', () => {
  it('returns the canonical id unchanged for an exact SPDX id', () => {
    expect(normalizeLicenseString('MIT')).toBe('MIT');
    expect(normalizeLicenseString('Apache-2.0')).toBe('Apache-2.0');
  });

  it('maps common free-text variants to their canonical id', () => {
    expect(normalizeLicenseString('MIT License')).toBe('MIT');
    expect(normalizeLicenseString('The MIT License (MIT)')).toBe('MIT');
    expect(normalizeLicenseString('Apache License, Version 2.0')).toBe('Apache-2.0');
    expect(normalizeLicenseString('The Apache Software License, Version 2.0')).toBe('Apache-2.0');
    expect(normalizeLicenseString('GNU General Public License v3.0')).toBe('GPL-3.0');
  });

  it('is case and punctuation insensitive', () => {
    expect(normalizeLicenseString('  apache-2.0  ')).toBe('Apache-2.0');
    expect(normalizeLicenseString('bsd 3-clause license')).toBe('BSD-3-Clause');
  });

  it('returns null for unrecognized or empty strings', () => {
    expect(normalizeLicenseString('Some Custom Corp License v9')).toBeNull();
    expect(normalizeLicenseString('')).toBeNull();
    expect(normalizeLicenseString('   ')).toBeNull();
    expect(normalizeLicenseString(null)).toBeNull();
    expect(normalizeLicenseString(undefined)).toBeNull();
  });

  it('distinguishes Unlicense from npm UNLICENSED', () => {
    expect(normalizeLicenseString('Unlicense')).toBe('Unlicense');
    expect(normalizeLicenseString('UNLICENSED')).toBe('UNLICENSED');
  });
});
