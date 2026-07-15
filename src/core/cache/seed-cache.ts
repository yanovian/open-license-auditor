import type { DepsDevSystem } from '../depsdev/system-name-map.js';
import seedData from './seed-license-cache.json' with { type: 'json' };

type SeedTable = Partial<Record<DepsDevSystem, Record<string, string>>>;

const SEED_TABLE = seedData as SeedTable;

/**
 * A small, curated list of very common packages with already-known licenses, shipped with the
 * Action itself. Checked before the cache and before any network call, so the most popular
 * packages in the world never cost a lookup, on any run, for any repo. Deliberately not an
 * attempt to mirror any registry: only a few dozen entries per ecosystem, matched by name only
 * since these packages' licenses are effectively stable across their versions.
 */
export function getSeedLicense(system: DepsDevSystem, packageName: string): string | null {
  return SEED_TABLE[system]?.[packageName] ?? null;
}
