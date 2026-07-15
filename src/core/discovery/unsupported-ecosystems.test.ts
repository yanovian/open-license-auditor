import { describe, expect, it } from 'vitest';
import { detectUnsupportedEcosystems } from './unsupported-ecosystems.js';

describe('detectUnsupportedEcosystems', () => {
  it('detects a well-known unsupported package manager by its marker file', () => {
    const detected = detectUnsupportedEcosystems(['Package.swift', 'Sources/main.swift']);

    expect(detected).toEqual([
      {
        language: 'Swift',
        packageManager: 'Swift Package Manager',
        manifestFilePath: 'Package.swift',
      },
    ]);
  });

  it('detects multiple unsupported ecosystems in the same repo', () => {
    const detected = detectUnsupportedEcosystems(['pubspec.yaml', 'mix.exs', 'package.json']);
    const languages = detected.map((entry) => entry.language).sort();
    expect(languages).toEqual(['Dart/Flutter', 'Elixir']);
  });

  it('returns an empty array when nothing unsupported is found', () => {
    expect(detectUnsupportedEcosystems(['package.json', 'README.md'])).toEqual([]);
  });
});
