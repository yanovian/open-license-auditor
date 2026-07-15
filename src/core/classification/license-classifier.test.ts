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
});
