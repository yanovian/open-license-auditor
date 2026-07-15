export interface LicenseAliasGroup {
  readonly canonicalId: string;
  readonly variants: readonly string[];
}

/**
 * Registries phrase the same license many different ways. Each group below lists the raw
 * strings we have seen npm, PyPI, Maven POMs, RubyGems, and Packagist report for one license,
 * mapped to a single canonical SPDX id. spdx-normalize.ts turns this into a lookup table; the
 * classifier and the user config only ever deal in the canonicalId column.
 */
export const LICENSE_ALIAS_GROUPS: readonly LicenseAliasGroup[] = [
  {
    canonicalId: 'MIT',
    variants: ['MIT', 'MIT License', 'The MIT License', 'The MIT License (MIT)'],
  },
  {
    canonicalId: 'Apache-2.0',
    variants: [
      'Apache-2.0',
      'Apache 2.0',
      'Apache License 2.0',
      'Apache License, Version 2.0',
      'The Apache Software License, Version 2.0',
      'Apache Software License',
      'Apache License',
    ],
  },
  {
    canonicalId: 'BSD-2-Clause',
    variants: ['BSD-2-Clause', 'BSD 2-Clause', 'BSD 2-Clause License', 'Simplified BSD License'],
  },
  {
    canonicalId: 'BSD-3-Clause',
    variants: [
      'BSD-3-Clause',
      'BSD 3-Clause',
      'BSD 3-Clause License',
      'New BSD License',
      'Modified BSD License',
      'BSD License',
    ],
  },
  { canonicalId: 'ISC', variants: ['ISC', 'ISC License'] },
  { canonicalId: '0BSD', variants: ['0BSD', 'BSD Zero Clause License'] },
  { canonicalId: 'Unlicense', variants: ['Unlicense', 'The Unlicense'] },
  {
    canonicalId: 'CC0-1.0',
    variants: ['CC0-1.0', 'CC0 1.0', 'Creative Commons Zero v1.0 Universal', 'Public Domain'],
  },
  { canonicalId: 'Zlib', variants: ['Zlib', 'zlib License', 'zlib/libpng License'] },
  {
    canonicalId: 'WTFPL',
    variants: ['WTFPL', 'Do What The F*ck You Want To Public License'],
  },
  {
    canonicalId: 'LGPL-2.1',
    variants: [
      'LGPL-2.1',
      'LGPL-2.1-only',
      'LGPL-2.1-or-later',
      'GNU Lesser General Public License v2.1',
      'GNU Lesser General Public License, version 2.1',
    ],
  },
  {
    canonicalId: 'LGPL-3.0',
    variants: [
      'LGPL-3.0',
      'LGPL-3.0-only',
      'LGPL-3.0-or-later',
      'GNU Lesser General Public License v3.0',
      'GNU Lesser General Public License',
    ],
  },
  {
    canonicalId: 'MPL-2.0',
    variants: ['MPL-2.0', 'Mozilla Public License 2.0', 'Mozilla Public License Version 2.0'],
  },
  { canonicalId: 'MPL-1.1', variants: ['MPL-1.1', 'Mozilla Public License 1.1'] },
  {
    canonicalId: 'EPL-1.0',
    variants: ['EPL-1.0', 'Eclipse Public License 1.0', 'Eclipse Public License - v 1.0'],
  },
  {
    canonicalId: 'EPL-2.0',
    variants: ['EPL-2.0', 'Eclipse Public License 2.0', 'Eclipse Public License - v 2.0'],
  },
  {
    canonicalId: 'CDDL-1.0',
    variants: ['CDDL-1.0', 'Common Development and Distribution License 1.0'],
  },
  {
    canonicalId: 'CDDL-1.1',
    variants: ['CDDL-1.1', 'Common Development and Distribution License 1.1'],
  },
  { canonicalId: 'UNLICENSED', variants: ['UNLICENSED'] },
  {
    canonicalId: 'GPL-2.0',
    variants: [
      'GPL-2.0',
      'GPL-2.0-only',
      'GPL-2.0-or-later',
      'GNU General Public License v2.0',
      'GNU General Public License, version 2',
    ],
  },
  {
    canonicalId: 'GPL-3.0',
    variants: [
      'GPL-3.0',
      'GPL-3.0-only',
      'GPL-3.0-or-later',
      'GNU General Public License v3.0',
      'GNU General Public License, version 3',
      'GNU General Public License',
    ],
  },
  {
    canonicalId: 'AGPL-3.0',
    variants: [
      'AGPL-3.0',
      'AGPL-3.0-only',
      'AGPL-3.0-or-later',
      'GNU Affero General Public License v3.0',
      'GNU Affero General Public License',
    ],
  },
  { canonicalId: 'SSPL-1.0', variants: ['SSPL-1.0', 'Server Side Public License'] },
];
