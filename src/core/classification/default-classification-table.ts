import type { Classification } from '../types/dependency-node.js';

/**
 * Default bucket for every canonical SPDX id the tool ships knowledge of. See
 * _docs/license-classification.md for the rationale behind each bucket. A consuming repo's
 * config `licenses:` block is merged on top of this table, and always wins on conflict.
 */
export const DEFAULT_CLASSIFICATION_TABLE: Readonly<Record<Classification, readonly string[]>> = {
  ok: [
    'MIT',
    'MIT-0',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    '0BSD',
    'ISC',
    'Unlicense',
    'CC0-1.0',
    'Zlib',
    'WTFPL',
    'BlueOak-1.0.0',
    'Python-2.0',
  ],
  warning: [
    'LGPL-2.1',
    'LGPL-3.0',
    'MPL-2.0',
    'MPL-1.1',
    'EPL-1.0',
    'EPL-2.0',
    'CDDL-1.0',
    'CDDL-1.1',
    'UNLICENSED',
  ],
  critical: ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'],
};
