import { retryingFetch } from '../http/retrying-fetch.js';
import type { DepsDevSystem } from './system-name-map.js';

const DEPS_DEV_BASE_URL = 'https://api.deps.dev/v3';

export type DepsDevRelation = 'SELF' | 'DIRECT' | 'INDIRECT';

export interface DepsDevVersionKey {
  readonly system: string;
  readonly name: string;
  readonly version: string;
}

export interface DepsDevDependencyNode {
  readonly versionKey: DepsDevVersionKey;
  readonly relation: DepsDevRelation;
}

export interface DepsDevDependencyEdge {
  readonly fromNode: number;
  readonly toNode: number;
}

export interface DepsDevDependenciesResponse {
  readonly nodes?: readonly DepsDevDependencyNode[];
  readonly edges?: readonly DepsDevDependencyEdge[];
}

export interface DepsDevVersionResponse {
  readonly licenses?: readonly string[];
}

export interface DepsDevClient {
  getDependencies(
    system: DepsDevSystem,
    name: string,
    version: string,
  ): Promise<DepsDevDependenciesResponse>;
  getVersion(system: DepsDevSystem, name: string, version: string): Promise<DepsDevVersionResponse>;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await retryingFetch(url);
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

/** Thin wrapper over the two deps.dev v3 endpoints this tool needs. */
export function createDepsDevClient(): DepsDevClient {
  return {
    async getDependencies(system, name, version) {
      const url = `${DEPS_DEV_BASE_URL}/systems/${system}/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}:dependencies`;
      return (await fetchJson<DepsDevDependenciesResponse>(url)) ?? {};
    },
    async getVersion(system, name, version) {
      const url = `${DEPS_DEV_BASE_URL}/systems/${system}/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`;
      return (await fetchJson<DepsDevVersionResponse>(url)) ?? {};
    },
  };
}
