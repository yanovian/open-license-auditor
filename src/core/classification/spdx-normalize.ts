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

const OR_SEPARATOR = /\s+or\s+/i;
const AND_SEPARATOR = /\s+and\s+/i;

/**
 * Best-effort mapping from whatever raw license string a registry reports to one canonical
 * SPDX id, or a ` AND `/` OR ` expression of canonical ids. Returns null when the string is
 * empty or not recognized, rather than guessing.
 */
export function normalizeLicenseString(rawLicenseString: string | null | undefined): string | null {
  if (rawLicenseString === null || rawLicenseString === undefined) {
    return null;
  }
  const trimmed = rawLicenseString.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const isOrExpression = OR_SEPARATOR.test(trimmed);
  const isAndExpression = AND_SEPARATOR.test(trimmed);
  // A string mixing both operators has no parentheses to say which binds first, so there is no
  // safe way to resolve it; leave it unrecognized rather than guess a grouping.
  if (isOrExpression && isAndExpression) {
    return null;
  }
  if (isOrExpression) {
    return normalizeExpression(trimmed, OR_SEPARATOR, ' OR ');
  }
  if (isAndExpression) {
    return normalizeExpression(trimmed, AND_SEPARATOR, ' AND ');
  }

  return ALIAS_LOOKUP.get(normalizeKey(trimmed)) ?? null;
}

/** Normalizes every term of a homogeneous AND-only or OR-only expression, only recognizing the
 * expression as a whole once every term does. */
function normalizeExpression(expression: string, separator: RegExp, joiner: string): string | null {
  const terms = expression.split(separator).map((term) => normalizeLicenseString(term));
  return terms.every((term): term is string => term !== null) ? terms.join(joiner) : null;
}
