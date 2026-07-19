import { describe, expect, it } from 'vitest';
import { createLicenseClassifier } from './license-classifier.js';

describe('createLicenseClassifier', () => {
  it('classifies permissive licenses as ok using the default table', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('MIT')).toBe('ok');
    expect(classifier.classify('Apache-2.0')).toBe('ok');
  });

  it('classifies strong copyleft licenses as critical using the default table', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('GPL-3.0')).toBe('critical');
    expect(classifier.classify('AGPL-3.0')).toBe('critical');
  });

  it('classifies weak copyleft licenses as warning using the default table', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('MPL-2.0')).toBe('warning');
  });

  it('falls back to warning for unrecognized or missing licenses', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('Some-Custom-License')).toBe('warning');
    expect(classifier.classify(null)).toBe('warning');
  });

  it('lets a user override always win over the default bucket', () => {
    const classifier = createLicenseClassifier({
      ok: ['MPL-2.0'],
      critical: ['MIT'],
    });
    expect(classifier.classify('MPL-2.0')).toBe('ok');
    expect(classifier.classify('MIT')).toBe('critical');
  });

  it('classifies BlueOak-1.0.0 and Python-2.0 as ok', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('BlueOak-1.0.0')).toBe('ok');
    expect(classifier.classify('Python-2.0')).toBe('ok');
  });

  it('resolves an OR expression to its best (most permissive) part', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('GPL-3.0 OR MIT')).toBe('ok');
    expect(classifier.classify('Apache-2.0 OR BSD-2-Clause OR MIT')).toBe('ok');
    expect(classifier.classify('GPL-3.0 OR MPL-2.0')).toBe('warning');
  });

  it('resolves an AND expression to its worst (most restrictive) part', () => {
    const classifier = createLicenseClassifier();
    expect(classifier.classify('BSD-3-Clause AND MIT')).toBe('ok');
    expect(classifier.classify('Apache-2.0 AND LGPL-3.0 AND MIT')).toBe('warning');
    expect(classifier.classify('Apache-2.0 AND GPL-3.0')).toBe('critical');
  });

  it('lets a user override win over splitting a compound expression apart', () => {
    const classifier = createLicenseClassifier({ critical: ['GPL-3.0 OR MIT'] });
    expect(classifier.classify('GPL-3.0 OR MIT')).toBe('critical');
  });
});
