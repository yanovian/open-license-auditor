import path from 'node:path';

export interface UnsupportedEcosystemSignature {
  readonly language: string;
  readonly packageManager: string;
  readonly markerFilename: string;
}

export interface DetectedUnsupportedEcosystem {
  readonly language: string;
  readonly packageManager: string;
  readonly manifestFilePath: string;
}

/**
 * Well-known package managers this tool does not yet support. Not exhaustive of every build
 * tool in existence, just common enough that a user would reasonably expect a note explaining
 * why their project's dependencies were not checked, rather than silence.
 */
export const KNOWN_UNSUPPORTED_ECOSYSTEMS: readonly UnsupportedEcosystemSignature[] = [
  { language: 'Swift', packageManager: 'Swift Package Manager', markerFilename: 'Package.swift' },
  { language: 'Dart/Flutter', packageManager: 'pub', markerFilename: 'pubspec.yaml' },
  { language: 'Elixir', packageManager: 'Mix', markerFilename: 'mix.exs' },
  { language: 'Objective-C/Swift', packageManager: 'CocoaPods', markerFilename: 'Podfile' },
  { language: 'Elm', packageManager: 'Elm package manager', markerFilename: 'elm.json' },
  { language: 'Haskell', packageManager: 'Stack', markerFilename: 'stack.yaml' },
  { language: 'Perl', packageManager: 'cpanm', markerFilename: 'cpanfile' },
  { language: 'C/C++', packageManager: 'Conan', markerFilename: 'conanfile.txt' },
  { language: 'C/C++', packageManager: 'vcpkg', markerFilename: 'vcpkg.json' },
  { language: 'R', packageManager: 'renv', markerFilename: 'renv.lock' },
];

export function detectUnsupportedEcosystems(
  repoFiles: readonly string[],
): DetectedUnsupportedEcosystem[] {
  const signatureByFilename = new Map(
    KNOWN_UNSUPPORTED_ECOSYSTEMS.map((signature) => [signature.markerFilename, signature]),
  );

  return repoFiles
    .map((filePath): DetectedUnsupportedEcosystem | null => {
      const signature = signatureByFilename.get(path.basename(filePath));
      return signature
        ? {
            language: signature.language,
            packageManager: signature.packageManager,
            manifestFilePath: filePath,
          }
        : null;
    })
    .filter((detected): detected is DetectedUnsupportedEcosystem => detected !== null);
}
