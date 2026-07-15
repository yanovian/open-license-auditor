/**
 * Filenames each ecosystem plugin looks for. Centralized here so a filename is never a
 * scattered magic string, and so the full breadth of what this tool can detect is visible in
 * one place.
 */
export const MANIFEST_FILENAMES = {
  npm: {
    manifest: 'package.json',
    lockfiles: ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'],
  },
  pip: { manifest: 'requirements.txt', lockfiles: ['poetry.lock', 'uv.lock', 'Pipfile.lock'] },
  cargo: { manifest: 'Cargo.toml', lockfiles: ['Cargo.lock'] },
  go: { manifest: 'go.mod', lockfiles: ['go.sum'] },
  maven: { manifest: 'pom.xml', lockfiles: [] },
  gradle: { manifest: 'build.gradle', lockfiles: ['gradle.lockfile'] },
  rubygems: { manifest: 'Gemfile', lockfiles: ['Gemfile.lock'] },
  composer: { manifest: 'composer.json', lockfiles: ['composer.lock'] },
  nuget: { manifest: '.csproj', lockfiles: ['packages.lock.json'] },
} as const;
