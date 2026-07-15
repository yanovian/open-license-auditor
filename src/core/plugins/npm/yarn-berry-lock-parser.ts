import { parse as parseYaml } from 'yaml';
import type { DirectDependency } from '../../depsdev/create-depsdev-plugin.js';

interface YarnBerryEntry {
  readonly version?: string;
}

function splitDescriptorKey(key: string): string[] {
  return key.split(', ').map((descriptor) => descriptor.trim());
}

/** Yarn Berry lockfiles always start with this block; classic v1 lockfiles never have one. */
export function isYarnBerryLockfile(fileContents: string): boolean {
  return fileContents.includes('__metadata:');
}

/**
 * Yarn Berry (v2+) lockfiles are real YAML, unlike classic v1's custom text format. Descriptors
 * are keyed as "name@npm:range" (or "name@workspace:.", "name@patch:...", etc. for non-registry
 * sources), and one YAML key can bundle several comma-separated descriptors that all resolved
 * to the same version.
 */
export function resolveYarnBerryVersions(
  fileContents: string,
  declaredDependencies: ReadonlyMap<string, string>,
): DirectDependency[] {
  const lockfile = parseYaml(fileContents) as Record<string, YarnBerryEntry>;
  const versionByDescriptor = new Map<string, string>();

  for (const [key, entry] of Object.entries(lockfile)) {
    if (key === '__metadata' || !entry?.version) {
      continue;
    }
    for (const descriptor of splitDescriptorKey(key)) {
      versionByDescriptor.set(descriptor, entry.version);
    }
  }

  return [...declaredDependencies.entries()]
    .map(([name, range]): DirectDependency | null => {
      const version = versionByDescriptor.get(`${name}@npm:${range}`);
      return version ? { name, version } : null;
    })
    .filter((dependency): dependency is DirectDependency => dependency !== null);
}
