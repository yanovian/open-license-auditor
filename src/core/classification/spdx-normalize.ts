import { LICENSE_ALIAS_GROUPS } from './license-alias-table.js';

function normalizeKey(rawLicenseString: string): string {
  return rawLicenseString
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\blicense\b/g, ' ')
    .replace(/\bversion\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAliasLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const group of LICENSE_ALIAS_GROUPS) {
    for (const variant of group.variants) {
      lookup.set(normalizeKey(variant), group.canonicalId);
    }
  }
  return lookup;
}

const ALIAS_LOOKUP = buildAliasLookup();

/**
 * Best-effort mapping from whatever raw license string a registry reports to one canonical
 * SPDX id. Returns null when the string is empty or not recognized, rather than guessing.
 */
export function normalizeLicenseString(rawLicenseString: string | null | undefined): string | null {
  if (rawLicenseString === null || rawLicenseString === undefined) {
    return null;
  }
  const trimmed = rawLicenseString.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return ALIAS_LOOKUP.get(normalizeKey(trimmed)) ?? null;
}
