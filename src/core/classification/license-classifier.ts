import type { Classification } from '../types/dependency-node.js';
import { DEFAULT_CLASSIFICATION_TABLE } from './default-classification-table.js';

export interface LicenseLists {
  readonly ok?: readonly string[] | undefined;
  readonly warning?: readonly string[] | undefined;
  readonly critical?: readonly string[] | undefined;
}

export interface LicenseClassifier {
  classify(canonicalLicenseId: string | null): Classification;
}

function buildClassificationMap(overrides: LicenseLists | undefined): Map<string, Classification> {
  const classificationMap = new Map<string, Classification>();

  for (const [classification, ids] of Object.entries(DEFAULT_CLASSIFICATION_TABLE) as [
    Classification,
    readonly string[],
  ][]) {
    for (const licenseId of ids) {
      classificationMap.set(licenseId, classification);
    }
  }

  // Whatever bucket the user places an id in always wins, even over the default table.
  for (const [classification, ids] of Object.entries(overrides ?? {}) as [
    Classification,
    readonly string[] | undefined,
  ][]) {
    for (const licenseId of ids ?? []) {
      classificationMap.set(licenseId, classification);
    }
  }

  return classificationMap;
}

// AND takes the worst part, since every part's terms must be satisfied at once; OR takes the
// best part, since you can always choose to comply with whichever part is least restrictive.
const WORST_FIRST: readonly Classification[] = ['critical', 'warning', 'ok'];
const BEST_FIRST: readonly Classification[] = ['ok', 'warning', 'critical'];

function classifyId(
  canonicalId: string,
  classificationMap: Map<string, Classification>,
): Classification {
  // A user override or the default table may list this exact compound expression, which wins
  // over splitting it apart.
  const direct = classificationMap.get(canonicalId);
  if (direct !== undefined) {
    return direct;
  }
  if (canonicalId.includes(' OR ')) {
    return combine(canonicalId.split(' OR '), classificationMap, BEST_FIRST);
  }
  if (canonicalId.includes(' AND ')) {
    return combine(canonicalId.split(' AND '), classificationMap, WORST_FIRST);
  }
  return 'warning';
}

/** Picks whichever part's classification comes first in `preferenceOrder`. */
function combine(
  parts: readonly string[],
  classificationMap: Map<string, Classification>,
  preferenceOrder: readonly Classification[],
): Classification {
  const partClassifications = parts.map((part) => classifyId(part, classificationMap));
  return preferenceOrder.find((candidate) => partClassifications.includes(candidate)) ?? 'warning';
}

/**
 * Unknown or unrecognized licenses always fall back to 'warning', never 'ok', so a gap in
 * license data can never silently pass as safe.
 */
export function createLicenseClassifier(overrides?: LicenseLists): LicenseClassifier {
  const classificationMap = buildClassificationMap(overrides);

  return {
    classify(canonicalLicenseId: string | null): Classification {
      if (canonicalLicenseId === null) {
        return 'warning';
      }
      return classifyId(canonicalLicenseId, classificationMap);
    },
  };
}
