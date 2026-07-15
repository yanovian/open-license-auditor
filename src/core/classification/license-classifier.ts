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
      return classificationMap.get(canonicalLicenseId) ?? 'warning';
    },
  };
}
