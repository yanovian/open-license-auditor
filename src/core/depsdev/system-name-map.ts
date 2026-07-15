import type { EcosystemId } from '../types/ecosystem-plugin.js';

export type DepsDevSystem = 'NPM' | 'PYPI' | 'CARGO' | 'MAVEN' | 'GO' | 'RUBYGEMS' | 'NUGET';

/**
 * Gradle has no deps.dev system of its own, but Gradle dependencies are Maven coordinates, so
 * Gradle license lookups reuse the MAVEN system. Composer has no deps.dev support at all, its
 * plugin reads the license straight out of composer.lock instead of calling this map.
 */
const ECOSYSTEM_TO_DEPSDEV_SYSTEM: Readonly<Partial<Record<EcosystemId, DepsDevSystem>>> = {
  npm: 'NPM',
  pip: 'PYPI',
  cargo: 'CARGO',
  maven: 'MAVEN',
  go: 'GO',
  rubygems: 'RUBYGEMS',
  nuget: 'NUGET',
  gradle: 'MAVEN',
};

export function depsDevSystemFor(ecosystem: EcosystemId): DepsDevSystem | null {
  return ECOSYSTEM_TO_DEPSDEV_SYSTEM[ecosystem] ?? null;
}
